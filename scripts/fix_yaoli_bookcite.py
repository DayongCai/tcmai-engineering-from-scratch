#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把《药理学·第N章 章名》补进缺书名号的章节头部。

audit 的 L3 只认《书名·篇名》这一种写法（正则 《[^》]*·[^》]*》）。
部分章头的「教材出处」行只写了「教材第 N 章」，没有书名号，于是 24 章被判红。
这里只做一件确定的事：在该行的冒号后补「第一文本为《药理学·第N章 章名》；」，
不动其它任何文字。
"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB = os.path.join(ROOT, 'departments', '09-jichu', '12-yaoli-xue')
BOOK = re.compile(r'《[^》]*·[^》]*》')


def main():
    doc = json.load(io.open(os.path.join(SUB, 'chapters.json'), encoding='utf-8'))
    fixed, skipped, failed = [], [], []
    for c in doc['chapters']:
        path = os.path.join(SUB, 'chapters', c['slug'], 'docs', 'zh.md')
        if not os.path.isfile(path):
            continue
        txt = io.open(path, encoding='utf-8').read()
        if BOOK.search(txt):
            skipped.append(c['slug'])
            continue
        # 章名：chapters.json 里是「第16章 治疗…」，去掉章号前缀只留名称
        name = c['title'].split(' ', 1)[-1]
        book = '《药理学·第%d章 %s》' % (c['n'], name)
        lines = txt.split('\n')
        hit = None
        for i, line in enumerate(lines):
            if '教材出处' in line or '出处**' in line:
                hit = i
                break
        if hit is None:
            # 没有出处行：在 双根因定位 那行后面插一行
            for i, line in enumerate(lines):
                if '双根因定位' in line:
                    lines.insert(i + 1, '')
                    lines.insert(i + 2, '**教材出处**：第一文本为%s。' % book)
                    hit = i + 1
                    break
        else:
            lines[hit] = lines[hit].replace('**：', '**：第一文本为%s；' % book, 1)
            if book not in lines[hit]:
                # 冒号形态不一致时，直接在行首补一句
                lines[hit] = '**教材出处**：第一文本为%s。%s' % (book, lines[hit])
        if hit is None:
            failed.append(c['slug'])
            continue
        io.open(path, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines))
        fixed.append(c['slug'])
    print('补书名号 %d 章 · 本来就有 %d 章 · 无法定位 %d 章' % (len(fixed), len(skipped), len(failed)))
    if failed:
        print('  无法定位：', failed)


if __name__ == '__main__':
    main()
