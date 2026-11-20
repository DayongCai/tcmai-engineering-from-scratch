#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_jiankang_pinggu_sources.py —— 药事管理学 外源补源登记 + 逐字校勘

按 补源约定.md 的十条规定做三件事：
  1. 对 standards/yaoshi-guanli/sources/*.pdf 现算 sha256、bytes、页数、文本层字符数；
  2. 把 外源条文.json 每条「原文」按 " ... " 切段，逐段回查 PDF 文本层；
  3. 写 补源登记.json（来源、URL、sha256、校勘结论、条号 locator）。

归一四项（与约定第五节一致）：删空白与软连字符、删页眉页脚与孤立页码、连字符跨行合并、
**连字符合成字母还原（ﬁ→fi、ﬂ→fl、ﬀ→ff）**。其余一概不动；查不到即 unverified，不许引用。
"""
import hashlib
import html
import json
import os
import re

import pdfplumber

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, 'standards', 'yaoshi-guanli')
SRC = os.path.join(D, 'sources')
CLAUSES = json.load(open(os.path.join(D, '外源条文.json'), encoding='utf-8'))

LIGATURES = {'\ufb01': 'fi', '\ufb02': 'fl', '\ufb00': 'ff', '\ufb03': 'ffi', '\ufb04': 'ffl'}
PAGE_JUNK = re.compile(r'-\s*\d{1,3}\s*-\s*X|^\s*(\d{1,3})\s*$|[—–-]\s*\d{1,3}\s*[—–-]|国家市场监督管理总局发布|国家市场监督管理总局规章|卫生部发布', re.M)


def norm(s):
    for k, v in LIGATURES.items():
        s = s.replace(k, v)
    s = s.replace('\u00ad', '')
    s = PAGE_JUNK.sub('', s)
    s = re.sub(r'-\s*\n\s*', '', s)
    return re.sub(r'\s+', '', s)


def main(check=False):
    reg = {"note": "药事管理学 外源补源登记：每条记来源、URL、sha256、页数与逐字校勘结论。"
                   "查不到的句子不入库（约定见 补源约定.md）。",
           "convention": "补源约定.md", "sources": {}, "clauses": []}

    texts = {}
    for key, meta in CLAUSES['sources'].items():
        p = os.path.join(SRC, meta['file'])
        if not os.path.exists(p):
            reg['sources'][key] = {**meta, 'exists': False}
            continue
        sha = hashlib.sha256(open(p, 'rb').read()).hexdigest()
        if meta.get('textfile'):
            # 旧版 .doc 等无法直接解析的原件：原件记 sha256，校勘走同目录文本副本（抽取不改字）
            txt = open(os.path.join(SRC, meta['textfile']), encoding='utf-8').read()
            pages = 0
        elif p.lower().endswith(('.html', '.htm')):
            raw = open(p, encoding='utf-8', errors='ignore').read()
            raw = re.sub(r'(?is)<(script|style).*?</\1>', '', raw)
            txt = html.unescape(re.sub(r'<[^>]+>', '\n', raw))
            pages = 0
        else:
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
            # 原文净值：只删页眉/页脚/孤立页码这些**版式痕迹**，其余一字不动。
            # 为什么需要：原文里的「现- 1 -X国家市场监督管理总局发布…」是从 PDF 文本层带出来的版式垃圾，
            # 照抄进教材就成了「引文里混着页眉」。引用一律取净值，比对仍走 norm()。
            '原文净值': PAGE_JUNK.sub('', c['原文']).strip(),
        })
    reg['counts'] = {'sources': len(reg['sources']), 'clauses': len(reg['clauses']),
                     'verified': ok, 'unverified': len(reg['clauses']) - ok,
                     'junkPolluted': sum(1 for c in CLAUSES['clauses'] if PAGE_JUNK.search(c['原文']))}
    out_path = os.path.join(D, '补源登记.json')

    if check:
        # 幂等门：sources/ 或 外源条文.json 变了没重跑，登记就会过期。
        # 只比这三块（note/convention 是静态文案，不算事实）。
        if not os.path.exists(out_path):
            print('✗ 缺 补源登记.json（先跑 python scripts/build_yaoshi_guanli_sources.py）')
            return 1
        old = json.load(open(out_path, encoding='utf-8'))
        for k in ('sources', 'clauses', 'counts'):
            a = json.dumps(old.get(k), ensure_ascii=False, sort_keys=True)
            b = json.dumps(reg.get(k), ensure_ascii=False, sort_keys=True)
            if a != b:
                print(f'✗ DRIFT {k}：补源登记与重算不一致 —— 改过 sources/ 或 外源条文.json 就重跑本脚本')
                return 1
        print(f"✅ 补源登记与重算一致：来源 {len(reg['sources'])} · 条文 {reg['counts']['clauses']} · "
              f"逐字可查 {reg['counts']['verified']} · 原文带页眉污染 {reg['counts']['junkPolluted']}（引用取 原文净值）")
        return 0

    json.dump(reg, open(out_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    print(f"来源 {len(reg['sources'])} · 条文 {reg['counts']['clauses']} · 逐字可查 {ok}")
    for s, m in reg['sources'].items():
        print(f"  {s:24} {m.get('pages', '—'):>2} 页 · {m.get('textChars', 0):>6} 字符 · "
              f"{(m.get('sha256') or '')[:16]}… · 文本层 {m.get('textLayer')}")
    for c in reg['clauses']:
        if not c['verified']:
            print('  ✗ 未通过', c['id'], c['missing'])
    return 0


if __name__ == '__main__':
    import sys
    sys.exit(main(check='--check' in sys.argv))
