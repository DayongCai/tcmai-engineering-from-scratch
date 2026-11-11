#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_jiankang_pinggu_sources.py —— 健康评估外源补源登记 + 逐字校勘

按 补源约定.md 的十条规定做三件事：
  1. 对 standards/jiankang-pinggu/sources/*.pdf 现算 sha256、bytes、页数、文本层字符数；
  2. 把 外源条文.json 每条「原文」按 " ... " 切段，逐段回查 PDF 文本层；
  3. 写 补源登记.json（来源、URL、sha256、校勘结论、条号 locator）。

归一四项（与约定第五节一致）：删空白与软连字符、删页眉页脚与孤立页码、连字符跨行合并、
**连字符合成字母还原（ﬁ→fi、ﬂ→fl、ﬀ→ff）**。其余一概不动；查不到即 unverified，不许引用。
"""
import hashlib
import json
import os
import re

import pdfplumber

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, 'standards', 'jiankang-pinggu')
SRC = os.path.join(D, 'sources')
CLAUSES = json.load(open(os.path.join(D, '外源条文.json'), encoding='utf-8'))

LIGATURES = {'\ufb01': 'fi', '\ufb02': 'fl', '\ufb00': 'ff', '\ufb03': 'ffi', '\ufb04': 'ffl'}
PAGE_JUNK = re.compile(r'^\s*(\d{1,3})\s*$', re.M)


def norm(s):
    for k, v in LIGATURES.items():
        s = s.replace(k, v)
    s = s.replace('\u00ad', '')
    s = PAGE_JUNK.sub('', s)
    s = re.sub(r'-\s*\n\s*', '', s)
    return re.sub(r'\s+', '', s)


def main():
    reg = {"note": "健康评估外源补源登记：每条记来源、URL、sha256、页数与逐字校勘结论。"
                   "查不到的句子不入库（约定见 补源约定.md）。",
           "convention": "补源约定.md", "sources": {}, "clauses": []}

    texts = {}
    for key, meta in CLAUSES['sources'].items():
        p = os.path.join(SRC, meta['file'])
        if not os.path.exists(p):
            reg['sources'][key] = {**meta, 'exists': False}
            continue
        sha = hashlib.sha256(open(p, 'rb').read()).hexdigest()
        with pdfplumber.open(p) as pdf:
            pages = len(pdf.pages)
            flat = "\n".join((pg.extract_text() or "") for pg in pdf.pages)
            # 双通道：整页提取常把多栏版面按行交错（CDC 三栏就是一例），
            # 故再按三等分栏各提一次，两路文本合并成校勘语料；字仍是 PDF 里的字。
            cols = []
            for pg in pdf.pages:
                for k in range(3):
                    box = (pg.width * k / 3, 0, pg.width * (k + 1) / 3, pg.height)
                    cols.append(pg.crop(box).extract_text() or "")
        txt = flat + "\n" + "\n".join(cols)
        texts[key] = txt
        reg['sources'][key] = {**meta, 'exists': True, 'sha256': sha,
                               'bytes': os.path.getsize(p), 'pages': pages,
                               'textChars': len(txt), 'textLayer': len(txt) > 2000}

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
    reg['counts'] = {'sources': len(reg['sources']), 'clauses': len(reg['clauses']),
                     'verified': ok, 'unverified': len(reg['clauses']) - ok}
    json.dump(reg, open(os.path.join(D, '补源登记.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)

    print(f"来源 {len(reg['sources'])} · 条文 {reg['counts']['clauses']} · 逐字可查 {ok}")
    for s, m in reg['sources'].items():
        print(f"  {s:24} {m.get('pages', '—'):>2} 页 · {m.get('textChars', 0):>6} 字符 · "
              f"{(m.get('sha256') or '')[:16]}… · 文本层 {m.get('textLayer')}")
    for c in reg['clauses']:
        if not c['verified']:
            print('  ✗ 未通过', c['id'], c['missing'])


if __name__ == '__main__':
    main()
