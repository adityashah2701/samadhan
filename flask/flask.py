# Flask API for Civic Issue Classification
# app.py

from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
from tensorflow import keras
import numpy as np
from PIL import Image
import io
import base64
import os
from datetime import datetime
import logging

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables
model = None
class_names = ['issue', 'no_issue']
input_size = (224, 224)

# ============================================================================
# Model Loading Functions
# ============================================================================

def load_model():
    """Load the trained model"""
    global model
    
    try:
        # Try loading Keras model first
        model_path = 'best_civic_model.h5'
        if os.path.exists(model_path):
            model = keras.models.load_model(model_path)
            logger.info(f"✅ Keras model loaded successfully from {model_path}")
            return True
            
        # Fallback to TFLite model
        tflite_path = 'civic_issue_classifier.tflite'
        if os.path.exists(tflite_path):
            model = tf.lite.Interpreter(model_path=tflite_path)
            model.allocate_tensors()
            logger.info(f"✅ TFLite model loaded successfully from {tflite_path}")
            return True
            
        logger.error("❌ No model file found. Please ensure model files exist.")
        return False
        
    except Exception as e:
        logger.error(f"❌ Error loading model: {str(e)}")
        return False

def preprocess_image(image_file):
    """Preprocess image for prediction"""
    try:
        # Open and convert image
        image = Image.open(image_file).convert('RGB')
        
        # Resize to model input size
        image = image.resize(input_size)
        
        # Convert to numpy array and normalize
        img_array = np.array(image) / 255.0
        img_array = np.expand_dims(img_array, axis=0).astype(np.float32)
        
        return img_array, None
        
    except Exception as e:
        return None, str(e)

