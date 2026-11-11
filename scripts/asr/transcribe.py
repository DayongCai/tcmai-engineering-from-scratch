#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""带上下文承接的转写变体测试：condition_on_previous_text=True（长讲座里术语会随上文传播）。
用法: python asr.py 的同一套参数，但 cut 到切片并只输出分数
"""
import json
import os
import sys
import time
import wave

import numpy as np

os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")

from faster_whisper import WhisperModel  # noqa: E402

model_path, audio, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
max_sec = float(sys.argv[4]) if len(sys.argv) > 4 else 0.0
prompt = sys.argv[5] if len(sys.argv) > 5 else ""
threads = int(sys.argv[6]) if len(sys.argv) > 6 else 8
carry = (sys.argv[7] if len(sys.argv) > 7 else "1") == "1"
beam = int(os.environ.get("BEAM", "5"))

with wave.open(audio, "rb") as w:
    n = int(max_sec * 16000) if max_sec else w.getnframes()
    n = min(n, w.getnframes())
    arr = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768.0

model = WhisperModel(model_path, device="cpu", compute_type="int8", cpu_threads=threads)
t0 = time.time()
segments, _ = model.transcribe(
    arr, language="zh", beam_size=beam, vad_filter=True,
    vad_parameters={"min_silence_duration_ms": 500},
    initial_prompt=prompt, condition_on_previous_text=carry,
)
secs = [{"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()} for s in segments if s.text.strip()]
wall = time.time() - t0
audio_sec = len(arr) / 16000.0
json.dump({"model": model_path, "beam": beam, "audioSec": audio_sec, "wallSec": round(wall, 1),
           "speed": round(audio_sec / wall, 2), "carry": carry, "segments": secs},
          open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{model_path} carry={carry}: 音频 {audio_sec:.0f}s / 用时 {wall:.0f}s = {audio_sec/wall:.2f}× · 段 {len(secs)}")
