#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
scripts/build_wenbing_text.py —— 温病学外源底本构建（三书合成）

为什么需要它：
  `09-wenbing-xue` 的 10 章要引卫气营血、三焦、九种温病与方剂体系。仓库的教材底本
  （桌面 qhzy-*.xlsx 100 份）没有温病学，所以原文只能走外源，按 EXTERNAL-SOURCES.md
  的规矩办：先留档、再登记 sha256、然后才落条文；外源单独成库，不并入底本统计。

三本书各管一段（不是重复收录）：
  · 《溫病條辨》吴鞠通 —— 三焦辨证 + 九种温病 + 方剂体系（第 3/4/5/6/8/9 章主源）
  · 《溫熱論》葉天士 —— 卫气营血四层（第 2 章主源；37 条，源页自带条号）
  · 《溫疫論》吳又可 —— 疫病与戾气（第 10 章）

留档与复算：
  standards/wenbing/<id>/source.html     原始页面，按字节留档（只读）
  standards/wenbing/底本.json            解析产物：三书 · 卷/篇 · 条 · 方
  standards/wenbing/底本.md              人读版（繁/简并列）
  ← 全部由本脚本生成；`--check` 校验三份 sha256 与条/方数，网页改版即报错。

条号口径（三本不同，必须分开说）：
  · 溫病條辨：源文用漢数字＋「、」起条（一、二、三…），**条号沿用源文的漢数字**，
    不给它编阿拉伯序号；引用写「外源·笈成·溫病條辨 上焦篇·四」。
  · 溫熱論：源页 `<p id="1">`…`<p id="37">`，条号即源页 id。
  · 溫疫論：无条号，只有「卷—篇」，逐段编号记作「篇·段N（本库编号）」。

方剂口径（只对《溫病條辨》）：
  源页用 `<p><u>NAME方</u></p>` 起方，紧接一段药味「桂枝（六錢） 芍藥（炒，三錢）…」，
  再一段煎服法，其后可能有「方論」。药味与剂量是**全角括号**包剂量，与金匮的 ⟨⟩ 不同，
  所以不能照搬 build_jingui_text 的切法。
  只有方名、药文在别处（「方見上」「見前」）的，标 refOnly，不进配伍统计。

繁→简：只做字形（opencc t2s），不改字词、不改方名。

用法：
  python scripts/build_wenbing_text.py             # 解析并写产物
  python scripts/build_wenbing_text.py --check     # 校验 sha256 / 条数 / 方数
  python scripts/build_wenbing_text.py --tiao 上焦篇 4
  python scripts/build_wenbing_text.py --sample 濕温 5
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import re
import sys
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, 'standards', 'wenbing')
OUT_JSON = os.path.join(BASE, '底本.json')
OUT_MD = os.path.join(BASE, '底本.md')

PROVIDER = {
    'id': 'jicheng',
    'title': '中醫笈成（漢リポ 文字化本）',
    'url': 'https://jicheng.tw/tcm/book/',
    'raw': 'https://gitlab.com/jicheng/jc.data/-/raw/master/pages/book/',
}

BOOKS = [
    {
        'id': 'tiaobian', 'title': '溫病條辨', 'titleSimp': '温病条辨', 'author': '吳瑭（鞠通）', 'dynasty': '清',
        'edition': '《溫病條辨》問心堂本一系（笈成文字化本）',
        'role': '三焦辨证 · 九种温病 · 方剂体系',
        'parser': 'tiaobian',
    },
    {
        'id': 'wenrelun', 'title': '溫熱論', 'titleSimp': '温热论', 'author': '葉桂（天士）', 'dynasty': '清',
        'edition': '《溫熱論》通行本（笈成文字化本）',
        'role': '卫气营血四层',
        'parser': 'wenrelun',
    },
    {
        'id': 'wenyilun', 'title': '溫疫論', 'titleSimp': '温疫论', 'author': '吳有性（又可）', 'dynasty': '明',
        'edition': '《溫疫論》通行本（笈成文字化本）',
        'role': '疫病 · 戾气 · 膜原',
        'parser': 'wenyilun',
    },
]

