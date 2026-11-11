#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""scripts/who_istt_terms.py —— WHO《国际标准中医药术语》双语术语表（入库产物）

## 这是什么

`scripts/icd11_terms.js` 建的 ICD-11 术语层是**英文语料**（MMS 快照只有英文），
于是中文查询在那一层命中率≈0。本脚本把 WHO ISTT 2007 的**中英双列表**变成
仓库内可查的词典，让中文查询有一个可核的落地：

    中文查询  →  WHO 双语表（中文→英文）  →  ICD-11 术语层（英文）  →  编码

每一条翻译都带着 WHO 的代码与书页，任何人可回书核对。**不做机器翻译、不猜词**：
查不到的中文片段就报「未覆盖」，不许拿近义词顶替。

## 为什么源不入库、产物入库

PDF 属 WHO 版权（2.2 MB），与 `data/icd11/` 同一处理：**源按 sha256 可重现**，
入库的是抽出来的结构化表（约 0.5 MB，含代码/英文/中文/书页），
因为**没有 PDF 就无法重建**，这份产物必须随仓库走。

## 两个子命令

    # 1) 抽表（需要 pymupdf + 同目录 pdftotext -layout 的 txt；复用 who_istt_extract.py 的坐标抽表）
    pdftotext -enc UTF-8 -layout istt2007.pdf istt2007.txt
    python scripts/who_istt_extract.py extract istt2007.pdf istt2007.txt rows.json
    python scripts/who_istt_terms.py build rows.json

    # 2) 体检（不需要 PDF）
    python scripts/who_istt_terms.py --check

## 口径

  · 中文名保留**原文繁體**（`zh`），另存 `t2s` 简体（`zhS`）——中文查询是简体，
    术语表是繁體，两个键都进词典，缺一就有一半查不到。
  · 只收 `enAgree` 为真的条目（英文名按「行带法」与「段落块法」两法互校，
    3149 条里只有 1 条不一致，那条丢弃）。这是 `who_istt_extract.py` 已有的判据。
  · 释义（`def`）只在原文里真的存在时保留（原书只给证候类释义），空就是空。
