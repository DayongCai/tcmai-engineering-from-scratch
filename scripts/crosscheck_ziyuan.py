#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/crosscheck_ziyuan.py —— 跨课对账：《中药资源学》×《中药商品学》

为什么要做这一层：
  资源学讲「资源在哪、有多少、怎么保」，商品学讲「规格几等、值多少钱」。
  同一味药在两课里的落点不同：资源学把它当**种群**，商品学把它当**批次**。
  本节量的是：**两课点到的品种重叠多少，各自独有的又是哪一类**。

判据：以《中药学》药物库 287 个药名为名单，
  在两课语料里分别出现即算「点到」；只出现在一边的，按语料看它落在哪种语境（保护/开发 vs 规格/价格）。
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'standards', 'zhongyao-ziyuan', '跨课对账.json')

CTX_ZY = {'保护': ['濒危', '保护', '枯竭', '稀缺', '野生', '蕴藏'],
          '开发': ['开发', '利用', '栽培', '种植', '新资源', '替代'],
          '评价': ['评价', '品质', '含量', '区划', '产区', '道地']}
CTX_SP = {'规格': ['规格', '等级', '统货', '选货', '片型', '性状'],
          '价格': ['价格', '行情', '市场', '购销', '库存', '批发'],
          '监管': ['监管', '标准', '抽检', '追溯', '许可']}


def corpus(sub):
    d = json.load(open(os.path.join(ROOT, 'standards', sub, 'units.json'), encoding='utf-8'))
    return '\n'.join(u['prose'] for u in d['units']), d


def ctx_of(text, name, ctx):
    """取该药名首次出现处 ±80 字，看落在哪种语境。"""
    i = text.find(name)
    if i < 0:
        return None
    win = text[max(0, i - 80): i + 80]
    best, bs = None, 0
    for k, ws in ctx.items():
        s = sum(win.count(w) for w in ws)
        if s > bs:
            best, bs = k, s
    return best or '未定'


def main():
    zy, d_zy = corpus('zhongyao-ziyuan')
    sp, d_sp = corpus('zhongyao-shangpin')
    drugs = json.load(open(os.path.join(ROOT, 'standards', 'zhongyao-xue', '药物库.json'), encoding='utf-8'))['drugs']
    names = sorted({x['药名'] for x in drugs if x['药名'] and re.fullmatch(r'[\u4e00-\u9fff]{2,6}', x['药名'])})

    in_zy = [n for n in names if n in zy]
    in_sp = [n for n in names if n in sp]
    both = [n for n in in_zy if n in sp]
    only_zy = [n for n in in_zy if n not in sp]
    only_sp = [n for n in in_sp if n not in zy]

    counts = {
        '药物库药名': len(names),
        '资源学点到': len(in_zy),
        '商品学点到': len(in_sp),
        '两课都点到': len(both),
        '仅资源学': len(only_zy),
        '仅商品学': len(only_sp),
        '重叠率(交集/并集)': round(len(both) / len(set(in_zy) | set(in_sp)), 3) if (in_zy or in_sp) else None,
    }
    # 语境抽样：只在一课出现的品种，各取 12 个看语境分布
    zy_ctx, sp_ctx = {}, {}
    for n in only_zy[:60]:
        c = ctx_of(zy, n, CTX_ZY)
        zy_ctx[c] = zy_ctx.get(c, 0) + 1
    for n in only_sp[:60]:
        c = ctx_of(sp, n, CTX_SP)
        sp_ctx[c] = sp_ctx.get(c, 0) + 1

    json.dump({'note': '两课共用药物库名单；语境按药名首次出现处 ±80 字内关键词归属，只作粗分。',
               'counts': counts,
               'only_zy_sample': only_zy[:20],
               'only_sp_sample': only_sp[:20],
               'zy_ctx_sample': zy_ctx,
               'sp_ctx_sample': sp_ctx},
              open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(counts)
    print('仅资源学语境分布', zy_ctx)
    print('仅商品学语境分布', sp_ctx)
    print('仅资源学样例', only_zy[:12])
    print('仅商品学样例', only_sp[:12])


if __name__ == '__main__':
    main()
