#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把 MOTTO 行的出处统一成门的口径。

现状有三种写法：
  1. `——教材·药理学·第24章·24.1.1（《药理学·第24章 抗高血压药》）`   ← 门能核
  2. `——《药理学·第6章 拟胆碱药》6.2.1`                              ← 门核不到（行内没有「教材·药理学」）
  3. `——《药理学·第 26 章 抗心律失常药》·26.2.1`                      ← 同上，且章号带空格

为什么统一：门只核「带 `教材·药理学·第N章` 的行里的「」引语」。
写法 2/3 等于让 MOTTO 那句逃过逐字校验——而 MOTTO 恰恰是全员都会读到的一句，
错了最难被发现。这里只改出处写法，引语一个字不动。
"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB = os.path.join(ROOT, 'departments', '09-jichu', '12-yaoli-xue')

# ——《药理学·第 26 章 名》·26.2.1   或   ——《药理学·第26章 名》26.2.1
TAIL = re.compile(r'——《药理学·第\s*(\d+)\s*章\s*([^》]+)》[·\s]*(\d+\.\d+\.\d+)\s*$')


def main():
    doc = json.load(io.open(os.path.join(SUB, 'chapters.json'), encoding='utf-8'))
    fixed = []
    for c in doc['chapters']:
        path = os.path.join(SUB, 'chapters', c['slug'], 'docs', 'zh.md')
        if not os.path.isfile(path):
            continue
        txt = io.open(path, encoding='utf-8').read()
        lines = txt.split('\n')
        for i, line in enumerate(lines):
            if 'MOTTO' not in line:
                continue
            if '教材·药理学' in line:
                break
            m = TAIL.search(line.rstrip())
            if not m:
                break
            n, name, sec = m.group(1), m.group(2).strip(), m.group(3)
            new = '——教材·药理学·第%s章·%s（《药理学·第%s章 %s》）' % (n, sec, n, name)
            lines[i] = line[:m.start()] + new
            fixed.append(c['slug'])
            break
        else:
            continue
        io.open(path, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines))
    print('统一 MOTTO 出处 %d 章：%s' % (len(fixed), '、'.join(fixed) if fixed else '（无）'))


if __name__ == '__main__':
    main()
