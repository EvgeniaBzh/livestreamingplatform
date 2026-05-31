from google import genai
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import traceback
import metrics_logger   # ← логер метрик

app = Flask(__name__)
CORS(app)

API_KEY = os.getenv('GENAI_API_KEY')
print(f"[INFO] Metrics will be saved to: {metrics_logger.get_metrics_path()}")


# ==================== HELPERS ====================

def format_messages(chat_messages, data):
    messages = ""

    if chat_messages and len(chat_messages) > 0:
        first_message = chat_messages[0]

        # ARCHIVE mode: Firebase format {author: {name: ""}, message: ""}
        if 'message' in first_message and isinstance(first_message.get('author'), dict):
            print("Detected ARCHIVE mode (Firebase format)")
            for msg in chat_messages:
                author_name = msg.get('author', {}).get('name', 'Unknown User')
                message_text = msg.get('message', '')
                if message_text:
                    messages += f"{author_name}: {message_text}\n"

        # FIRESTORE mode: {author: "@username", message: "text"}
        elif 'message' in first_message and isinstance(first_message.get('author'), str):
            print("Detected FIRESTORE mode (author string + message field)")
            for msg in chat_messages:
                author = msg.get('author', 'Unknown User')
                text = msg.get('message', '')
                if text:
                    messages += f"{author}: {text}\n"

        # LIVE mode: YouTube API format {author: "", text: ""}
        elif 'text' in first_message and isinstance(first_message.get('author'), str):
            print("Detected LIVE mode (YouTube API format)")
            for msg in chat_messages:
                author = msg.get('author', 'Unknown User')
                text = msg.get('text', '')
                if text:
                    messages += f"{author}: {text}\n"

        else:
            print("Unknown message format")
            for msg in chat_messages:
                author = msg.get('author', 'Unknown User')
                if isinstance(author, dict):
                    author = author.get('name', 'Unknown User')
                text = msg.get('message', '') or msg.get('text', '')
                if text:
                    messages += f"{author}: {text}\n"

    return messages


def get_title_and_description(data):
    title = data.get("videoTitle")
    description = data.get("videoDescription")
    if not title:
        title = data.get("chat_title", "No title provided")
    if not description:
        description = data.get("chat_description", "No description provided")
    return title, description


# ==================== EXISTING ENDPOINTS ====================

@app.route('/generate_summary', methods=['POST'])
def generate_summary():
    try:
        data = request.get_json(force=True)
        analysis_data = data.get('data', [])
        video_id = data.get('videoId', 'unknown')
        mode = data.get('mode', 'baseline')

        if not analysis_data:
            return jsonify({"error": "No analysis data provided"}), 400

        timeline_items = []
        for item in analysis_data:
            time = item.get('timestamp') or item.get('time', 0)
            minutes = int(time) // 60
            seconds = int(time) % 60
            time_str = f"{minutes:02d}:{seconds:02d}"

            if mode == 'smart':
                score = item.get('score', 0)
                insight = item.get('insight', '')
                video_summary = item.get('video_summary', '')
                speech = item.get('video_speech', '')

                line = f"[{time_str}] (score={score:.2f}) {video_summary}"
                if speech and speech not in ("No speech detected.", "...", ""):
                    line += f' | Speech: "{speech}"'
                if insight:
                    line += f'\n  → Chat reaction: {insight}'
            else:
                action = item.get('action', '') or item.get('label', '')
                speech = item.get('speech', '') or item.get('speech_content', '')
                line = f"[{time_str}] {action}"
                if speech and speech != "No speech detected.":
                    line += f' | "{speech}"'

            timeline_items.append((time, line))

        timeline_items.sort(key=lambda x: x[0])
        timeline_text = "\n".join(line for _, line in timeline_items)

        if not timeline_text.strip():
            return jsonify({"error": "Timeline is empty after parsing"}), 400

        if mode == 'smart':
            scored = sorted(analysis_data, key=lambda x: x.get('score', 0), reverse=True)
            top_n = max(3, len(scored) // 5)
            top_timestamps = {item.get('timestamp') for item in scored[:top_n]}
            filtered_items = [
                (t, line) for t, line in timeline_items
                if t in top_timestamps
            ]
            filtered_items.sort(key=lambda x: x[0])
            timeline_text = "\n".join(line for _, line in filtered_items)

        client = genai.Client(api_key=API_KEY)

        prompt_mode_hint = (
            "These are the TOP emotional highlights from a Smart analysis (pre-filtered by chat emotion score)."
            if mode == 'smart'
            else "This is a baseline timeline of stream events."
        )

        with metrics_logger.timer() as t:
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=f"""You are summarizing a livestream recording. {prompt_mode_hint}

Timeline:
{timeline_text}

Your task:
1. Understand the overall theme of this stream
2. Create a human-readable highlights summary in this exact format:

*[Stream title you inferred]*
[2-3 sentence overall description of what this stream was about]

[MM:SS] - [what happened — be specific and meaningful, include chat reaction if available]
[MM:SS] - [next highlight]
... (include ALL timestamps from the timeline — they are already pre-selected as the most important)

Rules:
- Write in English
- Use ONLY the timestamps provided — do not invent new ones
- For each moment: briefly describe the video action AND the chat reaction
- Be specific and vivid, like a sports commentator recap
- Do NOT skip any provided timestamp

Return ONLY the formatted text, no JSON, no extra explanation."""
            )

        metrics_logger.log(
            mode=mode,
            endpoint="generate_summary",
            response=response,
            latency_ms=t.ms,
            video_id=video_id,
            note=f"frames={len(analysis_data)}, top={len(timeline_items)}",
        )

        return jsonify({"summary": response.text.strip()})

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/generateSummary', methods=['POST'])
def generate_summary_disabled():
    return jsonify({"message": "generateSummary is temporarily disabled"}), 200


