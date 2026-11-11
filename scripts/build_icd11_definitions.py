# -*- coding: utf-8 -*-
"""从 WHO 打印版 PDF 里抽出**释义**（定义段），补上 API 拿不到的那一半。

## 为什么走打印版
`id.who.int` 要 OAuth 凭据（实测 401），而 WHO 的**打印版 PDF 是公开的**，且里面逐条写着
「题名 → 定义段 → Inclusions → Exclusions」。本机镜像里已经有
`release/<release>/en/print-ICD-11-MMS-en.zip`（2,563 页），这就是免凭据的释义源。

## 抽什么、不抽什么
- 锚点用**同一发布版的英文全表**（`SimpleTabulation-…-en.txt`）的 (code, Title)：
  只认「代码行 → 标题行与全表逐字相同」的段落，避免把排版噪声当成条目。
- 定义段 = 标题行之后、`Inclusions:` / `Exclusions:` / `Coding Note` 之前的第一段散文，
  且必须 ≥40 字符、不含码段区间（`(SA20‑SA2Z)` 这种是块标题，不是释义）。
- **第 26 章（TM1）抽不出释义**：WHO 在这一章只给了题名与 Inclusions/Exclusions。
  这不是解析漏，是源头如此（打印版、全表、API 三处一致）—— 脚本会把这件事写进产物。

## 用法
  python scripts/build_icd11_definitions.py            # 从镜像抽，写产物
  python scripts/build_icd11_definitions.py --check    # 自检（锚点 + 第26章应为 0）
  python scripts/build_icd11_definitions.py --sample 1A00 5A11
"""
import argparse
import hashlib
import io
import json
import os
import re
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIRROR = os.environ.get('ICD11_MIRROR', r'D:\ICD11-source')
RELEASE = os.environ.get('ICD11_RELEASE', '2026-01')
PDF_ZIP = os.path.join(MIRROR, 'release', RELEASE, 'en', 'print-ICD-11-MMS-en.zip')
EN_TXT = os.path.join(MIRROR, 'release', RELEASE, 'en', 'SimpleTabulation-ICD-11-MMS-en.txt')
OUT = os.path.join(ROOT, 'standards', 'icd11', 'definitions-en.json')

CODE_LINE = re.compile(r'^\s{1,6}([A-Z0-9]{3,7}(?:\.[0-9A-Z]{1,3})?)\s{1,6}$')
CODE_RANGE = re.compile(r'[（(][A-Z0-9]{3,7}\s*[‑–-]\s*[A-Z0-9]{3,7}[）)]')
STOP_PREFIX = ('Inclusions:', 'Exclusions:', 'Coding Note', 'Note:', 'Notes:', 'Ref.')


def die(msg):
    print('[defs] ' + msg, file=sys.stderr)
    sys.exit(1)


def read_tabulation():
    """同一发布版的英文全表：给锚点与章节，避免拿别的版本的题名去对。"""
    if not os.path.exists(EN_TXT):
        die('缺英文全表：%s（先跑 python scripts/icd11_mirror.py）' % EN_TXT)
    import csv
    raw = io.open(EN_TXT, encoding='utf-8-sig').read()
    out = {}
    for r in csv.DictReader(io.StringIO(raw), delimiter='\t', quotechar='"'):
        if r.get('ClassKind') != 'category':
            continue
        code = (r.get('Code') or '').strip()
        if not code:
            continue
        out[code] = {
            'title': re.sub(r'^[-\s]+', '', r.get('Title') or '').strip(),
            'chapter': (r.get('ChapterNo') or '').strip(),
        }
    return out


def pdf_text():
    if not os.path.exists(PDF_ZIP):
        die('缺打印版：%s（先跑 python scripts/icd11_mirror.py）' % PDF_ZIP)
    import pymupdf
    tmp = os.path.join(os.environ.get('TEMP', '/tmp'), 'icd11-print-en.pdf')
    with zipfile.ZipFile(PDF_ZIP) as z:
        name = [n for n in z.namelist() if n.lower().endswith('.pdf')][0]
        with z.open(name) as src, open(tmp, 'wb') as dst:
            dst.write(src.read())
    doc = pymupdf.open(tmp)
    pages = [p.get_text() for p in doc]
    sha = hashlib.sha256(open(tmp, 'rb').read()).hexdigest()
    n = doc.page_count
    doc.close()          # Windows 上不关句柄就删不掉（WinError 32）
    try:
        os.remove(tmp)
    except OSError:
        pass
    return pages, sha, n


