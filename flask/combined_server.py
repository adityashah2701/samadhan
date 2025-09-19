# ================================================================================
# FLASK API FOR CIVIC ISSUE DETECTION ONLY
# Updated server with only issue detection, category classification removed
# Added /health route for cron job monitoring
# ================================================================================

from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import tensorflow as tf
import numpy as np
from PIL import Image
import base64
import io
import os
from datetime import datetime
import logging
import os
import logging
import tensorflow as tf
import psutil  # For system health metrics
import time

# Disable all GPU devices (forces CPU only)
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

# Suppress TensorFlow logging except errors
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
logging.getLogger("tensorflow").setLevel(logging.ERROR)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ================================================================================
# CONFIGURATION
# ================================================================================

# Model path - only issue detection model
ISSUE_MODEL_PATH = 'civic_issue_classifier.tflite'
MODELS_DIR = 'models/'

# Image configuration
IMG_SIZE = (224, 224)

# Class names for issue detection only
ISSUE_CLASS_NAMES = ['issue', 'no_issue']

# Global model variable
issue_model = None

# Health check tracking
start_time = time.time()
health_check_count = 0
last_health_check = None

# ================================================================================
# MODEL LOADING FUNCTION
# ================================================================================

def load_issue_model():
    """Load the civic issue detection model"""
    global issue_model
    
    try:
        # Try different model file locations and formats
        model_paths = [
            ISSUE_MODEL_PATH,
            os.path.join(MODELS_DIR, ISSUE_MODEL_PATH),
            'best_civic_model.h5',
            os.path.join(MODELS_DIR, 'civic_issue_classifier.tflite')
        ]
        
        for model_path in model_paths:
            if os.path.exists(model_path):
                if model_path.endswith('.tflite'):
                    # Load TFLite model
                    issue_model = tf.lite.Interpreter(model_path=model_path)
                    issue_model.allocate_tensors()
                    logger.info(f"✅ Issue detection TFLite model loaded from {model_path}")
                else:
                    # Load Keras model
                    issue_model = tf.keras.models.load_model(model_path)
                    logger.info(f"✅ Issue detection Keras model loaded from {model_path}")
                return True
                
        logger.error("❌ Issue detection model not found")
        return False
        
    except Exception as e:
        logger.error(f"❌ Error loading issue model: {str(e)}")
        return False

# Load model when app starts
issue_model_loaded = load_issue_model()

# ================================================================================
# HELPER FUNCTIONS
# ================================================================================

def get_system_health():
    """Get system health metrics"""
    try:
        # Get system metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return {
            'cpu_usage_percent': round(cpu_percent, 2),
            'memory': {
                'total': round(memory.total / (1024**3), 2),  # GB
                'used': round(memory.used / (1024**3), 2),    # GB
                'percent': round(memory.percent, 2)
            },
            'disk': {
                'total': round(disk.total / (1024**3), 2),    # GB
                'used': round(disk.used / (1024**3), 2),      # GB
                'percent': round((disk.used / disk.total) * 100, 2)
            }
        }
    except Exception as e:
        logger.warning(f"Could not get system metrics: {str(e)}")
        return {'error': 'System metrics unavailable'}

def preprocess_image_for_issue(image):
    """Preprocess image for issue detection model"""
    try:
        # Resize image
        image = image.resize(IMG_SIZE)
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Convert to numpy array and normalize
        img_array = np.array(image) / 255.0
        
        # Add batch dimension
        img_batch = np.expand_dims(img_array, axis=0).astype(np.float32)
        
        return img_batch
    except Exception as e:
        logger.error(f"Error preprocessing image: {str(e)}")
        return None

