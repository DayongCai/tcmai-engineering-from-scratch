# -*- coding: utf-8 -*-
"""从 WHO《国际标准中医药术语（西太区版，2007）》原文 PDF 抽出证候代码，并与本仓库证名做**精确**匹配。

两个子命令：

    # 1) 抽表（需要 pymupdf + 同目录的 pdftotext -layout 文本）
    pdftotext -enc UTF-8 -layout istt2007.pdf istt2007.txt
    python scripts/who_istt_extract.py extract istt2007.pdf istt2007.txt who_rows.json

    # 2) 匹配（需要 opencc 做简→繁；只做精确匹配，同义关系不在这里处理）
    python scripts/who_istt_extract.py match who_rows.json out-candidates.json

为什么要按坐标抽表：这本书的表格由 4 个独立文本流排出（代码 / 英文术语 / 中文名 / 释义），
直接复制文字会串行 —— 中文名会落到相邻条目上，释义整体错位。规则：

  · 代码列 = 最左、形如 `x.y.z` 的 span；代码单元格在行内**垂直居中**；
  · 中文名：按相邻代码 y 的中点切行带，行带内的汉字 span 归属该代码（多行=同一代码的别名）；
  · 英文名 / 释义：按段落块切分后**顺序配对**（释义列有自己的流，y 对不齐），
    并用"行带法"对英文名做互校，两法不一致即标记 enAgree=false（导入时不采用）。

  释义只在「块数 == 该页代码数」时采用，否则置 null —— 宁缺不污。

书页号取自页眉数字（与 PDF 页差 5–20）；章节标题取自 pdftotext 的旋转页眉，
再按组号（`2.9` 等）取众数，避免章节交界页的页眉串到邻节。

来源与校验：
    PDF  https://iris.who.int/bitstreams/24400634-2d52-4dde-bbb1-d28ee2c6fd42/download
    sha256 d90b67f7a48a4e6ce06626f2be8ec4438312b66ed8bad89baa2a14691dd3a329
    已知锚点（与本机既有条目、herba.kr 转录三方一致）：
      2.9.90 肝陽上亢證 / 2.9.25 肺陰虛證 / 2.9.126 脾腎陽虛證（书页 146）
"""
import hashlib
import json
import os
import re
import sys

CODE = re.compile(r'^\d{1,2}\.\d{1,2}\.\d{1,3}$')
CJK = re.compile(r'[\u4e00-\u9fff]')
SECTION = re.compile(r'^(\d{1,3})\s+(Basic Theories|Diagnostics|Therapeutics|Acupuncture and Moxibustion|'
                     r'Materia Medica|Prescriptions|Health Preservation|Disorders)\s+-\s+(.+?)\s*$')
PAREN = re.compile(r'[（(][^（）()]*[）)]\s*$')


def class_path(section):
    """书的章节标题 → [章, 节]。标题形如 `Diagnostics - Visceral Pattern Identification/ Syndrome Differentiation`。"""
    if not section:
        return []
    if ' - ' in section:
        part, sec = section.split(' - ', 1)
        return [part.strip(), sec.strip()]
    return [section.strip()]
NORM = lambda s: s.replace('溼', '濕').replace('証', '證').replace('祕', '秘').replace('臺', '台')


# ── 文本清洗 ────────────────────────────────────────────────────────────────
def clean_en(s):
    s = re.sub(r'\s+', ' ', s).strip()
    s = re.sub(r'^\d{1,2}\.\d{1,2}\.\d{1,3}\s+', '', s)   # 串进来的行首代码
    s = re.sub(r'/\s+', '/', s)                          # pattern/ syndrome
    s = re.sub(r'(\w)-\s+(\w)', r'\1-\2', s)             # dampness- heat
    return s