T2S = None
try:
    from opencc import OpenCC
    T2S = OpenCC('t2s')
except Exception:  # pragma: no cover
    T2S = None

HAN = '一二三四五六七八九十百'


def to_simp(s: str) -> str:
    return T2S.convert(s) if T2S is not None else s


def sha256_file(p: str) -> str:
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def clean(s: str) -> str:
    s = re.sub(r'<br\s*/?>', '\n', s)
    s = re.sub(r'<[^>]+>', '', s)
    s = (s.replace('&nbsp;', ' ').replace('&amp;', '&')
         .replace('&lt;', '<').replace('&gt;', '>'))
    return re.sub(r'[ \t\u3000]+', ' ', s).strip()


def paragraphs(html: str):
    return [clean(m.group(1)) for m in re.finditer(r'(?s)<p[^>]*>(.*?)</p>', html)]


# ── 《溫病條辨》: 卷(h1) → 病类(h2) → 条(漢数字、) + 方(<u>X方</u>) ──────────
TOKEN = re.compile(r'(?s)<h([12])[^>]*>(.*?)</h\1>|<u>(.*?)</u>|<p[^>]*>(.*?)</p>')


def parse_herbs(line: str):
    """药味行：`桂枝（六錢） 芍藥（炒，三錢）` —— 剂量在**全角括号**里，药与药之间单空格。
    与金匮的 ⟨⟩ 夹注不同，这里不能复用那套切法。"""
    out = []
    for tok in re.split(r'[ \u3000]+', line.strip()):
        tok = tok.strip('，,。；')
        if not tok:
            continue
        m = re.match(r'^([^（(]+?)(?:[（(]([^）)]*)[）)])?$', tok)
        if not m:
            continue
        herb = (m.group(1) or '').strip()
        dose = (m.group(2) or '').strip()
        if not herb or herb in ('煎法服法',):
            continue
        # 「牛黃丸、紫雪丹」这类一个标记并列多个方，按顿号拆成多味方名的情形不在这里处理
        out.append({'herb': herb, 'herbSimp': to_simp(herb), 'dose': dose, 'doseSimp': to_simp(dose)})
    return out


