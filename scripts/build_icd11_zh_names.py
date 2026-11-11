# -*- coding: utf-8 -*-
"""ICD-11 官方中文名 —— 从 WHO 发布的 Simple Tabulation 里取，不再用第三方转写。

## 为什么换源
上一版用的是 NRICM TWCM FHIR IG 的 TM1 ValueSet：只有 **disorder**（216 条），
**pattern（证候）一条都没有** —— 而证候匹配要的正是 pattern 那一半。
那批数据本身也是「第三方按 WHO 中文译本转写」，与其拿转写当权威，不如直接取 WHO 原件。

WHO 每个发布版都在公开 CDN 上放 `SimpleTabulation-ICD-11-MMS-<lang>.zip`，
里面的制表符文本逐行给出：Foundation URI / Linearization URI / **Code** /
BlockId / **TitleEN** / **Title（官方中文）** / ClassKind / ChapterNo / IsResidual …
**解压即用，不需要凭据**。第 26 章（传统医学）在中译本里是全的：

    SF62  Dual deficiency of heart qi and blood pattern (TM1)   → 心气血两虚证（TM1）
    SF81  Lung yin deficiency pattern (TM1)                     → 肺阴虚证（TM1）
    SA00  Hypochondrium pain disorder (TM1)                     → 胁痛（TM1）

## 与仓库快照的关系
英文题名**逐条对账**：快照第 26 章 876 个码，官方表 876 个全部命中、题名不一致 **0** 条。
官方表另有 244 个码快照里没有（发布版更新）。不一致就进 `reconcile`，不合并、不改写。

## 用法
  python scripts/build_icd11_zh_names.py --fetch          # 下载并解压到 data/icd11/sources/
  python scripts/build_icd11_zh_names.py                  # 生成 standards/icd11/zh-names.json（第 26 章）
  python scripts/build_icd11_zh_names.py --chapters all   # 整本 ICD-11（约 1.1 万条，供全库中文面用）
  python scripts/build_icd11_zh_names.py --check          # 自检（CI）
"""
import argparse
import csv
import hashlib
import io
import json
import os
import re
import subprocess
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RELEASE = os.environ.get('ICD11_RELEASE', '2026-01')
ZIP_NAME = 'SimpleTabulation-ICD-11-MMS-zh.zip'
SRC_URL = 'https://icdcdn.who.int/static/releasefiles/%s/%s' % (RELEASE, ZIP_NAME)
SRC_DIR = os.path.join(ROOT, 'data', 'icd11', 'sources')
# 本机镜像（`python scripts/icd11_mirror.py` 建）优先：有就用本机的，没有才去 CDN 下。
# 标准源放在本机自有目录，构建就不该依赖网络 —— 这是「常备资源」的意义。
MIRROR = os.environ.get('ICD11_MIRROR', r'D:\ICD11-source')
MIRROR_TXT = os.path.join(MIRROR, 'release', RELEASE, 'zh', 'SimpleTabulation-ICD-11-MMS-zh.txt')
ZIP_PATH = os.path.join(SRC_DIR, ZIP_NAME)
TXT_PATH = os.path.join(SRC_DIR, 'SimpleTabulation-ICD-11-MMS-zh.txt')
SNAP = os.path.join(ROOT, 'data', 'icd11', 'entities.ndjson')
OUT = os.path.join(ROOT, 'standards', 'icd11', 'zh-names.json')

TM_MARK = re.compile(r'\s*[（(]TM([12])[）)]')
DASH = re.compile(r'^[-\s]+')


def die(msg):
    print('[zh-names] ' + msg, file=sys.stderr)
    sys.exit(1)


def fetch():
    os.makedirs(SRC_DIR, exist_ok=True)
    r = subprocess.run(['curl', '-sL', '--max-time', '180', '-o', ZIP_PATH, SRC_URL])
    if r.returncode != 0 or not os.path.exists(ZIP_PATH) or os.path.getsize(ZIP_PATH) < 100000:
        die('下载失败；手工执行：curl -sL -o "%s" "%s"' % (ZIP_PATH, SRC_URL))
    with zipfile.ZipFile(ZIP_PATH) as z:
        # zip 里除了数据表还有 readme.txt（1 KB）；按体积取最大的 .txt，
        # 并且优先名字里带 SimpleTabulation 的那个 —— 别把 readme 当数据表。
        cands = [n for n in z.namelist() if n.lower().endswith('.txt')]
        if not cands:
            die('zip 里没有 .txt')
        pick = sorted(cands, key=lambda n: (('simpletabul' in n.lower()), z.getinfo(n).file_size))[-1]
        with z.open(pick) as src, open(TXT_PATH, 'wb') as dst:
            dst.write(src.read())
    print('[zh-names] 已缓存 %s (%d 字节，来自 %s)' % (TXT_PATH, os.path.getsize(TXT_PATH), pick))


