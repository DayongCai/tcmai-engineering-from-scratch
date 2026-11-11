#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/report_zhongyao_stats.py —— 《中药学》单章实测：三辨/四气/药物表

用法：
  python scripts/report_zhongyao_stats.py                # 14 章一览
  python scripts/report_zhongyao_stats.py 09-anshen-pinggan   # 单章详表

数据源：standards/zhongyao-xue/{units.json, 药物库.json}（由 build_zhongyao_xue_text.py 现算）。
docstring 里写的那条命令，就是本章 docs 里标注的复算命令——所以它必须真的能跑。
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, 'standards', 'zhongyao-xue')

MAP = {
    '01-xingneng-siqi': ('中药学的研究对象与性能：四气五味', [1, 2, 3, 4, 5]),
    '02-jiebiaoyao-fengh': ('解表药：发散风寒与风热', [9]),
    '03-qingreyao-fenlei': ('清热药：泻火、解毒与凉血', [10]),
    '04-xiexia-qushi': ('泻下药与祛湿药', [11, 12, 13, 14]),
    '05-wenli-liqi': ('温里药与理气药', [15, 16]),
    '06-xiaoshi-zhixue': ('消食药、驱虫药与止血药', [17, 18, 19]),
    '07-huoxue-huayu': ('活血化瘀药：分类与配伍', [20]),
    '08-huatan-kesou': ('化痰止咳平喘药', [21]),
    '09-anshen-pinggan': ('安神药、平肝息风药与开窍药', [22, 23, 24]),
    '10-buxuyao-fenlei': ('补虚药：补气、补血、补阴、补阳', [25]),
    '11-shouse-yongtu': ('收涩药与涌吐药', [26, 27]),
    '12-xingneng-bianma': ('中药性能的编码化：性味归经 → 向量', [5, 6, 7, 8]),
    '13-caiyao-zhijian': ('药材之前：产地、采集、炮制、配伍、禁忌与剂量', [3, 4, 6]),
    '14-gongdu-badu': ('攻毒杀虫与拔毒化腐：毒性与用法边界', [28, 29]),
}


def load():
    u = json.load(open(os.path.join(D, 'units.json'), encoding='utf-8'))
    d = json.load(open(os.path.join(D, '药物库.json'), encoding='utf-8'))
    return u, d['drugs']


def row(slug, units, drugs):
    title, chs = MAP[slug]
    us = [x for x in units['units'] if int(x['chapter']) in chs]
    ds = [x for x in drugs if x['章'] in chs]
    v = {k: sum(x['measure']['views'][k] for x in us) for k in units['views']}
    qi = {k: sum(x['measure']['levels'][k] for x in us) for k in units['levels']}
    return {
        'slug': slug, 'title': title, 'textbook': chs, 'units': len(us),
        'hanzi': sum(x['hanzi'] for x in us), 'drugs': len(ds),
        'drugsWithQi': len([x for x in ds if x['性味归经']]),
        'views': v, 'qi': qi,
    }


def main():
    units, drugs = load()
    if len(sys.argv) > 1:
        slug = sys.argv[1]
        if slug not in MAP:
            sys.exit(f'未知章：{slug}\n可选：{", ".join(MAP)}')
        r = row(slug, units, drugs)
        print(f"{slug} · {r['title']}")
        print(f"教材第 {'、'.join(map(str, r['textbook']))} 章 · {r['units']} 小节 · {r['hanzi']:,} 汉字 · "
              f"{r['drugs']} 味药（性味可核 {r['drugsWithQi']}）")
        print('三辨：', r['views'])
        print('四气：', r['qi'])
        ds = [x for x in drugs if x['章'] in r['textbook']]
        print()
        for x in ds[:60]:
            print(f"  {x['药名']:6} {x['性味归经'][:30]:32} {re.sub(r'\\s+', '', x['功效'])[:40]}")
        return
    print('| 章 | slug | 教材章 | 小节 | 汉字 | 药 | 性能 | 功效 | 应用 |')
    print('|---:|---|---|---:|---:|---:|---:|---:|---:|')
    for i, slug in enumerate(MAP, 1):
        r = row(slug, units, drugs)
        v = r['views']
        print(f"| {i} | `{slug}` | {'、'.join(map(str, r['textbook']))} | {r['units']} | {r['hanzi']:,} | "
              f"{r['drugs']} | {v['性能']} | {v['功效']} | {v['应用']} |")
    tot = sum(row(s, units, drugs)['drugs'] for s in MAP)
    print(f'\n药物库合计 {len(drugs)} 味（有性味归经 {len([x for x in drugs if x["性味归经"]])} 味）；'
          f'14 章覆盖 {tot} 次（同一味药可被两章引，故大于总数属正常）')


if __name__ == '__main__':
    main()