def parse_tiaobian(html: str):
    body = re.sub(r'(?s)<(script|style).*?</\1>', '', html)
    sections = []
    cur = None
    art = None
    fang = None
    stage = 0          # 0 未起方；1 待药味；2 待煎服法；3 方论
    for m in TOKEN.finditer(body):
        if m.group(1):
            lv, title = m.group(1), clean(m.group(2))
            if not title or title.startswith('中醫') or '笈成' in title:
                continue
            if lv == '1':
                cur = {'juan': title, 'pian': None, 'articles': [], 'formulas': []}
            else:
                cur = {'juan': cur['juan'] if cur else None, 'pian': title, 'articles': [], 'formulas': []}
            sections.append(cur)
            art, fang, stage = None, None, 0
            continue
        if cur is None:
            continue
        if m.group(3) is not None:                      # <u>NAME方</u>
            name = clean(m.group(3))
            if not name:
                continue
            fang = {'name': name, 'nameSimp': to_simp(name), 'ingredients': [],
                    'method': '', 'methodSimp': '', 'pian': cur['pian'], 'juan': cur['juan'],
                    'tiao': art['no'] if art else None, 'refOnly': False}
            cur['formulas'].append(fang)
            stage = 1
            continue
        raw_p = m.group(4) or ''
        p = clean(raw_p)
        if not p:
            continue
        # 方名段落形如 <p><u>桂枝湯方</u></p>，也可能带尾注：<u>方名</u>（方見前）／（甘寒法）
        um = re.match(r'^\s*<u>(.*?)</u>\s*(?:[（(](.*?)[）)])?\s*$', raw_p, re.S)
        if um:
            name = clean(um.group(1))
            if not name:
                continue
            note = clean(um.group(2) or '')
            ref = bool(re.search(r'方見|見前|見上|見下|見暑温|並見', note))
            fang = {'name': name, 'nameSimp': to_simp(name), 'ingredients': [],
                    'method': '', 'methodSimp': '', 'note': note, 'noteSimp': to_simp(note),
                    'pian': cur['pian'], 'juan': cur['juan'],
                    'tiao': art['no'] if art else None, 'refOnly': ref}
            cur['formulas'].append(fang)
            stage = 1
            continue
        if fang is not None:
            # 新一轮条文会结束上一个方（方论截止到下一「一、二、三…」条）
            if re.match(r'^([%s]+)、' % HAN, p):
                fang, stage = None, 0
            else:
                if stage == 1:
                    # 药味段之前可能先来「主治」「即於某方內加減」——都不是药味
                    if re.match(r'^主治|^治[^，。]{0,8}(證|证|病)', p):
                        fang['indication'] = to_simp(p)
                        continue
                    if re.search(r'即於|即于|去[^，。]{1,10}加|內加|内加|加[^，。]{1,6}（', p):
                        fang['derivedFrom'] = to_simp(p)
                        fang['refOnly'] = True
                        stage = 3
                        continue
                    herbs = parse_herbs(p)
                    # 单 token 且超长 = 整段散文（水仙膏方的「水仙花根，不拘多少，剥去老赤皮…」）
                    if len(herbs) == 1 and len(herbs[0]['herb']) > 8:
                        fang['derivedFrom'] = to_simp(p)
                        fang['refOnly'] = True
                        stage = 3
                        continue
                    fang['ingredients'] = herbs
                    fang['refOnly'] = len(herbs) == 0
                    stage = 2
                    continue
                if stage == 2:
                    fang['method'] = p
                    fang['methodSimp'] = to_simp(p)
                    stage = 3
                    continue
                fang.setdefault('comment', '')
                fang['comment'] = (fang['comment'] + '\n' + to_simp(p)).strip()[:4000]
                continue
        mm = re.match(r'^([%s]+)、(.+)$' % HAN, p)
        if mm:
            art = {'no': mm.group(1), 'text': mm.group(2).strip(), 'notes': []}
            cur['articles'].append(art)
        elif art is not None:
            art['notes'].append(p)                       # 条后自注/按语
    return [s for s in sections if s['articles'] or s['formulas']]


# ── 《溫熱論》: 37 条，源页 <p id="N"> ──────────────────────────────
def parse_wenrelun(html: str):
    arts = []
    for m in re.finditer(r'(?s)<p id="(\d+)">(.*?)</p>', html):
        t = clean(m.group(2))
        if not t:
            continue
        arts.append({'no': int(m.group(1)), 'text': t, 'notes': []})
    return [{'juan': None, 'pian': '溫熱論', 'articles': arts, 'formulas': []}]


# ── 《溫疫論》: 卷(h1) → 篇(h2) → 段落 ────────────────────────────
def parse_wenyilun(html: str):
    body = re.sub(r'(?s)<(script|style).*?</\1>', '', html)
    sections = []
    cur = None
    for chunk in re.split(r'(?s)(<h[12][^>]*>.*?</h[12]>)', body):
        m = re.match(r'<h([12])[^>]*>(.*?)</h\1>', chunk, re.S)
        if m:
            lv, title = m.group(1), clean(m.group(2))
            if not title or title.startswith('中醫') or '笈成' in title:
                continue
            if lv == '1':
                cur = {'juan': title, 'pian': None, 'articles': [], 'formulas': []}
                sections.append(cur)
            else:
                cur = {'juan': cur['juan'] if cur else None, 'pian': title, 'articles': [], 'formulas': []}
                sections.append(cur)
            continue
        if cur is None:
            continue
        for p in paragraphs(chunk):
            if not p:
                continue
            f = re.match(r'^([\u4e00-\u9fff]{2,14}方)$', p)
            if f:
                cur['formulas'].append({'name': f.group(1), 'pian': cur['pian'], 'juan': cur['juan']})
                continue
            cur['articles'].append({'no': len(cur['articles']) + 1, 'text': p, 'notes': []})
    return [s for s in sections if s['articles'] or s['formulas']]


