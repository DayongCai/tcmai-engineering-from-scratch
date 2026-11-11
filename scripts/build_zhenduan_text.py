#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
scripts/build_zhenduan_text.py —— 《中医诊断学》教材底本的机器可读化

母本：`E:\\textbooks\\qhzy-中医诊断学.xlsx`（27 表 = 14 内容表 + 13 方法与平台表）。
产物：
  standards/zhenduan/底本.json   14 章 → 节 / 小节 / 段 四级 + 段落
  standards/zhenduan/底本.md     人读版
  standards/zhenduan/METHOD.json 方法层（分布式体系 / 病证单元库 / ICD11统一命名 / 可复用Skills …）

与「中基」同一套口径（见 standards/jichu/README.md）：
  · 引用写「教材·第N章·第M.M节」，不写「底本」「原文」；
  · 工作簿不按编号排列时按编号归位；
  · 段末无句末标点的段记截断，不推断补字。

用法：
  python scripts/build_zhenduan_text.py
  python scripts/build_zhenduan_text.py --check
  python scripts/build_zhenduan_text.py --sec 6.1
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
OUT_DIR = os.path.join(ROOT, 'standards', 'zhenduan')
OUT_JSON = os.path.join(OUT_DIR, '底本.json')
OUT_MD = os.path.join(OUT_DIR, '底本.md')
OUT_METHOD = os.path.join(OUT_DIR, 'METHOD.json')
OUT_BZU = os.path.join(OUT_DIR, 'bzu.json')

BOOK = {
    'title': '中医诊断学',
    'edition': '多智能体协同种子内容 · Hermes 改写版（v2.0-qhzy，2026-08）',
    'author': '项目组（依据规划教材《中医诊断学》口径整理）',
    'note': '母本为 Excel 工作簿；引文标「教材·第N章·第M.M节」',
}

CANDIDATES = [
    r'E:\textbooks\qhzy-中医诊断学.xlsx',
    os.path.join(os.path.expanduser('~'), 'Desktop', 'textbooks', 'qhzy-中医诊断学.xlsx'),
]

CONTENT_SHEETS = ['1绪论', '2望诊', '3闻诊', '4问诊', '5切诊', '6八纲辨证', '7病性辨证',
                  '8脏腑辨证', '9经络辨证', '10六经辨证', '11卫气营血辨证', '12三焦辨证',
                  '13诊断与病案', '14AI平台']
METHOD_SHEETS = ['0改写说明', '0分布式体系', '平台建设与依赖', '0映射1', '0映射2', '0映射3',
                 '0封面', '0目录', 'ICD11统一命名', '病证单元库', '多智能体协同', '兼容性思维流', '可复用Skills']


def find_book():
    env = os.environ.get('ZHENDUAN_XLSX')
    for p in ([env] if env else []) + CANDIDATES:
        if p and os.path.exists(p):
            return p
    sys.exit('✗ 找不到 qhzy-中医诊断学.xlsx（可用 ZHENDUAN_XLSX 指定）')


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


RE_CH = re.compile(r'^第([一二三四五六七八九十百]+|\d+)章[\s\u3000]*(.*)$')
RE_SEC = re.compile(r'^(\d+)\.(\d+)\s+(\S.*)$')
RE_SUB = re.compile(r'^(\d+)\.(\d+)\.(\d+)\s+(\S.*)$')
RE_ITEM = re.compile(r'^(\d+)\.(\d+)\.(\d+)\.(\d+)\s+(\S.*)$')
RE_NOTE = re.compile(r'^【[^】]*】')


