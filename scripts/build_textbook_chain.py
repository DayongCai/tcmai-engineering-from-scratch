# -*- coding: utf-8 -*-
"""scripts/build_textbook_chain.py —— 教材编写 × 教育视频 的落地链条台账

一条记录回答四件事（全部按磁盘现算，不读缓存结论）：
  ① 底本层：standards/<x>/底本.json 或 units.json.source.file（教材/出版底本）
  ② 单元层：units.json 是否存在，多少单元、多少汉字（能否由底本现算）
  ③ 正文层：departments/.../chapters/<章>/docs/zh.md 在磁盘上的章数与汉字
  ④ 视频层：data/video-lessons.json 的讲数与时长；data/video-textbook-links.json 的对齐讲数

输出 data/textbook-chain.json；--check 只比对不写，漂移退出码 1。

用法：
  python scripts/build_textbook_chain.py            # 写台账
  python scripts/build_textbook_chain.py --check    # 比对（门禁用）
  python scripts/build_textbook_chain.py --csv 路径  # 另存 CSV
"""
import csv
import hashlib
import io
import json
import os
import re
import sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CUR = json.load(io.open(os.path.join(ROOT, 'curriculum.json'), encoding='utf-8'))
HANZI = re.compile(r'[\u4e00-\u9fff]')
STD_REF = re.compile(r'standards/([A-Za-z0-9_\-]+)')


def load(name):
    p = os.path.join(ROOT, name)
    if not os.path.exists(p):
        return {}
    return json.load(io.open(p, encoding='utf-8'))


REGISTRY = (load('standards/textbook-sources.json') or {}).get('layers', {})
VIDEO = load('data/video-lessons.json')
LINKS = load('data/video-textbook-links.json')
VIDEO_BY = {}
for item in VIDEO.get('subjects', []):
    VIDEO_BY[(item.get('dept'), item.get('slug'))] = item
LINK_BY = {}
for item in LINKS.get('courses', []) or []:
    if isinstance(item, dict):
        LINK_BY[(item.get('dept'), item.get('slug'))] = item


ALIASES = {'zhongyaoxue': 'zhongyao-xue', 'zhongyao-xue': 'zhongyao-xue',
           'fangjixue': 'fangji', 'shanghanlun': 'shanghan'}


def std_candidates(slug):
    out = [slug, re.sub(r'^\d{2}-', '', slug)]
    bare = re.sub(r'^\d{2}-', '', slug)
    if bare in ALIASES:
        out.append(ALIASES[bare])
    return out


def unit_source(name):
    p = os.path.join(ROOT, 'standards', name, 'units.json')
    if not os.path.exists(p):
        return None
    try:
        return json.load(io.open(p, encoding='utf-8')).get('source')
    except Exception:
        return None


def layer_state(name):
    """返回 (底本种类, 单元数, 单元汉字)。底本种类 ∈ 教材/派生/未登记/无。"""
    if not name:
        return '无', 0, 0
    d = os.path.join(ROOT, 'standards', name)
    src = unit_source(name)
    kind = '未登记'
    if isinstance(src, dict):
        if src.get('file'):
            kind = '教材'
        elif src.get('derived') or src.get('kind') == '派生' or src.get('from'):
            kind = '派生'
    elif isinstance(src, str) and src.strip():
        t = src.strip()
        if '派生' in t or '合成' in t:
            kind = '派生'
        elif '.xlsx' in t or '底本' in t:
            kind = '教材'
    if kind == '未登记' and (os.path.exists(os.path.join(d, '底本.json')) or os.path.exists(os.path.join(d, '底本.md'))):
        kind = '教材'
    if kind == '未登记' and os.path.exists(os.path.join(d, '补源登记.json')):
        kind = '外源（已按补源约定登记）'
    if kind == '未登记' and name in REGISTRY:
        kind = REGISTRY[name].get('kind') or '已登记'
    units = hanzi = 0
    p = os.path.join(d, 'units.json')
    if os.path.exists(p):
        U = json.load(io.open(p, encoding='utf-8'))
        units = len(U.get('units', []))
        hanzi = (U.get('counts') or {}).get('hanzi', 0)
    return kind, units, hanzi


