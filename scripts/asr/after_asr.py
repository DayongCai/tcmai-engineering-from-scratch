#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""ASR 收尾入库：所有已转完的讲课录像 → 材料库产物（幂等，可反复跑）

由 cron 每 30 分钟调用；也可以在终端手动跑：
    python scripts/asr/after_asr.py

行为：
  · 对每个已存在 sources/asr/<slug>.json 且尚未生成 md 的 slug，调用
    node scripts/import_asr_materials.js <slug>
  · 有新入库时，跑一次 materials:map 并打印摘要（有新内容才输出，cron 才会推送）
  · 没有新内容 → 不输出（no_agent cron 视为「无事」）
"""

import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MAT = os.path.join(ROOT, "standards", "materials")
SLUGS = ["gainian-lectures", "qiqing-lectures", "shanghan-lectures", "neijing-lectures"]
NODE = "node"


def run(args):
    return subprocess.run(args, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")


def main():
    done = []
    for slug in SLUGS:
        asr = os.path.join(MAT, slug, "sources", "asr", f"{slug}.json")
        if not os.path.exists(asr):
            continue
        # 已入库判定：目录里有 md 且 registry 已登记
        d = os.path.join(MAT, slug)
        has_md = any(f.endswith(".md") for f in os.listdir(d)) if os.path.isdir(d) else False
        if has_md:
            continue
        r = run([NODE, "scripts/import_asr_materials.js", slug])
        if r.returncode == 0 and r.stdout.strip():
            done.append(r.stdout.strip().splitlines()[-1])
        else:
            print(f"[{slug}] 入库失败：{r.stderr.strip()[:300]}")

    if not done:
        return 0

    m = run([NODE, "scripts/map_materials_to_subjects.js"])
    tail = [ln for ln in m.stdout.splitlines() if "有源学科" in ln or "强命中" in ln]
    print("ASR 入库完成：" + "；".join(done))
    for ln in tail[:4]:
        print("  " + ln.strip())
    return 0


if __name__ == "__main__":
    sys.exit(main())
