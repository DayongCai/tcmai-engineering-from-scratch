#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/crosscheck_huli.py —— 跨课对账：《中医护理学》×《中药学》

为什么要做这一层：
  护理与中药看似天然相连（外治、饮食、服药护理），本课第 12/13 章也确实讲这两件事。
  本节量的是：**护理课到底点不点具体药名**——如果几乎不点，那「医护药」的分工在文本上就是分得开的。

判据：以《中药学》药物库 287 个药名为名单，统计本课语料中的命中；
  同时用同一套技术词统计本课自身的操作密度，作为对照。
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'standards', 'zhongyi-huli', '跨课对账.json')

TECH = ['灸', '拔罐', '留罐', '刮痧', '推拿', '穴位', '按压', '熏洗', '外敷', '贴敷', '耳穴', '艾']
DOC = ['记录', '文书', '评估', '观察', '交接班', '核对', '告知']


def corpus(sub):
    d = json.load(open(os.path.join(ROOT, 'standards', sub, 'units.json'), encoding='utf-8'))
    return '\n'.join(u['prose'] for u in d['units']), d


def main():
    hl, d_hl = corpus('zhongyi-huli')
    drugs = json.load(open(os.path.join(ROOT, 'standards', 'zhongyao-xue', '药物库.json'), encoding='utf-8'))['drugs']
    names = sorted({x['药名'] for x in drugs if x['药名'] and re.fullmatch(r'[\u4e00-\u9fff]{2,6}', x['药名'])})
    hit = [n for n in names if n in hl]
    han = sum(u['hanzi'] for u in d_hl['units'])

    counts = {
        '药物库药名': len(names),
        '本课提到药名': len(hit),
        '药名覆盖率': round(len(hit) / len(names), 3) if names else None,
        '本课汉字': han,
        '药名密度(每万字)': round(len(hit) / han * 10000, 2) if han else None,
        '技术词密度(每万字)': round(sum(hl.count(w) for w in TECH) / han * 10000, 1) if han else None,
        '文书词密度(每万字)': round(sum(hl.count(w) for w in DOC) / han * 10000, 1) if han else None,
    }
    json.dump({'note': '本课语料对《中药学》药名的命中；技术词/文书词密度作对照，说明本课的操作重心。',
               'counts': counts, '命中药名': hit},
              open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(counts)
    print('命中', hit)


if __name__ == '__main__':
    main()
