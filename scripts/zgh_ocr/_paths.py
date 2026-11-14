# -*- coding: utf-8 -*-
"""数据目录解析：代码进 git，中间产物留 scratch（.gitignore）。

两个目录必须分开，否则一次 OCR 会把 1.5 GB 页面图写进仓库：
  · 代码：scripts/zgh_ocr/     （tracked，可复现）
  · 数据：scratch/zgh_ocr/     （untracked；ocr/*.json 与 pages/*.png 可重新生成）

环境变量（换机、换盘时用）：
  ZGH_DATA  数据目录，默认 <repo>/scratch/zgh_ocr
  ZGH_PDF   三册 PDF 所在目录，默认 ~/Desktop/中医证候学
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
DATA = os.environ.get("ZGH_DATA") or os.path.join(ROOT, "scratch", "zgh_ocr")
PDF_DIR = os.environ.get("ZGH_PDF") or os.path.join(
    os.path.expanduser("~"), "Desktop", "中医证候学")