def resolve_std(dept, slug):
    for name in std_candidates(slug):
        if os.path.exists(os.path.join(ROOT, 'standards', name, 'units.json')):
            return name
    base = os.path.join(ROOT, 'departments', dept, slug, 'chapters')
    if os.path.isdir(base):
        for ch in sorted(os.listdir(base)):
            p = os.path.join(base, ch, 'code', 'main.js')
            if not os.path.exists(p):
                continue
            txt = io.open(p, encoding='utf-8', errors='ignore').read()
            for m in STD_REF.finditer(txt):
                x = m.group(1)
                if os.path.exists(os.path.join(ROOT, 'standards', x, 'units.json')):
                    return x
    return None


def body_state(dept, slug):
    base = os.path.join(ROOT, 'departments', dept, slug, 'chapters')
    n = hanzi = 0
    if os.path.isdir(base):
        for ch in os.listdir(base):
            p = os.path.join(base, ch, 'docs', 'zh.md')
            if os.path.exists(p):
                n += 1
                hanzi += len(HANZI.findall(io.open(p, encoding='utf-8', errors='ignore').read()))
    return n, hanzi


rows = []
for dept in CUR['departments']:
    for sub in dept['subjects']:
        slug, title, sem, target = sub[0], sub[1], sub[4], sub[6]
        name = resolve_std(dept['slug'], slug)
        kind, units, units_hanzi = layer_state(name)
        if not name and slug in REGISTRY:
            kind = REGISTRY[slug].get('kind') or '已登记'
        built, body_hanzi = body_state(dept['slug'], slug)
        v = VIDEO_BY.get((dept['slug'], slug)) or {}
        lk = LINK_BY.get((dept['slug'], slug)) or {}
        lectures = v.get('sources') and sum(s.get('lectures', 0) for s in v['sources']) or 0
        dur = v.get('sources') and sum(s.get('durationSec', 0) for s in v['sources']) or 0
        linked = lk.get('linkedLectures', 0)
        unlinked = (lectures - linked) if lectures else 0
        # 未挂的讲里，标题本身无信息量（第N讲 / wy01 / SW16 / 原文）→ 属「待分段」，不是漏挂
        GENERIC = re.compile(r'^(第\s*\d+\s*讲|wy\d+|SW\d+|ls\d+|原文|第\s*\d+|\d+)$', re.I)
        generic_unlinked = sum(
            1 for row in (lk.get('rows') or [])
            if not row.get('textbook') and GENERIC.match(str(row.get('title') or '').strip())
        )

        problems = []
        if not name or units == 0:
            problems.append('缺单元层')
        if kind == '派生':
            problems.append('派生层·无独立底本')
        elif kind.startswith('合成'):
            problems.append('合成层·无独立底本')
        elif kind == '手写':
            problems.append('手写课·无底本无单元层')
        elif kind == '未登记':
            problems.append('底本未登记')
        if built < (target or 0):
            problems.append(f'正文差 {(target or 0) - built} 章')
        if lectures and unlinked > 0:
            if generic_unlinked == unlinked:
                problems.append(f'视频 {unlinked} 讲标题无信息量（待分段）')
            elif generic_unlinked:
                problems.append(f'视频 {unlinked} 讲未对齐（其中 {generic_unlinked} 讲待分段）')
            else:
                problems.append(f'视频 {unlinked} 讲未对齐教材')
        if not lectures:
            problems.append('无视频')

        if not problems:
            chain = '完整（教材+视频对齐）'
        elif all(p in ('无视频',) for p in problems):
            chain = '教材完整·无视频'
        elif all(('待分段' in p) or p in ('无视频',) for p in problems):
            chain = '教材完整·视频部分待分段'
        elif problems == ['派生层·无独立底本'] or set(problems) <= {'派生层·无独立底本', '无视频'}:
            chain = '派生课·无视频' if '无视频' in problems else '派生课'
        else:
            chain = '待补'

        rows.append({
            '院系': dept.get('title') or dept['slug'], 'dept': dept['slug'],
            '学科': title, 'slug': slug, '学期': sem,
            '目标章': target or 0, '已建章': built, '正文汉字': body_hanzi,
            '底本种类': kind, '单元层': name or '—', '单元数': units, '单元汉字': units_hanzi,
            '视频讲数': lectures, '视频时长秒': round(dur, 1),
            '对齐讲数': linked, '未对齐讲数': unlinked,
            '链条状态': chain, '问题': '；'.join(problems),
        })

