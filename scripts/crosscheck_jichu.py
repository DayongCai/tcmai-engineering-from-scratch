#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/crosscheck_jichu.py —— 跨课对账：《基础护理学》×《中医护理学》

为什么做这一层：
  两课都讲操作，但落点不同。本课母本是「技能训练与考核」视角的教材，
  中医护理学是「辨证施护」视角的教材。本节量的是：**谁更「动手」、谁更「讲规范」**。

判据：同一组关键词在两课语料里的每万字密度。
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'standards', 'jichu-huli', '跨课对账.json')

KW = {
    '具体动作': ['注射', '穿刺', '置管', '导尿', '灌肠', '吸痰', '吸氧', '换药', '插管', '洗胃', '输液'],
    '规范与核对': ['核对', '查对', '规范', '流程', '步骤', '无菌', '洗手', '一次性'],
    '记录与评价': ['记录', '登记', '签名', '交接', '评价', '考核'],
    '辨证与中医技术': ['辨证', '证候', '灸', '拔罐', '刮痧', '耳穴', '穴位', '熏洗'],
}


def corpus(sub):
    d = json.load(open(os.path.join(ROOT, 'standards', sub, 'units.json'), encoding='utf-8'))
    t = '\n'.join(u['prose'] for u in d['units'])
    return t, sum(u['hanzi'] for u in d['units']), d


def main():
    t1, h1, d1 = corpus('jichu-huli')
    t2, h2, d2 = corpus('zhongyi-huli')
    rows = {}
    for k, ws in KW.items():
        a = sum(t1.count(w) for w in ws) / h1 * 10000
        b = sum(t2.count(w) for w in ws) / h2 * 10000
        rows[k] = {'基础护理学': round(a, 1), '中医护理学': round(b, 1),
                   '比值(中医/基护)': round(b / a, 2) if a else None}
    counts = {'基护汉字': h1, '中医护理汉字': h2, '基护章': 14, '中医护理章': 18}
    json.dump({'note': '两课同一组关键词；比每万字密度。另记本课母本的单词语料事实（动作词少、核对记录词多）。',
               'counts': counts, 'density': rows,
               '母本单词语料': {
                   '注射': t1.count('注射'), '静脉': t1.count('静脉'), '输液': t1.count('输液'),
                   '导尿': t1.count('导尿'), '吸氧': t1.count('吸氧'), '并发症': t1.count('并发症'),
                   '核对': t1.count('核对'), '记录': t1.count('记录'), '操作': t1.count('操作')}},
              open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(counts)
    for k, v in rows.items():
        print(f"  {k}: 基护 {v['基础护理学']} · 中医护理 {v['中医护理学']} · 比 {v['比值(中医/基护)']}")
    print('母本单词:', {'注射': t1.count('注射'), '吸氧': t1.count('吸氧'), '并发症': t1.count('并发症'),
                    '核对': t1.count('核对'), '记录': t1.count('记录')})


if __name__ == '__main__':
    main()
