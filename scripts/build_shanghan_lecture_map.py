# -*- coding: utf-8 -*-
"""从伤寒脑图 29 讲 ASR 里抽「讲 → 条文 → 教材章」映射 → standards/shanghan/讲题映射.json

判据（可复核，不猜）：
  每讲转写文本里若出现某条条文的开头片段（取条文正文前 8 个汉字，去标点），
  就记一次命中；一讲至少命中 2 条不同条文才落章，章取命中条数最多者。
  证据写「pNN 命中条文《locator》×N」。
"""
import io, json, os, re, sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UNITS = os.path.join(ROOT, 'standards', 'shanghan', 'units.json')
ASR = os.path.join(ROOT, 'standards', 'materials', 'shanghan-quannao', 'asr')
OUT = os.path.join(ROOT, 'standards', 'shanghan', '讲题映射.json')

units = json.load(io.open(UNITS, encoding='utf-8'))['units']
PUNCT = re.compile(r'[\s，。；：、！？,.!?;:"“”()（）]')

probes = []
for u in units:
    body = PUNCT.sub('', u.get('body') or u.get('rawBody') or '')
    if len(body) < 8:
        continue
    probes.append((body[:8], u))

def asr_text(path):
    j = json.load(io.open(path, encoding='utf-8'))
    segs = j.get('segments') or j.get('cues') or []
    return PUNCT.sub('', ''.join(s.get('text', '') for s in segs))

lectures, stats = {}, {'lectures': 0, 'mapped': 0, 'unmapped': []}
files = sorted(f for f in os.listdir(ASR) if re.fullmatch(r'p\d+\.json', f))
for f in files:
    no = int(re.search(r'(\d+)', f).group(1))
    text = asr_text(os.path.join(ASR, f))
    hits = defaultdict(list)
    for probe, u in probes:
        if probe and probe in text:
            hits[int(u['chapter'])].append(u)
    if not hits:
        stats['unmapped'].append(no)
        continue
    best_ch, best = max(hits.items(), key=lambda kv: len(kv[1]))
    if len(best) < 2:
        stats['unmapped'].append(no)
        continue
    lectures[f'第 {no} 讲'] = {
        'chapter': best_ch,
        'chapterTitle': best[0].get('chapterTitle') or '',
        'evidence': f'p{no:02d} 命中 {len(best)} 条：' + '、'.join(u['locator'] for u in best[:3]),
        'hits': len(best),
    }
    stats['mapped'] += 1
    stats['lectures'] += 1

doc = {
    'schema': 'lecture-title-map/v1',
    'note': ('伤寒脑图 29 讲只有「第N讲」标题，靠 ASR 转写里直接出现的条文开头片段落章；'
             '一讲至少命中 2 条不同条文才认，命中不足的留空等人工复核。'),
    'source': 'standards/materials/shanghan-quannao/asr/p*.json',
    'lectures': lectures,
    'stats': stats,
}
io.open(OUT, 'w', encoding='utf-8', newline='\n').write(json.dumps(doc, ensure_ascii=False, indent=1))
print('写出', os.path.relpath(OUT, ROOT), '· 讲', len(files), '· 落章', stats['mapped'])
for no in stats['unmapped']:
    print('  未落章 p%02d' % no)
