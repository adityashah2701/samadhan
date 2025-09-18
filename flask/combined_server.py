# ================================================================================
# COMBINED FLASK API FOR CIVIC AI CLASSIFICATION
# Unified server for both issue detection and category classification
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

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ================================================================================
# CONFIGURATION
# ================================================================================

# Model paths
ISSUE_MODEL_PATH = 'civic_issue_classifier.tflite'  # or 'best_civic_model.h5'
CATEGORY_MODEL_PATH = 'civic_classifier.h5'
MODELS_DIR = 'models/'

# Image configuration
IMG_SIZE = (224, 224)

# Class names for issue detection
ISSUE_CLASS_NAMES = ['issue', 'no_issue']

# Class names for category classification
CATEGORY_CLASS_NAMES = [
    'drainage_system',
    'garbage_bin', 
    'park',
    'parking_area',
    'road',
    'sidewalk_path',
    'street_lights'
]

# Global model variables
issue_model = None
category_model = None

# ================================================================================
# MODEL LOADING FUNCTIONS
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

def load_category_model():
    """Load the civic category classification model"""
    global category_model
    
    try:
        # Try different model file locations
        model_paths = [
            CATEGORY_MODEL_PATH,
            os.path.join(MODELS_DIR, CATEGORY_MODEL_PATH),
            os.path.join(MODELS_DIR, 'civic_classifier_quantized.tflite')
        ]
        
        for model_path in model_paths:
            if os.path.exists(model_path):
                if model_path.endswith('.tflite'):
                    # Load TFLite model
                    category_model = tf.lite.Interpreter(model_path=model_path)
                    category_model.allocate_tensors()
                    logger.info(f"✅ Category classification TFLite model loaded from {model_path}")
                else:
                    # Load Keras model
                    category_model = tf.keras.models.load_model(model_path)
                    logger.info(f"✅ Category classification Keras model loaded from {model_path}")
                return True
                
        logger.error("❌ Category classification model not found")
        return False
        
    except Exception as e:
        logger.error(f"❌ Error loading category model: {str(e)}")
        return False

# Load both models when app starts
issue_model_loaded = load_issue_model()
category_model_loaded = load_category_model()

# ================================================================================
# HELPER FUNCTIONS
# ================================================================================

def preprocess_image(image):
    """Preprocess image for prediction"""
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

