#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/crosscheck_daolun.py —— 跨课对账：《护理学导论》×《中医护理学》

为什么做这一层：
  导论是总纲，中医护理学是专科。总纲的价值在于「专科里真的用了它」——
  如果导论讲的护理程序在专科课里几乎不出现，那导论就只是入学时的门面。

判据：取导论的三辨词表，在同一口径下量两课语料的每万字密度，比「导论讲的，专科用不用」。
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'standards', 'huli-daolun', '跨课对账.json')

KW = {
    '护理程序': ['评估', '诊断', '计划', '实施', '评价', '程序', '目标'],
    '专业与伦理': ['伦理', '法律', '道德', '权利', '义务', '责任', '专业', '沟通', '人文', '关怀'],
    '安全意识': ['安全', '质量', '不良事件', '核对', '告知', '风险', '差错'],
    '辨证': ['辨证', '证候', '证型', '寒热', '虚实', '体质'],
}


def corpus(sub):
    d = json.load(open(os.path.join(ROOT, 'standards', sub, 'units.json'), encoding='utf-8'))
    return '\n'.join(u['prose'] for u in d['units']), sum(u['hanzi'] for u in d['units']), d


def main():
    t1, h1, d1 = corpus('huli-daolun')
    t2, h2, d2 = corpus('zhongyi-huli')
    rows = {}
    for k, ws in KW.items():
        a = sum(t1.count(w) for w in ws) / h1 * 10000
        b = sum(t2.count(w) for w in ws) / h2 * 10000
        rows[k] = {'护理学导论': round(a, 1), '中医护理学': round(b, 1),
                   '比值(专科/导论)': round(b / a, 2) if a else None}
    counts = {'导论汉字': h1, '中医护理汉字': h2, '导论单元': len(d1['units']), '中医护理单元': len(d2['units'])}
    json.dump({'note': '两课用同一组关键词，比每万字密度；比值 >1 表示专科课比导论更常出现该词类。',
               'counts': counts, 'density': rows},
              open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(counts)
    for k, v in rows.items():
        print(f"  {k}: 导论 {v['护理学导论']} · 专科 {v['中医护理学']} · 比 {v['比值(专科/导论)']}")


if __name__ == '__main__':
    main()
