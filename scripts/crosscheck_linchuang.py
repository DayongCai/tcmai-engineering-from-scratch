#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/crosscheck_linchuang.py —— 跨课对账：《中药学》×《临床中药学》的讲法侧重

同一批药，两门课讲法不同：
  《中药学》以「药」为条目，性能与功效是骨架；
  《临床中药学》以「证—药—用」为线索，临床应用与禁忌是骨架。

做法：用**同一组关键词**分别量两套语料，按每万字密度比——词表相同，比的是密度，不是词表本身。
  · 性能词：性味 / 归经 / 四气 / 五味 / 升降
  · 临床词：主治 / 用于 / 配伍 / 随证 / 加减 / 证
  · 安全词：禁忌 / 慎用 / 不宜 / 孕妇 / 中毒 / 不良反应
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
YAO = os.path.join(ROOT, 'standards', 'zhongyao-xue', 'units.json')
LC = os.path.join(ROOT, 'standards', 'linchuang-zhongyao', 'units.json')
OUT = os.path.join(ROOT, 'standards', 'linchuang-zhongyao', '跨课对账.json')

KW = {
    '性能': ['性味', '归经', '四气', '五味', '升降'],
    '临床': ['主治', '用于', '配伍', '随证', '加减', '证'],
    '安全': ['禁忌', '慎用', '不宜', '孕妇', '中毒', '不良反应'],
}


def corpus(path):
    d = json.load(open(path, encoding='utf-8'))
    text = '\n'.join(u['prose'] for u in d['units'])
    han = sum(u['hanzi'] for u in d['units'])
    return text, han, d


def density(text, han, words):
    return round(sum(text.count(w) for w in words) / han * 10000, 1) if han else 0


def main():
    t1, h1, d1 = corpus(YAO)
    t2, h2, d2 = corpus(LC)
    rows = {}
    for k, ws in KW.items():
        rows[k] = {'中药学': density(t1, h1, ws), '临床中药学': density(t2, h2, ws)}
        a, b = rows[k]['中药学'], rows[k]['临床中药学']
        rows[k]['密度比(临床/中药学)'] = round(b / a, 2) if a else None

    # 药名覆盖：中药学药物库的药，临床课提到几味
    import re
    drugs = json.load(open(os.path.join(ROOT, 'standards', 'zhongyao-xue', '药物库.json'), encoding='utf-8'))['drugs']
    names = sorted({x['药名'] for x in drugs if x['药名'] and re.fullmatch(r'[一-鿿]{2,6}', x['药名'])})
    hit = [n for n in names if n in t2]
    miss = [n for n in names if n not in t2]
    counts = {'中药学汉字': h1, '临床中药学汉字': h2, '中药学单元': len(d1['units']), '临床中药学单元': len(d2['units']),
              '药物库药名': len(names), '临床课提及': len(hit), '临床课未提及': len(miss),
              '药名覆盖率': round(len(hit) / len(names), 3) if names else None}
    json.dump({'note': '两套语料用同一组关键词；比的是每万字密度，不是绝对次数。另给药名覆盖（中药学药物库 → 临床课）。',
               'counts': counts, 'density': rows, '未提及药名': miss},
              open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(counts)
    for k, v in rows.items():
        print(f"  {k}: 中药学 {v['中药学']}/万字 · 临床 {v['临床中药学']}/万字 · 比 {v['密度比(临床/中药学)']}")


if __name__ == '__main__':
    main()