def build():
    path = find_book()
    import openpyxl
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)

    chapters, notes = [], []
    for sheet in CONTENT_SHEETS:
        if sheet not in wb.sheetnames:
            continue
        rows = list(wb[sheet].iter_rows(values_only=True))
        ch = sec = sub = None
        for r in rows:
            if not r or len(r) < 5 or r[4] is None:
                continue
            t = str(r[4]).strip()
            if not t:
                continue
            if RE_NOTE.match(t):
                notes.append({'sheet': sheet, 'text': t})
                continue
            m = RE_CH.match(t)
            if m:
                ch = {'no': m.group(1), 'title': m.group(2).strip(), 'sheet': sheet, 'secs': [], 'paras': []}
                chapters.append(ch)
                sec = sub = None
                continue
            m = RE_ITEM.match(t)
            if m:
                subno = f'{m.group(1)}.{m.group(2)}.{m.group(3)}'
                parent = '.'.join(subno.split('.')[:2])
                target = next((s for s in (ch or {}).get('secs', []) if s['no'] == parent), sec)
                if target is not None:
                    sub = next((x for x in target['subs'] if x['no'] == subno), None)
                    if sub is None:
                        sub = {'no': subno, 'title': '', 'paras': [], 'items': []}
                        target['subs'].append(sub)
                        sec = target
                    sub['items'].append({'no': f'{subno}.{m.group(4)}', 'title': m.group(5).strip()})
                continue
            m = RE_SUB.match(t)
            if m:
                subno = f'{m.group(1)}.{m.group(2)}.{m.group(3)}'
                parent = '.'.join(subno.split('.')[:2])
                target = next((s for s in (ch or {}).get('secs', []) if s['no'] == parent), sec)
                if target is not None:
                    sub = {'no': subno, 'title': m.group(4).strip(), 'paras': [], 'items': []}
                    target['subs'].append(sub)
                    sec = target
                continue
            m = RE_SEC.match(t)
            if m:
                sec = {'no': f'{m.group(1)}.{m.group(2)}', 'title': m.group(3).strip(), 'subs': [], 'paras': []}
                if ch is None:
                    ch = {'no': '?', 'title': sheet, 'sheet': sheet, 'secs': [], 'paras': []}
                    chapters.append(ch)
                ch['secs'].append(sec)
                sub = None
                continue
            # 正文段
            if sub is not None:
                sub['paras'].append(t)
            elif sec is not None:
                sec['paras'].append(t)
            elif ch is not None:
                ch['paras'].append(t)

    for ch in chapters:
        ch['counts'] = {
            'secs': len(ch['secs']),
            'subs': sum(len(s['subs']) for s in ch['secs']),
            'items': sum(len(x.get('items', [])) for s in ch['secs'] for x in s['subs']),
            'paras': len(ch['paras']) + sum(len(s['paras']) for s in ch['secs'])
            + sum(len(x['paras']) for s in ch['secs'] for x in s['subs']),
            'chars': sum(len(p) for p in ch['paras'])
            + sum(len(p) for s in ch['secs'] for p in s['paras'])
            + sum(len(p) for s in ch['secs'] for x in s['subs'] for p in x['paras']),
        }

    # 病证单元层：ICD-11 统一命名 + BZU（病×证→法→方）——第 11 章要用
    bzu = {'icd': [], 'units': []}
    if 'ICD11统一命名' in wb.sheetnames:
        rows = [r for r in wb['ICD11统一命名'].iter_rows(values_only=True)
                if any(x is not None and str(x).strip() for x in r)]
        head = [str(x).strip() for x in rows[1]] if len(rows) > 1 else []
        for r in rows[2:]:
            vals = ['' if x is None else str(x).strip() for x in r]
            if not vals or not vals[0]:
                continue
            bzu['icd'].append({
                'code': vals[0], 'name': vals[1] if len(vals) > 1 else '',
                'icd': vals[2] if len(vals) > 2 else '', 'en': vals[3] if len(vals) > 3 else '',
                'status': vals[4] if len(vals) > 4 else '', 'dbCheck': vals[5] if len(vals) > 5 else '',
            })
    if '病证单元库' in wb.sheetnames:
        rows = [r for r in wb['病证单元库'].iter_rows(values_only=True)
                if any(x is not None and str(x).strip() for x in r)]
        for r in rows[2:]:
            vals = ['' if x is None else str(x).strip() for x in r]
            if not vals or not vals[0]:
                continue
            # 表里混着一行「说明」（不是 BZU 单元），按编码格式过滤，并在产物里留账
            if not re.match(r'^BZ-B\d+-Z\d+$', vals[0]):
                bzu.setdefault('skipped', []).append(vals[0])
                continue
            bzu['units'].append({
                'bzu': vals[0], 'bing': vals[1] if len(vals) > 1 else '',
                'zheng': vals[2] if len(vals) > 2 else '', 'bingji': vals[3] if len(vals) > 3 else '',
                'symptoms': vals[4] if len(vals) > 4 else '', 'zhifa': vals[5] if len(vals) > 5 else '',
            })

    method = {}
    for sheet in METHOD_SHEETS:
        if sheet not in wb.sheetnames:
            continue
        rows = []
        for r in wb[sheet].iter_rows(values_only=True):
            vals = [str(x).strip() for x in r if x is not None and str(x).strip()]
            if vals:
                rows.append(vals)
        method[sheet] = {'rows': len(rows), 'sample': rows[:10]}

    wb.close()

    return {
        'book': BOOK['title'],
        'edition': BOOK['edition'],
        'author': BOOK['author'],
        'note': BOOK['note'],
        'source': {'path': path, 'bytes': os.path.getsize(path), 'sha256': sha256_file(path),
                   'sheets': len(CONTENT_SHEETS) + len(METHOD_SHEETS)},
        'numbering': '章-节-小节-段 四级编号沿用工作簿；引用写「教材·第6章·6.1」',
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
        'bzu': {'icd': len(bzu['icd']), 'units': len(bzu['units'])},
    }, method, bzu


