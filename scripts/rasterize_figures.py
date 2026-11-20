#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/rasterize_figures.py —— 把学科目录下的 SVG 图转成 PNG（供 PDF 用）

## 为什么需要

pandoc 出 PDF（xelatex）遇到 `![](x.svg)` 会生成 `\includesvg`，而 `svg` 包要求 inkscape；
本机没有 inkscape / rsvg / magick，于是整本 PDF 在第一个图处失败：

    Package svg Error: File `.../fig-01-….svg' not found ...
    l.427 ...hou-xue/figures/fig-01-四级编码与ICD11同构.svg

EPUB 不受影响（EPUB 直接带走 svg）。所以只给 PDF 版准备一份 png：
用本机的 Edge 无头模式把 svg 渲染成 png（`--headless --screenshot`）。

**不做的事**：不改源 svg、不改 EPUB 路径、不用 pymupdf 硬转（mermaid 出来的 svg 走 muPDF 会变黑块，
这条坑在 scanned-book-reconstruction 技能里记着）。

用法：
    python scripts/rasterize_figures.py textbooks/01-zhongyi/14-zhongyi-zhenghou-xue/figures textbooks/01-zhongyi/14-zhongyi-zhenghou-xue/build/figures
"""
import io
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.parse

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"


def svg_size(text):
    m = re.search(r'viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"', text)
    if m:
        return float(m.group(3)), float(m.group(4))
    m = re.search(r'width="([\d.]+)"[^>]*height="([\d.]+)"', text)
    if m:
        return float(m.group(1)), float(m.group(2))
    return 1200.0, 600.0


def main():
    d = sys.argv[1] if len(sys.argv) > 1 else "."
    out_dir = sys.argv[2] if len(sys.argv) > 2 else d
    if not os.path.exists(EDGE):
        print("✗ 缺 Edge，无法栅格化 SVG：%s" % EDGE)
        return 1
    os.makedirs(out_dir, exist_ok=True)
    svgs = [f for f in sorted(os.listdir(d)) if f.endswith(".svg")]
    if not svgs:
        print("· 没有 svg")
        return 0
    ok = 0
    for f in svgs:
        src = os.path.abspath(os.path.join(d, f))
        dst = os.path.join(os.path.abspath(out_dir), f[:-4] + ".png")
        w, h = svg_size(io.open(src, encoding="utf-8").read())
        # 2 倍分辨率，保证 A5 纸面上不糊
        ww, hh = int(min(2400, max(600, w * 2))), int(min(2400, max(300, h * 2)))
        # 截图先落到 ASCII 临时路径：Edge 对含中文的 --screenshot 参数会静默失败
        tmp = os.path.join(tempfile.gettempdir(), "tcmfig-%08d.png" % (abs(hash(f)) % 10 ** 8))
        r = subprocess.run([EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                            "--force-device-scale-factor=2",
                            "--window-size=%d,%d" % (ww, hh),
                            "--screenshot=" + tmp,
                            "file:///" + urllib.parse.quote(src.replace("\\", "/"), safe="/:")],
                           capture_output=True, text=True, timeout=180)
        if os.path.exists(tmp) and os.path.getsize(tmp) > 2000:
            shutil.move(tmp, dst)
        if os.path.exists(dst) and os.path.getsize(dst) > 2000:
            ok += 1
            print("  ✓ %s → %s（%d KB）" % (f, os.path.basename(dst), os.path.getsize(dst) // 1024))
        else:
            print("  ✗ %s 未产出 png（exit %d）%s" % (f, r.returncode, (r.stderr or "")[-200:]))
    print("完成 %d/%d" % (ok, len(svgs)))
    return 0 if ok == len(svgs) else 1


if __name__ == "__main__":
    raise SystemExit(main())
