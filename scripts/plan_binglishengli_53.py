#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/plan_binglishengli_53.py

把病理生理学课程的章目从「传统 14 章」切到「讲义 53 章」。

为什么改：讲义（supplements/jiangyi，15 单元 53 章）已经是全库最完整的病理生理学文本，
传统 14 章的章目与它并不对齐（发热、应激、缺血-再灌注在讲义里不存在独立章，
而讲义有生殖、神经、精神心理、骨骼肌肉、皮肤五大单元，旧章目完全没有）。
课程要继续往上写，只能让章目跟着有正文的那一套走。

章目来源：supplements/jiangyi.json（由 build_jiangyi_index.py 从 md 解析）。
所以这个脚本是「派生」而不是「手写」：讲义章名改了，跑一次它就跟着改。

用法：
  python scripts/plan_binglishengli_53.py          # 只打印计划
  python scripts/plan_binglishengli_53.py --write  # 写入 chapters.json + meta.json + curriculum.json
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB = 'departments/09-jichu/11-bingli-shengli-xue'
IDX = 'standards/binglishengli/supplements/jiangyi.json'

# 旧 14 章 → 新 53 章（按讲义对应章号）。只用于写迁移说明与「旧内容去哪了」，
# 不参与章目生成：某些旧章（发热 / 应激 / 缺血-再灌注）在讲义体系里没有对应章，
# 它们的正文归入相邻章的机制段，不再单独成章。
LEGACY_TO_NEW = {
    '01-xulun': [1],
    '02-jibing-gailun': [2],
    '03-shui-dianjiezhi-wenluan': [24],
    '04-suanjian-pingheng-wenluan': [25],
    '05-queyang': [13],
    '06-fare': [8, 9],
    '07-yingji': [9],
    '08-queshang-zaiguanzhu-sunshang': [15],
    '09-xiuke': [20],
    '10-nixue': [14],
    '11-xin-gongneng-buquan': [19],
    '12-huxi-gongneng-buquan': [21, 22, 23],
    '13-gan-gongneng-buquan': [38],
    '14-shen-gongneng-buquan': [28],
}

STOP = {'and', 'of', 'the', 'in', 'to', 'a', 'an', 'on', 'for', 'with'}


def slug_of(no, title):
    """章 slug：两位章号 + 英文题名的 kebab。英文题名是讲义标题括号里的那一段。"""
    m = re.search(r'[（(]([A-Za-z][^）)]*)[）)]', title)
    en = m.group(1) if m else 'chapter'
    words = re.findall(r"[A-Za-z0-9]+", en.lower())
    # 截断只截整词，并去掉截断后悬在尾部的虚词：
    # 第一版按 [:52] 硬切，切出过 “-trauma-infectio”“-to” 这种半截词/悬空虚词
    while len(words) > 2 and len('-'.join(words)) > 74:
        words.pop()
    while len(words) > 2 and words[-1] in STOP:
        words.pop()
    kebab = '-'.join(words)
    return '%02d-%s' % (no, kebab)


def zh_title(title):
    return re.sub(r'\s*[（(][^）)]*[）)]\s*$', '', title).strip()


def main():
    write = '--write' in sys.argv
    idx = json.load(io.open(os.path.join(ROOT, IDX), encoding='utf-8'))
    rows = []
    for u in idx['units']:
        for c in u['chapters']:
            rows.append({'n': int(c['no']), 'title': zh_title(c['title']),
                         'slug': slug_of(int(c['no']), c['title']),
                         'unit': u['unit'], 'full': c['title']})
    rows.sort(key=lambda r: r['n'])

    # 章号必须 1..53 连续：讲义写漏一章，这里立刻塌
    assert [r['n'] for r in rows] == list(range(1, len(rows) + 1)), '章号不连续'
    slugs = [r['slug'] for r in rows]
    dup = {s for s in slugs if slugs.count(s) > 1}
    assert not dup, 'slug 重复: %s' % dup
    for r in rows:
        assert re.match(r'^\d{2}-[a-z0-9-]+$', r['slug']), r['slug']

    print('章目 %d 章 / %d 单元' % (len(rows), len(idx['units'])))
    for r in rows[:3] + rows[-2:]:
        print('  %02d %-34s %s' % (r['n'], r['title'], r['slug']))
    if not write:
        print('\n（未写入；加 --write 落地）')
        return

    cj = os.path.join(ROOT, SUB, 'chapters.json')
    old = json.load(io.open(cj, encoding='utf-8'))
    built = {c['slug'] for c in old['chapters'] if c.get('status') != '📋'}
    old['chapters'] = [{'n': r['n'], 'slug': r['slug'], 'title': r['title'],
                        'status': '🚧'} for r in rows]
    old.setdefault('note', '')
    old['note'] = ('章目按讲义（supplements/jiangyi，15 单元 53 章）生成，'
                   '旧传统 14 章已归档到 standards/binglishengli/legacy-14-chapters/。')
    io.open(cj, 'w', encoding='utf-8', newline='\n').write(
        json.dumps(old, ensure_ascii=False, indent=2) + '\n')

    mj = os.path.join(ROOT, SUB, 'meta.json')
    meta = json.load(io.open(mj, encoding='utf-8'))
    meta['chaptersTarget'] = len(rows)
    io.open(mj, 'w', encoding='utf-8', newline='\n').write(
        json.dumps(meta, ensure_ascii=False, indent=2) + '\n')

    # curriculum.json 是 catalog / audit 的上游：章数写在第 7 个位置
    cur = json.load(io.open(os.path.join(ROOT, 'curriculum.json'), encoding='utf-8'))
    hit = 0
    for d in cur['departments']:
        for s in d['subjects']:
            if isinstance(s, list) and s and s[0] == '11-bingli-shengli-xue':
                s[6] = len(rows)
                hit += 1
    assert hit == 1, 'curriculum.json 里找到 %d 处' % hit
    io.open(os.path.join(ROOT, 'curriculum.json'), 'w', encoding='utf-8', newline='\n').write(
        json.dumps(cur, ensure_ascii=False, indent=2) + '\n')

    json.dump(LEGACY_TO_NEW, io.open(os.path.join(ROOT, SUB, 'chapters-legacy-map.json'),
                                     'w', encoding='utf-8', newline='\n'),
              ensure_ascii=False, indent=2)
    print('\n写入 chapters.json / meta.json / curriculum.json / chapters-legacy-map.json')
    print('旧章已建 %d 个' % len(built))


if __name__ == '__main__':
    main()