def predict_issue(img_batch):
    """Predict if image contains a civic issue"""
    try:
        if issue_model is None:
            return None
            
        if isinstance(issue_model, tf.lite.Interpreter):
            # TFLite prediction
            input_details = issue_model.get_input_details()
            output_details = issue_model.get_output_details()
            
            issue_model.set_tensor(input_details[0]['index'], img_batch)
            issue_model.invoke()
            predictions = issue_model.get_tensor(output_details[0]['index'])[0]
        else:
            # Keras prediction
            predictions = issue_model.predict(img_batch, verbose=0)[0]
        
        # Get results
        predicted_class_idx = np.argmax(predictions)
        predicted_class = ISSUE_CLASS_NAMES[predicted_class_idx]
        confidence = float(np.max(predictions))
        
        # Create probabilities dictionary
        probabilities = {
            class_name: float(prob) 
            for class_name, prob in zip(ISSUE_CLASS_NAMES, predictions)
        }
        
        return {
            'predicted_class': predicted_class,
            'confidence': confidence,
            'is_issue': predicted_class == 'issue',
            'probabilities': probabilities
        }
        
    except Exception as e:
        logger.error(f"Error in issue prediction: {str(e)}")
        return None

def process_image_input(request_data, is_file_upload=True):
    """Process image input from request (file upload or base64)"""
    try:
        if is_file_upload:
            # File upload
            if 'image' not in request.files:
                return None, 'No image file provided'
            
            file = request.files['image']
            if file.filename == '':
                return None, 'No image file selected'
            
            # Validate file type
            allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}
            if not ('.' in file.filename and 
                    file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
                return None, f'Invalid file type. Allowed: {", ".join(allowed_extensions)}'
            
            image = Image.open(file.stream)
            filename = file.filename
            
        else:
            # Base64 input
            if not request_data or 'image' not in request_data:
                return None, 'No base64 image data provided'
            
            image_base64 = request_data['image']
            
            # Remove data URL prefix if present
            if ',' in image_base64:
                image_base64 = image_base64.split(',')[1]
            
            # Decode base64
            try:
                image_data = base64.b64decode(image_base64)
                image = Image.open(io.BytesIO(image_data))
                filename = 'base64_image'
            except Exception as e:
                return None, f'Invalid base64 image data: {str(e)}'
        
        return {'image': image, 'filename': filename}, None
        
    except Exception as e:
        return None, f'Error processing image: {str(e)}'

# ================================================================================
# API ROUTES
# ================================================================================

@app.route('/')
def home():
    """Home page with API documentation"""
    
    html_template = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Civic Issue Detection API</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
            .endpoint { background: #ecf0f1; padding: 15px; margin: 10px 0; border-radius: 5px; }
            .method { background: #27ae60; color: white; padding: 3px 8px; border-radius: 3px; font-size: 12px; }
            .method.post { background: #e74c3c; }
            .method.get { background: #3498db; }
            code { background: #2c3e50; color: #ecf0f1; padding: 2px 6px; border-radius: 3px; }
            .health-info { background: #e8f8f5; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #27ae60; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🏛️ Civic Issue Detection API</h1>
            
            <div class="status">
                <h3>📊 Model Status</h3>
                <p><strong>Issue Detection:</strong> {{ '✅ Loaded' if issue_loaded else '❌ Not Loaded' }}</p>
            </div>
            
            <h2>🔗 API Endpoints</h2>
            
            <div class="endpoint">
                <span class="method get">GET</span> <code>/</code>
                <p>API documentation (this page)</p>
            </div>
            
            <div class="endpoint">
                <span class="method get">GET</span> <code>/status</code>
                <p>Check API and model status</p>
            </div>
            
            <div class="endpoint">
                <span class="method get">GET</span> <code>/health</code>
                <p>Health check endpoint for monitoring and cron jobs</p>
            </div>
            
            <div class="endpoint">
                <span class="method post">POST</span> <code>/predict/issue</code>
                <p>Detect if image contains civic issues (file upload)</p>
            </div>
            
            <div class="endpoint">
                <span class="method post">POST</span> <code>/predict/issue-base64</code>
                <p>Issue detection with base64 encoded image</p>
            </div>
            
            <div class="health-info">
                <h3>🩺 Health Check Information</h3>
                <p><strong>Endpoint:</strong> <code>GET /health</code></p>
                <p><strong>Purpose:</strong> Monitor server health and keep it alive</p>
                <p><strong>Cron Job Example:</strong> <code>*/2 * * * * curl -s http://localhost:1200/health > /dev/null</code></p>
                <p><strong>Returns:</strong> Server uptime, system metrics, model status, and health statistics</p>
            </div>
            
            <h2>🧪 Test the API</h2>
            <form action="/predict/issue" method="post" enctype="multipart/form-data">
                <input type="file" name="image" accept="image/*" required>
                <br><br>
                <button type="submit">Upload & Analyze Image</button>
            </form>
        </div>
    </body>
    </html>
    """
    
    return render_template_string(
        html_template,
        issue_loaded=issue_model_loaded
    )

@app.route('/health')
def health_check():
    """Health check endpoint for monitoring and cron jobs"""
    global health_check_count, last_health_check
    
    try:
        current_time = datetime.now()
        health_check_count += 1
        last_health_check = current_time
        
        # Calculate uptime
        uptime_seconds = time.time() - start_time
        uptime_hours = uptime_seconds // 3600
        uptime_minutes = (uptime_seconds % 3600) // 60
        
        # Get system health metrics
        system_health = get_system_health()
        
        # Determine overall health status
        health_status = "healthy"
        issues = []
        
        if not issue_model_loaded:
            health_status = "degraded"
            issues.append("Issue detection model not loaded")
        
        # Check system resources
        if isinstance(system_health, dict) and 'memory' in system_health:
            if system_health['memory']['percent'] > 90:
                health_status = "degraded"
                issues.append("High memory usage")
            
            if system_health['cpu_usage_percent'] > 90:
                health_status = "degraded"
                issues.append("High CPU usage")
        
        response_data = {
            'status': health_status,
            'timestamp': current_time.strftime('%Y-%m-%d %H:%M:%S'),
            'uptime': {
                'seconds': round(uptime_seconds, 2),
                'formatted': f"{int(uptime_hours)}h {int(uptime_minutes)}m"
            },
            'health_checks': {
                'total': health_check_count,
                'last_check': last_health_check.strftime('%Y-%m-%d %H:%M:%S') if last_health_check else None
            },
            'models': {
                'issue_detection': {
                    'loaded': issue_model_loaded,
                    'classes': ISSUE_CLASS_NAMES if issue_model_loaded else []
                }
            },
            'system': system_health,
            'issues': issues if issues else None
        }
        
        # Log health check (every 10th check to avoid spam)
        if health_check_count % 10 == 0:
            logger.info(f"Health check #{health_check_count} - Status: {health_status}")
        
        return jsonify(response_data), 200 if health_status == "healthy" else 503
        
    except Exception as e:
        logger.error(f"Error in health check: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }), 500

@app.route('/status')
def status():
    """API status endpoint"""
    return jsonify({
        'api_status': 'running',
        'model': {
            'issue_detection': {
                'loaded': issue_model_loaded,
                'classes': ISSUE_CLASS_NAMES
            }
        },
        'endpoints': [
            '/predict/issue',
            '/predict/issue-base64',
            '/health'
        ],
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    })

@app.route('/predict/issue', methods=['POST'])
def predict_issue_endpoint():
    """Issue detection endpoint (file upload)"""
    
    if not issue_model_loaded:
        return jsonify({
            'success': False,
            'error': 'Issue detection model not loaded',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }), 500
    
    try:
        # Process image input
        image_data, error = process_image_input(request, is_file_upload=True)
        if error:
            return jsonify({
                'success': False,
                'error': error,
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 400
        
        # Preprocess image
        img_batch = preprocess_image_for_issue(image_data['image'])
        if img_batch is None:
            return jsonify({
                'success': False,
                'error': 'Error preprocessing image',
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 400
        
        # Make prediction
        prediction = predict_issue(img_batch)
        if prediction is None:
            return jsonify({
                'success': False,
                'error': 'Error making prediction',
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 500
        
        # Return response
        response = {
            'success': True,
            'filename': image_data['filename'],
            'prediction_type': 'issue_detection',
            **prediction,
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        logger.info(f"Issue prediction: {prediction['predicted_class']} ({prediction['confidence']:.1%})")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in issue prediction endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }), 500

@app.route('/predict/issue-base64', methods=['POST'])
def predict_issue_base64():
    """Issue detection with base64 input"""
    
    if not issue_model_loaded:
        return jsonify({
            'success': False,
            'error': 'Issue detection model not loaded',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }), 500
    
    try:
        # Process image input
        data = request.get_json()
        image_data, error = process_image_input(data, is_file_upload=False)
        if error:
            return jsonify({
                'success': False,
                'error': error,
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 400
        
        # Preprocess and predict
        img_batch = preprocess_image_for_issue(image_data['image'])
        if img_batch is None:
            return jsonify({
                'success': False,
                'error': 'Error preprocessing image',
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 400
        
        prediction = predict_issue(img_batch)
        if prediction is None:
            return jsonify({
                'success': False,
                'error': 'Error making prediction',
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 500
        
        return jsonify({
            'success': True,
            'prediction_type': 'issue_detection',
            **prediction,
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
        
    except Exception as e:
        logger.error(f"Error in issue base64 endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }), 500

# ================================================================================
# ERROR HANDLERS
# ================================================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found',
        'available_endpoints': [
            'GET /',
            'GET /status',
            'GET /health',
            'POST /predict/issue',
            'POST /predict/issue-base64'
        ],
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error',
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }), 500

@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({
        'success': False,
        'error': 'File too large. Maximum size is 10MB.',
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }), 413

# ================================================================================
# MAIN FUNCTION
# ================================================================================

if __name__ == '__main__':
    # Set maximum file size (10MB)
    app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024
    
    print("🚀 CIVIC ISSUE DETECTION API")
    print("=" * 60)
    
    # Display model status
    print("📊 MODEL STATUS:")
    if issue_model_loaded:
        print("  ✅ Issue Detection Model: Loaded")
        print(f"     Classes: {', '.join(ISSUE_CLASS_NAMES)}")
    else:
        print("  ❌ Issue Detection Model: Not Loaded")
        print("     Please ensure model files exist:")
        print("     - civic_issue_classifier.tflite")
        print("     - best_civic_model.h5")
    
    print("\n🌐 STARTING SERVER...")
    print("📱 API Documentation: http://localhost:1200")
    print("📊 Status Check: http://localhost:1200/status")
    print("🩺 Health Check: http://localhost:1200/health")
    print("\n🔗 AVAILABLE ENDPOINTS:")
    print("  • GET  /health               - Health check for monitoring")
    print("  • POST /predict/issue        - Detect civic issues (file upload)")
    print("  • POST /predict/issue-base64 - Detect civic issues (base64)")
    
    print("\n⏰ CRON JOB EXAMPLES:")
    print("  • Every 2 minutes: */2 * * * * curl -s http://localhost:1200/health > /dev/null")
    print("  • Every 5 minutes: */5 * * * * curl -s http://localhost:1200/health")
    print("  • Every minute:    * * * * * wget -q -O /dev/null http://localhost:1200/health")
    
    if issue_model_loaded:
        print("\n⭐ Server ready! Issue detection model loaded.")
    else:
        print("\n⚠️  Warning: Issue detection model not loaded. Please check model files.")
    
    print("=" * 60)
    
    # Run the Flask app
    app.run(
        host='0.0.0.0',  # Allow external connections
        port=1200,       # Port number
        debug=True       # Enable debug mode (remove in production)
    )