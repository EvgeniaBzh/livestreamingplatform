FROM python:3.11-slim-bullseye

WORKDIR /usr/src/app

# Встановлюємо системні залежності + ffmpeg для Whisper
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    python3-dev \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    ffmpeg \
    ca-certificates \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install -q -U google-genai

COPY . .
RUN chmod +x start_all.sh

EXPOSE 5001
EXPOSE 5002

CMD ["./start_all.sh"]