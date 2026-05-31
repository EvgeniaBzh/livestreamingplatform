import cv2
import whisper
import clip
import torch
from anthropic import Anthropic
import json
from pathlib import Path

def extract_frames(video_path, every_n_seconds=5):
    """Витягує фрейми кожні N секунд"""
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    frames = []
    
    frame_interval = int(fps * every_n_seconds)
    frame_count = 0
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        if frame_count % frame_interval == 0:
            timestamp = frame_count / fps
            frames.append((timestamp, frame))
        frame_count += 1
    
    cap.release()
    return frames

def transcribe_audio(video_path):
    """Транскрибує аудіо через Whisper"""
    model = whisper.load_model("base")  # або "small", "medium"
    result = model.transcribe(video_path, language="uk")  # "uk" для укр
    return result["segments"]  # список з timestamp + text

def analyze_frames_with_clip(frames):
    """CLIP аналізує кожен фрейм"""
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model, preprocess = clip.load("ViT-B/32", device=device)
    
    # Категорії для пошуку
    categories = [
        "exciting gameplay moment",
        "person talking to camera",
        "game over screen",
        "achievement unlocked",
        "funny or emotional moment",
        "new level or area",
        "boring loading screen"
    ]
    
    text_inputs = clip.tokenize(categories).to(device)
    results = []
    
    for timestamp, frame in frames:
        # Конвертуємо frame для CLIP
        from PIL import Image
        pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        img_input = preprocess(pil_img).unsqueeze(0).to(device)
        
        with torch.no_grad():
            logits_per_image, _ = model(img_input, text_inputs)
            probs = logits_per_image.softmax(dim=-1).cpu().numpy()[0]
        
        top_category = categories[probs.argmax()]
        confidence = float(probs.max())
        
        results.append({
            "timestamp": timestamp,
            "category": top_category,
            "confidence": confidence,
            "is_highlight": confidence > 0.3 and "boring" not in top_category
        })
    
    return results

def generate_highlights(clip_results, whisper_segments, client):
    """LLM синтезує фінальний список хайлайтів"""
    
    # Відбираємо потенційні хайлайти
    potential = [r for r in clip_results if r["is_highlight"]]
    
    # Готуємо контекст для LLM
    context = f"""
Аналіз відеостріму:

ВІЗУАЛЬНІ ПОДІЇ (CLIP):
{json.dumps(potential[:50], indent=2, ensure_ascii=False)}

ТРАНСКРИПЦІЯ (Whisper, перші 100 сегментів):
{json.dumps(whisper_segments[:100], indent=2, ensure_ascii=False)}

Створи структурований список хайлайтів стріму у форматі JSON:
[{{"timestamp_start": 0, "timestamp_end": 30, "title": "...", "description": "..."}}]
Виділи 10-20 найцікавіших моментів.
"""
    
    message = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=2000,
        messages=[{"role": "user", "content": context}]
    )
    
    return message.content[0].text

def format_time(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    return f"{h:02d}:{m:02d}:{s:02d}"

def run_pipeline(video_path: str):
    print("🎬 Запускаємо аналіз відео...")
    
    # 1. Фрейми
    print("📷 Витягуємо фрейми...")
    frames = extract_frames(video_path, every_n_seconds=5)
    print(f"   Знайдено {len(frames)} фреймів")
    
    # 2. Аудіо
    print("🎤 Транскрибуємо аудіо (Whisper)...")
    segments = transcribe_audio(video_path)
    print(f"   Знайдено {len(segments)} мовних сегментів")
    
    # 3. CLIP
    print("👁️ Аналізуємо фрейми (CLIP)...")
    clip_results = analyze_frames_with_clip(frames)
    highlights_count = sum(1 for r in clip_results if r["is_highlight"])
    print(f"   Потенційних хайлайтів: {highlights_count}")
    
    # 4. LLM синтез
    print("🤖 Генеруємо хайлайти (Claude)...")
    client = Anthropic()  # бере ключ з ANTHROPIC_API_KEY
    highlights_raw = generate_highlights(clip_results, segments, client)
    
    # 5. Зберігаємо
    output_path = Path(video_path).stem + "_highlights.txt"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(f"ХАЙЛАЙТИ: {Path(video_path).name}\n")
        f.write("=" * 50 + "\n\n")
        f.write(highlights_raw)
    
    print(f"\n✅ Готово! Збережено у: {output_path}")
    return output_path

# Запуск
if __name__ == "__main__":
    run_pipeline("my_stream.mp4")