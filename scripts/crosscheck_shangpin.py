#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/crosscheck_shangpin.py —— 跨课对账：《中药商品学》×《中药鉴定学》×《中药分析学》

为什么做这一层：
  商品学把货分成「规格等级」，鉴定学回答「真不真」，分析学回答「合不合格」。
  三课合起来才是一条完整的判断：像不像（鉴定）→ 合格不合格（分析）→ 值多少钱（商品）。
  本节只量一件事：**商品学点到的品种，后两课接住了几味**。

判据：以《中药学》药物库 287 个药名为名单（三课共用），
  在商品学语料里出现的算「商品学点到」；该药名同时出现在鉴定学 / 分析学语料里算「接住」。
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'standards', 'zhongyao-shangpin', '跨课对账.json')


def corpus(sub):
    p = os.path.join(ROOT, 'standards', sub, 'units.json')
    d = json.load(open(p, encoding='utf-8'))
    return '\n'.join(u['prose'] for u in d['units']), d


def main():
    sp, d_sp = corpus('zhongyao-shangpin')
    jd, d_jd = corpus('zhongyao-jianding')
    fx, d_fx = corpus('zhongyao-fenxi')
    drugs = json.load(open(os.path.join(ROOT, 'standards', 'zhongyao-xue', '药物库.json'), encoding='utf-8'))['drugs']
    names = sorted({x['药名'] for x in drugs if x['药名'] and re.fullmatch(r'[\u4e00-\u9fff]{2,6}', x['药名'])})

    in_sp = [n for n in names if n in sp]
    both = [n for n in in_sp if n in jd and n in fx]
    only_jd = [n for n in in_sp if n in jd and n not in fx]
    only_fx = [n for n in in_sp if n not in jd and n in fx]
    neither = [n for n in in_sp if n not in jd and n not in fx]

    counts = {
        '药物库药名': len(names),
        '商品学点到': len(in_sp),
        '鉴定+分析都接住': len(both),
        '仅鉴定': len(only_jd),
        '仅分析': len(only_fx),
        '两课都未接': len(neither),
        '三课闭环率': round(len(both) / len(in_sp), 3) if in_sp else None,
    }
    json.dump({'note': '三课共用同一份药物库名单；「闭环」指商品学点到的品种，鉴定学与分析学都提到。',
               'counts': counts,
               '两课都未接': neither[:40]},
              open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(counts)
    print('两课都未接样例', neither[:15])


if __name__ == '__main__':
    main()