def write_md(doc):
    s = doc['source']
    L = [f"# {doc['book']} · 教材底本\n",
         f"- 版本：{doc['edition']}",
         f"- 母本：`{s['path']}` · {s['bytes']:,} 字节 · sha256 `{s['sha256']}`",
         f"- 编号：{doc['numbering']}",
         f"- 规模：{doc['counts']['chapters']} 章 · {doc['counts']['secs']} 节 · {doc['counts']['subs']} 小节 · {doc['counts']['paras']} 段 · {doc['counts']['chars']:,} 字\n"]
    for ch in doc['chapters']:
        L.append(f"## 第{ch['no']}章 {ch['title']}（{ch['counts']['secs']} 节 / {ch['counts']['paras']} 段 / {ch['counts']['chars']:,} 字）\n")
        for sec in ch['secs']:
            L.append(f"### {sec['no']} {sec['title']}")
            for sub in sec['subs']:
                L.append(f"- **{sub['no']} {sub['title'] or '（无小节标题）'}**（{len(sub['paras'])} 段）")
            L.append('')
    return '\n'.join(L) + '\n'


def check():
    doc, _, _ = build()
    prev = json.load(io.open(OUT_JSON, encoding='utf-8'))
    errs = []
    if prev['source']['sha256'] != doc['source']['sha256']:
        errs.append('sha256 变化')
    for k in ('chapters', 'secs', 'subs', 'paras'):
        if prev['counts'][k] != doc['counts'][k]:
            errs.append(f"{k}：{prev['counts'][k]} → {doc['counts'][k]}")
    if errs:
        print('[zhenduan] ✗ 教材与留档不一致：' + '；'.join(errs))
        return 1
    c = doc['counts']
    print(f"[zhenduan] ✓ sha256 {doc['source']['sha256'][:16]} · {c['chapters']} 章 · {c['secs']} 节 · {c['subs']} 小节 · {c['paras']} 段 · {c['chars']:,} 字")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--sec')
    args = ap.parse_args()
    if args.check:
        return check()
    doc, method, bzu = build()
    if args.sec:
        for ch in doc['chapters']:
            for sec in ch['secs']:
                if sec['no'].startswith(args.sec):
                    print(f"第{ch['no']}章 {ch['title']} · {sec['no']} {sec['title']}")
                    for sub in sec['subs']:
                        print(f"  [{sub['no']}] {sub['title']}（{len(sub['paras'])} 段，{len(sub['items'])} 段标题）")
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
    with io.open(OUT_BZU, 'w', encoding='utf-8') as f:
        json.dump({'source': {'sha256': doc['source']['sha256']}, **bzu}, f, ensure_ascii=False, indent=1)
        f.write('\n')
    c = doc['counts']
    print('═══ 中医诊断学 · 教材底本 ═══')
    print(f"  章 {c['chapters']} · 节 {c['secs']} · 小节 {c['subs']} · 段 {c['paras']} · {c['chars']:,} 字 · 批注 {c['notes']}")
    print(f"  sha256 {doc['source']['sha256']}")
    for ch in doc['chapters']:
        print(f"    第{ch['no']}章 {ch['title']}: {ch['counts']['secs']} 节 / {ch['counts']['paras']} 段 / {ch['counts']['chars']:,} 字")
    print(f"  病证单元：ICD 命名 {doc['bzu']['icd']} 条 · BZU {doc['bzu']['units']} 条")
    print('  → standards/zhenduan/{底本.json, 底本.md, METHOD.json, bzu.json}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
