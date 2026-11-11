#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_duli_sources.py —— 外源补源登记 + 逐字校勘

做三件事：
  1. 对 standards/zhongyao-du-li/sources/*.pdf 算 sha256、页数、文本层字符数；
  2. 把 外源条文.json 的每条「原文」按 " ... " 切段，逐段回查 PDF 文本层（去空白后比对），
     任何一段查不到就记 unverified —— 查不到就不许引；
  3. 写 补源登记.json（含来源、URL、sha256、校勘结论、条号映射）。
"""
import hashlib
import json
import os
import re

import pdfplumber

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, 'standards', 'zhongyao-du-li')
SRC = os.path.join(D, 'sources')
CLAUSES = json.load(open(os.path.join(D, '外源条文.json'), encoding='utf-8'))


PAGE_JUNK = re.compile(r'^\s*(©\s*OECD.*|OECD/OCDE\s*\d+|\d{1,3})\s*$', re.M)


def norm(s):
    """去页眉页脚、空白与软连字符，只留字母数字与中文。

    PDF 翻页会把一句话劈开（如 nulliparous 与 and non-pregnant 之间夹着 © OECD 与页码），
    这些是排版痕迹不是原文，比对前必须剔掉；断词连字符同理。
    """
    s = s.replace('\u00ad', '')
    s = PAGE_JUNK.sub('', s)
    s = re.sub(r'-\s*\n\s*', '', s)
    return re.sub(r'\s+', '', s)


def main():
    reg = {"note": "外源补源登记：每条都记来源、URL、sha256、页数与逐字校勘结论。查不到的句子不入库。",
           "sources": {}, "clauses": []}

    texts = {}
    for key, meta in CLAUSES['sources'].items():
        p = os.path.join(SRC, meta['file'])
        if not os.path.exists(p):
            reg['sources'][key] = {**meta, 'exists': False}
            continue
        sha = hashlib.sha256(open(p, 'rb').read()).hexdigest()
        with pdfplumber.open(p) as pdf:
            pages = len(pdf.pages)
            txt = "\n".join((pg.extract_text() or "") for pg in pdf.pages)
        texts[key] = txt
        reg['sources'][key] = {**meta, 'exists': True, 'sha256': sha, 'bytes': os.path.getsize(p),
                               'pages': pages, 'textChars': len(txt),
                               'textLayer': len(txt) > 2000}

    ok = 0
    for c in CLAUSES['clauses']:
        txt = texts.get(c['source'], '')
        parts = [x for x in c['原文'].split(' ... ') if x.strip()]
        miss = [x for x in parts if norm(x) not in norm(txt)]
        verified = not miss and bool(txt)
        ok += verified
        reg['clauses'].append({
            'id': c['id'], 'source': c['source'], 'clause': c['clause'],
            'sourceTitle': CLAUSES['sources'].get(c['source'], {}).get('title', ''),
            'url': CLAUSES['sources'].get(c['source'], {}).get('url', ''),
            'verified': verified,
            'missing': [x[:60] for x in miss],
            'locator': f"外源·{CLAUSES['sources'].get(c['source'], {}).get('title', c['source'])} {c['clause']}",
        })
    reg['counts'] = {'sources': len(reg['sources']), 'clauses': len(reg['clauses']), 'verified': ok,
                     'unverified': len(reg['clauses']) - ok}
    json.dump(reg, open(os.path.join(D, '补源登记.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    print(f"来源 {len(reg['sources'])} · 条文 {reg['counts']['clauses']} · 逐字可查 {ok}")
    for s, m in reg['sources'].items():
        print(f"  {s:26} {m.get('pages', '—'):>3} 页 · {(m.get('sha256') or '')[:16]}… · 文本层 {m.get('textLayer')}")
    for c in reg['clauses']:
        if not c['verified']:
            print('  ✗ 未通过', c['id'], c['missing'])


if __name__ == '__main__':
    main()
