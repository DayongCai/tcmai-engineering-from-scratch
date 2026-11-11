# -*- coding: utf-8 -*-
"""scripts/sync_course_yaml_media.py —— 按磁盘实况回写 course.yaml 的 chapters 段

为什么需要它：
  course.yaml 的 `video` / `estimate_minutes` / `measured_minutes` 是**手工维护**的三个字段，
  而 tests/test_platform_pipeline.js 拿它们跟磁盘和 lesson.json 对账。手工维护必然烂：
  章成片了状态还写 planned、配音重跑过而 measured_minutes 还是旧值——这类「静默过期」
  正是测试要抓的。与其每章手改三行，不如让脚本从 lesson.json + 磁盘现算再回写。

  它只改 `chapters:` 段，其余内容（头部注释、platform、capstone）原样保留。

用法：
  python scripts/sync_course_yaml_media.py 01-zhongyi/01-zhongyi-jichu-lilun
  python scripts/sync_course_yaml_media.py 01-zhongyi/01-zhongyi-jichu-lilun --check
"""

from __future__ import annotations

import argparse
import io
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def state(chdir: str) -> str:
    if os.path.exists(os.path.join(chdir, 'video', 'lesson.mp4')):
        return 'rendered'
    if os.path.exists(os.path.join(chdir, 'slides', 'index.html')):
        return 'slides-ready'
    if os.path.exists(os.path.join(chdir, 'narration', 'lesson.json')):
        return 'narration-ready'
    return 'planned'


def build_block(dept_slug: str, subj: str) -> list[str]:
    chapters = json.load(io.open(os.path.join(ROOT, 'departments', dept_slug, subj, 'chapters.json'), encoding='utf-8'))
    cdir = os.path.join(ROOT, 'platform', 'courses', dept_slug, subj)
    lines = ['chapters:']
    for n, c in enumerate(chapters['chapters'], 1):
        slug = c['slug']
        chdir = os.path.join(cdir, slug)
        st = state(chdir)
        lines.append(f"  - slug: {slug}")
        lines.append(f"    title: {c['title']}")
        lines.append(f"    video: {st}")
        lesson_p = os.path.join(chdir, 'narration', 'lesson.json')
        if os.path.exists(lesson_p):
            L = json.load(io.open(lesson_p, encoding='utf-8'))
            est = L.get('estimateTotalSeconds')
            meas = L.get('audioMeasuredSeconds')
            if est:
                lines.append(f"    estimate_minutes: {est / 60:.1f}      # = lesson.json estimateTotalSeconds ÷ 60")
            if meas:
                lines.append(f"    measured_minutes: {meas / 60:.1f}      # = lesson.json audioMeasuredSeconds ÷ 60（实测配音）")
        lines.append('')
    return lines


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('target', help='<dept>/<subject>，如 01-zhongyi/01-zhongyi-jichu-lilun')
    ap.add_argument('--check', action='store_true')
    a = ap.parse_args()

    dept_slug, subj = a.target.split('/')
    path = os.path.join(ROOT, 'platform', 'courses', dept_slug, subj, 'course.yaml')
    txt = io.open(path, encoding='utf-8').read()
    lines = txt.split('\n')

    start = next(i for i, l in enumerate(lines) if l.strip() == 'chapters:')
    end = start + 1
    while end < len(lines) and not lines[end].strip().startswith('capstone:'):
        end += 1

    block = build_block(dept_slug, subj)
    new = lines[:start] + block + ([''] if end < len(lines) else []) + lines[end:]
    out = '\n'.join(new)

    if a.check:
        if out != txt:
            print(f'DRIFT: {os.path.relpath(path, ROOT)}（跑 `python scripts/sync_course_yaml_media.py {a.target}` 回写）')
            return 1
        print(f'[course-yaml] ✓ {a.target} 状态与 lesson.json / 磁盘一致')
        return 0

    if out == txt:
        print(f'[course-yaml] {a.target} 无需改动')
        return 0
    io.open(path, 'w', encoding='utf-8').write(out)
    print(f'[course-yaml] 已回写 {a.target} 的 chapters 段')
    return 0


if __name__ == '__main__':
    sys.exit(main())
