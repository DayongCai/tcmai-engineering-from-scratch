# -*- coding: utf-8 -*-
"""从外部课程目录里抽「讲题 → 内经篇 → 教材章」映射，产出 standards/neijing-xuandu/讲题映射.json。

只做一件事：武夷山 30 讲（wy01–wy30）的目录标题里若含《素问》《灵枢》篇名，
就按篇名落到对应单元（units.json 一篇一单元，locator 写明「素问第N篇」），
再由单元所在教材章得到章号。目录标题里没有篇名的（如「古文基础中的道与德」）不硬派。
"""
import io, json, os, re, sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAT = os.path.join(ROOT, 'standards', 'materials', 'wuyishan-suwen30', 'content.json')
UNITS = os.path.join(ROOT, 'standards', 'neijing-xuandu', 'units.json')
OUT = os.path.join(ROOT, 'standards', 'neijing-xuandu', '讲题映射.json')

mat = json.load(io.open(MAT, encoding='utf-8'))
units = json.load(io.open(UNITS, encoding='utf-8'))['units']

# 篇名 → 单元（含核心名，去「大论/篇/论」；藏↔脏 归一）
def core(t):
    t = re.sub(r'^(素问|灵枢)\s*[·・.、]\s*', '', t.strip())
    t = re.sub(r'^(遗篇|大论|篇|论)\s*[·・.、]?\s*', '', t)
    return re.sub(r'(大论|篇|论)$', '', t)

by_core = {}
for u in units:
    m = re.search(r'（(素问|灵枢)第(\d+)篇）', u.get('locator') or '')
    if not m:
        continue
    key = core(u['title']).replace('藏', '脏')
    by_core.setdefault(key, u)

ALIAS = {'阴阳离阖': '阴阳离合', '金匮篇': '金匮真言', '上古之人': '上古天真', '脏与腑': '五藏别论'}

rows = mat['toc']['rows']
out = {}
stats = {'rows': len(rows), 'matched': 0, 'unmatched': []}
for r in rows:
    no, title = str(r[0]).strip(), str(r[1]).strip()
    if not no.isdigit():
        continue
    key = f'wy{int(no):02d}'
    probe = title.replace('藏', '脏')
    for a, b in ALIAS.items():
        probe = probe.replace(a, b)
    hit = None
    for k, u in by_core.items():
        if len(k) >= 2 and k in probe:
            hit = (k, u)
            break
    if not hit:
        stats['unmatched'].append({'id': key, 'title': title})
        continue
    k, u = hit
    out[key] = {
        'pianTitle': u['title'],
        'pian': u['locator'],
        'chapter': int(u['chapter']),
        'evidence': f'武夷山目录第{no}讲「{title}」含篇名「{u["title"]}」',
    }
    stats['matched'] += 1

doc = {
    'schema': 'lecture-title-map/v1',
    'note': ('外部课程目录里的讲题 → 内经篇 → 教材章。只收目录标题里明确含篇名的讲；'
             '无篇名的（古文基础、黄帝的烦恼等）不硬派，留在未挂里等字幕分段。'),
    'source': 'standards/materials/wuyishan-suwen30/content.json#toc',
    'lectures': out,
    'stats': stats,
}
io.open(OUT, 'w', encoding='utf-8', newline='\n').write(json.dumps(doc, ensure_ascii=False, indent=1))
print('写出', os.path.relpath(OUT, ROOT), '· 命中', stats['matched'], '/', stats['rows'])
for u in stats['unmatched']:
    print('  未命中', u['id'], u['title'])
