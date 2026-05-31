import csv
import os
import time
from datetime import datetime
from pathlib import Path

METRICS_DIR = Path(__file__).parent / "metrics"
METRICS_FILE = METRICS_DIR / "metrics_log.csv"

FIELDNAMES = [
    "timestamp", "mode", "endpoint", "video_id", "prompt_tokens",
    "output_tokens", "total_tokens", "latency_ms", "triggered", "note",
]

def _ensure_file():
    if not METRICS_DIR.exists():
        METRICS_DIR.mkdir(parents=True, exist_ok=True)
    if not METRICS_FILE.exists():
        with open(METRICS_FILE, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
            writer.writeheader()

def log(*, mode: str, endpoint: str, response=None, prompt_tokens: int = 0,
        output_tokens: int = 0, latency_ms: float = 0.0, video_id: str = "",
        triggered: bool = False, note: str = ""):
    _ensure_file()

    # Спроба дістати токени з відповіді Gemini 2.0
    if response is not None:
        try:
            # У новій бібліотеці це зазвичай response.usage_metadata
            usage = getattr(response, "usage_metadata", None)
            if usage:
                prompt_tokens = usage.prompt_token_count
                output_tokens = usage.candidates_token_count
        except Exception as e:
            print(f"[DEBUG] Не вдалося дістати токени автоматично: {e}")

    total_tokens = prompt_tokens + output_tokens
    row = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "mode": mode, "endpoint": endpoint, "video_id": video_id,
        "prompt_tokens": prompt_tokens, "output_tokens": output_tokens,
        "total_tokens": total_tokens, "latency_ms": round(latency_ms, 1),
        "triggered": triggered, "note": note,
    }

    with open(METRICS_FILE, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writerow(row)
        f.flush()
        os.fsync(f.fileno()) # Гарантуємо запис на диск

    print(f"📈 [LOGGED] {mode}/{endpoint} | Tokens: {total_tokens} | {latency_ms:.0f}ms")

class timer:
    def __enter__(self):
        self._start = time.perf_counter()
        return self
    def __exit__(self, *_):
        self.ms = (time.perf_counter() - self._start) * 1000

def get_metrics_path() -> str:
    return str(METRICS_FILE.resolve())
SCORE_FILE = METRICS_DIR / 'score_metrics.csv'
SCORE_FIELDS = ['timestamp', 'video_id', 'video_time_sec',
                'local_score', 'nlp_score', 'is_highlight_auto', 'is_highlight_manual']


SCORE_FILE = METRICS_DIR / "score_metrics.csv"
SCORE_FIELDS = ["timestamp", "video_id", "video_time_sec",
                "local_score", "nlp_score", "is_highlight_auto", "is_highlight_manual"]
def log_scores(*, video_id, video_time_sec, local_score, nlp_score,
               is_highlight_auto=False, is_highlight_manual=None):
    if not METRICS_DIR.exists():
        METRICS_DIR.mkdir(parents=True, exist_ok=True)
    write_header = not SCORE_FILE.exists()
    with open(SCORE_FILE, 'a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=SCORE_FIELDS)
        if write_header:
            writer.writeheader()
        writer.writerow({
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'video_id': video_id,
            'video_time_sec': round(float(video_time_sec), 1),
            'local_score': round(float(local_score), 4),
            'nlp_score': round(float(nlp_score), 4),
            'is_highlight_auto': int(bool(is_highlight_auto)),
            'is_highlight_manual': '' if is_highlight_manual is None else int(is_highlight_manual),
        })
        f.flush()