def predict_category(img_batch):
    """Predict civic category of the image"""
    try:
        if category_model is None:
            return None
            
        if isinstance(category_model, tf.lite.Interpreter):
            # TFLite prediction
            input_details = category_model.get_input_details()
            output_details = category_model.get_output_details()
            
            category_model.set_tensor(input_details[0]['index'], img_batch)
            category_model.invoke()
            predictions = category_model.get_tensor(output_details[0]['index'])[0]
        else:
            # Keras prediction
            predictions = category_model.predict(img_batch, verbose=0)[0]
        
        # Get results
        predicted_class_idx = np.argmax(predictions)
        predicted_class = CATEGORY_CLASS_NAMES[predicted_class_idx]
        confidence = float(predictions[predicted_class_idx])
        
        # Get top 3 predictions
        top_3_idx = np.argsort(predictions)[-3:][::-1]
        top_3_predictions = []
        for idx in top_3_idx:
            top_3_predictions.append({
                'class': CATEGORY_CLASS_NAMES[idx],
                'confidence': float(predictions[idx])
            })
        
        # Get all probabilities
        all_probabilities = {}
        for i, class_name in enumerate(CATEGORY_CLASS_NAMES):
            all_probabilities[class_name] = float(predictions[i])
        
        return {
            'predicted_class': predicted_class,
            'confidence': confidence,
            'top_3_predictions': top_3_predictions,
            'all_probabilities': all_probabilities
        }
        
    except Exception as e:
        logger.error(f"Error in category prediction: {str(e)}")
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
        <title>Civic AI Classification API</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
            h2 { color: #34495e; margin-top: 30px; }
            .endpoint { background: #ecf0f1; padding: 15px; margin: 10px 0; border-radius: 5px; }
            .method { background: #27ae60; color: white; padding: 3px 8px; border-radius: 3px; font-size: 12px; }
            .method.post { background: #e74c3c; }
            code { background: #2c3e50; color: #ecf0f1; padding: 2px 6px; border-radius: 3px; }
            .example { background: #f8f9fa; padding: 15px; border-left: 4px solid #3498db; margin: 10px 0; }
            .status { padding: 10px; border-radius: 5px; margin: 20px 0; }
            .status.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            .status.warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
            .status.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
            .models { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
            .model-card { padding: 15px; border-radius: 8px; border: 2px solid #ddd; }
            .model-card.loaded { border-color: #28a745; background: #f8fff9; }
            .model-card.not-loaded { border-color: #dc3545; background: #fff8f8; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🏛️ Civic AI Classification API</h1>
            
            <div class="models">
                <div class="model-card {{ 'loaded' if issue_loaded else 'not-loaded' }}">
                    <h3>🔍 Issue Detection Model</h3>
                    <p><strong>Status:</strong> {{ '✅ Loaded' if issue_loaded else '❌ Not Loaded' }}</p>
                    <p><strong>Classes:</strong> Issue, No Issue</p>
                    <p><strong>Purpose:</strong> Detect if image contains civic issues</p>
                </div>
                
                <div class="model-card {{ 'loaded' if category_loaded else 'not-loaded' }}">
                    <h3>🏗️ Category Classification Model</h3>
                    <p><strong>Status:</strong> {{ '✅ Loaded' if category_loaded else '❌ Not Loaded' }}</p>
                    <p><strong>Classes:</strong> {{ category_count }} civic categories</p>
                    <p><strong>Purpose:</strong> Classify civic infrastructure types</p>
                </div>
            </div>
            
            <h2>🔗 API Endpoints</h2>
            
            <div class="endpoint">
                <span class="method">GET</span> <code>/</code>
                <p>API documentation (this page)</p>
            </div>
            
            <div class="endpoint">
                <span class="method">GET</span> <code>/status</code>
                <p>Check API and model status</p>
            </div>
            
            <div class="endpoint">
                <span class="method post">POST</span> <code>/predict/issue</code>
                <p>Detect if image contains civic issues</p>
            </div>
            
            <div class="endpoint">
                <span class="method post">POST</span> <code>/predict/category</code>
                <p>Classify civic infrastructure category</p>
            </div>
            
            <div class="endpoint">
                <span class="method post">POST</span> <code>/predict/both</code>
                <p>Run both issue detection and category classification</p>
            </div>
            
            <div class="endpoint">
                <span class="method post">POST</span> <code>/predict/issue-base64</code>
                <p>Issue detection with base64 encoded image</p>
            </div>
            
            <div class="endpoint">
                <span class="method post">POST</span> <code>/predict/category-base64</code>
                <p>Category classification with base64 encoded image</p>
            </div>
            
            <div class="endpoint">
                <span class="method post">POST</span> <code>/predict/both-base64</code>
                <p>Both predictions with base64 encoded image</p>
            </div>
            
            <h2>💻 Usage Examples</h2>
            
            <div class="example">
                <strong>Issue Detection (cURL):</strong><br>
                <code>curl -X POST -F "image=@test_image.jpg" http://localhost:5000/predict/issue</code>
            </div>
            
            <div class="example">
                <strong>Category Classification (cURL):</strong><br>
                <code>curl -X POST -F "image=@test_image.jpg" http://localhost:5000/predict/category</code>
            </div>
            
            <div class="example">
                <strong>Both Predictions (cURL):</strong><br>
                <code>curl -X POST -F "image=@test_image.jpg" http://localhost:5000/predict/both</code>
            </div>
            
            <div class="example">
                <strong>Base64 Example (Python):</strong><br>
                <pre><code>import requests
import base64

# Read and encode image
with open('test_image.jpg', 'rb') as f:
    image_base64 = base64.b64encode(f.read()).decode('utf-8')

# Send request
data = {'image': image_base64}
response = requests.post('http://localhost:5000/predict/both-base64', json=data)
result = response.json()
print(result)</code></pre>
            </div>
            
            <h2>🧪 Test the API</h2>
            <form action="/predict/both" method="post" enctype="multipart/form-data" style="margin: 20px 0;">
                <input type="file" name="image" accept="image/*" required style="margin: 10px 0;">
                <br>
                <button type="submit" style="background: #3498db; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">
                    Upload & Analyze Image
                </button>
            </form>
        </div>
    </body>
    </html>
    """
    
    return render_template_string(
        html_template,
        issue_loaded=issue_model_loaded,
        category_loaded=category_model_loaded,
        category_count=len(CATEGORY_CLASS_NAMES)
    )

@app.route('/status')
def status():
    """API status endpoint"""
    return jsonify({
        'api_status': 'running',
        'models': {
            'issue_detection': {
                'loaded': issue_model_loaded,
                'classes': ISSUE_CLASS_NAMES
            },
            'category_classification': {
                'loaded': category_model_loaded,
                'classes': CATEGORY_CLASS_NAMES
            }
        },
        'endpoints': [
            '/predict/issue',
            '/predict/category', 
            '/predict/both',
            '/predict/issue-base64',
            '/predict/category-base64',
            '/predict/both-base64'
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
        img_batch = preprocess_image(image_data['image'])
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

@app.route('/predict/category', methods=['POST'])
def predict_category_endpoint():
    """Category classification endpoint (file upload)"""
    
    if not category_model_loaded:
        return jsonify({
            'success': False,
            'error': 'Category classification model not loaded',
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
        img_batch = preprocess_image(image_data['image'])
        if img_batch is None:
            return jsonify({
                'success': False,
                'error': 'Error preprocessing image',
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 400
        
        # Make prediction
        prediction = predict_category(img_batch)
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
            'prediction_type': 'category_classification',
            **prediction,
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        logger.info(f"Category prediction: {prediction['predicted_class']} ({prediction['confidence']:.1%})")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in category prediction endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }), 500

@app.route('/predict/both', methods=['POST'])
def predict_both_endpoint():
    """Combined prediction endpoint (file upload)"""
    
    if not issue_model_loaded and not category_model_loaded:
        return jsonify({
            'success': False,
            'error': 'No models loaded',
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
        img_batch = preprocess_image(image_data['image'])
        if img_batch is None:
            return jsonify({
                'success': False,
                'error': 'Error preprocessing image',
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 400
        
        # Make predictions
        predictions = {}
        
        if issue_model_loaded:
            issue_pred = predict_issue(img_batch)
            if issue_pred:
                predictions['issue_detection'] = issue_pred
            else:
                predictions['issue_detection'] = {'error': 'Issue prediction failed'}
        else:
            predictions['issue_detection'] = {'error': 'Issue model not loaded'}
        
        if category_model_loaded:
            category_pred = predict_category(img_batch)
            if category_pred:
                predictions['category_classification'] = category_pred
            else:
                predictions['category_classification'] = {'error': 'Category prediction failed'}
        else:
            predictions['category_classification'] = {'error': 'Category model not loaded'}
        
        # Return response
        response = {
            'success': True,
            'filename': image_data['filename'],
            'prediction_type': 'combined',
            'predictions': predictions,
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        logger.info(f"Combined prediction completed for {image_data['filename']}")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in combined prediction endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }), 500

# Base64 endpoints
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
        img_batch = preprocess_image(image_data['image'])
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

@app.route('/predict/category-base64', methods=['POST'])
def predict_category_base64():
    """Category classification with base64 input"""
    
    if not category_model_loaded:
        return jsonify({
            'success': False,
            'error': 'Category classification model not loaded',
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
        img_batch = preprocess_image(image_data['image'])
        if img_batch is None:
            return jsonify({
                'success': False,
                'error': 'Error preprocessing image',
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 400
        
        prediction = predict_category(img_batch)
        if prediction is None:
            return jsonify({
                'success': False,
                'error': 'Error making prediction',
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 500
        
        return jsonify({
            'success': True,
            'prediction_type': 'category_classification',
            **prediction,
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
        
    except Exception as e:
        logger.error(f"Error in category base64 endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }), 500

@app.route('/predict/both-base64', methods=['POST'])
def predict_both_base64():
    """Combined prediction with base64 input"""
    
    if not issue_model_loaded and not category_model_loaded:
        return jsonify({
            'success': False,
            'error': 'No models loaded',
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
        
        # Preprocess image
        img_batch = preprocess_image(image_data['image'])
        if img_batch is None:
            return jsonify({
                'success': False,
                'error': 'Error preprocessing image',
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 400
        
        # Make predictions
        predictions = {}
        
        if issue_model_loaded:
            issue_pred = predict_issue(img_batch)
            predictions['issue_detection'] = issue_pred if issue_pred else {'error': 'Issue prediction failed'}
        else:
            predictions['issue_detection'] = {'error': 'Issue model not loaded'}
        
        if category_model_loaded:
            category_pred = predict_category(img_batch)
            predictions['category_classification'] = category_pred if category_pred else {'error': 'Category prediction failed'}
        else:
            predictions['category_classification'] = {'error': 'Category model not loaded'}
        
        return jsonify({
            'success': True,
            'prediction_type': 'combined',
            'predictions': predictions,
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
        
    except Exception as e:
        logger.error(f"Error in combined base64 endpoint: {str(e)}")
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
            'POST /predict/issue',
            'POST /predict/category',
            'POST /predict/both',
            'POST /predict/issue-base64',
            'POST /predict/category-base64',
            'POST /predict/both-base64'
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
    
    print("🚀 CIVIC AI CLASSIFICATION API")
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
    
    if category_model_loaded:
        print("  ✅ Category Classification Model: Loaded") 
        print(f"     Classes: {', '.join(CATEGORY_CLASS_NAMES)}")
    else:
        print("  ❌ Category Classification Model: Not Loaded")
        print("     Please ensure model files exist:")
        print("     - civic_classifier.h5")
        print("     - models/civic_classifier_quantized.tflite")
    
    print("\n🌐 STARTING SERVER...")
    print("📱 API Documentation: http://localhost:5000")
    print("📊 Status Check: http://localhost:5000/status")
    print("\n🔗 AVAILABLE ENDPOINTS:")
    print("  • POST /predict/issue        - Detect civic issues")
    print("  • POST /predict/category     - Classify civic categories")
    print("  • POST /predict/both         - Run both predictions")
    print("  • POST /predict/*-base64     - Base64 image versions")
    
    if issue_model_loaded or category_model_loaded:
        print("\n⭐ Server ready! At least one model is loaded.")
    else:
        print("\n⚠️  Warning: No models loaded. Please check model files.")
    
    print("=" * 60)
    
    # Run the Flask app
    app.run(
        host='0.0.0.0',  # Allow external connections
        port=1200,       # Port number
        debug=True       # Enable debug mode (remove in production)
    )