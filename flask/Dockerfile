# Use Python 3.11 slim image (TensorFlow compatible)
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    wget \
    curl \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip first (important for TensorFlow wheels)
RUN pip install --upgrade pip setuptools wheel

# Copy requirements first (leverage caching)
COPY requirements.txt .

# Install lightweight deps separately (faster builds)
RUN pip install Pillow opencv-python-headless psutil

# Install requirements (TensorFlow, scikit-learn, etc.)
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the app
COPY . .

# Expose port (Render/Heroku uses $PORT)
ENV PORT=10000

# Run gunicorn on startup
CMD ["gunicorn", "combined_server:app", "--bind", "0.0.0.0:10000", "--workers", "2", "--timeout", "120"]
