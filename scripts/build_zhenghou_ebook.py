#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_zhenghou_ebook.py —— 《中医证候学》单书 EPUB / PDF

## 为什么要单独一支

`textbooks/build_book.js` 是按**卷**出的（五卷 · 每卷十几门课），而这一门要一本自己的书：
凡例 + 12 章（辞典正文）+ 附录 A–L。整卷重建要几小时，且会把别人的书一起重排。

本脚本只做一件事：把本学科目录下的 md 按「章节」聚合，交给 pandoc 出 EPUB 与 PDF。

    textbooks/01-zhongyi/14-zhongyi-zhenghou-xue/build/中医证候学.epub
    textbooks/01-zhongyi/14-zhongyi-zhenghou-xue/build/中医证候学.pdf

产物目录在 `.gitignore` 里（`textbooks/**/build/*.epub|pdf`）——成品不入库，源 md 才是事实来源。

## 与 build_book.js 对齐的几处坑

- `-yaml_metadata_block`：教材章里 `---` + `键: 值` 很常见，pandoc 会当元数据块直接把整书解析失败；
  元数据因此走 `--metadata-file`，正文一律关掉 yaml 块。
- `--resource-path` 指仓库根：正文里的图是 `figures/x.svg`（相对学科目录），聚合后路径会断。
  本脚本在聚合时把 `figures/` 改写成 `textbooks/<dept>/<slug>/figures/`。
- PDF 字体 `SimSun`：本机有；缺字体时宁可失败也不出占位 PDF。
- 缺 pandoc / xelatex 时明确报错退出，不生成空文件。

用法：
    python scripts/build_zhenghou_ebook.py            # epub + pdf
    python scripts/build_zhenghou_ebook.py --epub     # 只出 epub
    python scripts/build_zhenghou_ebook.py --pdf      # 只出 pdf
