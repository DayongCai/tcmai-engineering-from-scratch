#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_binglishengli_course_yaml.py —— 按 53 章重写 tcmP 课程编排 course.yaml

为什么要有这一份：`platform/courses/` 的 course.yaml 是「讲什么、什么状态」的登记表，
不是正文。它以前按传统 14 章写；课程章目在 2026-10-30 切到讲义 53 章之后，
这份登记表就成了**过期的手工状态**——而 `tests/test_platform_pipeline.js`
专门守这条（yaml 里 video 状态与磁盘实况不符即红）。

本脚本只登记骨架：53 章 × video: planned（旁白 / 幻灯片 / 成片都还没有），
不写 estimate_minutes / measured_minutes —— 那两个字段的语义是「对 narration/lesson.json 实测」，
现在没有 lesson.json，写了就是编数。

用法：python scripts/build_binglishengli_course_yaml.py [--check]
"""
import io
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB = os.path.join(ROOT, 'departments/09-jichu/11-bingli-shengli-xue')
OUT = os.path.join(ROOT, 'platform/courses/09-jichu/11-bingli-shengli-xue/course.yaml')

HEAD = """# [tcmP] 课程编排 · 09-jichu/11-bingli-shengli-xue
#
# 单一事实来源是 departments/09-jichu/11-bingli-shengli-xue/chapters/<slug>/docs/zh.md
# 本文件只登记「讲什么、什么状态」，不重复正文。
#
# chapters[].slug 必须与 chapters/ 下的目录名完全一致，否则 extract_narration.js 报错退出。
#
# 2026-10-30：章目从传统 14 章切到讲义 53 章（15 单元）。53 章全部 planned ——
# 旁白（narration/）、幻灯片（slides/）、成片（video/）都还没有，所以本文件
# 不写 estimate_minutes / measured_minutes：那两个字段的意思是对 lesson.json 的实测值，
# 没有 lesson.json 就写，属于编数。
#
# 章目由 scripts/plan_binglishengli_53.py 从讲义索引生成；本文件由
# scripts/build_binglishengli_course_yaml.py 渲染，--check 可比对漂移。
"""


def build():
    meta = json.load(io.open(os.path.join(SUB, 'meta.json'), encoding='utf-8'))
    chapters = json.load(io.open(os.path.join(SUB, 'chapters.json'), encoding='utf-8'))['chapters']
    idx = json.load(io.open(os.path.join(
        ROOT, 'standards/binglishengli/supplements/jiangyi.json'), encoding='utf-8'))
    unit_of = {int(c['no']): u['unit'] for u in idx['units'] for c in u['chapters']}

    out = [HEAD]
    out.append('id: 11-bingli-shengli-xue')
    out.append('title: 病理生理学')
    out.append('en: Pathophysiology')
    out.append('dept: 09-jichu')
    out.append('dept_title: 基础医学院')
    out.append('semester: %d' % int(meta.get('semester') or 4))
    out.append('stage: %s' % (meta.get('stage') or 'sheng'))
    out.append('hours: %d' % int(meta.get('hours') or 54))
    out.append('chapters_target: %d' % len(chapters))
    out.append('bridge: %s' % (meta.get('bridge') or ''))
    out.append('source_text: standards/binglishengli/supplements/jiangyi（讲义 15 单元 53 章 · 第一文本）')
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
        out.append('    title: 第 %d 章 · %s' % (c['n'], c['title']))
        out.append('    unit: %s' % unit_of[c['n']])
        # 状态按磁盘实况写，不按计划写：有 narration/lesson.json 就是 narration-ready。
        # estimate_minutes 只能来自 lesson.json 的 estimateTotalSeconds（脚本不再另算一遍），
        # 否则两处数字迟早对不上 —— tests/test_platform_pipeline.js 会当场点名。
        les = os.path.join(ROOT, 'platform/courses/09-jichu/11-bingli-shengli-xue',
                           c['slug'], 'narration/lesson.json')
        if os.path.isfile(les):
            L = json.load(io.open(les, encoding='utf-8'))
            # 状态按磁盘实况逐级写：有 slides/index.html 就是 slides-ready，否则 narration-ready。
            # 与 tests/test_platform_pipeline.js 的 RANK 口径一致（planned < narration-ready < slides-ready < rendered）。
            slide = os.path.join(ROOT, 'platform/courses/09-jichu/11-bingli-shengli-xue',
                                 c['slug'], 'slides/index.html')
            video_mp4 = os.path.join(ROOT, 'platform/courses/09-jichu/11-bingli-shengli-xue',
                                     c['slug'], 'video/lesson.mp4')
            # 逐级按磁盘实况：成片 > 幻灯片 > 旁白（与 test_platform_pipeline 的 RANK 同口径）
            if os.path.isfile(video_mp4):
                state = 'rendered'
            elif os.path.isfile(slide):
                state = 'slides-ready'
            else:
                state = 'narration-ready'
            out.append('    video: %s' % state)
            out.append('    estimate_minutes: %.2f' % (L['estimateTotalSeconds'] / 60.0))
            # 有配音才写实测：两个字段并列，读者一眼看出估算偏了多少
            if L.get('audioMeasuredSeconds'):
                out.append('    measured_minutes: %.2f' % (L['audioMeasuredSeconds'] / 60.0))
            # 有配音就把实测时长也写进来——两个字段并列，读者能直接看出估算偏了多少
        else:
            out.append('    video: planned')
    out.append('')
    return '\n'.join(out)


def main():
    txt = build()
    old = io.open(OUT, encoding='utf-8').read() if os.path.isfile(OUT) else None
    if '--check' in sys.argv:
        if old != txt:
            print('course.yaml 与 chapters.json 不一致（应重渲染）')
            sys.exit(1)
        # 四个状态都要数：只数三层时，成片落地后这一行会印出「planned 0」却看不出 rendered 53
        n = {k: txt.count('video: %s' % k) for k in ('planned', 'narration-ready', 'slides-ready', 'rendered')}
        print('course.yaml 与章目一致（%d 章 · planned %d / narration-ready %d / slides-ready %d / rendered %d）'
              % (txt.count('- slug:'), n['planned'], n['narration-ready'], n['slides-ready'], n['rendered']))
        return
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(txt)
    print('写入 %s（%d 章）' % (os.path.relpath(OUT, ROOT), txt.count('- slug:')))


if __name__ == '__main__':
    main()
