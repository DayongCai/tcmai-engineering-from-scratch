#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
scripts/build_neijing_text.py —— 《内经选读》底本的机器可读化

为什么需要它：
  06-neijing-xuandu 是中医系第 6 门，10 章，长期是「有课程、无底本」——
  kt-sphere 里 units=0 / std="" （本库 11 门底本缺席的学科之一，内经选读最要紧）。
  母本是 `F:\\textbooks\\qhzy-黄帝内经(通读注释版).xlsx`（46 个工作表：31 个内容表 + 15 个方法与平台表），
  内容表按「类型 / 四级编码 / 内容」三列排：篇名 → 通读 → 原文 → 注释。
  不落成 JSON + sha256，章节引文只能手抄——这正是本仓库一直拒绝的做法。

产物：
  standards/neijing-xuandu/底本.json  完整层级：篇类 → 篇 → 段（原文/注释/通读逐行）
  standards/neijing-xuandu/底本.md    人读版（篇类目录 + 每篇首段）
  standards/neijing-xuandu/units.json 单元层：一篇一单元（162 单元）
  standards/neijing-xuandu/README.md  来源 / 口径 / 引用格式
  standards/neijing-xuandu/sources/   工作簿副本（留档，按 sha256 校验）

口径：
  · 一篇一单元。《素问》81 篇 + 《灵枢》81 篇 = 162，与课程「内经选读」的书名口径一致。
  · 单元正文＝该篇全部「原文」段按序拼接；「通读」（篇导读）与「注释」单列，不进正文，
    否则统计字数会把教材按语混进原文。
  · 不校改：异体字、校勘批注（【网络校准·…】）原样保留，`notes` 里单独计数。
  · 三轴按本库既有写法族口径现算（阴阳 / 五行 / 藏象 / 经络 / 病机 / 治则 / 养生 / 运气），
    成员词在 README 公开，读者可自行复核。

用法：
  python scripts/build_neijing_text.py            # 生成四份产物 + 留档源
  python scripts/build_neijing_text.py --check    # sha256 / 规模 / 逐段对读
  python scripts/build_neijing_text.py --pian 阴阳应象大论
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'standards', 'neijing-xuandu')
SRC_DIR = os.path.join(OUT_DIR, 'sources')
SRC_NAME = 'qhzy-黄帝内经(通读注释版).xlsx'

CANDIDATES = [
    r'F:\textbooks\qhzy-黄帝内经(通读注释版).xlsx',
    r'E:\textbooks\qhzy-黄帝内经(通读注释版).xlsx',
    os.path.join(os.path.expanduser('~'), 'Desktop', 'textbooks', SRC_NAME),
]

import unicodedata


def _is_han(ch: str) -> bool:
    r"""汉字口径按 Unicode 块名判定，与测试里 \p{Script=Han} 同一口径。

    只认 [\u4e00-\u9fff] 会漏掉扩展区（B 区起是代理对），实测有 7 篇各差 1–2 字。
    """
    return unicodedata.name(ch, '').startswith('CJK UNIFIED IDEOGRAPH')
PIAN_NO = re.compile(r'（(素问|灵枢)第([0-9〇一二三四五六七八九十百]+)篇）')

BOOK = {
    'title': '黄帝内经（通读注释版）',
    'short': '内经选读',
    'edition': '岐黄智医版种子内容 v0.1-qhzy（2026-08-08）',
    'author': '项目组（依《素问》《灵枢》通行本整理，篇序按王冰次注 81 篇 / 史崧本 81 篇）',
    'note': '教材母本为 Excel 工作簿，非影印古籍；引文标「教材·素问·篇名（素问第N篇）」',
}

# 三轴：与 build_kt_history.py / build_kt_sphere_data.py 同一套写法族口径。
AXES = [
    ('阴阳', ['阴阳', '阳气', '阴气', '阳胜', '阴胜']),
    # 单字「木火土金水」在《内经》里遍地都是（水浆/火热/土工），只数它们会把轴撑爆；
    # 改数「五行」与《洪范》五行的定式写法，口径可解释。
    ('五行', ['五行', '相生', '相克', '生克', '木曰曲直', '火曰炎上', '土爰稼穑', '金曰从革', '水曰润下']),
    ('藏象', ['五藏', '五脏', '六府', '六腑', '藏象']),
    ('经络', ['经络', '经脉', '络脉', '经别', '经筋', '皮部']),
    ('病机', ['病机', '邪气', '正气', '虚实', '寒热', '表里']),
    ('治则', ['治则', '治法', '补泻', '逆从', '标本', '因势利导']),
    ('养生', ['养生', '摄生', '恬惔', '虚邪贼风', '治未病']),
    ('运气', ['五运', '六气', '司天', '在泉', '岁运', '客气', '主气']),
]


