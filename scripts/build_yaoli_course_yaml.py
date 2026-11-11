#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_yaoli_course_yaml.py —— 按 49 章渲染 tcmP 课程编排 course.yaml

course.yaml 是「讲什么、什么状态」的登记表，不是正文。这一科此前
`platform/courses/09-jichu/12-yaoli-xue/` 目录根本不存在（49 章只落在
departments/ 与 textbooks/ 两侧），所以平台侧看不到这门课。

本脚本只登记骨架：
  · 49 章 × video: planned（旁白 / 幻灯片 / 成片都还没有）；
  · **不写** estimate_minutes / measured_minutes —— 这两个字段的语义是
    「对 narration/lesson.json 的实测/估算值」，没有 lesson.json 就写等于编数。

状态不按计划写、按磁盘实况写：有 narration/lesson.json → narration-ready，
再有 slides/index.html → slides-ready，再有 video/lesson.mp4 → rendered。
这样以后往上层走，只要重跑本脚本，门就不会因为 yaml 过期而红。

用法：python scripts/build_yaoli_course_yaml.py [--check]
"""
import io
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB = os.path.join(ROOT, 'departments/09-jichu/12-yaoli-xue')
PLAT = os.path.join(ROOT, 'platform/courses/09-jichu/12-yaoli-xue')
OUT = os.path.join(PLAT, 'course.yaml')

HEAD = """# [tcmP] 课程编排 · 09-jichu/12-yaoli-xue
#
# 单一事实来源是 departments/09-jichu/12-yaoli-xue/chapters/<slug>/docs/zh.md
# 底本是 E:/textbooks/qhzy-药理学.xlsx（9 篇 49 章 196 节 588 小节），
# 已抽取为 standards/yaoli/底本.json（brief / body 分列，见 standards/yaoli/README.md）。
# 本文件只登记「讲什么、什么状态」，不重复正文。
#
# chapters[].slug 必须与 chapters/ 下的目录名完全一致，否则 extract_narration.js 报错退出。
#
# 2026-11-01：49 章全部 planned —— 旁白（narration/）、幻灯片（slides/）、
# 成片（video/）都还没有，所以本文件不写 estimate_minutes / measured_minutes：
# 那两个字段的意思是对 lesson.json 的实测值，没有 lesson.json 就写，属于编数。
#
# 本文件由 scripts/build_yaoli_course_yaml.py 渲染，--check 可比对漂移。
"""


def state_of(slug):
    d = os.path.join(PLAT, slug)
    if os.path.isfile(os.path.join(d, 'video/lesson.mp4')):
        return 'rendered'
    if os.path.isfile(os.path.join(d, 'slides/index.html')):
        # 幻灯片刻意可能与段数不同（拆片），有片就说明走过了 slides 一步
        return 'slides-ready'
    if os.path.isfile(os.path.join(d, 'narration/lesson.json')):
        return 'narration-ready'
    return 'planned'


def build():
    meta = json.load(io.open(os.path.join(SUB, 'meta.json'), encoding='utf-8'))
    chapters = json.load(io.open(os.path.join(SUB, 'chapters.json'), encoding='utf-8'))['chapters']
    base = json.load(io.open(os.path.join(ROOT, 'standards/yaoli/底本.json'), encoding='utf-8'))
    counts = base['counts']

    out = [HEAD]
    out.append('id: 12-yaoli-xue')
    out.append('title: 药理学')
    out.append('en: %s' % (meta.get('en') or 'Pharmacology'))
    out.append('dept: 09-jichu')
    out.append('dept_title: 基础医学院')
    out.append('semester: %d' % int(meta.get('semester') or 4))
    out.append('stage: %s' % (meta.get('stage') or 'sheng'))
    out.append('hours: %d' % int(meta.get('hours') or 72))
    out.append('chapters_target: %d' % len(chapters))
    out.append('bridge: %s' % (meta.get('bridge') or ''))
    out.append('source_text: standards/yaoli/底本.json（qhzy-药理学.xlsx · %d 篇 %d 章 %d 节 %d 小节 · %d 汉字 · 真教材）'
               % (9, counts['chapters'], counts['secs'], counts['subs'], counts['hanzi']))
    out.append('')
    out.append('platform:')
    out.append('  host: 站点内嵌播放器（site/ 自动挂载）')
    out.append('  resolution: 1920x1080')
    out.append('  fps: 25')
    out.append('  voice: zh-CN（TTS 可用时）；无 TTS 时为静音轨 + 人工配音')
    out.append('  captions: 由 narration/lesson.json 的 segments 生成，时间码只取 TTS 返回或 ffprobe 实测')
    out.append('')
    out.append('chapters:')
    for c in chapters:
        out.append('  - slug: %s' % c['slug'])
        out.append('    title: %s' % c['title'])
        out.append('    unit: %s' % c.get('unit', ''))
        st = state_of(c['slug'])
        out.append('    video: %s' % st)
        if st != 'planned':
            L = json.load(io.open(os.path.join(PLAT, c['slug'], 'narration/lesson.json'), encoding='utf-8'))
            out.append('    estimate_minutes: %.2f' % (L['estimateTotalSeconds'] / 60.0))
            if L.get('audioMeasuredSeconds'):
                out.append('    measured_minutes: %.2f' % (L['audioMeasuredSeconds'] / 60.0))
    out.append('')
    return '\n'.join(out)


def main():
    txt = build()
    old = io.open(OUT, encoding='utf-8').read() if os.path.isfile(OUT) else None
    if '--check' in sys.argv:
        if old != txt:
            print('course.yaml 与 chapters.json / 磁盘实况不一致（应重渲染）')
            sys.exit(1)
        n = {k: txt.count('video: %s' % k) for k in ('planned', 'narration-ready', 'slides-ready', 'rendered')}
        print('course.yaml 与章目一致（%d 章 · planned %d / narration-ready %d / slides-ready %d / rendered %d）'
              % (txt.count('- slug:'), n['planned'], n['narration-ready'], n['slides-ready'], n['rendered']))
        return
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(txt)
    print('写入 %s（%d 章）' % (os.path.relpath(OUT, ROOT), txt.count('- slug:')))


if __name__ == '__main__':
    main()