def parse(pages, tab):
    """逐页扫「代码行 → 标题 → 正文」，只认标题与全表一致的条目。"""
    entries, rejected = {}, {'titleMismatch': 0, 'noProse': 0, 'looksLikeHeading': 0, 'tooShort': 0}
    titles = {v['title'] for v in tab.values()}
    for pno, text in enumerate(pages, 1):
        lines = text.split('\n')
        for i, ln in enumerate(lines):
            m = CODE_LINE.match(ln)
            if not m:
                continue
            code = m.group(1)
            if code not in tab:
                continue
            # 标题行：下一个非空行
            j = i + 1
            while j < len(lines) and not lines[j].strip():
                j += 1
            if j >= len(lines):
                continue
            title = lines[j].strip()
            if title != tab[code]['title']:
                rejected['titleMismatch'] += 1
                continue
            # 正文：到下一个代码行为止
            k, body = j + 1, []
            while k < len(lines) and not CODE_LINE.match(lines[k]):
                body.append(lines[k].strip())
                k += 1
            # 切掉 Inclusions/Exclusions 之后的部分，只留定义段
            prose, inclusions, exclusions = [], [], []
            mode = 'def'
            for b in body:
                if not b:
                    continue
                if b.startswith('Inclusions:'):
                    mode = 'inc'
                    rest = b[len('Inclusions:'):].strip()
                    if rest:
                        inclusions.append(rest)
                    continue
                if b.startswith('Exclusions:'):
                    mode = 'exc'
                    rest = b[len('Exclusions:'):].strip()
                    if rest:
                        exclusions.append(rest)
                    continue
                if b.startswith(STOP_PREFIX[2:]):
                    mode = 'stop'
                    continue
                if mode == 'def':
                    prose.append(b)
                elif mode == 'inc':
                    inclusions.append(b)
                elif mode == 'exc':
                    exclusions.append(b)
            definition = ' '.join(prose).strip()
            if not definition:
                rejected['noProse'] += 1
                continue
            if len(definition) < 40:
                rejected['tooShort'] += 1
                continue
            # 块标题混进来：含码段区间，或本身就是另一条题名。
            # 还有第三种：整段其实是**子条目题名的清单**（打印版把子码连排时就会这样，
            # 例：SB06「Edema disorders」的正文是 SB06.0/.1/.Y/.Z 四条题名拼起来）。
            # 判据：段里同时出现 ≥2 条已知题名 —— 散文里不会这样。
            #    判据用**占比**而不是「出现 ≥2 条题名」：散文里提到一两个病名很正常
            #    （"any condition … such as cholera"），但整段都是题名的，匹配长度占比会接近 1。
            matched = sum(len(t) for t in titles if t and t in definition)
            titleShare = matched / max(len(definition), 1)
            if CODE_RANGE.search(definition) or definition in titles or titleShare >= 0.5:
                rejected['looksLikeHeading'] += 1
                continue
            entries[code] = {
                'title': title,
                'chapter': tab[code]['chapter'],
                'definition': definition,
                'inclusions': inclusions[:12],
                'exclusions': exclusions[:12],
                'page': pno,
            }
    return entries, rejected


def build():
    tab = read_tabulation()
    pages, sha, nPages = pdf_text()
    entries, rejected = parse(pages, tab)
    by_ch = {}
    for e in entries.values():
        by_ch[e['chapter']] = by_ch.get(e['chapter'], 0) + 1
    doc = {
        '$about': 'ICD-11 释义（定义段）—— 从 WHO 打印版 PDF 抽出，免 API 凭据；'
                  '第 26 章（TM1）在 WHO 源文件里没有释义，故为 0',
        'meta': {
            'source': {
                'zip': PDF_ZIP.replace('\\', '/'),
                'inside': 'ICD-11-MMS-en.pdf',
                'release': RELEASE,
                'sha256': sha,
                'pages': nPages,
                'anchor': os.path.basename(EN_TXT),
                'note': '锚点 = 同一发布版的英文全表 (code, Title)：只认标题逐字相同的段落，'
                        '避免把排版噪声当条目。',
            },
            'counts': {
                'tabulationCategories': len(tab),
                'withDefinition': len(entries),
                'byChapter': dict(sorted(by_ch.items(), key=lambda x: -x[1])),
                'chapter26': by_ch.get('26', 0),
                'rejected': rejected,
            },
            'gaps': [
                '第 26 章（TM1/TM2）没有任何释义 —— 打印版、全表、API 三处一致，源头如此。'
                '中医术语的定义在 WHO ISTT（本仓库 standards/semtensor/descriptions/who-istt-terms.json）里。',
                '英文打印版没有中文译本，所以释义只有英文；中文标题另有 zh-names.json。',
            ],
        },
        'entries': entries,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    io.open(OUT, 'w', encoding='utf-8').write(json.dumps(doc, ensure_ascii=False) + '\n')
    c = doc['meta']['counts']
    print('[defs] 写入 %s' % os.path.relpath(OUT, ROOT))
    print('[defs] 全表 %d 条 · 有释义 %d 条 · 第 26 章 %d 条' %
          (c['tabulationCategories'], c['withDefinition'], c['chapter26']))
    print('[defs] 拒绝 %s' % json.dumps(c['rejected'], ensure_ascii=False))
    return doc


def check(doc=None):
    doc = doc or build()
    errs = []
    e = doc['entries']
    if len(e) < 2000:
        errs.append('释义条数过少：%d' % len(e))
    if (doc['meta']['counts']['chapter26'] or 0) != 0:
        errs.append('第 26 章不该有释义（WHO 源头没有）—— 解析把块标题或 Inclusions 当成了释义')
    # 锚点：霍乱的释义必须以 "Cholera is" 开头（WHO 原文）
    if '1A00' in e and not e['1A00']['definition'].startswith('Cholera is'):
        errs.append('1A00 释义与 WHO 原文不符：%s' % e['1A00']['definition'][:60])
    for code, v in list(e.items())[:2000]:
        if CODE_RANGE.search(v['definition']):
            errs.append('%s 的释义里含码段区间（块标题混入）' % code)
            break
        if len(v['definition']) < 40:
            errs.append('%s 的释义过短' % code)
            break
    if errs:
        print('[defs] ✗ ' + '；'.join(errs[:6]), file=sys.stderr)
        sys.exit(1)
    print('[defs] ✓ %d 条释义 · 第 26 章 0 条（源头如此）· 锚点 1A00 通过' % len(e))


def sample(codes):
    doc = json.load(io.open(OUT, encoding='utf-8'))
    for c in codes:
        v = doc['entries'].get(c)
        if not v:
            print('  %s → （无释义）' % c)
            continue
        print('  %s %s（第 %s 章，p.%s）' % (c, v['title'], v['chapter'], v['page']))
        print('     %s' % v['definition'][:220])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--sample', nargs='*')
    a = ap.parse_args()
    if a.check:
        return check()
    if a.sample:
        return sample(a.sample)
    return build()


if __name__ == '__main__':
    main()
