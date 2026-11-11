#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
scripts/build_jichu_text.py —— 《中医基础理论》教材底本的机器可读化

为什么需要它：
  01-zhongyi-jichu-lilun 的 10 章要引教材原文（「阴阳者，天地之道也」「心主血脉」…），
  还要把教材的章-节-小节结构变成可统计的东西。教材的母本是
  `E:\\textbooks\\qhzy-中医基础理论.xlsx`（29 个工作表：14 个内容表 + 15 个方法与平台表）。
  不把这份工作簿落成 JSON + sha256，章节引文就只能靠手抄——这正是本仓库一直拒绝的做法。

产物：
  standards/jichu/底本.json   内容表 → 章/节/小节/段 的层级 + 段落
  standards/jichu/底本.md     人读版（章节结构 + 每节首段）
  standards/jichu/METHOD.json 方法层（0改写说明/平台建设/ICD11统一命名/病证单元库/可复用Skills 等）

口径：
  · 只读工作簿，不写回；sha256 记录在产物里，工作簿一变 `--check` 即报错。
  · 段落切分按工作簿的「内容」列逐行，空行即分隔；标题行用编号识别（第N章 / 9.1 / 9.1.1 / 9.1.1.1）。
  · 不校改原文：异体字、错字、网络校准批注（【网络校准·…】）原样保留，只在统计时单列。

用法：
  python scripts/build_jichu_text.py            # 生成三份产物
  python scripts/build_jichu_text.py --check    # 校验 sha256 / 章数 / 段落数
  python scripts/build_jichu_text.py --sec 9.1  # 看某一节
  python scripts/build_jichu_text.py --sample 病因 3
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'standards', 'jichu')
OUT_JSON = os.path.join(OUT_DIR, '底本.json')
OUT_MD = os.path.join(OUT_DIR, '底本.md')
OUT_METHOD = os.path.join(OUT_DIR, 'METHOD.json')

BOOK = {
    'title': '中医基础理论',
    'edition': '岐黄智医版种子内容 · 分布式体系适配版（v3.0-qhzy，2026-08）',
    'author': '项目组（依据五版/六版《中医基础理论》口径整理）',
    'note': '教材母本为 Excel 工作簿，非古籍；引文标「教材·第N章·第M节」',
}

CANDIDATES = [
    r'E:\textbooks\qhzy-中医基础理论.xlsx',
    os.path.join(os.path.expanduser('~'), 'Desktop', 'textbooks', 'qhzy-中医基础理论.xlsx'),
]

CONTENT_SHEETS = [
    '1绪论', '2哲思', '3脏腑', '4精神', '5经络', '6体窍',
    '7病因', '8发病', '9病机', '10治则', '11养康', '12体质', '13平台度量', '附篇五运六气',
]
METHOD_SHEETS = ['0改写说明', '0分布式体系', '平台建设与依赖', '平台支撑完整性', '0历史',
                 '0映射1', '0映射2', '0映射3', '0封面', '0目录',
                 'ICD11统一命名', '病证单元库', '多智能体协同', '兼容性思维流', '可复用Skills']


def find_book():
    env = os.environ.get('JICHU_XLSX')
    for p in ([env] if env else []) + CANDIDATES:
        if p and os.path.exists(p):
            return p
    sys.exit('✗ 找不到 qhzy-中医基础理论.xlsx（可用 JICHU_XLSX 指定路径）')


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


RE_CH = re.compile(r'^第([一二三四五六七八九十百]+|\d+)章\s*(.*)$')
RE_SEC = re.compile(r'^(\d+)\.(\d+)\s+(\S.*)$')
RE_SUB = re.compile(r'^(\d+)\.(\d+)\.(\d+)\s+(\S.*)$')
RE_ITEM = re.compile(r'^(\d+)\.(\d+)\.(\d+)\.(\d+)\s+(\S.*)$')
RE_NOTE = re.compile(r'^【[^】]*】')


def parse_sheet(rows):
    """工作簿的「内容」列逐行 → 章/节/小节/段 层级"""
    paras = []
    for r in rows:
        if not r or len(r) < 5:
            continue
        v = r[4]
        if v is None:
            continue
        t = str(v).strip()
        if t:
            paras.append(t)
    return paras