PARSERS = {'tiaobian': parse_tiaobian, 'wenrelun': parse_wenrelun, 'wenyilun': parse_wenyilun}


def load_book(b):
    p = os.path.join(BASE, b['id'], 'source.html')
    if not os.path.exists(p):
        sys.exit(f"✗ 缺留档 standards/wenbing/{b['id']}/source.html —— 先抓原文（见 README）")
    raw = open(p, 'rb').read()
    sections = PARSERS[b['parser']](raw.decode('utf-8', 'replace'))
    for s in sections:
        for a in s['articles']:
            a['zhHant'] = a['text']
            a['zhHans'] = to_simp(a['text'])
            a['notesHant'] = a['notes']
            a['notes'] = [to_simp(n) for n in a['notes']]
            del a['text']
        for f in s['formulas']:
            f['nameSimp'] = to_simp(f['name'])
            # 不变式：没有药味就不是可统计的方（互见/加减/主治先行都会走到这里）。
            # 少数方名段被源页排版粘上了下文（如「桃花方方法」），先按不变式兜住，
            # 并在 quirks 里点名，避免把它当成正常方名引用。
            if not f['ingredients']:
                f['refOnly'] = True
            if '方法' in f['nameSimp'] or len(f['nameSimp']) > 16:
                f.setdefault('quirks', []).append('name')
    return {
        'id': b['id'], 'title': b['title'], 'titleSimp': b['titleSimp'],
        'author': b['author'], 'dynasty': b['dynasty'], 'edition': b['edition'], 'role': b['role'],
        'source': {
            'provider': PROVIDER['id'], 'providerTitle': PROVIDER['title'],
            'url': PROVIDER['url'] + b['title'] + '/index.html',
            'rawUrl': PROVIDER['raw'] + b['title'] + '/index.html',
            'bytes': len(raw), 'sha256': sha256_file(p),
            'fetchedAt': date.fromtimestamp(os.path.getmtime(p)).isoformat(),
        },
        'sections': sections,
        'counts': {
            'sections': len(sections),
            'articles': sum(len(s['articles']) for s in sections),
            'formulas': sum(len(s['formulas']) for s in sections),
            'charsHant': sum(len(a['zhHant']) for s in sections for a in s['articles']),
        },
    }


def build():
    books = [load_book(b) for b in BOOKS]
    return {
        'scope': '温病学（卫气营血 · 三焦 · 九种温病 · 方剂 · 疫病）',
        'numbering': '條辨沿用源文漢数字条号；溫熱論用源页 id；溫疫論按篇内段落编号（本库编号）',
        't2s': 'opencc t2s（仅字形）' if T2S is not None else '未安装 opencc',
        'books': books,
        'counts': {
            'books': len(books),
            'sections': sum(b['counts']['sections'] for b in books),
            'articles': sum(b['counts']['articles'] for b in books),
            'formulas': sum(b['counts']['formulas'] for b in books),
            'charsHant': sum(b['counts']['charsHant'] for b in books),
        },
    }