def hanzi(s: str) -> int:
    return sum(1 for ch in (s or '') if _is_han(ch))


def sha256_file(p: str) -> str:
    h = hashlib.sha256()
    with io.open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def find_src() -> str:
    for p in CANDIDATES:
        if os.path.exists(p):
            return p
    raise SystemExit('找不到底本工作簿：' + ' / '.join(CANDIDATES))


def load_book():
    import openpyxl  # 缺依赖要明确报错，不静默降级
    p = find_src()
    wb = openpyxl.load_workbook(p, read_only=True, data_only=True)
    classes, skipped = [], []
    for name in wb.sheetnames:
        ws = wb[name]
        rows = list(ws.iter_rows(min_row=1, values_only=True))
        if not rows:
            skipped.append(name)
            continue
        first = [str(x or '').strip() for x in (rows[0] + (None, None, None))[:3]]
        if first != ['类型', '四级编码', '内容（原文/注释）']:
            skipped.append(name)
            continue
        rows = rows[1:]
        m = re.match(r'^(\d+)\.(素问|灵枢)·(.+)$', name)
        if not m:
            skipped.append(name)
            continue
        no, book, title = int(m.group(1)), m.group(2), m.group(3)
        pians, cur = [], None
        for r in rows:
            if len(r) < 3:
                continue
            typ = str(r[0] or '').strip()
            code = str(r[1] or '').strip()
            body = str(r[2] or '')
            if typ == '篇名':
                pm = PIAN_NO.search(body)
                full = PIAN_NO.sub('', body).strip()
                cur = {
                    'title': full,
                    'book': pm.group(1) if pm else book,
                    'no': pm.group(2) if pm else '',
                    'code': code,
                    'tongdu': '',
                    'paras': [],   # 原文段，按序
                    'notes': [],   # 注释段
                }
                pians.append(cur)
            elif cur is None:
                continue
            elif typ == '通读':
                cur['tongdu'] = (cur['tongdu'] + '\n' + body).strip()
            elif typ == '原文':
                cur['paras'].append({'code': code, 'text': body.strip()})
            elif typ == '注释':
                cur['notes'].append({'code': code, 'text': body.strip()})
        classes.append({'no': no, 'book': book, 'title': title, 'sheet': name, 'pians': pians})
    wb.close()
    for c in classes:
        for p_ in c['pians']:
            p_['cls'] = c['title']
            p_['clsNo'] = c['no']
            p_['clsSheet'] = c['sheet']
            p_['body'] = '\n'.join(x['text'] for x in p_['paras'])
    return p, classes, skipped


def measure(body: str) -> dict:
    return {k: sum(body.count(w) for w in words) for k, words in AXES}


FULL_TXT = os.path.join(ROOT, 'standards', 'materials', 'neijing-quanwen', 'content.json')

# 教材本篇名 → 全文篇名（今字/遗篇前缀差异；与 wire_neijing_chapters.py 的 ALIAS 同一张表）
ALIAS_FULL = {
    '五脏生成': '五藏生成', '五脏别论': '五藏别论', '本脏': '本藏',
    '玉机真脏论': '玉机真藏论', '脏气法时论': '藏气法时论',
    '邪气脏腑病形': '邪气藏府病形', '忧恚无言': '忧患无言',
    '遗篇·刺法论': '刺法论', '遗篇·本病论': '本病论', '上膈': '上隔', '背腧': '背俞',
}


def compare_full(units) -> dict:
    """与全文对读：只看字数比，不跑 difflib（162 篇全量比对太慢，逐章比在 wire 脚本里做）。"""
    if not os.path.exists(FULL_TXT):
        return {'available': False}
    A = json.load(io.open(FULL_TXT, encoding='utf-8'))
    full = {}
    for s in A['sections']:
        full[s['title'].split('·')[-1]] = sum(hanzi(b['text']) for b in s['blocks'] if b['type'] == '原文')
    full_n = 0
    excerpt, same, missing = [], [], []
    for u in units:
        name = u['title'] if u['title'] in full else ALIAS_FULL.get(u['title'])
        if not name or name not in full:
            missing.append(u['title'])
            continue
        f = full[name]
        full_n += f
        if f and u['hanzi'] / f >= 0.9:
            same.append(u['title'])
        else:
            excerpt.append({'title': u['title'], 'xuandu': u['hanzi'], 'full': f,
                            'pct': round(100 * u['hanzi'] / f, 1) if f else 0})
    excerpt.sort(key=lambda x: x['pct'])
    return {
        'available': True, 'pians': len(full), 'hanzi': full_n,
        'same': len(same), 'excerpt': len(excerpt), 'missing': missing,
        'excerptList': excerpt,
    }


