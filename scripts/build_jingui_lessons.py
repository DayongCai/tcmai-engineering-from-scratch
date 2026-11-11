# -*- coding: utf-8 -*-
"""scripts/build_jingui_lessons.py —— 金匮要略视频课：成片实测 → meta.json 的 platform 块

只统计**真实存在**的产物：
  · 讲次   = platform/courses/01-zhongyi/08-jingui-yaolue/<slug>/video/lesson.mp4 存在
  · 时长   = ffprobe 对 lesson.mp4 的实测（不是 lesson.json 的 estimateSeconds）
  · 幻灯片 = slides/manifest.json 的 slideCount
  · 音频段 = narration/audio/ 里的实际文件数
  · 字节   = lesson.mp4 的实际大小
  · 已发布 = platform/media-release.json 里本课的 chapterCount（HLS 打包完成后才有）

唯一输出：departments/01-zhongyi/08-jingui-yaolue/meta.json 的 platform 块。

**为什么不写 video/教案.md**：那份文件归 `node scripts/build_video_lessons.js` 所有
（它按 media-release.json 生成讲次表并带「勿手改」抬头）。两个生成器写同一个文件必然打架，
第一版就是这么撞上的——本脚本只管「实测 → meta」，教案交给仓库台账。

用法：
  python scripts/build_jingui_lessons.py            # 写 meta.json
  python scripts/build_jingui_lessons.py --check    # 现算并与磁盘比对（不写盘）
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
RELEASE = os.path.join(ROOT, "platform", "media-release.json")
META = os.path.join(SUBJ, "meta.json")

CH = json.load(io.open(os.path.join(SUBJ, "chapters.json"), encoding="utf-8"))["chapters"]


def ffprobe(path: str):
    exe = shutil.which("ffprobe") or os.path.join(
        os.environ.get("LOCALAPPDATA", ""), "ffmpeg", "ffmpeg-9.0.2-essentials_build", "bin", "ffprobe.exe")
    if not os.path.exists(exe):
        return None
    p = subprocess.run([exe, "-v", "error", "-show_entries", "format=duration",
                        "-of", "default=nw=1:nk=1", path], capture_output=True, text=True)
    try:
        return float(p.stdout.strip())
    except ValueError:
        return None


def mmss(sec: float) -> str:
    s = int(round(sec))
    return "%d:%02d" % (s // 60, s % 60)


def measure():
    rows = []
    for c in CH:
        cdir = os.path.join(COURSE, c["slug"])
        mp4 = os.path.join(cdir, "video", "lesson.mp4")
        man = os.path.join(cdir, "slides", "manifest.json")
        adir = os.path.join(cdir, "narration", "audio")
        slides = 0
        if os.path.exists(man):
            slides = json.load(io.open(man, encoding="utf-8")).get("slideCount", 0)
        audio = len(os.listdir(adir)) if os.path.isdir(adir) else 0
        dur = ffprobe(mp4) if os.path.exists(mp4) else None
        rows.append({
            "n": c["n"], "slug": c["slug"], "title": c["title"],
            "video": bool(dur), "seconds": dur or 0.0, "slides": slides, "audio": audio,
            "bytes": os.path.getsize(mp4) if os.path.exists(mp4) else 0,
        })
    return rows


def release_published() -> int:
    """已进 media-release.json 的讲数；没打包就是 0。"""
    if not os.path.exists(RELEASE):
        return 0
    d = json.load(io.open(RELEASE, encoding="utf-8"))
    for c in d.get("courses", []):
        if c.get("id") == "%s/%s" % (DEPT, SLUG):
            return int(c.get("chapterCount") or 0)
    return 0


def platform_block(rows) -> dict:
    done = [r for r in rows if r["video"]]
    total = sum(r["seconds"] for r in done)
    return {
        "id": "tcmP",
        "coursePath": "platform/courses/%s/%s" % (DEPT, SLUG),
        "videosPublished": release_published(),
        "status": "rendered" if done else "planned",
        "narrationChapters": len(rows),
        "slideDecks": sum(1 for r in rows if r["slides"]),
        "slides": sum(r["slides"] for r in rows),
        "videosRendered": len(done),
        "videoHours": round(total / 3600, 2),
        "videoBytes": sum(r["bytes"] for r in rows),
        "audioSegments": sum(r["audio"] for r in rows),
        "_note": "videosPublished = 已进 platform/media-release.json 的讲数（HLS 打包完成）；videosRendered = 已渲染成片数。",
    }


def main() -> int:
    rows = measure()
    block = platform_block(rows)
    cur = json.load(io.open(META, encoding="utf-8"))
    check = "--check" in sys.argv[1:]

    if check:
        ok = cur.get("platform") == block
        print("✓ meta.json 的 platform 块与实测一致" if ok else "✗ meta.json 的 platform 块与实测不一致")
        if not ok:
            for k in block:
                if cur.get("platform", {}).get(k) != block[k]:
                    print("   %s: 磁盘 %r ≠ 现算 %r" % (k, cur.get("platform", {}).get(k), block[k]))
        return 0 if ok else 1

    cur["platform"] = block
    io.open(META, "w", encoding="utf-8", newline="\n").write(
        json.dumps(cur, ensure_ascii=False, indent=2) + "\n")
    done = [r for r in rows if r["video"]]
    total = sum(r["seconds"] for r in done)
    print("✓ 成片 %d/%d · 实测 %s（%.2f 小时）· %.0f MB · 已发布 %d 讲" % (
        len(done), len(rows), mmss(total), total / 3600,
        sum(r["bytes"] for r in rows) / 1048576, block["videosPublished"]))
    print("  → departments/%s/%s/meta.json（platform 块）" % (DEPT, SLUG))
    return 0


if __name__ == "__main__":
    sys.exit(main())
