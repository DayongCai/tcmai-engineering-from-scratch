#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
scripts/build_zhongyao_text.py —— 《中药学》教材底本的机器可读化

母本：`E:\\textbooks\\qhzy-中药学.xlsx`（43 表 = 30 内容表 + 13 方法与平台表）。

产物：
  standards/zhongyao/底本.json    30 章 → 节 / 小节 / 段 四级 + 段落
  standards/zhongyao/底本.md      人读版
  standards/zhongyao/drugs.json   药物单元层：每味药的「来源与性味归经 / 功效与主治 / 用法用量 / 使用注意」
                                  并把「性温，味辛、微苦，归肺、膀胱经」拆成结构化字段
  standards/zhongyao/METHOD.json  方法层（分布式体系 / ICD11统一命名 / 病证单元库 …）

与中基 / 诊断学同一套口径（见 standards/zhenduan/README.md）：
  · 引用写「教材·第N章·第M.M节」，不写「底本」「原文」；
  · 工作簿不按编号排列时按编号归位；
  · 段末无句末标点的段记截断，不推断补字；
  · 拆不出的性味归经留空并计入 unparsed，不猜。

用法：
  python scripts/build_zhongyao_text.py
  python scripts/build_zhongyao_text.py --check
  python scripts/build_zhongyao_text.py --drug 麻黄
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
OUT_DIR = os.path.join(ROOT, 'standards', 'zhongyao')
OUT_JSON = os.path.join(OUT_DIR, '底本.json')
OUT_MD = os.path.join(OUT_DIR, '底本.md')
OUT_METHOD = os.path.join(OUT_DIR, 'METHOD.json')
OUT_DRUGS = os.path.join(OUT_DIR, 'drugs.json')

BOOK = {
    'title': '中药学',
    'edition': '多智能体协同种子内容 · Hermes 改写版（v2.0-qhzy，2026-08）',
    'author': '项目组（依据规划教材《中药学》口径整理）',
    'note': '母本为 Excel 工作簿；引文标「教材·第N章·第M.M节」',
}

CANDIDATES = [
    r'E:\textbooks\qhzy-中药学.xlsx',
    os.path.join(os.path.expanduser('~'), 'Desktop', 'textbooks', 'qhzy-中药学.xlsx'),
]

CONTENT_SHEETS = [
    '1绪论', '2简史', '3产地采集', '4炮制', '5性能', '6配伍', '7禁忌', '8剂量用法',
    '9解表药', '10清热药', '11泻下药', '12祛风湿药', '13化湿药', '14利水渗湿药',
    '15温里药', '16理气药', '17消食药', '18驱虫药', '19止血药', '20活血化瘀药',
    '21化痰止咳', '22安神药', '23平肝息风', '24开窍药', '25补虚药', '26收涩药',
    '27涌吐药', '28攻毒杀虫', '29拔毒化腐', '30临床中药应用',
]
METHOD_SHEETS = [
    '0改写说明', '0分布式体系', '平台建设与依赖', '0映射1', '0映射2', '0映射3',
    '0封面', '0目录', 'ICD11统一命名', '病证单元库', '多智能体协同', '兼容性思维流', '可复用Skills',
]

RE_CH = re.compile(r'^第([一二三四五六七八九十百]+|\d+)章[\s\u3000]*(.*)$')
RE_SEC = re.compile(r'^(\d+)\.(\d+)\s+(\S.*)$')
RE_SUB = re.compile(r'^(\d+)\.(\d+)\.(\d+)\s+(\S.*)$')
RE_ITEM = re.compile(r'^(\d+)\.(\d+)\.(\d+)\.(\d+)\s+(\S.*)$')
RE_NOTE = re.compile(r'^【[^】]*】')

# 性味归经：教材写法多样，这里只做**可核对的拆分**，拆不出就留空
QI = ['微寒', '大寒', '大热', '微温', '平', '寒', '热', '温', '凉']
WEI = ['微苦', '苦', '辛', '甘', '酸', '涩', '咸', '淡']
RE_QI = re.compile(r'性\s*(微寒|大寒|大热|微温|平|寒|热|温|凉)')
RE_WEI = re.compile(r'味\s*([\u4e00-\u9fff、]+?)(?:[，,。；;]|归)')
RE_GUI = re.compile(r'归\s*([\u4e00-\u9fff、]+?)经')
RE_DOSE = re.compile(r'(\d+(?:\.\d+)?\s*[～~\-—]\s*\d+(?:\.\d+)?\s*(?:g|克|钱))|(\d+(?:\.\d+)?\s*(?:g|克))')


