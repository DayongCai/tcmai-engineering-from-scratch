#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""重渲染 departments/01-zhongyi/10-zhongyi-neike-xue/README.md 里的 14 章地图。

数字全部现算（章名/slug 取 chapters.json，字数取各章 docs 的非空白字符数，状态按磁盘实况）。
用法：python scripts/render_neike_table.py [--check]
"""
import io
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB = os.path.join(ROOT, 'departments/01-zhongyi/10-zhongyi-neike-xue')
README = os.path.join(SUB, 'README.md')
BASE = os.path.join(ROOT, 'standards/neike/底本.json')
BEGIN = '<!-- NEIKE14:BEGIN -->'
END = '<!-- NEIKE14:END -->'


def nonws(path):
    if not os.path.isfile(path):
        return 0
    return len(''.join(io.open(path, encoding='utf-8').read().split()))


def build():
    doc = json.load(io.open(os.path.join(SUB, 'chapters.json'), encoding='utf-8'))
    base = {c['no']: c for c in json.load(io.open(BASE, encoding='utf-8'))['chapters']}
    out = [BEGIN,
           '| 章 | 标题 | slug | 底本节/小节 | 非空白字 | 状态 |',
           '|--:|---|---|---|--:|---|']
    cur = None
    total = 0
    built = 0
    for c in doc['chapters']:
        u = c.get('unit', '')
        if u != cur:
            out.append('| **%s** | | | | | |' % u)
            cur = u
        b = base.get(c['n'])
        shape = '%d 节 / %d 小节' % (b['counts']['secs'], b['counts']['subs']) if b else '综合章'
        n = nonws(os.path.join(SUB, 'chapters', c['slug'], 'docs', 'zh.md'))
        total += n
        if n:
            built += 1
        out.append('| %d | %s | `%s` | %s | %s | %s |' % (
            c['n'], c['title'].split(' ', 1)[-1], c['slug'], shape,
            ('%d' % n) if n else '—', '✅' if n else '⏳'))
    out.append('')
    out.append('已写 **%d / 14** 章，正文合计 **%d** 非空白字。' % (built, total))
    out.append(END)
    return '\n'.join(out), built, total


def main():
    block, built, total = build()
    txt = io.open(README, encoding='utf-8').read() if os.path.isfile(README) else ''
    if BEGIN in txt and END in txt:
        pre, rest = txt.split(BEGIN, 1)
        _, post = rest.split(END, 1)
        new = pre + block + post
    else:
        new = txt.rstrip() + '\n\n' + block + '\n'
    if '--check' in sys.argv:
        if new != txt:
            print('README 的 14 章地图已漂移，跑 python scripts/render_neike_table.py')
            sys.exit(1)
        print('README 地图与磁盘一致（%d/14 章 · %d 字）' % (built, total))
        return
    if new != txt:
        io.open(README, 'w', encoding='utf-8', newline='\n').write(new)
        print('已重写 README 地图（%d/14 章 · %d 字）' % (built, total))
    else:
        print('无变化（%d/14 章 · %d 字）' % (built, total))


if __name__ == '__main__':
    main()
