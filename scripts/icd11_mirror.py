# -*- coding: utf-8 -*-
"""把 ICD-11 的**公开发布文件**镜像到本机，成为可长期复用的标准源。

## 为什么是「镜像文件」而不是「调 API」
`id.who.int` 要 OAuth 凭据（实测 401），而 `icdcdn.who.int` 上的发布文件是**公开的、免凭据的**。
所以本机自有标准源 = 这些发布文件 + 校验清单；定义/索引词/父链这类只在 API 里的内容，
在 README 里**明确列为缺口**，不假装有。

## 镜像里有什么（2026-01 为例）
    release/2026-01/zh/SimpleTabulation-ICD-11-MMS-zh.zip   ← 全表中文题名（含第 26 章 472 条 TM1）
    release/2026-01/zh/SimpleTabulation-ICD-11-MMS-zh.txt   ← 解压后的制表符文本，直接能 grep
    release/2026-01/en/…                                    ← 英文同一份 + 打印版 + 死因/疾病列表 + 映射表
    changes/changes_MMS_*.zip                               ← 每一版的变更包（2018-06 起）
    guides/refguide-en.pdf · factsheet-zh.pdf · implementation-guide-zh.pdf
    derived/…                                               ← 本仓库从上述原件派生的小表（中文名/四轴/等价类）

## 用法
    python scripts/icd11_mirror.py                 # 下载缺的 + 解压 + 写清单与 README
    python scripts/icd11_mirror.py --status        # 只看现状
    python scripts/icd11_mirror.py --verify        # 校验 sha256（不联网）
    python scripts/icd11_mirror.py --dest E:/ICD11 # 换目录
"""
import argparse
import hashlib
import io
import json
import os
import shutil
import subprocess
import sys
import time
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DEST = r'D:\ICD11-source'
CDN = 'https://icdcdn.who.int/static/releasefiles'
PORTAL = 'https://icd.who.int/zh/docs'

RELEASE = '2026-01'
CHANGE_RELEASES = [
    ('2019-04', '2018-06'), ('2020-09', '2019-04'), ('2021-05', '2020-09'),
    ('2022-02', '2021-05'), ('2023-01', '2022-02'), ('2024-01', '2023-01'),
    ('2025-01', '2024-01'), ('2026-01', '2025-01'),
]

# kind: linearization(全表) / print(打印版) / tabulation(统计列表) / mapping(映射) / changes / guide
SPEC = [
    # ── 分类内容：2026-01（当前发布版）──
    {'path': 'release/2026-01/zh/SimpleTabulation-ICD-11-MMS-zh.zip',
     'url': f'{CDN}/{RELEASE}/SimpleTabulation-ICD-11-MMS-zh.zip',
     'kind': 'linearization', 'lang': 'zh', 'unzip': True,
     'note': '全表中文题名（37,098 行制表符文本）；第 26 章 1,120 条 / 472 条带官方中文'},
    {'path': 'release/2026-01/en/SimpleTabulation-ICD-11-MMS-en.zip',
     'url': f'{CDN}/{RELEASE}/SimpleTabulation-ICD-11-MMS-en.zip',
     'kind': 'linearization', 'lang': 'en', 'unzip': True,
     'note': '英文全表；与中文表逐码对账（英文题名不一致 0 条）'},
    {'path': 'release/2026-01/en/print-ICD-11-MMS-en.zip',
     'url': f'{CDN}/{RELEASE}/print-ICD-11-MMS-en.zip',
     'kind': 'print', 'lang': 'en',
     'note': '打印版（英文）；中文打印版**不存在**（实测 404），故只存英文'},
    {'path': 'release/2026-01/en/MorbidityTabulationList_en.zip',
     'url': f'{CDN}/{RELEASE}/MorbidityTabulationList_en.zip',
     'kind': 'tabulation', 'lang': 'en', 'note': '疾病统计列表'},
    {'path': 'release/2026-01/en/MortalityTabulationList_en.zip',
     'url': f'{CDN}/{RELEASE}/MortalityTabulationList_en.zip',
     'kind': 'tabulation', 'lang': 'en', 'note': '死因统计列表'},
    {'path': 'release/2026-01/en/mapping.zip',
     'url': f'{CDN}/{RELEASE}/mapping.zip',
     'kind': 'mapping', 'lang': 'en', 'note': 'ICD-10 → ICD-11 映射表'},
    {'path': 'release/2026-01/en/WHOListOfVaccinableConditions_en.zip',
     'url': f'{CDN}/{RELEASE}/WHOListOfVaccinableConditions_en.zip',
     'kind': 'tabulation', 'lang': 'en', 'note': 'WHO 可接种疫苗的疾病清单'},
]