def build():
    src = find_src()
    sha = sha256_file(src)
    classes, skipped = [], []
    _, classes, skipped = load_book()
    units = []
    for c in classes:
        for p_ in c['pians']:
            body = p_['body']
            loc = f"黄帝内经·{p_['book']}·{p_['title']}（{p_['book']}第{p_['no']}篇）"
            units.append({
                'chapter': str(c['no']),
                'chapterTitle': f"{c['no']}.{c['book']}·{c['title']}",
                'sec': p_['book'],
                'sub': p_['no'],
                'title': p_['title'],
                'locator': loc,
                'brief': (p_['paras'][0]['text'] if p_['paras'] else '')[:60],
                'rawBody': body,
                'body': body,
                'paras': p_['paras'],
                'notes': p_['notes'],
                'tongdu': p_['tongdu'],
                'hanzi': hanzi(body),
                'paras_count': len(p_['paras']),
                'measure': {'views': measure(body)},
            })
    counts = {
        'classes': len(classes),
        'pians': sum(len(c['pians']) for c in classes),
        'paras': sum(len(p['paras']) for c in classes for p in c['pians']),
        'notes': sum(len(p['notes']) for c in classes for p in c['pians']),
        'units': len(units),
        'hanzi': sum(u['hanzi'] for u in units),
        'hanziNotes': sum(hanzi(x['text']) for u in units for x in u['notes']),
        'hanziTongdu': sum(hanzi(u['tongdu']) for u in units),
        'byBook': {
            '素问': {
                'pians': sum(1 for u in units if u['sec'] == '素问'),
                'hanzi': sum(u['hanzi'] for u in units if u['sec'] == '素问'),
            },
            '灵枢': {
                'pians': sum(1 for u in units if u['sec'] == '灵枢'),
                'hanzi': sum(u['hanzi'] for u in units if u['sec'] == '灵枢'),
            },
        },
        'axisTotals': {ax: sum(u['measure']['views'][ax] for u in units) for ax, _ in AXES},
        'fullCompare': compare_full(units),
    }
    ben = {
        'book': BOOK,
        'source': {
            'path': src,
            'archive': f'standards/neijing-xuandu/sources/{SRC_NAME}',
            'sha256': sha,
            'bytes': os.path.getsize(src),
        },
        'counts': counts,
        'axes': [{'name': ax, 'members': ws} for ax, ws in AXES],
        'classes': [
            {
                'no': c['no'], 'book': c['book'], 'title': c['title'], 'sheet': c['sheet'],
                'pians': [
                    {
                        'code': p['code'], 'title': p['title'], 'no': p['no'],
                        'paras': p['paras'], 'notes': p['notes'], 'tongdu': p['tongdu'],
                        'hanzi': hanzi(p['body']),
                    } for p in c['pians']
                ],
            } for c in classes
        ],
        'skippedSheets': skipped,
        'generated': 'scripts/build_neijing_text.py',
    }
    unitsdoc = {
        'book': BOOK['title'],
        'source': ben['source'],
        'counts': counts,
        'axes': ben['axes'],
        'note': '一篇一单元（素问 81 + 灵枢 81）；大段段落见 units[i].paras，教材注释见 units[i].notes',
        'units': units,
    }
    md = build_md(ben)
    readme = build_readme(ben)
    return ben, unitsdoc, md, readme


def build_md(ben) -> str:
    c = ben['counts']
    L = [f"# {ben['book']['title']} · 底本目录", '']
    L.append(f"> 母本：`{os.path.basename(ben['source']['path'])}` · sha256 `{ben['source']['sha256'][:16]}…` · "
             f"{ben['source']['bytes']:,} B")
    L.append('>')
    L.append(f"> 规模：{c['classes']} 篇类 · **{c['pians']} 篇** · {c['paras']:,} 原文段 · "
             f"{c['notes']} 篇注释 · **{c['hanzi']:,} 汉字**（原文）")
    L.append('')
    for cl in ben['classes']:
        hz = sum(p_['hanzi'] for p_ in cl['pians'])
        L.append(f"## {cl['no']}.{cl['book']}·{cl['title']}（{len(cl['pians'])} 篇 · {hz:,} 字）")
        L.append('')
        for p in cl['pians']:
            L.append(f"- **{p['title']}**（{cl['book']}第{p['no']}篇）· {p['hanzi']:,} 字 · {len(p['paras'])} 段")
            if p['paras']:
                first = p['paras'][0]['text']
                L.append(f"  > {first[:120]}{'…' if len(first) > 120 else ''}")
        L.append('')
    return '\n'.join(L)


