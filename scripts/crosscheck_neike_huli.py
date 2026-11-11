#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/crosscheck_neike_huli.py —— 跨课对账：《内科护理学》×《中医护理学》

为什么做这一层：
  两课都管「内科病人」，但一个用西医病名（糖尿病、冠心病），一个用中医病名（消渴、胸痹）。
  如果同一批病在两课里根本不叫同一个名字，那「中西医对照」就不能从病名入手。

本节量三组词在两课语料里的出现：
  · 中医病名：消渴、中风、胸痹、黄疸、痹证、淋证、虚劳…
  · 西医病名：糖尿病、冠心病、脑卒中、肝硬化、类风湿、尿路感染…
  · 症状名：发热、疼痛、水肿、咳嗽、心悸、呼吸困难…
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'standards', 'neike-huli', '跨课对账.json')

TCM = ['消渴', '中风', '胸痹', '黄疸', '痹证', '淋证', '虚劳', '喘证', '胃痛', '泄泻', '血证', '眩晕', '心悸', '水肿']
WEST = ['糖尿病', '冠心病', '脑卒中', '肝硬化', '类风湿', '尿路感染', '贫血', '高血压', '心力衰竭', '哮喘',
        '慢性阻塞性肺疾病', '消化性溃疡']
SYMPTOM = ['发热', '疼痛', '水肿', '咳嗽', '心悸', '呼吸困难', '恶心', '呕吐', '乏力', '消瘦', '出血', '意识']


def corpus(sub):
    d = json.load(open(os.path.join(ROOT, 'standards', sub, 'units.json'), encoding='utf-8'))
    return '\n'.join(u['prose'] for u in d['units']), sum(u['hanzi'] for u in d['units'])


def main():
    nk, h_nk = corpus('neike-huli')
    zy, h_zy = corpus('zhongyi-huli')

    def table(words, a, b):
        return {w: {'内科护理学': a.count(w), '中医护理学': b.count(w),
                    '任一边出现': 1 if (a.count(w) or b.count(w)) else 0} for w in words}

    tcm, west, sym = table(TCM, nk, zy), table(WEST, nk, zy), table(SYMPTOM, nk, zy)

    def hit(rows):
        return sum(1 for v in rows.values() if v['任一边出现'])

    counts = {
        '内科护理学汉字': h_nk, '中医护理学汉字': h_zy,
        '中医病名种数': len(TCM), '中医病名任一边出现': hit(tcm),
        '西医病名种数': len(WEST), '西医病名任一边出现': hit(west),
        '症状名种数': len(SYMPTOM), '症状名任一边出现': hit(sym),
        '中医病名两课都出现': sum(1 for v in tcm.values() if v['内科护理学'] and v['中医护理学']),
        '症状名两课都出现': sum(1 for v in sym.values() if v['内科护理学'] and v['中医护理学']),
    }
    json.dump({'note': '三组词在两课的原文计数。中医病名按教材常见名收 14 个，西医病名 12 个，症状名 12 个。',
               'counts': counts,
               '中医病名': tcm, '西医病名': west, '症状名': sym},
              open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(counts)
    print('中医病名 0/0 的：', [w for w, v in tcm.items() if not v['任一边出现']])
    print('两课都出现的症状：', [w for w, v in sym.items() if v['内科护理学'] and v['中医护理学']])


if __name__ == '__main__':
    main()