def find_book():
    env = os.environ.get('ZHONGYAO_XLSX')
    for p in ([env] if env else []) + CANDIDATES:
        if p and os.path.exists(p):
            return p
    sys.exit('✗ 找不到 qhzy-中药学.xlsx（可用 ZHONGYAO_XLSX 指定）')


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def parse_nature(text):
    """从「性温，味辛、微苦，归肺、膀胱经」拆出 四气 / 五味 / 归经。"""
    qi = RE_QI.search(text)
    wei = RE_WEI.search(text)
    gui = RE_GUI.search(text)
    weis = []
    if wei:
        weis = [w.strip() for w in re.split(r'[、，,]', wei.group(1)) if w.strip() in WEI]
    guis = []
    if gui:
        guis = [g.strip() for g in re.split(r'[、，,]', gui.group(1)) if g.strip()]
    return {
        'qi': qi.group(1) if qi else '',
        'wei': weis,
        'guijing': guis,
        'raw': text[:160],
    }


def build():
    path = find_book()
    import openpyxl
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)

    chapters, notes, drugs = [], [], []
    num_prefix = re.compile(r'^\d+(?:\.\d+)+\s*')
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
            cell = lambda i: (str(r[i]).strip() if i < len(r) and r[i] is not None else '')
            c_ch, c_sec, c_sub, c_para = cell(0), cell(1), cell(2), cell(3)

            # 表头行（章/节/小节/段/内容）逐表都在，必须跳过，否则每表多出一个假章
            if t == '内容' or c_ch == '章':
                continue

            if RE_NOTE.match(t):
                notes.append({'sheet': sheet, 'text': t})
                continue

            # ① 章：章列有值（表头行「章」也要跳过）
            if c_ch and re.match(r'^\d+$', c_ch):
                m = RE_CH.match(t)
                title = (m.group(2).strip() if m else num_prefix.sub('', t)).strip()
                ch = {'no': c_ch, 'title': title, 'sheet': sheet, 'secs': [], 'paras': []}
                chapters.append(ch)
                sec = sub = None
                continue

            # ② 节：节列有值（数字才算）
            if c_sec and re.match(r'^\d+$', c_sec):
                if ch is None:
                    ch = {'no': '?', 'title': sheet, 'sheet': sheet, 'secs': [], 'paras': []}
                    chapters.append(ch)
                sec = {'no': f"{ch['no']}.{c_sec}", 'title': num_prefix.sub('', t).strip(),
                       'subs': [], 'paras': []}
                ch['secs'].append(sec)
                sub = None
                continue

            # ③ 小节：小节列有值（第 9 章起，这一行的内容就是**药名**，不带编号）
            if c_sub and re.match(r'^\d+$', c_sub):
                if sec is None:
                    continue
                sub = {'no': f"{ch['no']}.{sec['no'].split('.')[-1]}.{c_sub}",
                       'title': num_prefix.sub('', t).strip(), 'paras': [], 'items': []}
                sec['subs'].append(sub)
                continue

            # ④ 段：段列有值。段号 < 10 是**段标题**行，≥ 10 是正文（教材的段号从 11 起）
            if c_para:
                try:
                    pno = int(float(c_para))
                except ValueError:
                    pno = 99
                if pno < 10:
                    title = num_prefix.sub('', t).strip()
                    if sub is not None:
                        sub['items'].append({'no': f"{sub['no']}.{pno}", 'title': title})
                    continue
                if sub is not None:
                    sub['paras'].append(t)
                elif sec is not None:
                    sec['paras'].append(t)
                elif ch is not None:
                    ch['paras'].append(t)
                continue

            # ⑤ 无列号的散段：挂到最近的层级
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

    # 药物单元层：章 ≥ 9 的小节即「药」（第 1–8 章讲总论，小节是概念不是药）
    unparsed = []
    for ch in chapters:
        if not str(ch['no']).isdigit() or not (9 <= int(ch['no']) <= 29):
            continue  # 第 1–8 章是总论（小节是概念），第 30 章是临床应用（小节是专题），都不是单味药
        for sec in ch['secs']:
            for sub in sec['subs']:
                name = (sub['title'] or '').strip()
                if not name:
                    continue
                # 真药的小节，段标题一定写成「药名·来源与性味归经」；没有「·」的不算药
                if not any('·' in it['title'] for it in sub['items']):
                    continue
                fields = {}
                for it in sub['items']:
                    key = it['title'].split('·')[-1].strip()
                    fields.setdefault(key, '')
                # 段与段标题一一对应：第 i 段正文配第 i 个段标题
                for idx, it in enumerate(sub['items']):
                    key = it['title'].split('·')[-1].strip()
                    if idx < len(sub['paras']):
                        fields[key] = sub['paras'][idx]
                src = fields.get('来源与性味归经') or fields.get('性味归经') or ''
                nature = parse_nature(src) if src else {'qi': '', 'wei': [], 'guijing': [], 'raw': ''}
                if src and not (nature['qi'] or nature['wei'] or nature['guijing']):
                    unparsed.append({'drug': name, 'why': '来源段里没有性/味/归经的字面写法', 'text': src[:120]})
                drugs.append({
                    'name': name,
                    'chapter': ch['no'],
                    'chapterTitle': ch['title'],
                    'sec': sec['no'],
                    'secTitle': sec['title'],
                    'sub': sub['no'],
                    'fields': fields,
                    'nature': nature,
                    'chars': sum(len(p) for p in sub['paras']),
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

    doc = {
        'book': BOOK['title'],
        'edition': BOOK['edition'],
        'author': BOOK['author'],
        'note': BOOK['note'],
        'source': {'path': path, 'bytes': os.path.getsize(path), 'sha256': sha256_file(path),
                   'sheets': len(CONTENT_SHEETS) + len(METHOD_SHEETS),
                   'contentSheets': len(CONTENT_SHEETS), 'methodSheets': len(METHOD_SHEETS)},
        'numbering': '章-节-小节-段 四级编号沿用工作簿；引用写「教材·第N章·N.M」',
        'chapters': chapters,
        'notes': notes,
        'counts': {
            'chapters': len(chapters),
            'secs': sum(c['counts']['secs'] for c in chapters),
            'subs': sum(c['counts']['subs'] for c in chapters),
            'items': sum(c['counts']['items'] for c in chapters),
            'paras': sum(c['counts']['paras'] for c in chapters),
            'chars': sum(c['counts']['chars'] for c in chapters),
            'notes': len(notes),
            'drugs': len(drugs),
            'drugsWithQi': sum(1 for d in drugs if d['nature']['qi']),
            'drugsWithWei': sum(1 for d in drugs if d['nature']['wei']),
            'drugsWithGui': sum(1 for d in drugs if d['nature']['guijing']),
            'drugsUnparsed': len(unparsed),
            'drugsMissingWei': [d['name'] for d in drugs if not d['nature']['wei']],
            'drugsMissingGui': [d['name'] for d in drugs if not d['nature']['guijing']],
        },
        'method': {k: {'rows': v['rows']} for k, v in method.items()},
    }

    drugs_doc = {
        'about': '药物单元层：一味药一条，字段来自教材该药的四段（来源与性味归经 / 功效与主治 / 用法用量 / 使用注意）',
        'source': doc['source'],
        'parseRule': {
            'qi': '正则「性\\s*(微寒|大热|微温|平|寒|热|温|凉)」',
            'wei': '正则「味\\s*([^，。；归]+)」，再按顿号切、只保留 8 种五味（含微苦）',
            'guijing': '正则「归\\s*([^经]+)经」，按顿号切',
            'noGuess': '段里没有字面写法就留空，并计入 unparsed，不用通行药典补',
        },
        'counts': {k: doc['counts'][k] for k in ('drugs', 'drugsWithQi', 'drugsWithWei', 'drugsWithGui', 'drugsUnparsed')},
        'partialMiss': {
            'noWei': doc['counts']['drugsMissingWei'],
            'noGui': doc['counts']['drugsMissingGui'],
            'note': '这几味药在教材的「来源与性味归经」段里没有写全（如只写性、未写味），按原样留空，不用药典补',
        },
        'unparsed': unparsed,
        'drugs': drugs,
    }
    return doc, method, drugs_doc


def write_md(doc):
    s = doc['source']
    c = doc['counts']
    L = [f"# {doc['book']} · 教材底本\n",
         f"- 版本：{doc['edition']}",
         f"- 母本：`{s['path']}` · {s['bytes']:,} 字节 · sha256 `{s['sha256']}`",
         f"- 编号：{doc['numbering']}",
         f"- 规模：{c['chapters']} 章 · {c['secs']} 节 · {c['subs']} 小节 · {c['items']} 段标题 · {c['paras']} 段 · {c['chars']:,} 字",
         f"- 药物单元：{c['drugs']} 味（性 {c['drugsWithQi']} · 味 {c['drugsWithWei']} · 归经 {c['drugsWithGui']} · 拆不出 {c['drugsUnparsed']}）\n"]
    for ch in doc['chapters']:
        cc = ch['counts']
        L.append(f"## 第{ch['no']}章 {ch['title']}（{cc['secs']} 节 / {cc['subs']} 小节 / {cc['paras']} 段 / {cc['chars']:,} 字）\n")
        for sec in ch['secs']:
            L.append(f"### {sec['no']} {sec['title']}")
            for sub in sec['subs']:
                L.append(f"- **{sub['no']} {sub['title'] or '（无小节标题）'}**（{len(sub['paras'])} 段）")
            L.append('')
    return '\n'.join(L) + '\n'


def check():
    doc, _, drugs = build()
    prev = json.load(io.open(OUT_JSON, encoding='utf-8'))
    errs = []
    if prev['source']['sha256'] != doc['source']['sha256']:
        errs.append('sha256 变化')
    for k in ('chapters', 'secs', 'subs', 'paras', 'chars', 'drugs'):
        if prev['counts'][k] != doc['counts'][k]:
            errs.append(f"{k}：{prev['counts'][k]:,} → {doc['counts'][k]:,}")
    if errs:
        print('[zhongyao] ✗ 教材与留档不一致：' + '；'.join(errs))
        return 1
    c = doc['counts']
    print(f"[zhongyao] ✓ sha256 {doc['source']['sha256'][:16]} · {c['chapters']} 章 · {c['secs']} 节 · "
          f"{c['subs']} 小节 · {c['paras']} 段 · {c['chars']:,} 字 · {c['drugs']} 味药")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--drug')
    args = ap.parse_args()

    if args.check:
        return check()

    doc, method, drugs = build()
    os.makedirs(OUT_DIR, exist_ok=True)
    io.open(OUT_JSON, 'w', encoding='utf-8').write(json.dumps(doc, ensure_ascii=False, indent=1) + '\n')
    io.open(OUT_MD, 'w', encoding='utf-8').write(write_md(doc))
    io.open(OUT_METHOD, 'w', encoding='utf-8').write(json.dumps(method, ensure_ascii=False, indent=1) + '\n')
    io.open(OUT_DRUGS, 'w', encoding='utf-8').write(json.dumps(drugs, ensure_ascii=False, indent=1) + '\n')

    c = doc['counts']
    print('═══ 中药学底本 ═══')
    print(f"  母本 sha256 {doc['source']['sha256'][:16]} · {doc['source']['bytes']:,} 字节 · {doc['source']['sheets']} 表"
          f"（内容 {doc['source']['contentSheets']} / 方法 {doc['source']['methodSheets']}）")
    print(f"  {c['chapters']} 章 · {c['secs']} 节 · {c['subs']} 小节 · {c['items']} 段标题 · {c['paras']} 段 · {c['chars']:,} 字")
    print(f"  药物 {c['drugs']} 味：性 {c['drugsWithQi']} · 味 {c['drugsWithWei']} · 归经 {c['drugsWithGui']} · 拆不出 {c['drugsUnparsed']}")

    if args.drug:
        hit = [d for d in drugs['drugs'] if d['name'] == args.drug]
        if hit:
            d = hit[0]
            print(f"\n  {d['name']}（教材·第{d['chapter']}章·{d['sub']}）性={d['nature']['qi']} 味={d['nature']['wei']} 归={d['nature']['guijing']}")
            for k, v in d['fields'].items():
                print(f"    {k}：{v[:70]}")
        else:
            print(f"  未找到药名：{args.drug}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
