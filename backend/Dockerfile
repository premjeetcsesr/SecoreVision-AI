# Production Dockerfile for SecureVision AI Backend
FROM python:3.11-slim

WORKDIR /app

# Prevent Python from writing .pyc files & buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Expose port (Cloud providers map $PORT dynamically)
EXPOSE 8000

# Start Uvicorn ASGI server
CMD ["python", "run.py"]