# ── 变更包：每一版相对上一版改了什么（追溯用）──
for new, old in CHANGE_RELEASES:
    SPEC.append({
        'path': f'changes/changes_MMS_{new}_{old}.zip',
        'url': f'{CDN}/changes/changes_MMS_{new}_{old}.zip',
        'kind': 'changes', 'lang': 'en', 'note': f'{old} → {new} 的变更包',
    })

# ── 指南与说明（含中文）──
SPEC += [
    {'path': 'guides/refguide-en.pdf',
     'url': 'https://icdcdn.who.int/icd11referenceguide/en/refguide.pdf',
     'kind': 'guide', 'lang': 'en',
     'note': 'ICD-11 Reference Guide（473 页，2022）—— 第 26 章命名规则原文在 §3.2.26'},
    {'path': 'guides/factsheet-zh.pdf',
     'url': f'{PORTAL}/ICD11_FactSheet_2026_zh.pdf',
     'kind': 'guide', 'lang': 'zh', 'note': 'ICD-11 情况说明书（中文）'},
    {'path': 'guides/implementation-guide-zh.pdf',
     'url': f'{PORTAL}/192190_ICD-11_Implementation_or_Transition_Guide_20191223_CN.pdf',
     'kind': 'guide', 'lang': 'zh', 'note': 'ICD-11 实施和转换指南（中文，2019）'},
]

DERIVED = [
    ('standards/icd11/zh-names.json', 'derived/zh-names.json', '第 26 章官方中文名（WHO 发布文件派生，含繁体/简体与对账）'),
    ('standards/icd11/tm1/axes.json', 'derived/tm1-axes.json', 'TM1 四轴词表（术语命名法，从 472 条官方题名统计）'),
    ('standards/icd11/definitions-en.json', 'derived/definitions-en.json',
     'ICD-11 释义（从打印版 PDF 抽出，2,394 条；第 26 章 0 条）'),
    ('standards/icd11/tm1/README.md', 'derived/tm1-naming-notes.md', '第 26 章命名规则原文摘录与本仓库口径'),
    ('standards/semtensor/equivalence/classes.json', 'derived/equivalence-classes.json', '语义张量等价类（中英等价映射，非 WHO 原件）'),
]

