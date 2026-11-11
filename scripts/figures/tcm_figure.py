# -*- coding: utf-8 -*-
"""scripts/figures/tcm_figure.py —— 教材插图统一主题（matplotlib）

用途
    教材里的数据图 / 函数图 / 统计图不必每张重复设置字体与配色。
    用法：

        import sys, pathlib
        sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3] / 'scripts' / 'figures'))
        from tcm_figure import canvas, save

        fig, ax = canvas(7, 4)
        ax.plot(x, y, label='木（春）')
        save(fig)            # 输出路径由 render.js 通过 argv[1] 传入

配色为什么是浅底
    textbooks/build_book.js 产出的单文件书是纸质浅底
    （--paper #fbf8f2 / --ink #1f1b16 / --line #ddd3c4 / --accent #8a5a2b）。
    图若用深色底，嵌进书里就是一块突兀的黑洞。这里的取值与那份 CSS 同源，
    改一处配色时两处都要改 —— 所以常量写在一起，便于对照。

字体
    宋体栈与 build_book.js 的 font-family 一致：
    Noto Serif SC → Source Han Serif CN → Songti SC → SimSun。
    本机只确定有 SimSun / SimHei / Microsoft YaHei，按此顺序回退。
"""

import sys
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager

# ── 主题常量（与 textbooks/build_book.js 的 CSS 变量同源）──
PAPER = "#fbf8f2"
INK = "#1f1b16"
MUTED = "#6b6156"
LINE = "#ddd3c4"
ACCENT = "#8a5a2b"      # 赭石
PANEL = "#f3ede2"

# 五行 / 五脏常用色（浅底可读版本，非纯饱和色）
WUXING = {
    "木": "#4a7c59",     # 青
    "火": "#b5443a",     # 赤
    "土": "#b8860b",     # 黄
    "金": "#8c8375",     # 白（浅底需加深才可见）
    "水": "#2f4d6e",     # 黑（取墨蓝）
}

_FONT_CANDIDATES = [
    ("C:/Windows/Fonts/NotoSerifSC-Regular.otf", "Noto Serif SC"),
    ("C:/Windows/Fonts/simsun.ttc", "SimSun"),
    ("C:/Windows/Fonts/simhei.ttf", "SimHei"),
    ("C:/Windows/Fonts/msyh.ttc", "Microsoft YaHei"),
    ("/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc", "Noto Serif CJK SC"),
    ("/System/Library/Fonts/Supplemental/Songti.ttc", "Songti SC"),
]

_font_name = None


def _ensure_font():
    """注册并选定一个可用中文字体。找不到就明确失败，不出豆腐块图。"""
    global _font_name
    if _font_name:
        return _font_name
    for path, name in _FONT_CANDIDATES:
        try:
            font_manager.fontManager.addfont(path)
        except Exception:
            continue
    available = {f.name for f in font_manager.fontManager.ttflist}
    for _, name in _FONT_CANDIDATES:
        if name in available:
            _font_name = name
            break
    if _font_name is None:
        sys.exit(
            "✗ 找不到可用的中文字体（试过 Noto Serif SC / SimSun / SimHei / Microsoft YaHei）。\n"
            "  教材插图缺中文就是豆腐块，本脚本不生成这种图。"
        )
    return _font_name


def _apply_theme():
    name = _ensure_font()
    plt.rcParams.update({
        "font.family": name,
        "axes.unicode_minus": False,        # 负号用 ASCII，避免缺字形
        "figure.facecolor": PAPER,
        "axes.facecolor": PAPER,
        "savefig.facecolor": PAPER,
        "axes.edgecolor": LINE,
        "axes.linewidth": 0.9,
        "axes.labelcolor": INK,
        "axes.titlecolor": INK,
        "text.color": INK,
        "xtick.color": MUTED,
        "ytick.color": MUTED,
        "grid.color": LINE,
        "grid.linewidth": 0.8,
        "legend.frameon": True,
        "legend.facecolor": PAPER,
        "legend.edgecolor": LINE,
        "legend.framealpha": 0.95,
        "font.size": 10.5,
        "axes.titlesize": 12.5,
        "axes.labelsize": 10.5,
        "figure.autolayout": False,
    })


def canvas(w=7.0, h=4.0, dpi=160):
    """返回 (fig, ax)，主题已应用。多子图请用 canvas_grid。"""
    _apply_theme()
    fig, ax = plt.subplots(figsize=(w, h), dpi=dpi)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    return fig, ax


def canvas_grid(rows, cols, w=7.0, h=4.0, dpi=160, **kw):
    """多子图版 canvas。"""
    _apply_theme()
    fig, axes = plt.subplots(rows, cols, figsize=(w, h), dpi=dpi, **kw)
    for ax in (axes.ravel() if hasattr(axes, "ravel") else [axes]):
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
    return fig, axes


def save(fig, out=None, tight=True):
    """保存为 SVG（默认）或按扩展名推断。

    out 省略时取 sys.argv[1] —— render.js 就是这么调用的，
    这样图源脚本本身不需要知道自己在仓库里的相对位置。
    """
    if out is None:
        if len(sys.argv) < 2:
            sys.exit("✗ 未给出输出路径：用法 python <图源>.py <out.svg>")
        out = sys.argv[1]
    if tight:
        fig.tight_layout()
    fmt = "svg" if out.lower().endswith(".svg") else None
    fig.savefig(out, format=fmt)
    plt.close(fig)
    print(f"  ✓ {out}")
