#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 lesson.json 的「实测配音时长」按磁盘上的 mp3 重算。

为什么需要它：lesson.json 的 audioSeconds / audioMeasuredSeconds 是合成那一刻写下的快照。
配音后来重合成过（讲稿变长、换 TTS、补段），这两个数就过期；而 course.yaml 的
measured_minutes 与门都读它，于是三处数字互相打架：
  ffprobe(mp4) 27.48 分钟 / lesson.json 25.3 分钟 / course.yaml 27.48 分钟
以磁盘为准重算，三方才对得上。
只改「实测」字段；estimate* 是按字数估算，不碰。
"""
import glob
import json
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FFPROBE = shutil.which("ffprobe")
if not FFPROBE:
    raise SystemExit("找不到 ffprobe")


def dur(p):
    r = subprocess.run(
        [FFPROBE, "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", p],
        capture_output=True, text=True, timeout=120)
    if r.returncode != 0:
        return None
    try:
        return round(float(r.stdout.strip()), 3)
    except ValueError:
        return None


changed = 0
missing = []
scan = 0
for lp in sorted(glob.glob(os.path.join(ROOT, "platform", "courses", "*", "*", "*", "narration", "lesson.json"))):
    scan += 1
    chdir = os.path.dirname(os.path.dirname(lp))
    with open(lp, encoding="utf-8") as f:
        L = json.load(f)
    segs = L.get("segments") or []
    if not segs:
        continue
    adir = os.path.join(chdir, "narration", "audio")
    total = 0.0
    ok = True
    dirty = False
    for s in segs:
        name = s.get("audio") or f"{int(s.get('n', 0)):03d}.mp3"
        p = os.path.join(adir, name)
        if not os.path.exists(p):
            ok = False
            missing.append(f"{os.path.relpath(chdir, ROOT)}/{name}")
            break
        d = dur(p)
        if d is None:
            ok = False
            break
        total += d
        if s.get("audioSeconds") != d:
            s["audioSeconds"] = d
            dirty = True
    if not ok:
        continue
    if abs(float(L.get("audioMeasuredSeconds") or 0) - round(total, 2)) > 0.01:
        dirty = True
    L["audioMeasuredSeconds"] = round(total, 2)
    est = float(L.get("estimateTotalSeconds") or 0)
    if est > 0:
        L["estimateVsActual"] = {
            "estimateMinutes": round(est / 60.0, 2),
            "measuredMinutes": round(total / 60.0, 2),
            "ratio": round(total / est, 3) if est else None,
        }
    if dirty:
        with open(lp, "w", encoding="utf-8", newline="") as f:
            json.dump(L, f, ensure_ascii=False, indent=2)
            f.write("\n")
        changed += 1

print(f"扫描 {scan} 章 · 重算 {changed} 章 · 缺配音 {len(missing)} 章")
for m in missing[:10]:
    print("  缺:", m)
sys.exit(0)
