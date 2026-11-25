#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 course.yaml 的 estimate_minutes / measured_minutes 对齐到 lesson.json。

为什么需要它：这两个字段有三个写入方——
  1. course.yaml 生成器（build_*_course_yaml.py）按自己的口径写；
  2. 人按旧数据手写；
  3. 讲稿重抽取后 lesson.json 的 estimate / audio 实测全变了。
三者不一致时，门会报「course.yaml 的时长与 lesson.json 一致（声明了来源就必须对得上）」。

口径（与 tests/test_video_ledger.js 一致）：
  estimate_minutes = lesson.json.estimateTotalSeconds / 60
  measured_minutes = lesson.json.audioMeasuredSeconds / 60（实测配音，不是估算）
lesson.json 的实测值由 scripts/sync_lesson_audio.py 按磁盘 mp3 重算，所以这条链是：
  mp3 → lesson.json → course.yaml

放在 rebuild:all 的「所有 course.yaml 生成器之后、video_lessons 之前」，
否则生成器会把它们写回旧值。
"""
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def lesson_of(cdir, slug):
    p = os.path.join(cdir, slug, "narration", "lesson.json")
    if not os.path.exists(p):
        return None
    try:
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return None


def set_field(seg, key, minutes):
    """把 seg（一章的 yaml 片段）里的 key 改成 minutes；没有就补在 estimate_minutes 之后。"""
    m = re.search(rf"({key}:\s*)([\d.]+)", seg)
    if m:
        if abs(float(m.group(2)) - minutes) <= 0.05:
            return seg, False
        return seg[:m.start(2)] + f"{minutes}" + seg[m.end(2):], True
    em = re.search(r"estimate_minutes:[\d.]+\s*\n", seg)
    add = f"    {key}: {minutes}\n"
    if em:
        return seg[:em.end()] + add + seg[em.end():], True
    return seg.rstrip("\n") + "\n" + add, True


changed = 0
scanned = 0
for yml in sorted(glob.glob(os.path.join(ROOT, "platform", "courses", "*", "*", "course.yaml"))):
    cdir = os.path.dirname(yml)
    with open(yml, encoding="utf-8") as f:
        text = f.read()
    orig = text
    for _ in range(200):  # 每改一处重新扫块（偏移会变），上限保护
        blocks = list(re.finditer(r"^(\s*)-\s+slug:\s*(\S+)\s*$", text, flags=re.M))
        touched = False
        for i, m in enumerate(blocks):
            slug = m.group(2)
            start = m.start()
            end = blocks[i + 1].start() if i + 1 < len(blocks) else len(text)
            seg = text[start:end]
            L = lesson_of(cdir, slug)
            if not L:
                continue
            est = float(L.get("estimateTotalSeconds") or 0)
            meas = float(L.get("audioMeasuredSeconds") or 0)
            newseg = seg
            did = False
            if est > 0:
                newseg, d1 = set_field(newseg, "estimate_minutes", round(est / 60.0, 2))
                did = did or d1
            if meas > 0:
                newseg, d2 = set_field(newseg, "measured_minutes", round(meas / 60.0, 2))
                did = did or d2
            if did:
                text = text[:start] + newseg + text[end:]
                changed += 1
                touched = True
                break
        if not touched:
            break
    if text != orig:
        with open(yml, "w", encoding="utf-8", newline="") as f:
            f.write(text)
    scanned += 1

print(f"扫描 {scanned} 门 · 改 {changed} 章")
sys.exit(0)
