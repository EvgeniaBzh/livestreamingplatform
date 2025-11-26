FROM python:3.11-slim-bullseye

# Set working directory
WORKDIR /usr/src/app

# Install system dependencies in one layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    python3-dev \
    build-essential \
    ca-certificates \
    apt-transport-https && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy files
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install additional dependency
RUN pip install -q -U google-genai

# Copy your application file
COPY gemini.py .

# Expose the Flask port
EXPOSE 5001

# Run the app
CMD ["python3", "gemini.py"]
