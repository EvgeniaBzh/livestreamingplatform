import json
import subprocess
import os
import time
import firebase_admin
from firebase_admin import credentials, firestore

# --- CONFIG ---
VIDEO_DIR = "videos_mp4"
CHUNK_SIZE = 300       # 🔥 messages per Firestore document
SLEEP_BETWEEN_CHUNKS = 0.2
BATCH_SIZE = 50        # 🔥 number of docs per batch commit
SLEEP_BETWEEN_BATCHES = 0.5

if not os.path.exists(VIDEO_DIR):
    os.makedirs(VIDEO_DIR)

# --- SAFE COMMIT (з retry) ---
def safe_commit(batch):
    for attempt in range(5):
        try:
            batch.commit()
            return
        except Exception as e:
            print(f"Commit failed (attempt {attempt+1}): {e}")
            time.sleep(2 ** attempt)
    raise Exception("Failed to commit batch after retries")

# --- DELETE COLLECTION ---
def delete_collection(coll_ref, batch_size=200):
    docs = coll_ref.limit(batch_size).stream()
    deleted = 0
    for doc in docs:
        doc.reference.delete()
        deleted += 1
    if deleted >= batch_size:
        time.sleep(0.2)
        return delete_collection(coll_ref, batch_size)

# --- Firebase init ---
cred = credentials.Certificate("serviceAccountKey.json")
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)
db = firestore.client()

# --- READ INPUT ---
videos_data = []
try:
    with open("videos.txt", "r") as file:
        lines = [line.strip() for line in file if line.strip()]
        for i in range(0, len(lines), 2):
            if i + 1 < len(lines):
                videos_data.append({
                    "url": lines[i],
                    "video_name": lines[i + 1]
                })
except FileNotFoundError:
    print("videos.txt not found")
    exit()

# --- MAIN LOOP ---
for data in videos_data:
    url = data["url"]
    video_name = data["video_name"]
    video_id = url.split("/live/")[-1].split("?")[0] if "/live/" in url else url.split("v=")[-1].split("&")[0]

    print(f"\n--- Processing: {video_name} ({video_id}) ---")

    live_chat_file = f"{video_id}.live_chat.json"
    info_file = f"{video_id}.info.json"
    video_output_path = os.path.join(VIDEO_DIR, f"{video_id}.mp4")

    # --- REMOVE OLD VIDEO ---
    if os.path.exists(video_output_path):
        print(f"Removing old video: {video_output_path}")
        os.remove(video_output_path)

    # --- DOWNLOAD VIDEO ---
    print(f"Downloading video + chat...")
    try:
        subprocess.run([
            "yt-dlp",
            "--write-subs",
            "--sub-langs", "live_chat",
            "--write-info-json",
            "--format", "bv*[height<=720][vcodec^=avc1]+ba/b[ext=mp4]",
            "--retries", "20",
            "--fragment-retries", "20",
            "--retry-sleep", "5",
            "--concurrent-fragments", "1",
            "--merge-output-format", "mp4",
            "--output", f"{video_id}.%(ext)s",
            url
        ], check=True)

        found_video = False
        for f in os.listdir('.'):
            if f.startswith(video_id) and f.endswith(('.mp4', '.mkv', '.webm')) and not f.endswith('.json'):
                os.rename(f, video_output_path)
                print(f"Video saved: {video_output_path}")
                found_video = True
                break

        if not found_video:
            print("Video not found after download")
            continue

    except subprocess.CalledProcessError as e:
        print(f"yt-dlp failed: {e}")
        continue

    if not os.path.exists(live_chat_file):
        print("Live chat not found")
        continue

    # --- PARSE CHAT ---
    messages = []
    with open(live_chat_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue

            actions = obj.get("replayChatItemAction", {}).get("actions", [])
            for action in actions:
                item = action.get("addChatItemAction", {}).get("item", {})
                chat_msg = item.get("liveChatTextMessageRenderer") or item.get("liveChatPaidMessageRenderer")
                if not chat_msg:
                    continue

                offset_ms = obj.get("replayChatItemAction", {}).get("videoOffsetTimeMsec")
                time_sec = int(offset_ms) / 1000.0 if offset_ms is not None else None

                author_name = chat_msg.get("authorName", {}).get("simpleText", "User")
                thumbnails = chat_msg.get("authorPhoto", {}).get("thumbnails", [])
                author_photo = thumbnails[-1].get("url") if thumbnails else ""

                message_text = "".join([run.get("text", "") for run in chat_msg.get("message", {}).get("runs", [])])
                author_channel_id = chat_msg.get("authorExternalChannelId", "")

                messages.append({
                    "author": author_name,
                    "message": message_text,
                    "timestamp": time_sec,
                    "authorChannelId": author_channel_id,
                    "authorPhoto": author_photo
                })

    print(f"Parsed {len(messages)} messages")

    # --- SAVE TO FIRESTORE (CHUNKS + BATCHES) ---
    video_ref = db.collection("videos").document(video_id)
    video_ref.set({
        "videoId": video_id,
        "name": video_name,
        "localVideoPath": video_output_path,
        "processedAt": firestore.SERVER_TIMESTAMP
    }, merge=True)

    chat_ref = video_ref.collection("chatChunks")

    print("Cleaning old chat chunks...")
    delete_collection(chat_ref)

    print("Uploading messages in chunks with batch commit...")
    batch = db.batch()
    docs_in_batch = 0

    for i in range(0, len(messages), CHUNK_SIZE):
        chunk = messages[i:i + CHUNK_SIZE]
        doc = chat_ref.document()
        batch.set(doc, {
            "messages": chunk,
            "chunkIndex": i // CHUNK_SIZE
        })
        docs_in_batch += 1

        if docs_in_batch >= BATCH_SIZE:
            safe_commit(batch)
            batch = db.batch()
            docs_in_batch = 0
            time.sleep(SLEEP_BETWEEN_BATCHES)

    if docs_in_batch > 0:
        safe_commit(batch)

    # --- CLEANUP ---
    if os.path.exists(live_chat_file):
        os.remove(live_chat_file)
    if os.path.exists(info_file):
        os.remove(info_file)

    print(f"Finished processing {video_id}")

print("\n--- ALL DONE ---")