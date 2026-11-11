#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/render_binglishengli_53_table.py —— 重渲染课程 README 里的 53 章地图

数字全部现算：章名/slug 取 chapters.json，单元归属取讲义索引，字数取各章 docs 的非空白字符数。
手写这张表一定会漂（53 行），所以让它生成。

用法：python scripts/render_binglishengli_53_table.py [--check]
  不带参数 = 直接改写 README；--check = 只比对，不一致则 exit 1。
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB = os.path.join(ROOT, 'departments/09-jichu/11-bingli-shengli-xue')
README = os.path.join(SUB, 'README.md')
BEGIN = '<!-- BSLJ53:BEGIN -->'
END = '<!-- BSLJ53:END -->'


def build():
    doc = json.load(io.open(os.path.join(SUB, 'chapters.json'), encoding='utf-8'))
    idx = json.load(io.open(os.path.join(
        ROOT, 'standards/binglishengli/supplements/jiangyi.json'), encoding='utf-8'))
    unit_of = {int(c['no']): (u['unit'], u['counts']['chapters'])
               for u in idx['units'] for c in u['chapters']}

    out = [BEGIN,
           '| 章 | 标题 | slug | 正文非空白字 |',
           '|--:|---|---|--:|']
    cur = None
    total = 0
    built = 0
    for c in doc['chapters']:
        u, n = unit_of[c['n']]
        if u != cur:
            out.append('| **%s（%d 章）** | | | |' % (u, n))
            cur = u
        dp = os.path.join(SUB, 'chapters', c['slug'], 'docs', 'zh.md')
        if os.path.isfile(dp):
            chars = len(re.sub(r'\s', '', io.open(dp, encoding='utf-8').read()))
            built += 1
            total += chars
            size = format(chars, ',')
        else:
            size = '—'
        out.append('| %d | %s | `%s` | %s |' % (c['n'], c['title'], c['slug'], size))
    out.append('')
    out.append('合计：**%d 章**，已建 **%d 章**，正文 **%s** 非空白字。'
               % (len(doc['chapters']), built, format(total, ',')))
    out.append(END)
    return '\n'.join(out), built, total


def main():
    block, built, total = build()
    s = io.open(README, encoding='utf-8').read()
    if BEGIN in s and END in s:
        new = re.sub(re.escape(BEGIN) + r'.*?' + re.escape(END), block, s, flags=re.S)
    else:
        new = s.rstrip() + '\n\n' + block + '\n'
    if '--check' in sys.argv:
        if new != s:
            print('表格与实物不一致（应重渲染）')
            sys.exit(1)
        print('表格与实物一致 · %d 章已建 · %s 字' % (built, format(total, ',')))
        return
    io.open(README, 'w', encoding='utf-8', newline='\n').write(new)
    print('README 表格已重渲染 · %d 章已建 · %s 字' % (built, format(total, ',')))


if __name__ == '__main__':
    main()
