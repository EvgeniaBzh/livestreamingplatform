"""
threshold_analysis.py
─────────────────────
Завантажує score_metrics.csv, будує гістограми розподілів
local_score та nlp_score, обчислює оптимальні пороги.

Запуск:
    python threshold_analysis.py --csv score_metrics.csv
    python threshold_analysis.py --csv score_metrics.csv --use-auto
"""

import argparse
import os
import sys
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from scipy import stats

# ── Аргументи ────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument("--csv",      default="./score_metrics.csv")
parser.add_argument("--use-auto", action="store_true",
                    help="Використати is_highlight_auto замість is_highlight_manual")
parser.add_argument("--out",      default="./threshold_analysis.png")
args = parser.parse_args()

# ── Завантаження ──────────────────────────────────────────────────────────────
if not os.path.exists(args.csv):
    print(f"[ERROR] Файл не знайдено: {args.csv}")
    sys.exit(1)

df = pd.read_csv(args.csv)
print(f"[INFO] Завантажено {len(df)} рядків")

# ── Вибір колонки міток ───────────────────────────────────────────────────────
if args.use_auto:
    label_col = "is_highlight_auto"
    print("[INFO] Використовую автомітку (is_highlight_auto)")
else:
    df_labeled = df[df["is_highlight_manual"].notna() & (df["is_highlight_manual"] != "")]
    if len(df_labeled) == 0:
        print("[WARN] Ручних міток нема — перемикаюся на автомітку")
        label_col = "is_highlight_auto"
    else:
        df = df_labeled.copy()
        label_col = "is_highlight_manual"
        print(f"[INFO] Ручна розмітка: {len(df)} рядків")

df[label_col] = df[label_col].astype(int)

events    = df[df[label_col] == 1]
no_events = df[df[label_col] == 0]

print(f"\n  Подійних моментів:    {len(events)}")
print(f"  Неподійних моментів:  {len(no_events)}")

if len(events) == 0 or len(no_events) == 0:
    print("[ERROR] Потрібні обидві групи (0 і 1). Заповни is_highlight_manual або використай --use-auto")
    sys.exit(1)

# ── Функція аналізу ───────────────────────────────────────────────────────────
def compute_threshold(series_pos, series_neg, score_name, current_threshold):
    m_pos, s_pos = series_pos.mean(), series_pos.std()
    m_neg, s_neg = series_neg.mean(), series_neg.std()

    print(f"\n─── {score_name} ───")
    print(f"  Події:     mean={m_pos:.3f}  std={s_pos:.3f}  min={series_pos.min():.3f}  max={series_pos.max():.3f}")
    print(f"  Не-події:  mean={m_neg:.3f}  std={s_neg:.3f}  min={series_neg.min():.3f}  max={series_neg.max():.3f}")

    t_half = m_pos - 0.5 * s_pos
    t_one  = m_pos - 1.0 * s_pos
    print(f"  mean - 0.5·std = {t_half:.3f}")
    print(f"  mean - 1.0·std = {t_one:.3f}")
    print(f"  Поточний поріг = {current_threshold}")

    # Youden J
    all_vals = np.concatenate([series_pos.values, series_neg.values])
    labels   = np.concatenate([np.ones(len(series_pos)), np.zeros(len(series_neg))])
    thresholds = np.linspace(all_vals.min(), all_vals.max(), 300)
    best_j, best_t = -1, 0
    results = []
    for thr in thresholds:
        pred = (all_vals >= thr).astype(int)
        tp = ((pred==1)&(labels==1)).sum()
        fp = ((pred==1)&(labels==0)).sum()
        fn = ((pred==0)&(labels==1)).sum()
        tn = ((pred==0)&(labels==0)).sum()
        sens = tp/(tp+fn) if (tp+fn) else 0
        spec = tn/(tn+fp) if (tn+fp) else 0
        prec = tp/(tp+fp) if (tp+fp) else 0
        f1   = 2*prec*sens/(prec+sens) if (prec+sens) else 0
        j = sens + spec - 1
        results.append((thr, sens, spec, prec, f1, j))
        if j > best_j:
            best_j, best_t = j, thr

    print(f"  Youden J-opt   = {best_t:.3f}  (J={best_j:.3f})")

    # Метрики для поточного порогу
    pred_cur = (all_vals >= current_threshold).astype(int)
    tp = ((pred_cur==1)&(labels==1)).sum()
    fp = ((pred_cur==1)&(labels==0)).sum()
    fn = ((pred_cur==0)&(labels==1)).sum()
    tn = ((pred_cur==0)&(labels==0)).sum()
    sens_cur = tp/(tp+fn) if (tp+fn) else 0
    spec_cur = tn/(tn+fp) if (tn+fp) else 0
    prec_cur = tp/(tp+fp) if (tp+fp) else 0
    f1_cur   = 2*prec_cur*sens_cur/(prec_cur+sens_cur) if (prec_cur+sens_cur) else 0
    print(f"  При поточному порозі {current_threshold}: Precision={prec_cur:.3f}  Recall={sens_cur:.3f}  F1={f1_cur:.3f}")

    # Shapiro-Wilk
    for name, series in [("події", series_pos), ("не-події", series_neg)]:
        if len(series) >= 3:
            n = min(len(series), 5000)
            sample = series.sample(n, random_state=42) if len(series) > n else series
            _, p = stats.shapiro(sample)
            verdict = "нормальний ✓" if p > 0.05 else "НЕ нормальний"
            print(f"  Shapiro-Wilk ({name}): p={p:.4f} → {verdict}")

    return t_half, t_one, best_t, results

