#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""重转 P28 / P29（用户复核：28 集开头未识别完、29 集完全未识别）。

不改原脚本，只把输出文件名改成 pNN.re.json，便于与旧结果逐段比对。
用法: python scripts/asr/redo_p2829.py
"""
import importlib.util
import json
import os
import sys
import wave
import numpy as np
from faster_whisper import WhisperModel

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
spec = importlib.util.spec_from_file_location("sqn", os.path.join(ROOT, "scripts", "asr", "shanghan_quannao.py"))
sqn = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sqn)

TMP = sqn.TMP
ASRD = sqn.ASRD


def run(no):
    wav = os.path.join(TMP, f"a{no:02d}.wav")
    if not os.path.exists(wav):
        ep = [e for e in sqn.manifest()["episodes"] if e["no"] == no][0]
        wav, _ = sqn.fetch_audio(ep)
    with wave.open(wav, "rb") as w:
        arr = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    model = WhisperModel(sqn.MODEL, device="cpu", compute_type="int8",
                         cpu_threads=int(os.environ.get("THREADS", "8")))
    segs, info = model.transcribe(arr, language="zh", beam_size=5,
                                  vad_filter=False,          # 不做 VAD，先看原始切分有没有漏掉开头
                                  initial_prompt=sqn.PROMPT,
                                  condition_on_previous_text=False)
    rec = [{"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()}
           for s in segs if s.text.strip()]
    out = {"no": no, "model": os.path.basename(sqn.MODEL), "beam": 5, "vad": False,
           "audioSec": round(len(arr) / 16000.0, 1), "segments": rec,
           "chars": sum(len(s["text"]) for s in rec)}
    p = os.path.join(ASRD, f"p{no:02d}.re.json")
    json.dump(out, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"[P{no:02d}] {out['audioSec']}s · 段 {len(rec)} · 字 {out['chars']} → {p}", flush=True)


if __name__ == "__main__":
    for a in (sys.argv[1:] or ["28", "29"]):
        run(int(a))
