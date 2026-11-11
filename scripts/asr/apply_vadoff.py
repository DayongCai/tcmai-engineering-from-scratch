#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把重转结果（pNN.re.json）验过再换上，旧版一律进 asr/vad-backup/。

门槛（任一条不过就整讲不换，并记入 rejected）：
  1) 覆盖：audioSec / 页面时长 ≥ 0.985
  2) 体量：新字数 ≥ 旧字数 × 0.85（VAD 关掉只会多不会少）
  3) 非空：段数 > 0
  4) 坐标：首段 ≤ 旧首段 + 0.5（允许提前，不允许变晚）
  5) 收尾：所有 end ≤ audioSec（片尾字幕卡被拉长的情况一律裁到音频长度）

用法: python scripts/asr/apply_vadoff.py [--dry]
"""
import argparse
import json
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MAT = os.path.join(ROOT, "standards", "materials", "shanghan-quannao")
ASRD = os.path.join(MAT, "asr")
BAK = os.path.join(ASRD, "vad-backup")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry", action="store_true")
    a = ap.parse_args()
    eps = {e["no"]: e for e in json.load(open(os.path.join(MAT, "sources", "episodes.json"),
                                             encoding="utf-8"))["episodes"]}
    os.makedirs(BAK, exist_ok=True)
    done, rejected, missing = [], [], []
    print(f"{'讲':>4} {'覆盖':>6} {'段 旧→新':>12} {'字 旧→新':>14} {'首段 旧→新':>12}  判定")
    for no in sorted(eps):
        cur = os.path.join(ASRD, f"p{no:02d}.json")
        new = os.path.join(ASRD, f"p{no:02d}.re.json")
        if not os.path.exists(new):
            missing.append(no)
            continue
        old = json.load(open(cur, encoding="utf-8")) if os.path.exists(cur) else {"segments": [], "chars": 0}
        d = json.load(open(new, encoding="utf-8"))
        segs = d["segments"]
        cover = d["audioSec"] / eps[no]["dur"]
        o_first = old["segments"][0]["start"] if old.get("segments") else 99
        why = []
        if cover < 0.985:
            why.append("覆盖<98.5%")
        if segs and sum(len(s["text"]) for s in segs) < old.get("chars", 0) * 0.85:
            why.append("字数缩水")
        if not segs:
            why.append("空转写")
        if segs and segs[0]["start"] > o_first + 0.5:
            why.append("首段反而变晚")
        ok = not why
        print(f"P{no:02d} {cover * 100:5.1f}% "
              f"{len(old.get('segments', [])):>5}→{len(segs):<5} "
              f"{old.get('chars', 0):>6}→{sum(len(s['text']) for s in segs):<6} "
              f"{o_first:5.1f}→{segs[0]['start'] if segs else 0:<5.1f} "
              f"{'换上' if ok else '拒绝：' + '、'.join(why)}")
        if not ok:
            rejected.append((no, why))
            continue
        if not a.dry:
            b = os.path.join(BAK, f"p{no:02d}.vad.json")
            if os.path.exists(cur) and not os.path.exists(b):
                shutil.copy(cur, b)
            body = dict(d)
            body["segments"] = [{"start": s["start"], "end": min(s["end"], d["audioSec"]),
                                 "text": s["text"]} for s in segs]
            body["chars"] = sum(len(s["text"]) for s in body["segments"])
            body.setdefault("note", "2026-10-26 全量重转（vad_filter=false）；旧版见 asr/vad-backup/")
            json.dump(body, open(cur, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        done.append(no)
    print(f"\n换上 {len(done)} 讲；拒绝 {len(rejected)}；缺重转 {len(missing)} {missing}")
    if rejected:
        print("拒绝明细：", rejected)
    return 1 if rejected else 0


if __name__ == "__main__":
    sys.exit(main())
