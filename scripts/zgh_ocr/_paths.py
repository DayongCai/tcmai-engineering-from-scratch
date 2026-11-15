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


def doors_file():
    """门区间规格：**以仓库里 track 的那份为准**，运行时目录的同名文件只作兜底。

    为什么以 track 版为准：哪门哪几页、补段在哪，是这套管线能不能复现的规格，
    必须随代码评审；`extra`（章界落在邻卷的补段）曾经只活在 scratch 里，
    结果换一次运行就丢，湿门末几证与痰门首证整段没被解析（12 条“缺条”由此而来）。
    若确实要临时改区间，改这份文件并提交，别改 scratch 里那份。
    """
    spec = os.path.join(HERE, "门区间.json")
    run = os.path.join(DATA, "门区间.json")
    return spec if os.path.exists(spec) else run
