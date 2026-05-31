from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import traceback
import os
import tempfile
import subprocess
import json
from google import genai
import metrics_logger   # ← логер метрик
import base64

app = Flask(__name__)
CORS(app)

API_KEY = os.environ.get("GENAI_API_KEY")
print("--- VISION+AUDIO SERVER READY ---")
print(f"[INFO] Metrics will be saved to: {metrics_logger.get_metrics_path()}")


def extract_clip(video_path, timestamp, duration=5):
    tmp = tempfile.NamedTemporaryFile(suffix='.mp4', delete=False)
    tmp.close()
    start = max(0, timestamp - 2)
    subprocess.run([
        'ffmpeg', '-y', '-ss', str(start),
        '-i', video_path, '-t', str(duration),
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-strict', 'experimental',
        tmp.name
    ], capture_output=True)
    return tmp.name


@app.route('/analyze_frame', methods=['POST'])
def analyze_frame():
    data = request.get_json(force=True)
    v_id = data.get('videoId')
    video_path = f"/usr/src/app/videos_mp4/{v_id}.mp4"
    
    print(f"[DEBUG] videoId received: {v_id}")
    print(f"[DEBUG] Looking for: {video_path}")
    try:
        files = os.listdir('/usr/src/app/videos_mp4/')
        print(f"[DEBUG] Files in dir: {files}")
    except Exception as e:
        print(f"[DEBUG] Cannot list dir: {e}")
    clip_path = None
    v_id = "unknown"
    mode = "baseline"
    try:
        data = request.get_json(force=True)
        v_id = data.get('videoId')
        timestamp = data.get('timestamp', 0)
        mode = data.get('mode', 'baseline')
        
        # ВИПРАВЛЕНО: Використовуємо шлях, який бачить Docker контейнер
        video_path = f"/usr/src/app/videos_mp4/{v_id}.mp4"

        if not os.path.exists(video_path):
            # Логуємо помилку навіть якщо файл не знайдено
            metrics_logger.log(mode=mode, endpoint="analyze_frame", note=f"ERR: File {v_id}.mp4 not found")
            return jsonify({"error": f"File {v_id}.mp4 not found at {video_path}"}), 404

        clip_path = extract_clip(video_path, timestamp)
        client = genai.Client(api_key=API_KEY)

        with open(clip_path, 'rb') as f:
            video_bytes = f.read()

        with metrics_logger.timer() as t:
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[
                    {"inline_data": {"mime_type": "video/mp4", "data": base64.b64encode(video_bytes).decode()}},
                    "Analyze this stream clip. Respond ONLY in valid JSON: {\"action\": \"...\", \"speech\": \"...\", \"summary\": \"...\"}"
                ]
            )

        metrics_logger.log(
            mode=mode, 
            endpoint="analyze_frame", 
            response=response,
            latency_ms=t.ms, 
            video_id=v_id, 
            triggered=(mode == 'smart'),
            note=f"t={timestamp}s"
        )

        raw_text = response.text.strip().replace('```json', '').replace('```', '').strip()
        result = json.loads(raw_text)

        return jsonify({
            "full_description": result.get('summary', ''),
            "label": result.get('action', ''),
            "speech_content": result.get('speech', ''),
            "timestamp": timestamp,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if clip_path and os.path.exists(clip_path): os.unlink(clip_path)


@app.route('/generate_summary', methods=['POST'])
def generate_summary():
    try:
        data = request.get_json(force=True)
        analysis_data = data.get('data', [])
        video_id = data.get('videoId', 'unknown')
        
        if not analysis_data:
            return jsonify({"error": "No data provided"}), 400

        # ── Фільтрація сміття ────────────────────────────────────────────────
        SKIP_PHRASES = [
            "no action", "no speech", "no audio", "static", "advertisement",
            "sponsor", "discount", "promo", "mypillow", "all family pharmacy",
            "covepure", "birch gold", "rumble wallet", "angelpace",
            "30% off", "free shipping", "coupon code", "rsbn", "right side broadcasting",
            "news anchor is", "the man in the video is talking about",
            "the clip shows a news", "the speaker is advertising",
            "a news anchor promotes", "the presenter is advertising",
        ]

        def is_interesting(item):
            action = item.get('action') or item.get('label') or item.get('video_summary') or ''
            if isinstance(action, list): action = ' '.join(str(x) for x in action)
            action = str(action).lower()

            speech = item.get('speech') or item.get('speech_content') or item.get('video_speech') or ''
            if isinstance(speech, list): speech = ' '.join(str(x) for x in speech)
            speech = str(speech).lower()

            combined = action + ' ' + speech
            if any(phrase in combined for phrase in SKIP_PHRASES):
                return False
            if len(action.strip()) < 20:
                return False
            return True

        filtered = [item for item in analysis_data if is_interesting(item)]

        # Якщо після фільтрації мало — беремо оригінал
        if len(filtered) < 10:
            filtered = analysis_data

        # Обмежуємо до 80 найбільш рівномірно розподілених записів
        if len(filtered) > 80:
            step = len(filtered) / 80
            filtered = [filtered[int(i * step)] for i in range(80)]

        # ── Формуємо текстовий блок ──────────────────────────────────────────
        full_text_blob = ""
        for item in filtered:
            t = item.get('time') or item.get('timestamp', 0)
            # Конвертуємо секунди в MM:SS
            try:
                t_int = int(float(t))
                time_str = f"{t_int // 60:02d}:{t_int % 60:02d}"
            except:
                time_str = str(t)
            
            act = item.get('action') or item.get('label') or item.get('video_summary') or ''
            sp  = item.get('speech') or item.get('speech_content') or item.get('video_speech') or ''
            
            line = f"[{time_str}] {act}"
            if sp and sp not in ('...', 'no speech', 'No speech detected.', 'none', 'None'):
                line += f' | "{sp}"'
            full_text_blob += line + "\n"

        client = genai.Client(api_key=API_KEY)

        prompt = f"""You are creating a highlight reel summary of a livestream recording.

Below is a timeline of what happened (pre-filtered to remove ads and boring moments):

{full_text_blob}

Write a summary in this EXACT format:

[Stream title — specific, include streamer name and event type]
[1 sentence: what this stream was about overall]

[MM:SS] - [What happened — specific, vivid, 1 sentence. Include quotes if interesting.]
[MM:SS] - ...

Rules:
- Choose the 10-15 MOST interesting and significant moments only
- Prioritize: dramatic moments, announcements, funny moments, crowd reactions, key speeches
- Skip anything that looks like an ad, filler, or repetitive news anchor commentary
- Each moment: 1 sentence, specific details, avoid vague phrases like "a man is speaking"
- Fix any broken timestamps — use proper MM:SS format
- Write in English, no markdown, no bullet points

Return ONLY the formatted text, nothing else."""

        with metrics_logger.timer() as t:
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt
            )

        metrics_logger.log(
            mode="baseline",
            endpoint="generate_summary",
            response=response,
            latency_ms=t.ms,
            video_id=video_id,
            note=f"frames={len(analysis_data)}, filtered={len(filtered)}",
        )

        return jsonify({"summary": response.text.strip()})

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=False, use_reloader=False)