#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/fix_binglishengli_53_contract.py —— 修 53 章的两处系统性契约不符

审计 L2/L3 是仓库级契约，子代理按内容模板写作时漏了两条：

1. **L3 经典引文**：docs 里必须有一处《书名·篇名》级引文（正则 `《[^》]*·[^》]*》`）。
   本课程的对应写法是 `《hermes-病理生理学讲义·第N章·N.M》`——与病理学
   `《病理学·第N章·N.M》` 同构，指向真实存在的讲义节，不是造书名。
   做法：在 MOTTO 行的引文后面补一对括号；MOTTO 若没有讲义节号，就取全章第一条。

2. **L2 skill name**：`outputs/skill-<slug>.md` 的 frontmatter `name:` 必须等于 slug
   （子代理写成了拼音名）。prompt 文件不改，它没有 name 契约。

用法：python scripts/fix_binglishengli_53_contract.py [--write]
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB = os.path.join(ROOT, 'departments/09-jichu/11-bingli-shengli-xue')
CITE = re.compile(r'补充·hermes-病理生理学讲义·第\s*(\d+)\s*章·(\d+\.\d+)')
CLASSIC = re.compile(r'《[^》]*·[^》]*》')


def main():
    write = '--write' in sys.argv
    doc = json.load(io.open(os.path.join(SUB, 'chapters.json'), encoding='utf-8'))
    fixed_classic = 0
    fixed_skill = 0
    skipped = []

    for c in doc['chapters']:
        d = os.path.join(SUB, 'chapters', c['slug'])
        dp = os.path.join(d, 'docs/zh.md')
        if not os.path.isfile(dp):
            skipped.append(c['slug'])
            continue
        s = io.open(dp, encoding='utf-8').read()

        if not CLASSIC.search(s):
            # 找 MOTTO 行里的第一章节号；没有就退到全章第一条
            motto = next((l for l in s.split('\n') if 'MOTTO' in l), '')
            m = CITE.search(motto) or CITE.search(s)
            if not m:
                skipped.append(c['slug'] + ':docs 无讲义引文')
                continue
            tag = '（《hermes-病理生理学讲义·第%s章·%s》）' % (m.group(1), m.group(2))
            if motto and 'MOTTO' in motto:
                new_motto = motto.rstrip() + tag
                s = s.replace(motto, new_motto, 1)
            else:
                # 没有 MOTTO 行：追加在「教材出处 / 补充层出处」段后
                lines = s.split('\n')
                idx = next((i for i, l in enumerate(lines) if l.startswith('**补充层出处')), None)
                if idx is None:
                    skipped.append(c['slug'] + ':找不到落点')
                    continue
                lines.insert(idx, '> 本章对应讲义节：%s' % tag)
                s = '\n'.join(lines)
            fixed_classic += 1
            if write:
                io.open(dp, 'w', encoding='utf-8', newline=os.linesep).write(s)

        sp = os.path.join(d, 'outputs', 'skill-%s.md' % c['slug'])
        if os.path.isfile(sp):
            t = io.open(sp, encoding='utf-8').read()
            m = re.search(r'^name:\s*(\S+)\s*$', t, re.M)
            # 基准名 = slug 去掉两位章号前缀（audit 的规范：03-cell-… → cell-…）
            want = re.sub(r'^\d{2}-', '', c['slug'])
            if m and m.group(1) != want:
                t = t[:m.start(1)] + want + t[m.end(1):]
                fixed_skill += 1
                if write:
                    io.open(sp, 'w', encoding='utf-8', newline=os.linesep).write(t)

    print('补经典引文 %d 章 · 改 skill name %d 个' % (fixed_classic, fixed_skill))
    if skipped:
        print('跳过 %d：%s' % (len(skipped), skipped[:5]))
    if not write:
        print('（未写入；加 --write 落地）')


if __name__ == '__main__':
    main()
