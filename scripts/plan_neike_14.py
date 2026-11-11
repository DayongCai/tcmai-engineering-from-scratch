#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""重写 departments/01-zhongyi/10-zhongyi-neike-xue/chapters.json。

14 章 = 底本 12 章（1:1）+ 2 章本仓综合章：
  · 底本 12 章：章号、章名照 qhzy-中医内科学.xlsx，slug 用拼音；
  · 第 13 章「证候—方剂—疗效的因果推断」、第 14 章「内科分型与 ICD-11 的映射」
    是本仓的 AI 桥梁章，底本没有对应章，引文要跨章引（门对这两章另设判据）。

为什么不沿用旧 14 章的病证式切分（咳嗽与喘证、肺痈肺痿……）：
  课程正文要逐条引「教材·中医内科学·第N章·M.K」，章号必须与底本对得上；
  旧切分把一章拆成两章、又把两章并成一章，引文的章号会来回跳，门也没法核。
"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB = os.path.join(ROOT, 'departments/01-zhongyi/10-zhongyi-neike-xue')

# (章号, slug, 篇/系, 章名)——前 12 章与底本一一对应
ROWS = [
    (1, 'xulun', '总论', '绪论'),
    (2, 'bianzheng-silu', '总论', '中医内科疾病的辨证论治思路与方法'),
    (3, 'zangfu-bianzheng-gangyao', '总论', '脏腑辨证纲要与内科治则'),
    (4, 'feixi-bingzheng', '病证各论', '肺系病证'),
    (5, 'xinxi-bingzheng', '病证各论', '心系病证'),
    (6, 'piwei-bingzheng', '病证各论', '脾胃系病证'),
    (7, 'ganxi-bingzheng', '病证各论', '肝系病证'),
    (8, 'shenxi-bingzheng', '病证各论', '肾系病证'),
    (9, 'qixue-jinye-bingzheng', '病证各论', '气血津液病证'),
    (10, 'zhiti-jingluo-bingzheng', '病证各论', '肢体经络病证'),
    (11, 'jizheng-chuanranbing', '病证各论', '常见急症与传染病'),
    (12, 'shuzihua-ai', '拓展', '中医内科学的数字化与AI时代'),
    (13, 'zhengfang-liaoxiao', '综合', '证候—方剂—疗效的因果推断'),
    (14, 'fenxing-icd11', '综合', '内科分型与 ICD-11 的映射'),
]


def main():
    assert len(ROWS) == 14
    base = json.load(io.open(os.path.join(ROOT, 'standards/neike/底本.json'), encoding='utf-8'))
    by_no = {c['no']: c for c in base['chapters']}
    chapters = []
    for n, slug, unit, title in ROWS:
        item = {'n': n, 'slug': '%02d-%s' % (n, slug), 'title': '第%d章 %s' % (n, title), 'unit': unit, 'status': '⏳'}
        if n in by_no:
            b = by_no[n]
            item['source'] = {'chapter': n, 'secs': b['counts']['secs'], 'subs': b['counts']['subs'], 'hanzi': b['counts']['hanzi']}
        else:
            # 综合章：底本无对应章，引文要跨章
            item['source'] = {'chapter': None, 'synthesis': True}
        chapters.append(item)
    out = {'slug': '10-zhongyi-neike-xue', 'title': '中医内科学', 'chapters': chapters}
    io.open(os.path.join(SUB, 'chapters.json'), 'w', encoding='utf-8', newline='\n').write(
        json.dumps(out, ensure_ascii=False, indent=1) + '\n')
    print('写入 chapters.json：14 章（12 底本 + 2 综合）')
    for c in chapters:
        src = c['source']
        if src.get('synthesis'):
            print('  %2d %-26s 综合章（跨章引）' % (c['n'], c['title']))
        else:
            print('  %2d %-26s 节 %2d · 小节 %2d · %6d 字'
                  % (c['n'], c['title'], src['secs'], src['subs'], src['hanzi']))


if __name__ == '__main__':
    main()