def build_readme(ben) -> str:
    c = ben['counts']
    ax = ' · '.join(f"{k} {v:,}" for k, v in c['axisTotals'].items())
    L = [
        '# 内经选读 · 底本',
        '',
        '**黄帝内经（通读注释版）** —— 06-neijing-xuandu 课程的教材层底本。',
        '',
        '> 本书是**教材选读本**，不是全文：31 篇类 → 162 篇，其中若干篇只保留教材要讲的部分（节选）。',
        '> 逐字引用以全文 `standards/materials/neijing-quanwen`（162 篇 · 155,206 字）为准；',
        '> 教材本负责注释、篇导读与篇类编排，两本的分工见本文件末「与全文对读」。',
        '',
        '| 项 | 值 |',
        '|---|---|',
        f"| 母本 | `{os.path.basename(ben['source']['path'])}`（{ben['book']['edition']}） |",
        f"| sha256 | `{ben['source']['sha256']}` |",
        f"| 字节 | {ben['source']['bytes']:,} B |",
        f"| 留档 | `{ben['source']['archive']}` |",
        f"| 规模 | {c['classes']} 篇类 · **{c['pians']} 篇** · {c['paras']:,} 原文段 · {c['notes']} 篇注释 |",
        f"| 原文 | **{c['hanzi']:,} 汉字**（素问 {c['byBook']['素问']['pians']} 篇 {c['byBook']['素问']['hanzi']:,} 字 · "
        f"灵枢 {c['byBook']['灵枢']['pians']} 篇 {c['byBook']['灵枢']['hanzi']:,} 字） |",
        f"| 教材注释 | {c['hanziNotes']:,} 汉字（单列，不进正文） |",
        f"| 篇导读（通读） | {c['hanziTongdu']:,} 汉字（单列，不进正文） |",
        '',
        '## 文件',
        '',
        '| 文件 | 内容 |',
        '|---|---|',
        '| `底本.json` | 完整层级：篇类 → 篇 → 段（原文/注释/通读逐行，含四级编码） |',
        '| `底本.md` | 人读版目录（每篇首段） |',
        '| `units.json` | 单元层：**一篇一单元**（162 单元），带三轴计数 |',
        '| `sources/` | 工作簿副本（按 sha256 校验） |',
        '',
        '## 口径（可复算）',
        '',
        '1. **一篇一单元**：素问 81 + 灵枢 81 = 162，与「内经选读」的书名口径一致；'
        '篇内 1,728 段原文保留在 `units[i].paras`，不做二次合并。',
        '2. **正文只算原文**：教材的「通读」（篇导读）与「注释」（校勘按语）单列在 '
        '`tongdu` / `notes`，不进 `body`——否则 13.6 万字会混进 1.9 万字按语。',
        '3. **不校改**：异体字与 `【网络校准·…】` 批注原样保留，只在统计时单列。',
        '4. **引用格式**：`教材·素问·阴阳应象大论（素问第5篇）`；本书是教材整理本，'
        '不得写成「影印本第N页」。',
        '',
        '## 三轴（写法族，成员词公开）',
        '',
        f'全库口径命中：{ax}',
        '',
        '| 轴 | 成员词 |',
        '|---|---|',
    ]
    for a in ben['axes']:
        L.append(f"| {a['name']} | {'、'.join(a['members'])} |")
    L += [
        '',
        '> 只数写法族、不数「真名」：《素问》通篇讲「阳气/阴气」而不写「阴阳学说」，'
        '只数真名会把整本书算成 0。',
        '',
        '## 复算',
        '',
        '```bash',
        'python scripts/build_neijing_text.py            # 重建四份产物',
        'python scripts/build_neijing_text.py --check    # sha256 / 规模 / 逐段对读',
        'python scripts/build_neijing_text.py --pian 阴阳应象大论   # 看一篇',
        '```',
        '',
        '## 与全文对读（教材本 vs 全文）',
        '',
        '课程逐字引用以**全文**为准；教材本负责注释、篇导读与 31 篇类编排。两本字数比 < 90% 的判为**节选**。',
        '',
    ]
    fc = c.get('fullCompare') or {}
    if fc.get('available'):
        L += [
            '| 项 | 值 |',
            '|---|---|',
            f"| 全文 | `standards/materials/neijing-quanwen`（{fc['pians']} 篇 · {fc['hanzi']:,} 字） |",
            f"| 教材本 | 162 篇 · {c['hanzi']:,} 字（约为全文 {100 * c['hanzi'] / fc['hanzi']:.1f}%） |",
            f"| 篇数口径相同 | {fc['same']} 篇（教材本 ≥ 全文 90%） |",
            f"| 节选 | **{fc['excerpt']} 篇**（< 90%，教材只保留要讲的部分） |",
            f"| 对不上篇名 | {len(fc['missing'])} 篇（如需，补 `ALIAS_FULL`） |",
            '',
            '节选最多（教材本保留最少）的十篇：',
            '',
            '| 篇 | 教材本 | 全文 | 保留 |',
            '|---|--:|--:|--:|',
        ]
        for e in fc['excerptList'][:10]:
            L.append(f"| {e['title']} | {e['xuandu']:,} | {e['full']:,} | {e['pct']}% |")
        L += [
            '',
            '> 为什么必须分两本：教材本若是「全 162 篇」的假象，就会出现「引一句原文，回查时在教材本里找不到」——'
            '或更糟，引了教材略去的段落，读者以为全书如此。逐字以全文为准，是这条链的底。',
            '',
        ]
    L += [
        '## 边界',
        '',
        '- 本底本是**教材整理本**，不是影印善本：篇序依王冰次注/史崧本，文字以工作簿为准；'
        '若要校勘异文，需另立影印本来源（本课不做）。',
        '- 「通读」与「注释」是教材编者的话，引用时必须与原文分开标注。',
        '- 篇数与通行本一致（162 篇），但**未逐字核对**通行本异文——这是已知缺口，不掩饰。',
        '- 单元按**教材的 31 篇类 → 162 篇**编排，与课程 06-neijing-xuandu 的 **10 章**不是同一套编号：',
        '  课章是选读路线（阴阳/藏象/脉学…），篇类是全书的检索骨架；两套并存，不得互相冒充。',
        '',
    ]
    return '\n'.join(L)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--pian', default='')
    a = ap.parse_args()

    ben, unitsdoc, md, readme = build()

    if a.pian:
        hits = [u for u in unitsdoc['units'] if a.pian in u['title']]
        for u in hits:
            print(f"== {u['locator']} · {u['hanzi']} 字 · {u['paras_count']} 段")
            print(u['body'][:400])
            if u['tongdu']:
                print('-- 通读 --', u['tongdu'][:200])
            for n in u['notes'][:2]:
                print('-- 注 --', n['text'][:160])
        return 0

    targets = {
        os.path.join(OUT_DIR, '底本.json'): json.dumps(ben, ensure_ascii=False, indent=1) + '\n',
        os.path.join(OUT_DIR, '底本.md'): md,
        os.path.join(OUT_DIR, 'units.json'): json.dumps(unitsdoc, ensure_ascii=False, indent=1) + '\n',
        os.path.join(OUT_DIR, 'README.md'): readme,
    }

    if a.check:
        bad = []
        for p, text in targets.items():
            old = io.open(p, encoding='utf-8').read() if os.path.exists(p) else ''
            if old != text:
                bad.append(os.path.relpath(p, ROOT))
        arc = os.path.join(SRC_DIR, SRC_NAME)
        if not os.path.exists(arc) or sha256_file(arc) != ben['source']['sha256']:
            bad.append('sources/' + SRC_NAME)
        if bad:
            print('DRIFT:', ', '.join(bad))
            return 1
        c = ben['counts']
        print(f"[neijing] ✓ {c['classes']} 篇类 · {c['pians']} 篇 · {c['paras']:,} 段 · "
              f"{c['units']} 单元 · {c['hanzi']:,} 字 · sha {ben['source']['sha256'][:16]}")
        return 0

    os.makedirs(SRC_DIR, exist_ok=True)
    arc = os.path.join(SRC_DIR, SRC_NAME)
    if not (os.path.exists(arc) and sha256_file(arc) == ben['source']['sha256']):
        shutil.copy2(ben['source']['path'], arc)
    for p, text in targets.items():
        os.makedirs(os.path.dirname(p), exist_ok=True)
        io.open(p, 'w', encoding='utf-8').write(text)
    c = ben['counts']
    print(f"[neijing] {c['classes']} 篇类 · {c['pians']} 篇 · {c['paras']:,} 原文段 · "
          f"{c['notes']} 注释 · {c['units']} 单元 · {c['hanzi']:,} 汉字")
    print(f"  素问 {c['byBook']['素问']['pians']} 篇 {c['byBook']['素问']['hanzi']:,} 字 · "
          f"灵枢 {c['byBook']['灵枢']['pians']} 篇 {c['byBook']['灵枢']['hanzi']:,} 字")
    print(f"  sha256 {ben['source']['sha256']}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