def predict_image(img_array):
    """Make prediction using the loaded model"""
    try:
        if isinstance(model, tf.lite.Interpreter):
            # TFLite prediction
            input_details = model.get_input_details()
            output_details = model.get_output_details()
            
            model.set_tensor(input_details[0]['index'], img_array)
            model.invoke()
            predictions = model.get_tensor(output_details[0]['index'])[0]
            
        else:
            # Keras prediction
            predictions = model.predict(img_array, verbose=0)[0]
        
        # Get results
        predicted_class_idx = np.argmax(predictions)
        predicted_class = class_names[predicted_class_idx]
        confidence = float(np.max(predictions))
        
        # Create probabilities dictionary
        probabilities = {
            class_name: float(prob) 
            for class_name, prob in zip(class_names, predictions)
        }
        
        return {
            'success': True,
            'predicted_class': predicted_class,
            'confidence': confidence,
            'is_issue': predicted_class == 'issue',
            'probabilities': probabilities,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

# ============================================================================
# API Routes
# ============================================================================

@app.route('/', methods=['GET'])
def home():
    """Health check endpoint"""
    return jsonify({
        'status': 'Civic Issue Classifier API is running',
        'model_loaded': model is not None,
        'endpoints': {
            'POST /predict': 'Upload image for classification',
            'POST /predict_base64': 'Send base64 encoded image for classification',
            'GET /health': 'Health check',
            'GET /info': 'API information'
        },
        'timestamp': datetime.now().isoformat()
    })

@app.route('/health', methods=['GET'])
def health_check():
    """Detailed health check"""
    return jsonify({
        'status': 'healthy' if model is not None else 'unhealthy',
        'model_loaded': model is not None,
        'model_type': 'TFLite' if isinstance(model, tf.lite.Interpreter) else 'Keras',
        'class_names': class_names,
        'input_size': input_size,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/info', methods=['GET'])
def api_info():
    """API information and usage instructions"""
    return jsonify({
        'api_name': 'Civic Issue Classifier API',
        'version': '1.0.0',
        'description': 'API for classifying civic issues in images',
        'classes': class_names,
        'input_requirements': {
            'image_formats': ['JPEG', 'PNG', 'JPG'],
            'max_file_size': '10MB',
            'recommended_size': '224x224 pixels'
        },
        'usage_examples': {
            'curl_file_upload': 'curl -X POST -F "image=@your_image.jpg" http://localhost:5000/predict',
            'curl_base64': 'curl -X POST -H "Content-Type: application/json" -d \'{"image": "base64_encoded_string"}\' http://localhost:5000/predict_base64'
        },
        'response_format': {
            'success': 'boolean',
            'predicted_class': 'issue or no_issue',
            'confidence': 'float between 0 and 1',
            'is_issue': 'boolean',
            'probabilities': 'dict with class probabilities',
            'timestamp': 'ISO formatted timestamp'
        }
    })

@app.route('/predict', methods=['POST'])
def predict():
    """Main prediction endpoint - accepts file upload"""
    try:
        # Check if model is loaded
        if model is None:
            return jsonify({
                'success': False,
                'error': 'Model not loaded. Please check server logs.',
                'timestamp': datetime.now().isoformat()
            }), 500
        
        # Check if image file is present
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No image file provided. Please upload an image using the "image" field.',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        image_file = request.files['image']
        
        # Check if file is selected
        if image_file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg'}
        if not ('.' in image_file.filename and 
                image_file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
            return jsonify({
                'success': False,
                'error': f'Invalid file type. Allowed: {", ".join(allowed_extensions)}',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        # Preprocess image
        img_array, error = preprocess_image(image_file)
        if error:
            return jsonify({
                'success': False,
                'error': f'Image preprocessing failed: {error}',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        # Make prediction
        result = predict_image(img_array)
        
        if result['success']:
            logger.info(f"Prediction successful: {result['predicted_class']} ({result['confidence']:.3f})")
            return jsonify(result)
        else:
            logger.error(f"Prediction failed: {result['error']}")
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"Unexpected error in predict endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/predict_base64', methods=['POST'])
def predict_base64():
    """Prediction endpoint for base64 encoded images"""
    try:
        # Check if model is loaded
        if model is None:
            return jsonify({
                'success': False,
                'error': 'Model not loaded',
                'timestamp': datetime.now().isoformat()
            }), 500
        
        # Get JSON data
        if not request.is_json:
            return jsonify({
                'success': False,
                'error': 'Request must be JSON with "image" field containing base64 string',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        data = request.get_json()
        
        if 'image' not in data:
            return jsonify({
                'success': False,
                'error': 'No "image" field in JSON data',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        # Decode base64 image
        try:
            image_data = base64.b64decode(data['image'])
            image_file = io.BytesIO(image_data)
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Invalid base64 image data: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        # Preprocess image
        img_array, error = preprocess_image(image_file)
        if error:
            return jsonify({
                'success': False,
                'error': f'Image preprocessing failed: {error}',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        # Make prediction
        result = predict_image(img_array)
        
        if result['success']:
            logger.info(f"Base64 prediction successful: {result['predicted_class']} ({result['confidence']:.3f})")
            return jsonify(result)
        else:
            logger.error(f"Base64 prediction failed: {result['error']}")
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"Unexpected error in predict_base64 endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/batch_predict', methods=['POST'])
def batch_predict():
    """Batch prediction endpoint for multiple images"""
    try:
        if model is None:
            return jsonify({
                'success': False,
                'error': 'Model not loaded',
                'timestamp': datetime.now().isoformat()
            }), 500
        
        # Check for multiple files
        if 'images' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No images provided. Use "images" field for multiple files.',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        files = request.files.getlist('images')
        
        if len(files) == 0:
            return jsonify({
                'success': False,
                'error': 'No files selected',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        results = []
        
        for i, file in enumerate(files):
            try:
                # Preprocess image
                img_array, error = preprocess_image(file)
                if error:
                    results.append({
                        'file_index': i,
                        'filename': file.filename,
                        'success': False,
                        'error': f'Preprocessing failed: {error}'
                    })
                    continue
                
                # Make prediction
                result = predict_image(img_array)
                result['file_index'] = i
                result['filename'] = file.filename
                results.append(result)
                
            except Exception as e:
                results.append({
                    'file_index': i,
                    'filename': file.filename,
                    'success': False,
                    'error': str(e)
                })
        
        return jsonify({
            'batch_success': True,
            'total_files': len(files),
            'successful_predictions': sum(1 for r in results if r.get('success', False)),
            'results': results,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Batch prediction error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Batch prediction failed: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }), 500

# ============================================================================
# Error Handlers
# ============================================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found',
        'available_endpoints': [
            'GET /',
            'GET /health', 
            'GET /info',
            'POST /predict',
            'POST /predict_base64',
            'POST /batch_predict'
        ],
        'timestamp': datetime.now().isoformat()
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error',
        'timestamp': datetime.now().isoformat()
    }), 500

@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({
        'success': False,
        'error': 'File too large. Maximum size is 10MB.',
        'timestamp': datetime.now().isoformat()
    }), 413

# ============================================================================
# Application Startup
# ============================================================================

def initialize_app():
    """Initialize the application"""
    logger.info("🚀 Starting Civic Issue Classifier API...")
    
    # Load model
    if load_model():
        logger.info("✅ Application initialized successfully!")
        return True
    else:
        logger.error("❌ Failed to initialize application - model loading failed")
        return False

if __name__ == '__main__':
    # Set maximum file size (10MB)
    app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024
    
    # Initialize app
    if initialize_app():
        print("\n" + "="*60)
        print("🏛️  CIVIC ISSUE CLASSIFIER API")
        print("="*60)
        print("✅ Server Status: Ready")
        print("🔗 API Endpoints:")
        print("   • POST /predict        - Upload image file")
        print("   • POST /predict_base64 - Send base64 image")
        print("   • POST /batch_predict  - Multiple images")
        print("   • GET  /health         - Health check")
        print("   • GET  /info           - API information")
        print("📍 Server URL: http://localhost:5000")
        print("="*60)
        
        # Start Flask server
        app.run(
            host='0.0.0.0',  # Accept connections from any IP
            port=5000,
            debug=True,      # Remove in production
            threaded=True    # Handle multiple requests
        )
    else:
        print("❌ Failed to start server - check model files")
        print("Required files: 'best_civic_model.h5' or 'civic_issue_classifier.tflite'")