def build():
    path = find_book()
    import openpyxl
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)

    chapters = []
    notes = []
    for sheet in CONTENT_SHEETS:
        if sheet not in wb.sheetnames:
            continue
        rows = list(wb[sheet].iter_rows(values_only=True))
        paras = parse_sheet(rows)
        ch = None
        sec = None
        sub = None
        for t in paras:
            if RE_NOTE.match(t):
                notes.append({'sheet': sheet, 'text': t})
                continue
            m = RE_CH.match(t)
            if m:
                ch = {'no': m.group(1), 'title': m.group(2).strip(), 'sheet': sheet, 'secs': []}
                chapters.append(ch)
                sec = sub = None
                continue
            m = RE_ITEM.match(t)
            if m and sub is not None:
                sub.setdefault('items', []).append({'no': f'{m.group(1)}.{m.group(2)}.{m.group(3)}.{m.group(4)}', 'title': m.group(5).strip()})
                continue
            m = RE_SUB.match(t)
            if m:
                subno = f'{m.group(1)}.{m.group(2)}.{m.group(3)}'
                parent = '.'.join(subno.split('.')[:2])
                # 工作簿并非严格按编号排列：9.6.4 出现在 9.7.2 之后（后补的小节）。
                # 按编号归位，而不是挂到「当前节」——否则 9.6.4 会被记进 9.7。
                target = next((x for x in (ch or {}).get('secs', []) if x['no'] == parent), None)
                if target is None:
                    target = sec
                if target is not None:
                    sub = {'no': subno, 'title': m.group(4).strip(), 'paras': [], 'items': []}
                    target['subs'].append(sub)
                    sec = target
                    continue
            m = RE_SEC.match(t)
            if m:
                sec = {'no': f'{m.group(1)}.{m.group(2)}', 'title': m.group(3).strip(), 'subs': [], 'paras': []}
                if ch is None:
                    ch = {'no': '?', 'title': sheet, 'sheet': sheet, 'secs': []}
                    chapters.append(ch)
                ch['secs'].append(sec)
                sub = None
                continue
            # 正文段：挂到当前小节 > 当前节 > 当前章
            if sub is not None:
                sub['paras'].append(t)
            elif sec is not None:
                sec['paras'].append(t)
            elif ch is not None:
                ch.setdefault('paras', []).append(t)

    for ch in chapters:
        ch['counts'] = {
            'secs': len(ch['secs']),
            'subs': sum(len(s['subs']) for s in ch['secs']),
            'items': sum(len(x.get('items', [])) for s in ch['secs'] for x in s['subs']),
            'paras': len(ch.get('paras', [])) + sum(len(s['paras']) for s in ch['secs']) + sum(len(x['paras']) for s in ch['secs'] for x in s['subs']),
            'chars': sum(len(p) for p in ch.get('paras', []))
            + sum(len(p) for s in ch['secs'] for p in s['paras'])
            + sum(len(p) for s in ch['secs'] for x in s['subs'] for p in x['paras']),
        }

    method = {}
    for sheet in METHOD_SHEETS:
        if sheet not in wb.sheetnames:
            continue
        rows = []
        for r in wb[sheet].iter_rows(values_only=True):
            vals = [str(x).strip() for x in r if x is not None and str(x).strip()]
            if vals:
                rows.append(vals)
        method[sheet] = {'rows': len(rows), 'sample': rows[:12]}

    wb.close()

    return {
        'book': BOOK['title'],
        'edition': BOOK['edition'],
        'author': BOOK['author'],
        'note': BOOK['note'],
        'source': {
            'path': path,
            'bytes': os.path.getsize(path),
            'sha256': sha256_file(path),
            'sheets': len(CONTENT_SHEETS) + len(METHOD_SHEETS),
        },
        'numbering': '章-节-小节-段 四级编号沿用工作簿（第9章 / 9.1 / 9.1.1 / 9.1.1.1）；引用写「教材·第9章·9.1」',
        'chapters': chapters,
        'notes': notes,
        'counts': {
            'chapters': len(chapters),
            'secs': sum(c['counts']['secs'] for c in chapters),
            'subs': sum(c['counts']['subs'] for c in chapters),
            'paras': sum(c['counts']['paras'] for c in chapters),
            'chars': sum(c['counts']['chars'] for c in chapters),
            'notes': len(notes),
        },
        'method': {k: {'rows': v['rows']} for k, v in method.items()},
    }, method


