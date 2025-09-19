# Use Python 3.11 slim image (TensorFlow compatible)
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (basic build tools + wget)
RUN apt-get update && apt-get install -y \
    build-essential \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install Pillow
RUN pip install -r requirements.txt

# Copy app and models
COPY . .

# Expose port (Render uses $PORT)
ENV PORT=10000
# Run gunicorn on startup
CMD ["gunicorn", "combined_server:app", "--bind", "0.0.0.0:10000", "--workers", "2", "--timeout", "120"]
