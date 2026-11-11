#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/sync_binglishengli_chapter_expect.py —— 讲义扩写后，同步各课程章单测里锁死的规模数

为什么需要：每章 `code/main.test.js` 把「节数 / 段数 / 汉字 / 非空白字符」四个数写死，
这是**有意**的防漂移断言——讲义改了而课程章没跟上，测试就该红。所以讲义扩写后不能放宽断言，
只能把这四个数按新的实物改过来，让测试重新锁住（新的）真相。

五种写法都得认（各章由不同子代理写成，字面不统一）：
  `"hanzi": 3253` ・ `chars: 4208` ・ `.hanzi, 3202` ・ `(paras, 59)`
  `… 11 节 59 段 2915 汉字 4679 非空白字符` ・ `本章 10 节，讲义 3006 汉字、4029 非空白字`

用法：
  python scripts/sync_binglishengli_chapter_expect.py            # 只报告
  python scripts/sync_binglishengli_chapter_expect.py --write    # 落地
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB = os.path.join(ROOT, 'departments/09-jichu/11-bingli-shengli-xue')
IDX = os.path.join(ROOT, 'standards/binglishengli/supplements/jiangyi.json')

KEYS = ('hanzi', 'chars', 'paras', 'secs')


def measure(book, ch):
    c = next(x for u in book['units'] for x in u['chapters'] if int(x['no']) == ch)
    paras = sum(len(s.get('paras') or []) for s in c['secs'])
    hanzi = c.get('hanzi') or sum(s.get('hanzi') or 0 for s in c['secs'])
    chars = c.get('chars') or sum(len(re.sub(r'\s', '', p))
                                  for s in c['secs'] for p in (s.get('paras') or []))
    return dict(secs=len(c['secs']), paras=paras, hanzi=hanzi, chars=chars)


def patch(src, new):
    # 1) 带引号的键： "chars": 4929
    src = re.sub(r'(["\'])(hanzi|chars|paras|secs)\1(\s*:\s*)(\d+)',
                 lambda m: m.group(1) + m.group(2) + m.group(1) + m.group(3) + str(new[m.group(2)]),
                 src)
    # 2) 裸键： chars: 4208（EXPECT 对象）
    src = re.sub(r'(\b(?:hanzi|chars|paras|secs)\s*:\s*)(\d+)',
                 lambda m: m.group(1) + str(new[re.match(r'\w+', m.group(1)).group(0)]), src)
    # 3) 属性断言： .hanzi, 3202
    src = re.sub(r'\.(hanzi|chars|paras|secs)(\s*,\s*)(\d+)',
                 lambda m: '.' + m.group(1) + m.group(2) + str(new[m.group(1)]), src)
    # 4) 裸标识符断言： assert.strictEqual(paras, 59)
    src = re.sub(r'(\b(?:hanzi|chars|paras|secs))(\s*,\s*)(\d+)(\s*\))',
                 lambda m: m.group(1) + m.group(2) + str(new[m.group(1)]) + m.group(4), src)
    # 5) 中文标题/说明里的四种量（先长后短，避免「非空白字」吃掉「非空白字符」）
    src = re.sub(r'(\d+)(\s*非空白字符)', lambda m: str(new['chars']) + m.group(2), src)
    src = re.sub(r'(\d+)(\s*非空白字)', lambda m: str(new['chars']) + m.group(2), src)
    src = re.sub(r'(\d+)(\s*汉字)', lambda m: str(new['hanzi']) + m.group(2), src)
    src = re.sub(r'(\d+)(\s*段)', lambda m: str(new['paras']) + m.group(2), src)
    src = re.sub(r'(\d+)(\s*节)', lambda m: str(new['secs']) + m.group(2), src)
    return src


def main():
    write = '--write' in sys.argv
    book = json.load(io.open(IDX, encoding='utf-8'))
    chapters = json.load(io.open(os.path.join(SUB, 'chapters.json'), encoding='utf-8'))['chapters']
    changed = []
    for c in chapters:
        tp = os.path.join(SUB, 'chapters', c['slug'], 'code', 'main.test.js')
        if not os.path.isfile(tp):
            continue
        s = io.open(tp, encoding='utf-8').read()
        new = measure(book, c['n'])
        p = patch(s, new)
        if p != s:
            changed.append((c['n'], c['slug'], new, tp, p))
    print('需要同步 %d 章：' % len(changed))
    for n, slug, new, _, _ in changed:
        print('  C%02d %-56s 节 %d · 段 %d · 汉字 %d · 非空白 %d'
              % (n, slug[:56], new['secs'], new['paras'], new['hanzi'], new['chars']))
    if not write:
        print('\n（未写入；加 --write 落地）')
        return
    for _, _, _, tp, p in changed:
        io.open(tp, 'w', encoding='utf-8', newline=os.linesep).write(p)
    print('\n已同步 %d 章' % len(changed))


if __name__ == '__main__':
    main()