def read_src():
    # ① 本机镜像（权威、离线可用）→ ② 仓库内缓存 → ③ 报错并给补法
    for p in (MIRROR_TXT, TXT_PATH):
        if os.path.exists(p) and os.path.getsize(p) > 100000:
            raw = open(p, 'rb').read()
            return raw, hashlib.sha256(raw).hexdigest(), p
    die('缺源表：先跑 python scripts/icd11_mirror.py（建本机镜像），'
        '或 python scripts/build_icd11_zh_names.py --fetch（从 CDN 下）')


def clean_zh(raw):
    """去掉层级短横与 (TM1)/(TM2) 标记 —— 标记是概念标签，不是名字的一部分。
    标记可能不在末尾（"…（TM1）（包括分娩）"），所以按全局删。
    原文另存 zhRaw，永不丢。"""
    t = DASH.sub('', raw or '').strip()
    t = TM_MARK.sub('', t).strip()
    return t


# 模块必须从**英文**题名取：TM2 在 WHO 中译本里没有中文题名，
# 若从中文题名取模块，整章 650 条 TM2 会被判成「无模块」—— 这正是第一版的错。
def module_of(en_raw):
    m = TM_MARK.search(en_raw or '')
    return 'TM%s' % m.group(1) if m else None


def parse(raw, chapters):
    want = None if chapters == 'all' else {str(c).zfill(2) for c in chapters}
    out = []
    for row in csv.DictReader(io.StringIO(raw.decode('utf-8-sig')), delimiter='\t', quotechar='"'):
        if row.get('ClassKind') != 'category':
            continue
        if want is not None and str(row.get('ChapterNo') or '').zfill(2) not in want:
            continue
        code = (row.get('Code') or '').strip()
        if not code:
            continue
        en = DASH.sub('', (row.get('TitleEN') or '')).strip()
        module = module_of(en)
        zh = clean_zh(row.get('Title'))
        out.append({
            'code': code,
            'en': en,
            'enRaw': en,
            'zh': zh,
            'zhRaw': (row.get('Title') or '').strip(),
            'module': module,
            'chapter': (row.get('ChapterNo') or '').strip(),
            'blockId': (row.get('BlockId') or '').strip(),
            'kind': (row.get('ClassKind') or '').strip(),
            'isLeaf': (row.get('isLeaf') or '').strip().lower() == 'true',
            'isResidual': (row.get('IsResidual') or '').strip().lower() == 'true',
        })
    return out