"""
import argparse
import io
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _which(names):
    for d in os.environ.get("PATH", "").split(os.pathsep):
        for n in names:
            p = os.path.join(d, n)
            if os.path.exists(p):
                return p
    return None


def find_pandoc():
    p = _which(["pandoc.exe", "pandoc"])
    if p:
        return p
    local = os.environ.get("LOCALAPPDATA") or os.path.join(os.path.expanduser("~"), "AppData", "Local")
    base = os.path.join(local, "pandoc")
    if os.path.isdir(base):
        for e in sorted(os.listdir(base), reverse=True):
            for cand in (os.path.join(base, e, "pandoc.exe"), os.path.join(base, e)):
                if os.path.isfile(cand) and cand.endswith("pandoc.exe"):
                    return cand
    for cand in (r"C:\Program Files\Pandoc\pandoc.exe", r"C:\Program Files (x86)\Pandoc\pandoc.exe"):
        if os.path.exists(cand):
            return cand
    return None


def find_xelatex():
    p = _which(["xelatex.exe", "xelatex"])
    if p:
        return p
    for cand in (r"C:\Users\user\AppData\Local\Programs\MiKTeX\miktex\bin\x64\xelatex.exe",
                 r"C:\Program Files\MiKTeX\miktex\bin\x64\xelatex.exe"):
        if os.path.exists(cand):
            return cand
    return None

DEPT = "01-zhongyi"
SUBJ = "14-zhongyi-zhenghou-xue"
TB = os.path.join(ROOT, "textbooks", DEPT, SUBJ)
BUILD = os.path.join(TB, "build")
BASE = "中医证候学"


def files_in_order():
    """00-凡例 → 01..12 章 → 附录 A..L（按文件名排序天然就是这个顺序）。"""
    out = []
    for name in sorted(os.listdir(TB)):
        if not name.endswith(".md"):
            continue
        out.append(os.path.join(TB, name))
    return out


def assemble():
    parts = []
    for p in files_in_order():
        md = io.open(p, encoding="utf-8").read()
        # 图路径 → 仓库根相对
        md = re.sub(r"\]\((figures/[^)\s]+)", r"](textbooks/%s/%s/\1" % (DEPT, SUBJ), md)
        md = re.sub(r'src="(figures/[^"]+)"', r'src="textbooks/%s/%s/\1"' % (DEPT, SUBJ), md)
        # 章题统一成一级标题（pandoc --top-level-division=chapter 用）
        md = re.sub(r"^# ", "# ", md, flags=re.M)
        parts.append(md.rstrip() + "\n")
    return "\n\n".join(parts)


META = """---
title: 中医证候学
subtitle: 疾病证候单元辞典 · 十二门 · 四十五类 · 291 证 · 1866 候
author: 李洪成，李新平，李新晔 编著（原书）；本库重建：tcmai-engineering
date: 2026-11
lang: zh-CN
rights: 教学与工程用途；不构成诊疗建议
---
"""


def run(cmd, timeout, label):
    print("  · %s" % label)
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        print("  ✗ %s 失败（exit %d）" % (label, r.returncode))
        print("     " + "\n     ".join((r.stderr or "").strip().split("\n")[-6:]))
        return False
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--epub", action="store_true")
    ap.add_argument("--pdf", action="store_true")
    a = ap.parse_args()
    want_epub = a.epub or not (a.epub or a.pdf)
    want_pdf = a.pdf or not (a.epub or a.pdf)

    pandoc = find_pandoc()
    xelatex = find_xelatex()
    if not pandoc:
        print("✗ 缺 pandoc —— 不生成占位 EPUB/PDF。装法见 platform/README.md")
        return 1
    if want_pdf and not xelatex:
        print("✗ 缺 xelatex —— 不生成占位 PDF。")
        return 1

    os.makedirs(BUILD, exist_ok=True)
    md_body = assemble()
    src = os.path.join(BUILD, BASE + ".md")
    meta = os.path.join(BUILD, BASE + ".meta.yaml")
    io.open(src, "w", encoding="utf-8", newline="\n").write(md_body)
    io.open(meta, "w", encoding="utf-8", newline="\n").write(META)
    print("源：%s（%d 汉字）· %d 个 md 文件" % (
        os.path.relpath(src, ROOT), len(re.findall(r"[\u4e00-\u9fff]", md_body)), len(files_in_order())))

    ok = True
    if want_epub:
        out = os.path.join(BUILD, BASE + ".epub")
        cmd = [pandoc, src, "-o", out,
               "--from", "markdown+fenced_divs+pipe_tables-yaml_metadata_block-raw_tex",
               "--metadata-file", meta,
               "--toc", "--toc-depth=1", "--top-level-division=chapter",
               "--resource-path", ROOT, "--split-level=1"]
        css = os.path.join(ROOT, "textbooks", "epub.css")
        if os.path.exists(css):
            cmd += ["--css", css]
        ok &= run(cmd, 30 * 60, "EPUB")
        if os.path.exists(out):
            print("  ✓ EPUB %s（%.1f MB）" % (os.path.relpath(out, ROOT), os.path.getsize(out) / 1e6))

    if want_pdf:
        # PDF 走 png 版：xelatex 的 \includesvg 要 inkscape，本机没有；
        # png 由 scripts/rasterize_figures.py 用 Edge 无头渲染（不动源 svg，EPUB 仍用 svg）
        pdf_src = os.path.join(BUILD, BASE + ".pdf.md")
        # 图：EPUB 用学科目录下的 svg；PDF 用 build/figures 下的 png（Edge 渲的副本，
        # 不进 figures/ —— 那里每一张图都要有 mmd/py 出处，png 副本过不了图源对账）
        pdf_body = md_body.replace("textbooks/%s/%s/figures/" % (DEPT, SUBJ),
                                   "textbooks/%s/%s/build/figures/" % (DEPT, SUBJ))
        pdf_body = pdf_body.replace(".svg)", ".png)").replace('.svg"', '.png"')
        io.open(pdf_src, "w", encoding="utf-8", newline="\n").write(pdf_body)
        out = os.path.join(BUILD, BASE + ".pdf")
        cmd = [pandoc, pdf_src, "-o", out,
               "--pdf-engine=%s" % xelatex,
               "-V", "mainfont=SimSun", "-V", "CJKmainfont=SimSun",
               "-V", "geometry:margin=2.5cm",
               "-V", "papersize=a5",
               "--toc", "--toc-depth=1",
               "-f", "markdown+pipe_tables-yaml_metadata_block-raw_tex",
               "--metadata-file", meta,
               "--resource-path", ROOT]
        ok &= run(cmd, 6 * 60 * 60, "PDF")
        if os.path.exists(out):
            print("  ✓ PDF %s（%.1f MB）" % (os.path.relpath(out, ROOT), os.path.getsize(out) / 1e6))

    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
