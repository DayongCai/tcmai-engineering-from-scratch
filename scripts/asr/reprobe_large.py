#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""对 21 段「待人工」换 large-v3 复核（同提示词，只换模型，便于归因）。

对照关系：
  alt1 / sim1  faster-whisper turbo，无提示（audit_all --audio）
  alt2 / sim2  同 turbo，长提示 111 方名（reprobe_fang）
  alt2s/sim2s  同 turbo，短提示（reprobe_fang --short）
  alt3 / sim3  **large-v3**，只有基础提示（本脚本）

用法: python scripts/asr/reprobe_large.py [--limit N]
输出: asr/gap-audit/large-probe.json
"""
import argparse
import difflib
import json
import os
import re
import sys
import time
import wave

import numpy as np
from faster_whisper import WhisperModel

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MAT = os.path.join(ROOT, "standards", "materials", "shanghan-quannao")
GA = os.path.join(MAT, "asr", "gap-audit")
TMP = os.path.join(os.environ.get("LOCALAPPDATA", "."), "Temp", "sqn")
MODELS = os.path.join(os.environ.get("LOCALAPPDATA", ""), "Temp", "models")
BASE = ("《伤寒论》原文背诵。太阳病、阳明病、少阳病、太阴病、少阴病、厥阴病、"
        "记忆宫殿、记忆桩、任脉、督脉、十二正经、经络穴位。")


def norm(s):
    return re.sub(r"[^一-鿿0-9]", "", s or "")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--name", default="large-v3")
    a = ap.parse_args()
    os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
    os.environ.setdefault("HF_HUB_DISABLE_XET", "1")

    rows = [r for r in json.load(open(os.path.join(GA, "all.json"), encoding="utf-8"))
            if r["verdict"] == "待人工"]
    if a.limit:
        rows = rows[:a.limit]
    print(f"待人工 {len(rows)} 段 · 模型 {a.name} · 下载根 {MODELS}", flush=True)

    t0 = time.time()
    model = WhisperModel(a.name, device="cpu", compute_type="int8", cpu_threads=6,
                         download_root=MODELS)
    print(f"模型就绪 {time.time() - t0:.0f}s", flush=True)

    out = []
    for i, r in enumerate(rows, 1):
        wav = os.path.join(TMP, f"a{r['no']:02d}.wav")
        if not os.path.exists(wav):
            continue
        with wave.open(wav, "rb") as w:
            arr = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
        dur = len(arr) / 16000.0
        o = norm(r["old"])
        s0 = max(0.0, r["start"] - 0.8)
        s1 = min(dur, r["start"] + max(2.5, len(o) / 4.0) + 1.2)
        clip = arr[int(s0 * 16000):int(s1 * 16000)]
        t1 = time.time()
        segs, _ = model.transcribe(clip, language="zh", beam_size=5, vad_filter=False,
                                   initial_prompt=BASE, condition_on_previous_text=False)
        alt = "".join(x.text.strip() for x in segs)
        sim = difflib.SequenceMatcher(None, o, norm(alt)).ratio()
        out.append({"no": r["no"], "start": r["start"], "old": r["old"],
                    "alt_turbo": r.get("alt") or "", "sim_turbo": round(r.get("simAlt") or 0, 2),
                    "alt": alt, "sim": round(sim, 2), "sec": round(time.time() - t1, 1)})
        print(f"{i:02d}/{len(rows)} P{r['no']:02d} {int(r['start']) // 60}:{int(r['start']) % 60:02d} "
              f"turbo {r.get('simAlt') or 0:.2f} → large-v3 {sim:.2f} ({time.time() - t1:.0f}s) | {alt[:42]}",
              flush=True)
    json.dump(out, open(os.path.join(GA, "large-probe.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    up = [x for x in out if x["sim"] - x["sim_turbo"] >= 0.15]
    ok = [x for x in out if x["sim"] >= 0.75]
    print(f"\n合计 {len(out)} 段：改善≥0.15 {len(up)} 段；提到 ≥0.75 {len(ok)} 段；"
          f"平均 {sum(x['sim'] for x in out) / max(1, len(out)):.2f} vs turbo "
          f"{sum(x['sim_turbo'] for x in out) / max(1, len(out)):.2f}")
    if ok:
        print("判清：", [(x["no"], f"{int(x['start']) // 60}:{int(x['start']) % 60:02d}", x["sim"]) for x in ok])


if __name__ == "__main__":
    sys.exit(main())