depts = []
for d in CUR['departments']:
    rs = [r for r in rows if r['dept'] == d['slug']]
    depts.append({
        'dept': d['slug'], 'title': d.get('title') or d['slug'], 'subjects': len(rs),
        'chaptersTarget': sum(r['目标章'] for r in rs), 'chaptersBuilt': sum(r['已建章'] for r in rs),
        'bodyHanzi': sum(r['正文汉字'] for r in rs),
        'units': sum(r['单元数'] for r in rs),
        'withVideo': sum(1 for r in rs if r['视频讲数']),
        'lectures': sum(r['视频讲数'] for r in rs),
        'linked': sum(r['对齐讲数'] for r in rs),
        'textbookBase': sum(1 for r in rs if r['底本种类'] == '教材'),
        'external': sum(1 for r in rs if r['底本种类'].startswith('外源')),
        'derived': sum(1 for r in rs if r['底本种类'] == '派生'),
        'unregistered': sum(1 for r in rs if r['底本种类'] == '未登记'),
        'complete': sum(1 for r in rs if r['链条状态'].startswith('完整')),
    })

obj = {
    'schema': 'textbook-chain/v1',
    'note': ('三层按磁盘现算：底本=units.json.source.file 或 底本.json；单元=units.json；'
             '正文=chapters/<章>/docs/zh.md。视频取 data/video-lessons.json，对齐取 data/video-textbook-links.json。'),
    'totals': {
        'depts': len(depts), 'subjects': len(rows),
        'chaptersTarget': sum(r['目标章'] for r in rows), 'chaptersBuilt': sum(r['已建章'] for r in rows),
        'bodyHanzi': sum(r['正文汉字'] for r in rows),
        'units': sum(r['单元数'] for r in rows),
        'withVideo': sum(1 for r in rows if r['视频讲数']),
        'lectures': sum(r['视频讲数'] for r in rows),
        'linkedLectures': sum(r['对齐讲数'] for r in rows),
        'videoHours': round(sum(r['视频时长秒'] for r in rows) / 3600, 1),
        'textbookBase': sum(1 for r in rows if r['底本种类'] == '教材'),
        'external': sum(1 for r in rows if r['底本种类'].startswith('外源')),
        'derived': sum(1 for r in rows if r['底本种类'] == '派生'),
        'synthetic': sum(1 for r in rows if r['底本种类'].startswith('合成')),
        'unregistered': sum(1 for r in rows if r['底本种类'] == '未登记'),
        'complete': sum(1 for r in rows if r['链条状态'].startswith('完整')),
        'noVideo': sum(1 for r in rows if not r['视频讲数']),
    },
    'departments': depts,
    'subjects': rows,
}

text = json.dumps(obj, ensure_ascii=False, indent=1)
path = os.path.join(ROOT, 'data', 'textbook-chain.json')

if '--csv' in sys.argv:
    out = sys.argv[sys.argv.index('--csv') + 1]
    with io.open(out, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()), extrasaction='ignore')
        w.writeheader()
        for r in rows:
            w.writerow(r)
    print('csv:', out)

if '--check' in sys.argv:
    old = io.open(path, encoding='utf-8').read() if os.path.exists(path) else ''
    if old == text:
        t = obj['totals']
        print(f"✓ 教材链条台账一致：{t['subjects']} 学科 · 章 {t['chaptersBuilt']}/{t['chaptersTarget']} · "
              f"视频 {t['withVideo']} 学科 / {t['lectures']} 讲 / {t['videoHours']} h · 对齐 {t['linkedLectures']} 讲")
        raise SystemExit(0)
    print('✗ data/textbook-chain.json 与磁盘不一致，请重跑 python scripts/build_textbook_chain.py')
    raise SystemExit(1)

io.open(path, 'w', encoding='utf-8', newline='\n').write(text)
t = obj['totals']
print(f"✓ 写 data/textbook-chain.json：{t['subjects']} 学科 · 章 {t['chaptersBuilt']}/{t['chaptersTarget']} · "
      f"正文 {t['bodyHanzi']:,} 汉字 · 单元 {t['units']:,}")
print(f"  底本：教材 {t['textbookBase']} · 派生 {t['derived']} · 未登记 {t['unregistered']} · 链条完整 {t['complete']}")
print(f"  视频：{t['withVideo']} 学科 / {t['lectures']} 讲 / {t['videoHours']} h · 对齐 {t['linkedLectures']} 讲 · 无视频 {t['noVideo']} 学科")