GAPS = [
    ('定义 / 索引词 / 父链', '`id.who.int` 需 OAuth 凭据（实测 401）。注册 ICD-API 后可补，'
     '补法见 `scripts/icd11_client.js --who-check`。'),
    ('第 26 章 TM2 的中文题名', 'WHO 中译本整章未译（648 条题名为空）—— 源头缺，不是取漏。'),
    ('中文打印版', '`print-ICD-11-MMS-zh.zip` 实测 404，WHO 未发布。'),
    ('中文 Reference Guide', '`icd11referenceguide/zh/refguide.pdf` 实测 404，只有英文版。'),
]


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def fetch(url, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    tmp = dest + '.part'
    r = subprocess.run(['curl', '-sL', '--max-time', '600', '-o', tmp, url])
    if r.returncode != 0 or not os.path.exists(tmp) or os.path.getsize(tmp) < 1000:
        if os.path.exists(tmp):
            os.remove(tmp)
        return False, '下载失败'
    os.replace(tmp, dest)
    return True, None


def unzip_if_needed(item, dest_root):
    """解压到同目录；只解 .txt/.xlsx/.csv 这类能直接用的大件，避免把 tree 摊开。"""
    zpath = os.path.join(dest_root, item['path'])
    outdir = os.path.dirname(zpath)
    want = ('.txt', '.csv', '.xlsx')
    try:
        with zipfile.ZipFile(zpath) as z:
            for n in z.namelist():
                if not n.lower().endswith(want):
                    continue
                if 'readme' in n.lower():
                    continue
                target = os.path.join(outdir, os.path.basename(n))
                if os.path.exists(target) and os.path.getsize(target) > 0:
                    continue
                with z.open(n) as src, open(target, 'wb') as dst:
                    shutil.copyfileobj(src, dst)
    except zipfile.BadZipFile:
        return f'不是有效 zip：{item["path"]}'
    return None


def load_manifest(dest):
    p = os.path.join(dest, 'MANIFEST.json')
    if not os.path.exists(p):
        return {}
    try:
        return {x['path']: x for x in json.load(io.open(p, encoding='utf-8')).get('files', [])}
    except Exception:
        return {}


def do_fetch(dest):
    os.makedirs(dest, exist_ok=True)
    old = load_manifest(dest)
    files, errs = [], []
    for item in SPEC:
        target = os.path.join(dest, item['path'])
        entry = dict(item)
        if os.path.exists(target) and os.path.getsize(target) > 1000:
            entry['bytes'] = os.path.getsize(target)
            entry['sha256'] = old.get(item['path'], {}).get('sha256') or sha256(target)
            entry['state'] = 'cached'
        else:
            ok, why = fetch(item['url'], target)
            if not ok:
                errs.append(f'{item["path"]}: {why}')
                continue
            entry['bytes'] = os.path.getsize(target)
            entry['sha256'] = sha256(target)
            entry['state'] = 'fetched'
            entry['fetchedAt'] = time.strftime('%Y-%m-%d')
        if item.get('unzip'):
            bad = unzip_if_needed(item, dest)
            if bad:
                errs.append(bad)
            else:
                d = os.path.dirname(target)
                entry['extracted'] = sorted(
                    os.path.basename(x) for x in
                    (os.path.join(d, f) for f in os.listdir(d))
                    if x.lower().endswith(('.txt', '.csv', '.xlsx'))
                )
        files.append(entry)
    write_index(dest, files)
    return files, errs


def write_index(dest, files):
    doc = {
        '$about': 'ICD-11 本机标准源镜像清单（WHO 公开发布文件；不含 API 专属内容）',
        'generatedAt': time.strftime('%Y-%m-%d %H:%M'),
        'release': RELEASE,
        'dest': dest,
        'counts': {
            'files': len(files),
            'bytes': sum(f.get('bytes') or 0 for f in files),
            'byKind': {k: sum(1 for f in files if f['kind'] == k)
                       for k in sorted({f['kind'] for f in files})},
        },
        'gaps': [{'what': w, 'why': y} for w, y in GAPS],
        'files': sorted(files, key=lambda f: f['path']),
    }
    io.open(os.path.join(dest, 'MANIFEST.json'), 'w', encoding='utf-8').write(
        json.dumps(doc, ensure_ascii=False, indent=1) + '\n')
    io.open(os.path.join(dest, 'README.md'), 'w', encoding='utf-8').write(render_readme(doc))


def render_readme(doc):
    lines = [
        '# ICD-11 本机标准源镜像',
        '',
        f'> 由 `scripts/icd11_mirror.py` 生成于 {doc["generatedAt"]} · 发布版 **{doc["release"]}** · '
        f'{doc["counts"]["files"]} 个文件 / {doc["counts"]["bytes"] / 1048576:.1f} MB',
        '',
        '这些是 **WHO 公开发布文件**（`icdcdn.who.int` / `icd.who.int/zh/docs`），免凭据、可校验 sha256。',
        '它们是本仓库 ICD-11 侧一切派生数据的**原件**：中文名表、四轴词表、等价类都从这里算出来。',
        '',
        '## 目录',
        '',
        '```',
        'release/2026-01/zh/   中文全表（.zip 与解压后的 .txt/.xlsx）',
        'release/2026-01/en/   英文全表、打印版、死因/疾病统计列表、ICD-10→11 映射',
        'changes/              每版变更包（2018-06 起）',
        'guides/               Reference Guide（英）、情况说明书（中）、实施指南（中）',
        'derived/              本仓库从上述原件派生的小表（非 WHO 原件）',
        'MANIFEST.json         每个文件的 url / 字节数 / sha256 / 取回日期',
        '```',
        '',
        '## 校验',
        '',
        '```bash',
        'python scripts/icd11_mirror.py --verify     # 重算 sha256，与 MANIFEST 比对',
        'python scripts/icd11_mirror.py              # 补齐缺的、写清单',
        'python scripts/icd11_mirror.py --status     # 只看现状',
        '```',
        '',
        '## 缺口（不在镜像里，且有原因）',
        '',
    ]
    for g in doc['gaps']:
        lines.append(f'- **{g["what"]}** —— {g["why"]}')
    lines += ['', '## 清单', '', '| 文件 | 大小 | sha256 | 说明 |', '|---|---|---|---|']
    for f in doc['files']:
        lines.append(f'| `{f["path"]}` | {(f.get("bytes") or 0) / 1024:.0f} KB | '
                     f'`{(f.get("sha256") or "")[:12]}…` | {f.get("note", "")} |')
    lines.append('')
    return '\n'.join(lines)


def do_verify(dest):
    man = load_manifest(dest)
    if not man:
        print('[mirror] 缺 MANIFEST.json —— 先跑一次（不带参数）')
        return 1
    bad, missing, ok = [], [], 0
    for p, e in man.items():
        full = os.path.join(dest, p)
        if not os.path.exists(full):
            missing.append(p)
            continue
        if os.path.getsize(full) != e.get('bytes'):
            bad.append(f'{p}: 大小 {os.path.getsize(full)} ≠ 清单 {e.get("bytes")}')
            continue
        if e.get('sha256') and sha256(full) != e['sha256']:
            bad.append(f'{p}: sha256 不符')
            continue
        ok += 1
    print(f'[mirror] ✓ {ok} 个文件校验通过 · 缺失 {len(missing)} · 不符 {len(bad)}')
    for m in missing[:10]:
        print(f'  缺：{m}')
    for b in bad[:10]:
        print(f'  ✗ {b}')
    return 0 if not (missing or bad) else 1


def do_status(dest):
    man = load_manifest(dest)
    total = sum(e.get('bytes') or 0 for e in man.values())
    print(f'═══ ICD-11 本机镜像 {dest} ═══')
    print(f'  文件 {len(man)} · 合计 {total / 1048576:.1f} MB · 发布版 {RELEASE}')
    kinds = {}
    for e in man.values():
        kinds[e['kind']] = kinds.get(e['kind'], 0) + 1
    for k in sorted(kinds):
        print(f'  {k:14s} {kinds[k]}')
    print('  缺口：')
    for w, y in GAPS:
        print(f'   - {w}：{y[:60]}…')
    return 0


def copy_derived(dest):
    out = []
    for src_rel, dst_rel, note in DERIVED:
        src = os.path.join(ROOT, src_rel)
        if not os.path.exists(src):
            out.append(f'跳过（不存在）{src_rel}')
            continue
        dst = os.path.join(dest, dst_rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(src, dst)
        out.append(f'{dst_rel} ← {src_rel}')
    io.open(os.path.join(dest, 'derived', 'README.md'), 'w', encoding='utf-8').write(
        '# derived/\n\n'
        '这些**不是 WHO 原件**，是本仓库从 `release/` 与 `guides/` 里的原件派生出来的小表，\n'
        '放在这里是为了离线直接可用。派生规则与校验见仓库内对应 README；\n'
        '重新生成：`npm run icd11:zh-names && npm run icd11:axes && npm run equivalence`。\n\n'
        + '\n'.join(f'- `{d}` —— {n}' for _, d, n in DERIVED) + '\n')
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dest', default=os.environ.get('ICD11_MIRROR', DEFAULT_DEST))
    ap.add_argument('--verify', action='store_true', help='只校验 sha256（不联网）')
    ap.add_argument('--status', action='store_true', help='只看现状')
    a = ap.parse_args()
    if a.verify:
        return do_verify(a.dest)
    if a.status:
        return do_status(a.dest)
    files, errs = do_fetch(a.dest)
    derived = copy_derived(a.dest)
    print(f'═══ ICD-11 镜像 → {a.dest} ═══')
    for f in files:
        print(f'  {f["state"]:8s} {f["path"]:58s} {(f.get("bytes") or 0) / 1024:8.0f} KB')
    print(f'  合计 {sum(f.get("bytes") or 0 for f in files) / 1048576:.1f} MB')
    for d in derived:
        print(f'  derived  {d}')
    if errs:
        print('  ✗ 失败：')
        for e in errs:
            print(f'    {e}')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