def load_snapshot():
    snap = {}
    with io.open(SNAP, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            e = json.loads(line)
            if e.get('code'):
                snap[e['code']] = e
    return snap


def norm_en(t):
    """只为对账：抹平 (TM1)/（TM1）/pattern|syndrome/大小写与标点。"""
    t = re.sub(r'[（(]TM[12][）)]', '', str(t or '')).lower()
    t = t.replace('pattern/syndrome', 'pattern').replace('syndrome', 'pattern')
    return re.sub(r'[^a-z]', '', t)


def build(chapters, label):
    raw, sha, srcPath = read_src()
    rows = parse(raw, chapters)
    if not rows:
        die('解析出 0 行 —— 源表结构变了？')
    snap = load_snapshot()

    mismatch, not_in_snapshot, missing_zh = [], [], []
    for r in rows:
        if not r['zh']:
            missing_zh.append(r['code'])
        e = snap.get(r['code'])
        if e is None:
            not_in_snapshot.append(r['code'])
            continue
        if norm_en(e['title']) != norm_en(r['enRaw']):
            mismatch.append({'code': r['code'], 'snapshot': e['title'], 'who': r['enRaw']})

    covered = {r['code'] for r in rows} & set(snap)
    by_module = {}
    for r in rows:
        if r['module']:
            by_module[r['module']] = by_module.get(r['module'], 0) + 1

    doc = {
        '$about': 'ICD-11 官方中文名（WHO Simple Tabulation，%s）；第 %s 章'
                  % (RELEASE, '全部' if chapters == 'all' else '/'.join(str(c) for c in chapters)),
        'meta': {
            'source': {
                'url': SRC_URL,
                'inside': 'SimpleTabulation-ICD-11-MMS-zh.txt',
                'publisher': 'World Health Organization · ICD-11 MMS %s' % RELEASE,
                'license': 'CC BY-ND 3.0 IGO（ICD-11 内容版权归 WHO；此处只存题名，不存正文）',
                'sha256': sha,
                'bytes': len(raw),
                'release': RELEASE,
                'localPath': srcPath,
                'note': 'WHO 公开发布文件；优先取本机镜像（`scripts/icd11_mirror.py`），'
                        '镜像缺失时才从 CDN 下。不需要 API 凭据。',
            },
            'counts': {
                'rows': len(rows),
                'withZh': len(rows) - len(missing_zh),
                'coveredOfSnapshot': len(covered),
                'inSnapshot': len(covered),
                'supplement': len(rows) - len(covered),   # WHO 表有、快照没有的码（术语层可据此补索引）
                'byModule': by_module,
            },
            'reconcile': {
                'titleMismatch': mismatch,
                'inWhoNotInSnapshot': not_in_snapshot[:400],
                'inWhoNotInSnapshotCount': len(not_in_snapshot),
                'missingZh': missing_zh,
                'note': '英文题名以仓库快照（2025-01 mms，来自 vectorization-ICD11）为准；'
                        'WHO 表更新、多出的码不猜不补，只登记。',
            },
        },
        'names': rows,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    io.open(OUT, 'w', encoding='utf-8').write(json.dumps(doc, ensure_ascii=False, indent=1) + '\n')
    c = doc['meta']['counts']
    print('[zh-names] 写入 %s（%s）· 源 %s' % (os.path.relpath(OUT, ROOT), label, srcPath))
    print('[zh-names] 行 %d · 有中文 %d · 与快照重合 %d · 英文题名不一致 %d · WHO 多出 %d'
          % (c['rows'], c['withZh'], c['coveredOfSnapshot'], len(mismatch), len(not_in_snapshot)))
    print('[zh-names] 模块 %s' % json.dumps(by_module, ensure_ascii=False))
    if mismatch:
        for m in mismatch[:8]:
            print('  ! %s 快照=%r WHO=%r' % (m['code'], m['snapshot'], m['who']))


def check():
    if not os.path.exists(OUT):
        die('缺 %s' % OUT)
    d = json.load(io.open(OUT, encoding='utf-8'))
    bad = []
    src = d.get('meta', {}).get('source', {})
    if len(str(src.get('sha256') or '')) != 64:
        bad.append('meta.source.sha256 缺失')
    names = d.get('names') or []
    codes = [n['code'] for n in names]
    if len(codes) != len(set(codes)):
        bad.append('同一 code 出现多次')
    # 中文只要求 TM1：WHO 的中译本把 Module I 全译了（472 条全有），
    # Module II（阿育吠陀/悉达）整章**没有中文题名** —— 那是源头缺，不是我们解析漏了。
    for n in names:
        if n.get('module') == 'TM1' and not n.get('zh'):
            bad.append('TM1 缺中文：%s' % n.get('code'))
        if not re.fullmatch(r'[A-Z0-9]{3,7}(\.[0-9A-Z]+)?', n.get('code') or ''):
            bad.append('奇怪的编码：%s' % n.get('code'))
    tm1 = [n for n in names if n.get('module') == 'TM1']
    if len(tm1) < 300:
        bad.append('TM1 条目过少（%d）—— 源表可能只解析了 half' % len(tm1))
    if bad:
        print('[zh-names] ✗ ' + '；'.join(bad[:8]), file=sys.stderr)
        sys.exit(1)
    c = d['meta']['counts']
    print('[zh-names] ✓ %d 行 / 有中文 %d（TM1 全译；TM2 源头无中文）· 模块 %s · 与快照重合 %d · 题名不一致 %d'
          % (c['rows'], c['withZh'], json.dumps(c['byModule'], ensure_ascii=False),
             c['coveredOfSnapshot'], len(d['meta']['reconcile']['titleMismatch'])))


def sample(words):
    d = json.load(io.open(OUT, encoding='utf-8'))
    idx = {}
    for n in d['names']:
        idx.setdefault(n['zh'], []).append(n)
    for w in words:
        hits = idx.get(w) or []
        if not hits:
            print('  %-10s → （表里没有）' % w)
        for h in hits:
            print('  %-10s → %-8s %s' % (w, h['code'], h['en']))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--fetch', action='store_true', help='下载并解压 WHO Simple Tabulation（中文）')
    ap.add_argument('--check', action='store_true', help='自检（CI）')
    ap.add_argument('--chapters', default='26', help="章节：'26'（默认）/ 'all' / '26,06'")
    ap.add_argument('--sample', nargs='*', help='按官方中文名反查编码')
    a = ap.parse_args()
    if a.fetch:
        fetch()
    if a.check:
        check()
    elif a.sample:
        sample(a.sample)
    else:
        chapters = a.chapters if a.chapters == 'all' else [c.strip() for c in a.chapters.split(',') if c.strip()]
        build(chapters, a.chapters)


if __name__ == '__main__':
    main()
