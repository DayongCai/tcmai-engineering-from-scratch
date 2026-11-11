#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""全量重转：vad_filter=false（去 VAD 掐头），输出 pNN.re.json，不动 pNN.json。

用法:
  python scripts/asr/redo_all_vadoff.py --threads 4 --split 0/2     # 第 0 份（编号 %2==0）
  python scripts/asr/redo_all_vadoff.py --threads 4 --split 1/2
  python scripts/asr/redo_all_vadoff.py --threads 8 --only 3,5,7    # 指定讲
已完成的（.re.json 存在且 chars>0）默认跳过，可加 --force。

日志：asr/redo-<split>.log，逐讲一行，带 flush，便于中途 tail。
"""
import argparse
import importlib.util
import json
import os
import sys
import time
import traceback
import wave

import numpy as np
from faster_whisper import WhisperModel

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
spec = importlib.util.spec_from_file_location("sqn", os.path.join(ROOT, "scripts", "asr", "shanghan_quannao.py"))
sqn = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sqn)

ASRD = sqn.ASRD
TMP = sqn.TMP
SKIP = {28, 29}          # 这两讲已于 2026-10-26 单独重转


def log(path, msg):
    line = time.strftime("%H:%M:%S ") + msg
    print(line, flush=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def run_one(no, model, threads, force=False):
    out = os.path.join(ASRD, f"p{no:02d}.re.json")
    if os.path.exists(out) and not force:
        try:
            d = json.load(open(out, encoding="utf-8"))
            if d.get("chars", 0) > 0:
                return "skip", d
        except Exception:  # noqa: BLE001
            pass
    wav = os.path.join(TMP, f"a{no:02d}.wav")
    if not os.path.exists(wav):
        ep = [e for e in sqn.manifest()["episodes"] if e["no"] == no][0]
        wav, _ = sqn.fetch_audio(ep)
    with wave.open(wav, "rb") as w:
        arr = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    aud = len(arr) / 16000.0
    t0 = time.time()
    segs, _info = model.transcribe(arr, language="zh", beam_size=5, vad_filter=False,
                                   initial_prompt=sqn.PROMPT, condition_on_previous_text=False)
    rec = [{"start": round(s.start, 2), "end": round(min(s.end, aud), 2), "text": s.text.strip()}
           for s in segs if s.text.strip()]
    wall = time.time() - t0
    d = {"no": no, "model": os.path.basename(sqn.MODEL), "beam": 5, "vad": False,
         "audioSec": round(aud, 1), "wallSec": round(wall, 1), "speed": round(aud / wall, 2),
         "chars": sum(len(s["text"]) for s in rec), "segments": rec,
         "note": "2026-10-26 全量重转（vad_filter=false）；旧版见 asr/vad-backup/ 或 git 历史"}
    json.dump(d, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return "ok", d


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--threads", type=int, default=4)
    ap.add_argument("--split", default="0/1")
    ap.add_argument("--only", default="")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    i, n = (int(x) for x in a.split.split("/"))
    eps = [e for e in sqn.manifest()["episodes"] if e["no"] not in SKIP]
    if a.only:
        want = {int(x) for x in a.only.split(",")}
        eps = [e for e in eps if e["no"] in want]
    else:
        eps = [e for e in eps if e["no"] % n == i]
    logf = os.path.join(ASRD, f"redo-split{i}.log")
    log(logf, f"=== 开始 threads={a.threads} 讲={[e['no'] for e in eps]}")
    model = WhisperModel(sqn.MODEL, device="cpu", compute_type="int8", cpu_threads=a.threads)
    done = fail = 0
    for e in eps:
        no = e["no"]
        try:
            st, d = run_one(no, model, a.threads, a.force)
            log(logf, f"P{no:02d} {st} · {d['audioSec']}s / 页面{e['dur']}s = "
                      f"{d['audioSec'] / e['dur'] * 100:.1f}% · 段{len(d['segments'])} · 字{d['chars']} · "
                      f"{d.get('speed', '—')}×")
            done += 1 if st == "ok" else 0
        except Exception as exc:  # noqa: BLE001
            fail += 1
            log(logf, f"P{no:02d} FAIL {exc}")
            log(logf, traceback.format_exc().replace("\n", " | ")[:400])
    log(logf, f"=== 结束 完成{done} 失败{fail}")


if __name__ == "__main__":
    sys.exit(main())
