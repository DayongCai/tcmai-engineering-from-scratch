# -*- coding: utf-8 -*-
"""按磁盘实测重写 platform/README.md 里的成片清单代码块（10 章）。

测试按行核对格式 `^NN-slug  X.XX MB · YYY.YYs$`；数字来自 mp4 字节与 subtitles.json 的 videoSeconds。
"""
import io
import json
import os
import re

ROOT = r'E:\tcmai-engineering-from-scatch'
SUBJ = os.path.join(ROOT, 'platform', 'courses', '01-zhongyi', '01-zhongyi-jichu-lilun')
README = os.path.join(ROOT, 'platform', 'README.md')

rows = []
for slug in sorted(d for d in os.listdir(SUBJ) if re.match(r'^\d\d-', d)):
    mp4 = os.path.join(SUBJ, slug, 'video', 'lesson.mp4')
    sj = os.path.join(SUBJ, slug, 'narration', 'subtitles.json')
    if not (os.path.exists(mp4) and os.path.exists(sj)):
        continue
    mb = os.path.getsize(mp4) / 1048576
    sec = float(json.load(io.open(sj, encoding='utf-8'))['videoSeconds'])
    rows.append((slug, mb, sec))

text = io.open(README, encoding='utf-8').read()
block = '\n'.join(f'{s:<22} {mb:.2f} MB · {sec:.2f}s' for s, mb, sec in rows)

# 找到含「NN-slug … MB · …s」行的 ```text 代码块，整块换成最新实测
pat = re.compile(r'```text\n(?=(?:[0-9]{2}-[a-z-]+ +[0-9.]+ MB · [0-9.]+s\n)+)(?:[^\n]*\n)+?```')
assert pat.search(text), 'README 里找不到成片清单代码块'
text = pat.sub('```text\n' + block + '\n```', text, count=1)
io.open(README, 'w', encoding='utf-8').write(text)
print('rows', len(rows))
for s, mb, sec in rows:
    print(f'  {s:<24}{mb:.2f} MB {sec:.2f}s')