@app.route('/generateParagraphSummary', methods=['POST'])
def generate_paragraph_summary():
    return jsonify({"message": "generateParagraphSummary is temporarily disabled"}), 200


@app.route('/generateLanguages', methods=['POST'])
def generate_languages():
    return jsonify({"message": "generateLanguages is temporarily disabled"}), 200


# ==================== SMART MODE ENDPOINTS ====================

@app.route('/scoreChatEmotion', methods=['POST'])
def score_chat_emotion():
    client = genai.Client(api_key=API_KEY)
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON body"}), 400

    chat_messages = data.get("chat_messages", [])

    if not chat_messages:
        return jsonify({"score": 0.0, "reason": "No messages provided"}), 200

    messages = format_messages(chat_messages, data)

    if not messages.strip():
        return jsonify({"score": 0.0, "reason": "No valid messages"}), 200

    prompt = f"""
You are analyzing live chat messages from a video stream to detect emotional intensity.

Chat messages:
{messages}

Analyze the messages and return a JSON object with:
- "score": a float from 0.0 to 1.0 where:
  0.0 = totally calm, regular chat
  0.3 = some engagement, a few reactions
  0.6 = notable excitement or reaction (multiple people reacting to something)
  0.8 = high intensity (caps lock, lots of !!!, Pog/KEKW/OMG, flooding)
  1.0 = extreme hype or mass reaction (chat going crazy, spam, everyone reacting at once)

- "reason": one short sentence explaining why (max 10 words)
- "keywords": array of up to 5 trigger words/phrases you detected

Signals to look for:
- Caps lock words (OMG, WTF, WHAT, LET'S GO, NO WAY)
- Repeated characters (noooo, whaaat, lmaooo)
- Exclamation marks (!! or !!!)
- Emotes (KEKW, PogChamp, Pog, OMEGALUL, monkaS, 5Head, LULW, LUL, PauseChamp)
- Clip requests ("CLIP IT", "clip that", "CLIP")
- Shock/hype phrases ("no way", "holy", "wait what", "let's go", "lets go")
- Message flooding (many messages in a short time saying similar things)
- Emotional words in any language

Return ONLY valid JSON, no explanation, no markdown:
{{"score": 0.75, "reason": "Multiple users reacting with hype emotes", "keywords": ["KEKW", "LET'S GO", "clip"]}}
"""

    try:
        with metrics_logger.timer() as t:
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
            )

        text = response.text.strip().replace('```json', '').replace('```', '').strip()
        result = json.loads(text)

        score = float(result.get("score", 0.0))
        score = max(0.0, min(1.0, score))

        triggered = score >= 0.6

        metrics_logger.log(
            mode="smart",
            endpoint="scoreChatEmotion",
            response=response,
            latency_ms=t.ms,
            triggered=triggered,
            note=f"score={score:.2f} | {result.get('reason', '')}",
        )

        print(f"Chat emotion score: {score} | Reason: {result.get('reason', '')}")
        return jsonify({
            "score": score,
            "reason": result.get("reason", ""),
            "keywords": result.get("keywords", [])
        })

    except Exception as e:
        print(f"Error in score_chat_emotion: {e}")
        return jsonify({"score": 0.0, "reason": "Analysis failed", "keywords": []}), 500


