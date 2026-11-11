# -*- coding: utf-8 -*-
"""scripts/build_jingui_course_yaml.py —— 金匮要略 [tcmP] course.yaml 渲染器

单一事实来源：departments/01-zhongyi/08-jingui-yaolue/chapters/<slug>/docs/zh.md
  → platform/pipeline/extract_narration.js → platform/courses/.../narration/lesson.json
  → build_video.js → video/lesson.mp4

本文件只登记「讲什么、什么状态、实测多长」，不重复正文，也不写估算冒充实测：
  estimate_minutes 来自 lesson.json 的 estimateTotalSeconds（按字数排期，非实测）
  measured_minutes 来自 ffprobe 对 video/lesson.mp4 的实测时长（没有成片就不写这一行）

用法：
  python scripts/build_jingui_course_yaml.py            # 渲染 course.yaml
  python scripts/build_jingui_course_yaml.py --check    # 幂等校验
"""
from __future__ import annotations

import io
import json
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEPT, SLUG = "01-zhongyi", "08-jingui-yaolue"
SUBJ = os.path.join(ROOT, "departments", DEPT, SLUG)
COURSE = os.path.join(ROOT, "platform", "courses", DEPT, SLUG)
OUT = os.path.join(COURSE, "course.yaml")

META = json.load(io.open(os.path.join(SUBJ, "meta.json"), encoding="utf-8"))
CH = json.load(io.open(os.path.join(SUBJ, "chapters.json"), encoding="utf-8"))["chapters"]

UNITS = [
    (1, 10, "主题章（框架与病类）"),
    (11, 24, "篇目精读（按篇通读）"),
]


def ffprobe_duration(path: str):
    exe = shutil.which("ffprobe") or os.path.join(
        os.environ.get("LOCALAPPDATA", ""), "ffmpeg", "ffmpeg-9.0.2-essentials_build", "bin", "ffprobe.exe")
    if not os.path.exists(exe):
        return None
    p = subprocess.run([exe, "-v", "error", "-show_entries", "format=duration",
                        "-of", "default=nw=1:nk=1", path], capture_output=True, text=True)
    if p.returncode != 0:
        return None
    try:
        return float(p.stdout.strip())
    except ValueError:
        return None


def unit_of(n: int) -> str:
    for a, b, label in UNITS:
        if a <= n <= b:
            return label
    return "—"


def build() -> str:
    lines = []
    lines.append("# [tcmP] 课程编排 · %s/%s" % (DEPT, SLUG))
    lines.append("#")
    lines.append("# 单一事实来源是 departments/%s/%s/chapters/<slug>/docs/zh.md；" % (DEPT, SLUG))
    lines.append("# 底本是外源双本：standards/jingui/底本.json（笈成·条文主见证）+ standards/jingui/gushiwen/（古诗文网·校勘）。")
    lines.append("# 本文件只登记「讲什么、什么状态、实测多长」，不重复正文。")
    lines.append("#")
    lines.append("# 24 章 ↔ 25 篇：1-10 章按主题写（覆盖 11 篇），11-24 章为篇目精读（一篇一章，覆盖 14 篇）。")
    lines.append("# estimate_minutes 是 lesson.json 的排期估算（按字数），measured_minutes 才是成片实测。")
    lines.append("# 本文件由 scripts/build_jingui_course_yaml.py 渲染，--check 可比对漂移。")
    lines.append("")
    lines.append("id: %s" % SLUG)
    lines.append("title: %s" % META["title"])
    lines.append("en: %s" % META["en"])
    lines.append("dept: %s" % DEPT)
    lines.append("dept_title: %s" % META["deptTitle"])
    lines.append("semester: %d" % META["semester"])
    lines.append("stage: %s" % META["stage"])
    lines.append("hours: %d" % META["hours"])
    lines.append("chapters_target: %d" % META["chaptersTarget"])
    lines.append("bridge: %s" % META["bridge"])
    lines.append("source_text: standards/jingui/底本.json（笈成·22 篇+序+3 附篇 · 402 条 · 174 方）+ standards/jingui/gushiwen/gushiwen.json（古诗文网 · 25 篇 · 1,282 段）")
    lines.append("")
    lines.append("platform:")
    lines.append("  host: 站点内嵌播放器（site/ 自动挂载）")
    lines.append("  resolution: 1920x1080")
    lines.append("  fps: 25")
    lines.append("  voice: zh-CN edge-tts（缺失时降级为静音轨 + 人工配音）")
    lines.append("  captions: 由 narration/lesson.json 的 segments 生成，时间码只取 TTS 返回或 ffprobe 实测")
    lines.append("")
    lines.append("chapters:")
    for c in CH:
        slug = c["slug"]
        lesson = os.path.join(COURSE, slug, "narration", "lesson.json")
        mp4 = os.path.join(COURSE, slug, "video", "lesson.mp4")
        lines.append("  - slug: %s" % slug)
        lines.append("    title: 第%d章 %s" % (c["n"], c["title"]))
        lines.append("    unit: %s" % unit_of(c["n"]))
        if os.path.exists(mp4):
            lines.append("    video: rendered")
        elif os.path.exists(lesson):
            lines.append("    video: narration-only")
        else:
            lines.append("    video: planned")
        if os.path.exists(lesson):
            narr = json.load(io.open(lesson, encoding="utf-8"))
            lines.append("    segments: %d" % narr["segmentCount"])
            lines.append("    estimate_minutes: %.2f" % (narr["estimateTotalSeconds"] / 60.0))
        if os.path.exists(mp4):
            d = ffprobe_duration(mp4)
            if d:
                lines.append("    measured_minutes: %.2f" % (d / 60.0))
    return "\n".join(lines) + "\n"


def main() -> int:
    text = build()
    check = "--check" in sys.argv[1:]
    # 只比章节段与头部生成字段：注释行允许人工修订（本脚本每次重写，故仍按全文比）
    old = io.open(OUT, encoding="utf-8").read() if os.path.exists(OUT) else None
    if check:
        if old != text:
            print("✗ platform/courses/%s/%s/course.yaml 与生成器不一致" % (DEPT, SLUG))
            return 1
        print("✓ course.yaml 与生成器一致")
        return 0
    os.makedirs(COURSE, exist_ok=True)
    if old != text:
        io.open(OUT, "w", encoding="utf-8", newline="\n").write(text)
        print("✓ 已渲染 platform/courses/%s/%s/course.yaml（%d 章）" % (DEPT, SLUG, len(CH)))
    else:
        print("· course.yaml 无变化")
    return 0


if __name__ == "__main__":
    sys.exit(main())
