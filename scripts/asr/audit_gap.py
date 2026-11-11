#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""抽听辅助：找出「旧转写有、新转写没有」的片段，并把那段音频单独切出来重转。

为什么这样查：全库重转（vad=false）后 P10 少 48 字、P12 少 55 字，光看总字数无法判断
是「删掉了重复/幻觉」还是「真丢了一句」。做法：
  ① 逐段对齐（按字覆盖），列出新转写里找不到的旧句子；
  ② 用 ffmpeg 把这些时间段从原始 WAV 切出来，单独重转一遍（不看上下文）；
  ③ 单段重转能把话说出来 → 是全库那一次漏了；说不出来 → 旧句多半是幻觉或重复。

用法: python scripts/asr/audit_gap.py 10 12
输出: standards/materials/shanghan-quannao/asr/gap-audit-P10.json 等
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MAT = os.path.join(ROOT, "standards", "materials", "shanghan-quannao")
TMP = os.path.join(os.environ.get("LOCALAPPDATA", "."), "Temp", "sqn")
MODEL = os.path.join(os.environ.get("LOCALAPPDATA", ""), "Temp", "models", "faster-whisper-turbo")


def norm(s):
    return re.sub(r"[^\u4e00-\u9fff0-9]", "", s)


def covered(seg_text, hay):
    """旧句里的四字窗口有多少能在新文本里找到（0-1）。"""
    t = norm(seg_text)
    if len(t) < 4:
        return 1.0, []
    miss, hit = [], 0
    for i in range(len(t) - 3):
        w = t[i:i + 4]
        if w in hay:
            hit += 1
        else:
            miss.append((i, w))
    return hit / max(1, len(t) - 3), miss


def main():
    nos = [int(x) for x in (sys.argv[1:] or ["10", "12"])]
    from faster_whisper import WhisperModel
    model = None
    for no in nos:
        old = json.load(open(os.path.join(MAT, "asr", "vad-backup", f"p{no:02d}.vad.json"), encoding="utf-8"))
        new = json.load(open(os.path.join(MAT, "asr", f"p{no:02d}.json"), encoding="utf-8"))
        hay = norm("".join(s["text"] for s in new["segments"]))
        gaps = []
        for s in old["segments"]:
            c, miss = covered(s["text"], hay)
            if c < 0.6:
                gaps.append({"start": s["start"], "end": s["end"], "text": s["text"], "cover": round(c, 2)})
        print(f"P{no:02d} 旧{len(old['segments'])}段 / 新{len(new['segments'])}段 · "
              f"旧字{old['chars']} 新字{new['chars']} · 疑似丢句 {len(gaps)} 段")
        for g in gaps:
            print(f"   [{int(g['start'])//60}:{int(g['start'])%60:02d}-"
                  f"{int(g['end'])//60}:{int(g['end'])%60:02d}] cover={g['cover']} {g['text'][:46]}")
        # 把疑似丢句的音频切出来单独重转
        wav = os.path.join(TMP, f"a{no:02d}.wav")
        with wave.open(wav, "rb") as w:
            arr = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
        if model is None:
            model = WhisperModel(MODEL, device="cpu", compute_type="int8", cpu_threads=6)
        for g in gaps:
            a = max(0.0, g["start"] - 0.6)
            b = min(len(arr) / 16000.0, g["end"] + 0.6)
            clip = arr[int(a * 16000):int(b * 16000)]
            if len(clip) < 16000 * 0.6:
                g["alt"] = ""
                continue
            segs, _ = model.transcribe(clip, language="zh", beam_size=5, vad_filter=False)
            g["alt"] = "".join(x.text.strip() for x in segs)
            g["altMatch"] = round(covered(g["text"], norm(g["alt"]))[0], 2)
            print(f"      单段重转：{g['alt'][:60]}  (与旧句四字覆盖 {g['altMatch']})")
        json.dump({"no": no, "gaps": gaps}, open(os.path.join(MAT, "asr", f"gap-audit-P{no:02d}.json"),
                                                "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