@app.route('/generateMomentInsight', methods=['POST'])
def generate_moment_insight():
    client = genai.Client(api_key=API_KEY)
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON body"}), 400

    video_timestamp = data.get("videoTimestamp", 0)
    video_action = data.get("videoAction", "Unknown action")
    video_speech = data.get("videoSpeech", "")
    chat_messages = data.get("chatMessages", "")
    video_id = data.get("videoId", "")

    minutes = int(video_timestamp) // 60
    seconds = int(video_timestamp) % 60
    time_str = f"{minutes:02d}:{seconds:02d}"

    speech_part = f'\nSpeaker said: "{video_speech}"' if video_speech and video_speech != "No speech detected." else ""

    prompt = f"""
You are summarizing a key moment from a livestream at timestamp {time_str}.

VIDEO at {time_str}:
Action: {video_action}{speech_part}

CHAT REACTION (recent messages from viewers):
{chat_messages}

Write a single, concise paragraph (2-3 sentences) that:
1. Describes what happened in the video
2. Explains how the chat reacted (use examples from the messages)
3. Captures the emotional tone of the moment

Style: conversational, like a sports commentator recap. Start with the timestamp in brackets [{time_str}].
Do not use bullet points. No more than 60 words total.
"""

    try:
        with metrics_logger.timer() as t:
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
            )
        metrics_logger.log(
            mode="smart",
            endpoint="generateMomentInsight",
            response=response,
            latency_ms=t.ms,
            video_id=video_id,
            triggered=True,
            note=f"t={time_str}",
        )
        insight_text = response.text.strip()
        print(f"Moment insight generated for t={time_str}: {insight_text[:80]}...")
        return jsonify({"insight": insight_text, "timestamp": video_timestamp})
    except Exception as e:
        print(f"Error in generate_moment_insight: {e}")
        return jsonify({"error": "Failed to generate insight"}), 500


# ==================== НОВИЙ ЕНДПОІНТ: LOG SCORES ====================
# Приймає local_score та nlp_score від React-клієнта для кожного тіку.
# Ці дані потім використовуються для обґрунтування порогів threshold_analysis.py

@app.route('/log_scores', methods=['POST'])
def log_scores():
    """
    Body (JSON):
    {
        "video_id":    "dQw4w9WgXcQ",
        "timestamp":   42,        // секунда відео
        "local_score": 0.63,      // L0 — локальний фільтр
        "nlp_score":   0.71,      // s  — NLP оцінка
        "is_highlight": true      // автомітка: score >= SMART_THRESHOLD
    }
    """
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"error": "Empty body"}), 400

        metrics_logger.log_scores(
            video_id          = data.get("video_id", "unknown"),
            video_time_sec    = data.get("timestamp", 0),
            local_score       = float(data.get("local_score", 0.0)),
            nlp_score         = float(data.get("nlp_score", 0.0)),
            is_highlight_auto = bool(data.get("is_highlight", False)),
        )
        return jsonify({"ok": True})

    except Exception as e:
        print(f"Error in log_scores: {e}")
        return jsonify({"error": str(e)}), 500


# ==================== HEALTH CHECK ====================

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "gemini-ai",
        "supports": ["live", "archive", "smart-mode"],
        "metrics_file": metrics_logger.get_metrics_path(),
        "endpoints": [
            "/generateTopics",
            "/generateSummary",
            "/generateParagraphSummary",
            "/generateLanguages",
            "/scoreChatEmotion",
            "/generateMomentInsight",
            "/log_scores",          # ← новий
        ]
    })


if __name__ == '__main__':
    print("Starting Unified Gemini AI Service on port 5001...")
    print("Supports LIVE, ARCHIVE, and SMART modes")
    app.run(host='0.0.0.0', port=5001, debug=False, use_reloader=False)