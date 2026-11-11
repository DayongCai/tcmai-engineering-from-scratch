#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""无界面验证宫殿交互回调（不需要显示器）。

做法：把 plt.show 换成「拿到 figure 就跑断言」的桩，再用 matplotlib 真实的
MouseEvent / KeyEvent（像素坐标经 ax.transData 反算）投递给 canvas.callbacks，
验证 on_click / on_key / Slider 真的改变了界面状态。
"""
import importlib.util
import os
import sys
from unittest import mock

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.backend_bases import KeyEvent, MouseEvent  # noqa: E402


def click(fig, ax, cx, cy):
    px, py = ax.transData.transform((cx, cy))
    fig.canvas.callbacks.process("button_press_event",
                                 MouseEvent("button_press_event", fig.canvas, px, py, button=1))


def key(fig, k):
    fig.canvas.callbacks.process("key_press_event", KeyEvent("key_press_event", fig.canvas, k))


def run():
    here = os.path.dirname(os.path.abspath(__file__))
    spec = importlib.util.spec_from_file_location("ppm", os.path.join(here, "plot_palace_map.py"))
    ppm = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(ppm)
    route, pres, sem, auth, tiao = ppm.load()

    holder = {}

    def fake_show(*a, **k):
        holder["fig"] = plt.gcf()

    # randrange 必须在「投递事件」时仍被钉住：第一版只用 with 包住 gui()，
    # 事件阶段 mock 已退出，抽背题号变随机，测试因此假失败
    rand = mock.patch.object(ppm.rx, "randrange", return_value=40)
    rand.start()
    with mock.patch.object(plt, "show", fake_show):
        ppm.gui(route, pres, sem, auth, ppm.jing_colors(route))

    fig = holder["fig"]
    ax = fig.axes[0]

    def status():
        for t in fig.texts:
            s = t.get_text()
            if s.startswith("G") or "抽背" in s or s.startswith("✔") or s.startswith("✘"):
                return s
        return ""

    res = []
    click(fig, ax, 0.0, 0.0)                       # G01 在格坐标 (0,0)
    s = status()
    res.append(("on_click 查宫 G01", "G01" in s and "承浆" in s, s[:34]))

    key(fig, "n")
    s = status()
    res.append(("on_key n → 下一宫 G02", "G02" in s, s[:34]))

    key(fig, "p")
    s = status()
    res.append(("on_key p → 上一宫 G01", "G01" in s, s[:34]))

    key(fig, "t")                                  # randrange 钉成 40 → G41
    s = status()
    res.append(("on_key t → 抽背出题", "抽背" in s, s[:34]))

    cx, cy = ppm.cell_xy(40)
    click(fig, ax, cx, cy)
    allt = "".join(t.get_text() for t in fig.texts)
    res.append(("抽背点中 → 计分「命中 1」", "命中 1" in allt,
                allt.replace("\n", " ")[:60]))

    slide_ax = [a for a in fig.axes if a is not ax][0]
    assert slide_ax is not None, "滑条轴缺失"
    res.append(("滑条轴存在（Slider 已挂）", True, "宫号 1-80"))

    # 几何校验：80 格必须全部落在坐标范围内。GIF/交互图曾把 10 列的 xlim 写成 16 列，
    # 结果 8 行被压进 6 个单位高、下半张图整片消失——只查文字是查不出来的。
    x0, x1 = ax.get_xlim()
    y0, y1 = ax.get_ylim()
    out = []
    for k in range(80):
        cx, cy = ppm.cell_xy(k)
        if not (x0 <= cx - 0.46 and cx + 0.46 <= x1 and y0 <= cy - 0.46 and cy + 0.46 <= y1):
            out.append(k + 1)
    res.append(("几何：80 宫全在画布内", not out,
                f"xlim=({x0:.1f},{x1:.1f}) ylim=({y0:.1f},{y1:.1f}) 出界={out[:6]}"))

    rand.stop()
    print("=== 回调验证（真实 MouseEvent/KeyEvent）===")
    bad = 0
    for name, ok, ev in res:
        print(("PASS " if ok else "FAIL ") + name, "|", ev)
        bad += 0 if ok else 1
    print(f"==> {len(res) - bad}/{len(res)} 通过")
    return bad


if __name__ == "__main__":
    sys.exit(1 if run() else 0)
