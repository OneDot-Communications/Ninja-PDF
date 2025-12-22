# Root-level Dockerfile (builds Django backend only)

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies REQUIRED for pycairo/xhtml2pdf
RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libopenjp2-7-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy only backend requirements
COPY backend/requirements.txt ./requirements.txt

# Install Python dependencies + gunicorn
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy ONLY backend folder into container
COPY backend/ /app/

# Heroku PORT
ENV PORT=8000

# Run Django API with gunicorn
CMD gunicorn core.wsgi:application --bind 0.0.0.0:$PORT