# ── Обчислення ────────────────────────────────────────────────────────────────
loc_t_half, loc_t_one, loc_youden, loc_roc = compute_threshold(
    events["local_score"], no_events["local_score"],
    "local_score (L₀)", current_threshold=0.8
)
nlp_t_half, nlp_t_one, nlp_youden, nlp_roc = compute_threshold(
    events["nlp_score"], no_events["nlp_score"],
    "nlp_score (s)", current_threshold=0.7
)

# ── Графіки ───────────────────────────────────────────────────────────────────
fig, axes = plt.subplots(2, 2, figsize=(13, 9))
fig.suptitle("Обґрунтування порогів каскадної архітектури", fontsize=14, fontweight="bold")

COLOR_POS = "#1D9E75"
COLOR_NEG = "#888780"
BINS = 20

for row_idx, (score_col, t_half, t_one, t_youden, cur_thr, label) in enumerate([
    ("local_score", loc_t_half, loc_t_one, loc_youden, 0.8, "L₀  (локальний фільтр, ярус 0)"),
    ("nlp_score",   nlp_t_half, nlp_t_one, nlp_youden, 0.7, "s  (NLP оцінка, ярус 1)"),
]):
    # Гістограма
    ax = axes[row_idx][0]
    ax.hist(no_events[score_col].dropna(), bins=BINS, alpha=0.55,
            color=COLOR_NEG, label="не-подія", density=True)
    ax.hist(events[score_col].dropna(), bins=BINS, alpha=0.70,
            color=COLOR_POS, label="подія", density=True)
    ax.axvline(cur_thr,  color="#185FA5", linestyle="-",  linewidth=2,   label=f"поточний поріг = {cur_thr}")
    ax.axvline(t_youden, color="#D85A30", linestyle="--", linewidth=1.6, label=f"Youden opt = {t_youden:.2f}")
    ax.axvline(t_half,   color="#BA7517", linestyle=":",  linewidth=1.4, label=f"mean−0.5σ = {t_half:.2f}")
    ax.set_title(f"Гістограма: {label}", fontsize=11)
    ax.set_xlabel(score_col)
    ax.set_ylabel("Щільність")
    ax.legend(fontsize=8)

    # F1 vs поріг
    ax2 = axes[row_idx][1]
    roc_data = locals()[f"{'loc' if row_idx==0 else 'nlp'}_roc"]
    thrs = [r[0] for r in roc_data]
    f1s  = [r[4] for r in roc_data]
    sens = [r[1] for r in roc_data]
    prec = [r[3] for r in roc_data]
    ax2.plot(thrs, f1s,  color="#1D9E75", linewidth=2,   label="F1-score")
    ax2.plot(thrs, sens, color="#7F77DD", linewidth=1.5, label="Recall",    linestyle="--")
    ax2.plot(thrs, prec, color="#D85A30", linewidth=1.5, label="Precision", linestyle=":")
    ax2.axvline(cur_thr,  color="#185FA5", linestyle="-",  linewidth=2,   label=f"поточний = {cur_thr}")
    ax2.axvline(t_youden, color="#D85A30", linestyle="--", linewidth=1.4, label=f"Youden = {t_youden:.2f}")
    ax2.set_title(f"F1 / Precision / Recall vs поріг: {label}", fontsize=11)
    ax2.set_xlabel("поріг")
    ax2.set_ylabel("значення метрики")
    ax2.set_ylim(0, 1.05)
    ax2.legend(fontsize=8)
    ax2.grid(alpha=0.3)

plt.tight_layout()
plt.savefig(args.out, dpi=150, bbox_inches="tight")
print(f"\n[OK] Графік збережено: {args.out}")

# ── Висновок ──────────────────────────────────────────────────────────────────
print("\n══ ПІДСУМОК ══")
print(f"  local_score:  поточний=0.8  |  Youden={loc_youden:.2f}  |  mean-0.5σ={loc_t_half:.2f}")
print(f"  nlp_score:    поточний=0.7  |  Youden={nlp_youden:.2f}  |  mean-0.5σ={nlp_t_half:.2f}")
print()
if abs(nlp_youden - 0.7) <= 0.05:
    print("  ✓ SMART_THRESHOLD=0.7 підтверджено даними (Youden близький)")
else:
    print(f"  ! Рекомендований SMART_THRESHOLD={nlp_youden:.2f} (відхилення від 0.7)")
if abs(loc_youden - 0.8) <= 0.05:
    print("  ✓ local_score поріг=0.8 підтверджено даними")
else:
    print(f"  ! Рекомендований local_score поріг={loc_youden:.2f}")