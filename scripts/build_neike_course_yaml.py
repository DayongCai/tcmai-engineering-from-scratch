#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_neike_course_yaml.py —— 按 14 章渲染 tcmP 课程编排 course.yaml

只登记「讲什么、什么状态」：
  · 14 章 × video 状态按磁盘实况逐级判定（planned < narration-ready < slides-ready < rendered）；
  · **不写** estimate_minutes / measured_minutes —— 没有 narration/lesson.json 就写等于编数。

用法：python scripts/build_neike_course_yaml.py [--check]
"""
import io
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB = os.path.join(ROOT, 'departments/01-zhongyi/10-zhongyi-neike-xue')
PLAT = os.path.join(ROOT, 'platform/courses/01-zhongyi/10-zhongyi-neike-xue')
OUT = os.path.join(PLAT, 'course.yaml')

HEAD = """# [tcmP] 课程编排 · 01-zhongyi/10-zhongyi-neike-xue
#
# 单一事实来源是 departments/01-zhongyi/10-zhongyi-neike-xue/chapters/<slug>/docs/zh.md
# 底本是 E:/textbooks/qhzy-中医内科学.xlsx（12 章 83 节 384 小节），
# 已抽取为 standards/neike/底本.json（节/小节/条目三级，见 standards/neike/README.md）。
# 本文件只登记「讲什么、什么状态」，不重复正文。
#
# 14 章 = 底本 12 章 1:1 + 第 13、14 章（证候—方剂—疗效的因果推断 / 内科分型与 ICD-11 的映射），
# 这两章底本没有对应章，引文跨章。
#
# 2026-11-01：14 章全部 planned —— 旁白 / 幻灯片 / 成片都还没有，所以本文件不写
# estimate_minutes / measured_minutes：那两个字段的意思是对 lesson.json 的实测值。
#
# 本文件由 scripts/build_neike_course_yaml.py 渲染，--check 可比对漂移。
"""


def state_of(slug):
    d = os.path.join(PLAT, slug)
    if os.path.isfile(os.path.join(d, 'video/lesson.mp4')):
        return 'rendered'
    if os.path.isfile(os.path.join(d, 'slides/index.html')):
        return 'slides-ready'
    if os.path.isfile(os.path.join(d, 'narration/lesson.json')):
        return 'narration-ready'
    return 'planned'


def build():
    meta = json.load(io.open(os.path.join(SUB, 'meta.json'), encoding='utf-8'))
    chapters = json.load(io.open(os.path.join(SUB, 'chapters.json'), encoding='utf-8'))['chapters']
    base = json.load(io.open(os.path.join(ROOT, 'standards/neike/底本.json'), encoding='utf-8'))
    c = base['counts']

    out = [HEAD]
    out.append('id: 10-zhongyi-neike-xue')
    out.append('title: 中医内科学')
    out.append('en: %s' % (meta.get('en') or 'Internal Medicine of TCM'))
    out.append('dept: 01-zhongyi')
    out.append('dept_title: 中医学院')
    out.append('semester: %d' % int(meta.get('semester') or 5))
    out.append('stage: %s' % (meta.get('stage') or 'zhi'))
    out.append('hours: %d' % int(meta.get('hours') or 108))
    out.append('chapters_target: %d' % len(chapters))
    out.append('bridge: %s' % (meta.get('bridge') or ''))
    out.append('source_text: standards/neike/底本.json（qhzy-中医内科学.xlsx · %d 章 %d 节 %d 小节 · %d 汉字 · 真教材）'
               % (c['chapters'], c['secs'], c['subs'], c['hanzi']))
    out.append('')
    out.append('platform:')
    out.append('  host: 站点内嵌播放器（site/ 自动挂载）')
    out.append('  resolution: 1920x1080')
    out.append('  fps: 25')
    out.append('  voice: zh-CN（TTS 可用时）；无 TTS 时为静音轨 + 人工配音')
    out.append('  captions: 由 narration/lesson.json 的 segments 生成，时间码只取 TTS 返回或 ffprobe 实测')
    out.append('')
    out.append('chapters:')
    for ch in chapters:
        out.append('  - slug: %s' % ch['slug'])
        out.append('    title: %s' % ch['title'])
        out.append('    unit: %s' % ch.get('unit', ''))
        st = state_of(ch['slug'])
        out.append('    video: %s' % st)
        if st != 'planned':
            L = json.load(io.open(os.path.join(PLAT, ch['slug'], 'narration/lesson.json'), encoding='utf-8'))
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