def write_md(doc):
    s = doc['source']
    L = [f"# {doc['book']} · 教材底本\n",
         f"- 版本：{doc['edition']}",
         f"- 母本：`{s['path']}` · {s['bytes']:,} 字节 · sha256 `{s['sha256']}`",
         f"- 编号：{doc['numbering']}",
         f"- 规模：{doc['counts']['chapters']} 章 · {doc['counts']['secs']} 节 · {doc['counts']['subs']} 小节 · {doc['counts']['paras']} 段 · {doc['counts']['chars']:,} 字\n",
         '> 引用格式：**教材·第N章·第M.M节**。教材不是古籍，别标「原文」「经文」。\n']
    for ch in doc['chapters']:
        L.append(f"## 第{ch['no']}章 {ch['title']}（{ch['counts']['secs']} 节 / {ch['counts']['paras']} 段 / {ch['counts']['chars']:,} 字）\n")
        for sec in ch['secs']:
            L.append(f"### {sec['no']} {sec['title']}")
            first = (sec['paras'][:1] or [''])[0]
            if first:
                L.append(f"> {first[:160]}")
            for sub in sec['subs']:
                L.append(f"- **{sub['no']} {sub['title']}**（{len(sub['paras'])} 段{('，' + str(len(sub['items'])) + ' 个段标题') if sub['items'] else ''}）")
            L.append('')
    return '\n'.join(L) + '\n'


def check():
    doc, _ = build()
    prev = json.load(io.open(OUT_JSON, encoding='utf-8'))
    errs = []
    if prev['source']['sha256'] != doc['source']['sha256']:
        errs.append(f"sha256 变化：{prev['source']['sha256'][:16]} ≠ {doc['source']['sha256'][:16]}")
    for k in ('chapters', 'secs', 'subs', 'paras'):
        if prev['counts'][k] != doc['counts'][k]:
            errs.append(f"{k}：{prev['counts'][k]} → {doc['counts'][k]}")
    if errs:
        print('[jichu] ✗ 教材与留档不一致（工作簿被改过？）\n  ' + '\n  '.join(errs))
        return 1
    c = doc['counts']
    print(f"[jichu] ✓ sha256 {doc['source']['sha256'][:16]} · {c['chapters']} 章 · {c['secs']} 节 · {c['subs']} 小节 · {c['paras']} 段 · {c['chars']:,} 字")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--sec', metavar='9.1')
    ap.add_argument('--sample', nargs=2, metavar=('KEYWORD', 'N'))
    args = ap.parse_args()

    if args.check:
        return check()

    doc, method = build()

    if args.sec:
        want = args.sec
        for ch in doc['chapters']:
            for sec in ch['secs']:
                if sec['no'] == want or sec['no'].startswith(want + '.'):
                    print(f"第{ch['no']}章 {ch['title']} · {sec['no']} {sec['title']}")
                    for p in sec['paras'][:3]:
                        print('  ', p[:200])
                    for sub in sec['subs']:
                        print(f"  [{sub['no']}] {sub['title']}（{len(sub['paras'])} 段）")
        return 0

    if args.sample:
        kw, n = args.sample[0], int(args.sample[1])
        for ch in doc['chapters']:
            if kw in ch['title'] or kw in ch.get('sheet', ''):
                print(f"第{ch['no']}章 {ch['title']} · {ch['counts']['secs']} 节 / {ch['counts']['paras']} 段")
                for sec in ch['secs'][:n]:
                    print('  ', sec['no'], sec['title'])
        return 0

    os.makedirs(OUT_DIR, exist_ok=True)
    with io.open(OUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write('\n')
    with io.open(OUT_MD, 'w', encoding='utf-8') as f:
        f.write(write_md(doc))
    with io.open(OUT_METHOD, 'w', encoding='utf-8') as f:
        json.dump({'sheets': method}, f, ensure_ascii=False, indent=1)
        f.write('\n')
    c = doc['counts']
    print('═══ 中医基础理论 · 教材底本 ═══')
    print(f"  章 {c['chapters']} · 节 {c['secs']} · 小节 {c['subs']} · 段 {c['paras']} · {c['chars']:,} 字 · 校准批注 {c['notes']}")
    print(f"  sha256 {doc['source']['sha256']}")
    for ch in doc['chapters']:
        print(f"    第{ch['no']}章 {ch['title']}: {ch['counts']['secs']} 节 / {ch['counts']['paras']} 段")
    print('  → standards/jichu/{底本.json, 底本.md, METHOD.json}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
