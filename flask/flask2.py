# ================================================================================
# FLASK API FOR CIVIC CATEGORIES IMAGE CLASSIFICATION
# Simple REST API for image classification
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

# Model configuration
MODEL_PATH = 'civic_classifier.h5'
IMG_SIZE = (224, 224)

# Class names - same as training
CLASS_NAMES = [
    'drainage_system',
    'garbage_bin',
    'park', 
    'parking_area',
    'road',
    'sidewalk_path',
    'street_lights'
]

# Global model variable
model = None

# ================================================================================
# MODEL LOADING
# ================================================================================

def load_model():
    """Load the trained model"""
    global model
    try:
        if os.path.exists(MODEL_PATH):
            model = tf.keras.models.load_model(MODEL_PATH)
            logger.info(f"✅ Model loaded successfully from {MODEL_PATH}")
            return True
        else:
            logger.error(f"❌ Model file not found: {MODEL_PATH}")
            return False
    except Exception as e:
        logger.error(f"❌ Error loading model: {str(e)}")
        return False

# Load model when app starts
model_loaded = load_model()

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
        img_batch = np.expand_dims(img_array, axis=0)
        
        return img_batch
    except Exception as e:
        logger.error(f"Error preprocessing image: {str(e)}")
        return None

def make_prediction(img_batch):
    """Make prediction on preprocessed image"""
    try:
        if model is None:
            return None
        
        # Get prediction
        predictions = model.predict(img_batch, verbose=0)
        pred_probs = predictions[0]
        
        # Get predicted class
        predicted_class_idx = np.argmax(pred_probs)
        predicted_class = CLASS_NAMES[predicted_class_idx]
        confidence = float(pred_probs[predicted_class_idx])
        
        # Get top 3 predictions
        top_3_idx = np.argsort(pred_probs)[-3:][::-1]
        top_3_predictions = []
        for idx in top_3_idx:
            top_3_predictions.append({
                'class': CLASS_NAMES[idx],
                'confidence': float(pred_probs[idx])
            })
        
        # Get all probabilities
        all_probabilities = {}
        for i, class_name in enumerate(CLASS_NAMES):
            all_probabilities[class_name] = float(pred_probs[i])
        
        return {
            'predicted_class': predicted_class,
            'confidence': confidence,
            'top_3_predictions': top_3_predictions,
            'all_probabilities': all_probabilities
        }
    except Exception as e:
        logger.error(f"Error making prediction: {str(e)}")
        return None

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
        <title>Civic Categories Image Classification API</title>
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
            .classes { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 15px 0; }
            .class-item { background: #3498db; color: white; padding: 10px; border-radius: 5px; text-align: center; }
            .status { padding: 10px; border-radius: 5px; margin: 20px 0; }
            .status.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            .status.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🏗️ Civic Categories Image Classification API</h1>
            
            <div class="status {{ 'success' if model_loaded else 'error' }}">
                <strong>Model Status:</strong> {{ '✅ Loaded Successfully' if model_loaded else '❌ Model Not Loaded' }}
            </div>
            
            <h2>📋 Available Classes</h2>
            <div class="classes">
                {% for class_name in class_names %}
                <div class="class-item">{{ class_name.replace('_', ' ').title() }}</div>
                {% endfor %}
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
                <span class="method post">POST</span> <code>/predict</code>
                <p>Classify an image</p>
                <strong>Parameters:</strong>
                <ul>
                    <li><code>image</code> - Image file (JPG, PNG, etc.)</li>
                </ul>
            </div>
            
            <div class="endpoint">
                <span class="method post">POST</span> <code>/predict-base64</code>
                <p>Classify base64 encoded image</p>
                <strong>JSON Body:</strong>
                <ul>
                    <li><code>image_base64</code> - Base64 encoded image string</li>
                </ul>
            </div>
            
            <h2>💻 Usage Examples</h2>
            
            <div class="example">
                <strong>Using cURL (File Upload):</strong><br>
                <code>curl -X POST -F "image=@test_image.jpg" http://localhost:5000/predict</code>
            </div>
            
            <div class="example">
                <strong>Using Python requests:</strong><br>
                <pre><code>import requests

# File upload
files = {'image': open('test_image.jpg', 'rb')}
response = requests.post('http://localhost:5000/predict', files=files)
result = response.json()
print(result)</code></pre>
            </div>
            
            <div class="example">
                <strong>Expected Response:</strong><br>
                <pre><code>{
  "success": true,
  "predicted_class": "garbage_bin",
  "confidence": 0.875,
  "top_3_predictions": [
    {"class": "garbage_bin", "confidence": 0.875},
    {"class": "street_lights", "confidence": 0.082},
    {"class": "road", "confidence": 0.021}
  ],
  "all_probabilities": {...},
  "timestamp": "2024-01-01 12:00:00"
}</code></pre>
            </div>
            
            <h2>🧪 Test the API</h2>
            <form action="/predict" method="post" enctype="multipart/form-data" style="margin: 20px 0;">
                <input type="file" name="image" accept="image/*" required style="margin: 10px 0;">
                <br>
                <button type="submit" style="background: #3498db; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">
                    Upload & Classify Image
                </button>
            </form>
        </div>
    </body>
    </html>
    """
    
    return render_template_string(html_template, 
                                model_loaded=model_loaded, 
                                class_names=CLASS_NAMES)

@app.route('/status')
def status():
    """API status endpoint"""
    return jsonify({
        'api_status': 'running',
        'model_loaded': model_loaded,
        'model_path': MODEL_PATH,
        'classes': CLASS_NAMES,
        'total_classes': len(CLASS_NAMES),
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    })

@app.route('/predict', methods=['POST'])
def predict():
    """Image classification endpoint (file upload)"""
    
    if not model_loaded:
        return jsonify({
            'success': False,
            'error': 'Model not loaded',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }), 500
    
    try:
        # Check if image is present in request
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No image file provided',
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 400
        
        file = request.files['image']
        
        # Check if file is selected
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No image file selected',
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 400
        
        # Load and preprocess image
        image = Image.open(file.stream)
        img_batch = preprocess_image(image)
        
        if img_batch is None:
            return jsonify({
                'success': False,
                'error': 'Error preprocessing image',
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 400
        
        # Make prediction
        prediction = make_prediction(img_batch)
        
        if prediction is None:
            return jsonify({
                'success': False,
                'error': 'Error making prediction',
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 500
        
        # Return successful response
        response = {
            'success': True,
            'filename': file.filename,
            'predicted_class': prediction['predicted_class'],
            'confidence': prediction['confidence'],
            'confidence_percentage': f"{prediction['confidence']:.1%}",
            'top_3_predictions': prediction['top_3_predictions'],
            'all_probabilities': prediction['all_probabilities'],
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        logger.info(f"Prediction made for {file.filename}: {prediction['predicted_class']} ({prediction['confidence']:.1%})")
        
        return jsonify(response)
    
    except Exception as e:
        logger.error(f"Error in predict endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }), 500

@app.route('/predict-base64', methods=['POST'])
def predict_base64():
    """Image classification endpoint (base64 encoded)"""
    
    if not model_loaded:
        return jsonify({
            'success': False,
            'error': 'Model not loaded',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }), 500
    
    try:
        # Get JSON data
        data = request.get_json()
        
        if not data or 'image_base64' not in data:
            return jsonify({
                'success': False,
                'error': 'No base64 image data provided',
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 400
        
        # Decode base64 image
        image_base64 = data['image_base64']
        
        # Remove data URL prefix if present
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        
        # Decode base64
        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data))
        
        # Preprocess image
        img_batch = preprocess_image(image)
        
        if img_batch is None:
            return jsonify({
                'success': False,
                'error': 'Error preprocessing image',
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 400
        
        # Make prediction
        prediction = make_prediction(img_batch)
        
        if prediction is None:
            return jsonify({
                'success': False,
                'error': 'Error making prediction',
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 500
        
        # Return successful response
        response = {
            'success': True,
            'predicted_class': prediction['predicted_class'],
            'confidence': prediction['confidence'],
            'confidence_percentage': f"{prediction['confidence']:.1%}",
            'top_3_predictions': prediction['top_3_predictions'],
            'all_probabilities': prediction['all_probabilities'],
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        logger.info(f"Base64 prediction made: {prediction['predicted_class']} ({prediction['confidence']:.1%})")
        
        return jsonify(response)
    
    except Exception as e:
        logger.error(f"Error in predict-base64 endpoint: {str(e)}")
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
        'available_endpoints': ['/', '/status', '/predict', '/predict-base64'],
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error',
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }), 500

# ================================================================================
# MAIN FUNCTION
# ================================================================================

if __name__ == '__main__':
    print("🚀 CIVIC CATEGORIES IMAGE CLASSIFICATION API")
    print("=" * 60)
    
    if model_loaded:
        print("✅ Model loaded successfully!")
        print(f"📂 Model path: {MODEL_PATH}")
        print(f"🎯 Classes: {', '.join(CLASS_NAMES)}")
        print(f"📊 Total classes: {len(CLASS_NAMES)}")
    else:
        print("❌ Model loading failed!")
        print(f"Please ensure '{MODEL_PATH}' exists in the current directory")
    
    print("\n🌐 Starting Flask server...")
    print("📱 API Documentation: http://localhost:5000")
    print("🧪 Test endpoint: http://localhost:5000/predict")
    print("📊 Status check: http://localhost:5000/status")
    print("\n⭐ Ready to classify civic images!")
    
    # Run the Flask app
    app.run(
        host='0.0.0.0',  # Allow external connections
        port=5000,       # Port number
        debug=True       # Enable debug mode
    )