"""

import hashlib
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'standards', 'semtensor', 'descriptions', 'who-istt-terms.json')
WHO_JSON = os.path.join(ROOT, 'standards', 'semtensor', 'descriptions', 'who-tcm.json')

SOURCE = {
    'url': 'https://iris.who.int/bitstreams/24400634-2d52-4dde-bbb1-d28ee2c6fd42/download',
    'title': 'WHO International Standard Terminologies on Traditional Medicine in the Western Pacific Region (2007)',
    'sha256': 'd90b67f7a48a4e6ce06626f2be8ec4438312b66ed8bad89baa2a14691dd3a329',
    'extractor': 'scripts/who_istt_extract.py extract（按 PDF 坐标抽表：代码列 / 中文列 / 英文列 / 释义列）',
    'licenseNote': 'WHO 版权；PDF 不入库，按 sha256 可重现。入库的是抽出的结构化术语表。',
}

CODE = re.compile(r'^\d{1,2}\.\d{1,2}\.\d{1,3}$')
PAREN = re.compile(r'[（(][^（）()]*[）)]')
SECTION_CN = {
    '0': '总类',
    '1': '基础理论（精气/阴阳/五行/脏腑/经络/病因/病机）',
    '2': '诊断（四诊/八纲/病因/气血/津液/脏腑/六经/卫气营血/三焦辨证）',
    '3': '疾病（内/外/妇产/儿/眼/耳鼻喉/骨伤）',
    '4': '治则治法',
    '5': '针灸',
    '6': '中药与方剂',
}


def die(msg):
    sys.stderr.write('%s\n' % msg)
    sys.exit(1)


def need_opencc():
    try:
        import opencc
    except ImportError:                                    # pragma: no cover
        die('缺依赖 opencc：pip install opencc-python-reimplemented -i https://mirrors.aliyun.com/pypi/simple/')
    return opencc.OpenCC('t2s')


def norm_cn(s):
    """去掉括注（别名位）并压空白 —— 括注是解释，不是术语本体"""
    return re.sub(r'\s+', ' ', PAREN.sub('', str(s or ''))).strip()


def split_names(cn):
    out = []
    for part in str(cn or '').split(';'):
        n = norm_cn(part)
        if n:
            out.append(n)
    # 去重保序
    seen = set()
    return [x for x in out if not (x in seen or seen.add(x))]


def build(rows_path):
    cc = need_opencc()
    rows = json.load(open(rows_path, encoding='utf-8'))
    entries, dropped = [], []
    for r in rows:
        code = str(r.get('code') or '').strip()
        if not CODE.match(code):
            dropped.append((code, '代码不是 x.y.z'))
            continue
        if not r.get('enAgree'):
            dropped.append((code, '英文名两法不一致'))
            continue
        zh = split_names(r.get('cn'))
        if not zh:
            dropped.append((code, '无中文名'))
            continue
        en = re.sub(r'\s+', ' ', str(r.get('en') or '')).strip()
        if not en:
            dropped.append((code, '无英文名'))
            continue
        entries.append({
            'code': code,
            'grp': code.split('.')[0],
            'section': r.get('section') or r.get('sectionGroup') or None,
            'bookPage': r.get('bookPage'),
            'zh': zh,
            'zhS': [cc.convert(x) for x in zh],
            'en': en,
            'def': r.get('def') or None,
        })

    entries.sort(key=lambda e: [int(x) for x in e['code'].split('.')])

    by_grp = {}
    for e in entries:
        by_grp[e['grp']] = by_grp.get(e['grp'], 0) + 1

    out = {
        '$generated': 'python scripts/who_istt_terms.py build <rows.json>',
        'source': SOURCE,
        'what': 'WHO ISTT（2007 西太区版）全量术语表：代码 / 英文术语 / 中文术语（繁简两键）/ 书页。'
                '用途：中文查询 → 英文的**可核**词典，给 scripts/icd11_terms.js 的英文术语层当入口。',
        'counts': {
            'entries': len(entries),
            'bySection': dict(sorted(by_grp.items())),
            'withChineseName': len(entries),
            'withDefinition': sum(1 for e in entries if e['def']),
            'multiNameEntries': sum(1 for e in entries if len(e['zh']) > 1),
        },
        'sections': SECTION_CN,
        'dropped': dropped,
        'entries': entries,
    }

    json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('写入 %s' % os.path.relpath(OUT, ROOT))
    print('  条目 %d · 有释义 %d · 多别名条目 %d · 丢弃 %d'
          % (len(entries), out['counts']['withDefinition'], out['counts']['multiNameEntries'], len(dropped)))
    print('  按章：%s' % out['counts']['bySection'])
    return out


def check():
    if not os.path.exists(OUT):
        die('缺产物：%s\n  补法：python scripts/who_istt_terms.py build <rows.json>（需 PDF + pdftotext -layout）'
            % os.path.relpath(OUT, ROOT))
    d = json.load(open(OUT, encoding='utf-8'))
    errs = []
    ent = d.get('entries') or []
    if not ent:
        errs.append('entries 为空')
    if d.get('source', {}).get('sha256') != SOURCE['sha256']:
        errs.append('source.sha256 与脚本记录不一致')
    if d['counts']['entries'] != len(ent):
        errs.append('counts.entries 与实际条数不符')
    if any(not CODE.match(str(e['code'])) for e in ent):
        errs.append('有代码不合 x.y.z')
    if any(not e.get('en') or not e.get('zhS') for e in ent):
        errs.append('有缺英文名或简体中文名的条目')
    codes = [e['code'] for e in ent]
    if len(set(codes)) != len(codes):
        errs.append('代码重复')

    bycode = {e['code']: e for e in ent}
    # 已知锚点（与 who_istt_extract.py 的锚点同一批）
    anchors = {'2.9.90': '肝阳上亢证', '2.9.25': '肺阴虚证', '2.9.126': '脾肾阳虚证', '2.9.110': '膀胱湿热证'}
    for c, want in anchors.items():
        got = bycode.get(c)
        if not got:
            errs.append('锚点缺失：%s' % c)
        elif want not in got['zhS']:
            errs.append('锚点 %s 中文名不符（表内 %s）' % (c, got['zhS']))

    # 与 who-tcm.json 的 26 条已核证候对读：代码必须在表里，且中文名要能对上
    # （repo 侧的 whoCnName 可能是「名1;名2」的合并串，要拆开比 —— 第一版整串比，
    #   26 条全报不一致，那是比较方式错了，不是数据错了）
    try:
        who = json.load(open(WHO_JSON, encoding='utf-8'))
        for r in who.get('entries', []):
            e = bycode.get(str(r.get('whoCode')))
            if not e:
                errs.append('who-tcm.json 的 %s（%s）不在术语表里' % (r.get('whoCode'), r.get('label')))
                continue
            table = {norm_cn(x) for x in e['zh']}
            repo_names = [norm_cn(x) for x in str(r.get('whoCnName') or '').split(';') if norm_cn(x)]
            if repo_names and not (set(repo_names) & table):
                errs.append('who-tcm.json 的 %s 中文名与术语表不一致（repo %s / 表 %s）'
                            % (r.get('whoCode'), repo_names, sorted(table)))
    except FileNotFoundError:
        pass

    if errs:
        print('✗ WHO ISTT 术语表体检失败：')
        for e in errs[:20]:
            print('   - %s' % e)
        sys.exit(1)

    print('✅ WHO ISTT 术语表体检通过')
    print('   条目 %d · 有释义 %d · 章节 %s' % (len(ent), d['counts']['withDefinition'],
                                                list(d['counts']['bySection'].keys())))
    print('   锚点 %d 条、who-tcm.json 已核证候对读一致' % len(anchors))


def sample(words):
    d = json.load(open(OUT, encoding='utf-8'))
    idx = {}
    for e in d['entries']:
        for zh, zhS in zip(e['zh'], e['zhS']):
            idx.setdefault(zhS, e)
    for w in words:
        e = idx.get(w)
        print('  %s -> %s' % (w, ('%s  %s' % (e['code'], e['en'])) if e else '（表中无）'))
    print('  注：本输出是**逐字**匹配。JS 侧 scripts/lib_zh_en.js 另有异体字归一'
          '（脇/脅/胁、乾/干 …），所以「胁痛」在检索侧能查到「脇痛」(2.3.65)；'
          '逐字表里没有就是没有。')


if __name__ == '__main__':
    args = sys.argv[1:]
    if not args:
        die(__doc__)
    if args[0] == '--check':
        check()
    elif args[0] == 'build':
        if len(args) < 2:
            die('用法：python scripts/who_istt_terms.py build <rows.json>')
        build(args[1])
    elif args[0] == '--sample':
        sample(args[1:] or ['口苦', '失眠', '阴虚', '湿热'])
    else:
        die(__doc__)