def clean_def(s):
    s = re.sub(r'\s+', ' ', s).strip()
    if 'a pattern/syndrome' not in s:
        return None
    s = s[s.index('a pattern/syndrome'):]
    # 该书释义句末不带句号（与 herba 转录一致），只挡断在词中间的残句
    return s if len(s) > 40 and (s[-1].isalnum() or s[-1] == '.') else None


def section_map(txt_path):
    m = {}
    if not txt_path or not os.path.exists(txt_path):
        return m
    for raw in open(txt_path, encoding='utf-8', errors='replace'):
        hit = SECTION.match(raw.strip().replace('\f', '').strip())
        if hit:
            m[int(hit.group(1))] = f'{hit.group(2)} - {hit.group(3)}'
    return m


def blocks(spans, pitch=14.0):
    out = []
    for y, t in sorted(spans):
        if out and y - out[-1][-1][0] <= pitch:
            out[-1].append((y, t))
        else:
            out.append([(y, t)])
    return [' '.join(t for _, t in b) for b in out]


# ── 1) 抽表 ────────────────────────────────────────────────────────────────
def extract(pdf, txt, out_path):
    import pymupdf                      # 只有抽表要它；match 子命令不需要
    doc = pymupdf.open(pdf)
    secs = section_map(txt)
    rows = []
    for pno in range(doc.page_count):
        page = pno + 1
        spans, hdr_y = [], 0.0
        for b in doc[pno].get_text('dict')['blocks']:
            for l in b.get('lines', []):
                for s in l['spans']:
                    t = s['text']
                    if not t.strip():
                        continue
                    spans.append((s['bbox'][0], s['bbox'][1], t))
                    if t.strip() in ('Code', 'Term', 'Chinese'):
                        hdr_y = max(hdr_y, s['bbox'][1])
        if hdr_y == 0:
            continue
        body = [(x, y, t) for x, y, t in spans if y > hdr_y + 4]
        cjk_x = [x for x, y, t in body if CJK.search(t)]
        if not cjk_x:
            continue
        cn_x = min(cjk_x)
        codes = sorted((y, t.strip()) for x, y, t in body if x < cn_x - 60 and CODE.match(t.strip()))
        if not codes:
            continue
        book = None
        for m in re.finditer(r'(?m)^\s*(\d{1,3})\s*$', doc[pno].get_text()):
            if 5 <= page - int(m.group(1)) <= 20:
                book = int(m.group(1))
                break
        en_all = blocks([(y, t.strip()) for x, y, t in body
                         if x < cn_x - 5 and not CJK.search(t) and not CODE.match(t.strip())])
        def_all = blocks([(y, t.strip()) for x, y, t in body if x >= cn_x + 45])
        while def_all and not def_all[0].startswith('a pattern/syndrome'):
            def_all = def_all[1:]                       # 页首可能是上一页释义的尾
        def_ok = len(def_all) == len(codes)
        for i, (y, c) in enumerate(codes):
            lo = 0.0 if i == 0 else (codes[i - 1][0] + y) / 2
            hi = float('inf') if i + 1 == len(codes) else (y + codes[i + 1][0]) / 2
            cn = ''.join(t.strip() for x, yy, t in sorted(body)
                         if lo <= yy < hi and cn_x - 5 <= x < cn_x + 45 and CJK.search(t))
            en_band = clean_en(' '.join(t.strip() for x, yy, t in sorted(body)
                                        if lo <= yy < hi and x < cn_x - 5 and not CJK.search(t)
                                        and not CODE.match(t.strip())))
            en_seq = clean_en(en_all[i]) if i < len(en_all) else ''
            rows.append({'code': c, 'pdfPage': page, 'bookPage': book,
                         'section': secs.get(book) if book else None,
                         'cn': cn, 'en': en_seq or en_band, 'enBand': en_band, 'enSeq': en_seq,
                         'enAgree': bool(en_band and en_seq and en_band == en_seq),
                         'def': clean_def(def_all[i]) if def_ok and i < len(def_all) else None})

    votes = {}
    for r in rows:
        if r['section']:
            g = '.'.join(r['code'].split('.')[:2])
            votes.setdefault(g, {})
            votes[g][r['section']] = votes[g].get(r['section'], 0) + 1
    gsec = {g: max(c, key=c.get) for g, c in votes.items()}
    for r in rows:
        r['sectionGroup'] = gsec.get('.'.join(r['code'].split('.')[:2]))

    json.dump(rows, open(out_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('rows', len(rows),
          '· 英文名两法一致', sum(1 for r in rows if r['enAgree']),
          '· 有释义', sum(1 for r in rows if r['def']),
          '· 有章节', sum(1 for r in rows if r['section']))
    print('pdf sha256', hashlib.sha256(open(pdf, 'rb').read()).hexdigest())


# ── 2) 匹配 ────────────────────────────────────────────────────────────────
def match(rows_path, out_path, external_path, who_path):
    import opencc
    s2t = opencc.OpenCC('s2t')
    rows = json.load(open(rows_path, encoding='utf-8'))
    ext = json.load(open(external_path, encoding='utf-8'))
    who = json.load(open(who_path, encoding='utf-8'))
    have = {e['label'] for e in who['entries']}

    index = {}
    for r in rows:
        if not r['enAgree'] or not r['en']:
            continue                                   # 英文名两法不一致的条目一律不用
        for i, name in enumerate(p for p in (x.strip() for x in r['cn'].split(';')) if p):
            index.setdefault(NORM(name), []).append((r, i))

    cands, skipped = [], []
    for e in ext['entries']:
        label = e['label']
        if label in have:
            skipped.append((label, '已入库'))
            continue
        base = NORM(PAREN.sub('', label))
        target = NORM(s2t.convert(base))
        hits = index.get(target)
        if not hits:
            continue
        r, idx = hits[0]
        if len({h[0]['code'] for h in hits}) > 1:
            skipped.append((label, f'同名对多码 {sorted({h[0]["code"] for h in hits})}'))
            continue
        cands.append({
            'label': label,
            'whoCode': r['code'],
            'whoCnName': r['cn'],
            'matchType': 'exact-parenthetical-stripped' if base != label else 'exact',
            'matchNameIndex': idx,
            'whoEnglish': r['en'],
            'whoDefinitionEn': r['def'],
            'whoEdition': f'2007（西太区版，代码 {r["code"]}，书页 {r["bookPage"]}）',
            'classPathFromDict': class_path(r['sectionGroup']),
            'source': {
                'url': 'https://iris.who.int/bitstreams/24400634-2d52-4dde-bbb1-d28ee2c6fd42/download',
                'title': 'WHO International Standard Terminologies on Traditional Medicine in the Western Pacific Region（2007）',
                'type': 'WHO-TCM（原文 PDF，表格逐行坐标解析）',
                'pdfSha256': hashlib.sha256(open(os.environ.get('WHO_PDF', ''), 'rb').read()).hexdigest()
                if os.environ.get('WHO_PDF') and os.path.exists(os.environ['WHO_PDF']) else None,
                'pdfPage': r['pdfPage'],
                'bookPage': r['bookPage'],
            },
        })
    json.dump(cands, open(out_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'候选 {len(cands)} 条（证名 {len({c["label"] for c in cands})}，代码 {len({c["whoCode"] for c in cands})}）'
          f'· 跳过 {len(skipped)}')
    for label, why in skipped:
        print('  跳过', label, '—', why)


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    if cmd == 'extract':
        extract(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None,
                sys.argv[4] if len(sys.argv) > 4 else 'who_rows.json')
    elif cmd == 'match':
        match(sys.argv[2], sys.argv[3],
              sys.argv[4] if len(sys.argv) > 4 else 'standards/semtensor/descriptions/external.json',
              sys.argv[5] if len(sys.argv) > 5 else 'standards/semtensor/descriptions/who-tcm.json')
    else:
        print(__doc__)
        sys.exit(2)