def write_md(doc):
    L = ['# 温病学 · 外源底本（三书）\n',
         '> 引用格式：**外源·笈成·&lt;书名&gt; <卷/篇>·第N条**。不得标为「底本」（底本 = qhzy-*.xlsx）。\n']
    for b in doc['books']:
        s = b['source']
        L += [f"## {b['titleSimp']}（{b['author']}）\n",
              f"- 用途：{b['role']}",
              f"- 留档：`standards/wenbing/{b['id']}/source.html` · {s['bytes']:,} 字节 · sha256 `{s['sha256']}`",
              f"- 规模：{b['counts']['sections']} 卷/篇 · {b['counts']['articles']} 条 · {b['counts']['formulas']} 方 · {b['counts']['charsHant']:,} 字（繁）\n"]
        for sec in b['sections']:
            head = ' · '.join(x for x in [sec['juan'], sec['pian']] if x) or '（无标题）'
            L.append(f"### {head}\n")
            for a in sec['articles'][:40]:
                L.append(f"- **{a['no']}** {a['zhHans']}")
                for n in a['notes'][:2]:
                    L.append(f"  - 注：{n[:120]}")
            for f in sec['formulas']:
                L.append(f"- 方：**{f['nameSimp']}**")
            L.append('')
    return '\n'.join(L) + '\n'


def check():
    doc = build()
    prev = json.load(io.open(OUT_JSON, encoding='utf-8'))
    errs = []
    prevById = {b['id']: b for b in prev['books']}
    for b in doc['books']:
        old = prevById.get(b['id'])
        if not old:
            errs.append(f"新增书 {b['id']}")
            continue
        if old['source']['sha256'] != b['source']['sha256']:
            errs.append(f"{b['titleSimp']} sha256 变化")
        for k in ('sections', 'articles', 'formulas'):
            if old['counts'][k] != b['counts'][k]:
                errs.append(f"{b['titleSimp']} {k}：{old['counts'][k]} → {b['counts'][k]}")
    if errs:
        print('[wenbing] ✗ 底本与留档不一致\n  ' + '\n  '.join(errs))
        return 1
    c = doc['counts']
    print(f"[wenbing] ✓ {c['books']} 书 · {c['sections']} 卷篇 · {c['articles']} 条 · {c['formulas']} 方 · {c['charsHant']:,} 字")
    for b in doc['books']:
        print(f"    {b['titleSimp']}: {b['counts']['articles']} 条 · {b['counts']['formulas']} 方 · sha {b['source']['sha256'][:12]}")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--tiao', nargs=2, metavar=('PIAN', 'NO'))
    ap.add_argument('--sample', nargs=2, metavar=('KEYWORD', 'N'))
    args = ap.parse_args()

    if args.check:
        return check()

    doc = build()

    if args.tiao:
        pian, no = args.tiao
        for b in doc['books']:
            for sec in b['sections']:
                for a in sec['articles']:
                    if str(a['no']) == str(no) and (sec['pian'] or '').find(pian) >= 0:
                        print(f"{b['titleSimp']} · {sec['pian']} · 第{a['no']}条")
                        print('  简：', a['zhHans'])
                        print('  繁：', a['zhHant'])
                        for n in a['notes'][:3]:
                            print('  注：', n[:160])
        return 0

    if args.sample:
        kw, n = args.sample[0], int(args.sample[1])
        for b in doc['books']:
            for sec in b['sections']:
                if kw in (sec['pian'] or ''):
                    print(f"── {b['titleSimp']} · {sec['pian']}（{len(sec['articles'])} 条 · {len(sec['formulas'])} 方）")
                    for a in sec['articles'][:n]:
                        print('  ', a['no'], a['zhHans'][:80])
                    print('   方：', '、'.join(f['nameSimp'] for f in sec['formulas']))
        return 0

    with io.open(OUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write('\n')
    with io.open(OUT_MD, 'w', encoding='utf-8') as f:
        f.write(write_md(doc))
    c = doc['counts']
    print('═══ 温病学底本（三书）═══')
    print(f"  书 {c['books']} · 卷篇 {c['sections']} · 条 {c['articles']} · 方 {c['formulas']} · 繁字 {c['charsHant']:,}")
    for b in doc['books']:
        print(f"    {b['titleSimp']}: 条 {b['counts']['articles']} · 方 {b['counts']['formulas']} · {b['source']['sha256'][:12]}")
    print('  → standards/wenbing/底本.json · 底本.md')
    return 0


if __name__ == '__main__':
    sys.exit(main())
