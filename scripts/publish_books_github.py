#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""publish_books_github.py —— 把五卷教材 EPUB 发到 GitHub Release（只走 API）

    export GITHUB_TOKEN=***                       # fine-grained: Contents 读写 + Releases
    python scripts/publish_books_github.py --repo DayongCai/tcmai-engineering-from-scratch --tag books-v1
    python scripts/publish_books_github.py --dry-run     # 只打印计划，不发请求
    python scripts/publish_books_github.py --self-test    # 假响应跑通链路，一个字节都不外发

为什么和视频分开一个仓：
    媒体仓（tcm-course-media）放视频，本仓只放书。书的发布节奏跟视频完全不同（教材改一章就要重出），
    混在一个仓里会让两边的 tag 互相牵制。仓库里仍然**不放二进制**——EPUB 走 Release 附件，
    仓库只有 README 与清单，克隆依旧很快（GitHub 单文件 100 MB、仓库软上限 1 GB）。

与 publish_release_github.py 同一套失败语义：
    · 令牌缺失/无效 → 退出 2，不发任何请求；
    · 仓库不存在且未给 --create-repo → 退出 3；
    · Release 已存在 → 复用（不重造 tag），但补齐缺失附件；
    · 附件已存在且大小一致 → 跳过（幂等，重跑安全）；
    · 上传完**回读** release，逐个核 name/size，缺一个就退出 1。
"""

import argparse
import hashlib
import json
import os
import sys
import urllib.error
import urllib.request

API = 'https://api.github.com'
UPLOAD_HOST = 'https://uploads.github.com'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

_FAKE = {'on': False, 'assets': []}


def die(code, msg):
    print('✗ ' + msg)
    sys.exit(code)


def sha256_of(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def _fake_req(method, url, token, data=None, extra_headers=None, raw_file=None, timeout=120):
    name = (url.split('name=')[1] if 'name=' in url else '')
    if method == 'GET' and '/releases/tags/' in url:
        if not _FAKE['assets']:
            return 404, {'error': 'Not Found'}
        return 200, {'html_url': 'https://example.invalid/books',
                     'assets': [{'name': n, 'size': s, 'id': i,
                                 'browser_download_url': f'https://example.invalid/{n}'}
                                for i, (n, s) in enumerate(_FAKE['assets'])]}
    if method == 'GET' and '/repos/' in url and url.count('/') == 5:
        return 404, {'error': 'Not Found'}
    if method == 'POST' and url.endswith('/user/repos'):
        return 201, {'full_name': 'DayongCai/tcmai-engineering-from-scratch'}
    if method == 'POST' and '/releases' in url and 'assets' not in url:
        return 201, {'upload_url': UPLOAD_HOST + '/repos/x/y/releases/1/assets{?name,label}', 'assets': []}
    if method == 'POST' and '/assets' in url:
        _FAKE['assets'].append((name, os.path.getsize(raw_file)))
        return 201, {'name': name}
    return 200, {}


def req(method, url, token, data=None, extra_headers=None, raw_file=None, timeout=180):
    if _FAKE['on']:
        return _fake_req(method, url, token, data, extra_headers, raw_file, timeout)
    headers = {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'tcmai-books-publisher',
    }
    if extra_headers:
        headers.update(extra_headers)
    body = None
    if data is not None:
        body = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    if raw_file is not None:
        headers['Content-Type'] = 'application/octet-stream'
        headers['Content-Length'] = str(os.path.getsize(raw_file))
        body = open(raw_file, 'rb')
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as resp:
            payload = resp.read()
            return resp.status, (json.loads(payload) if payload else None)
    except urllib.error.HTTPError as e:
        return e.code, {'error': e.read().decode('utf-8', 'replace')[:400]}
    finally:
        if raw_file is not None:
            body.close()


def read_token(token_file):
    token = os.environ.get('GITHUB_TOKEN') or os.environ.get('GH_TOKEN')
    if token:
        return token.strip()
    path = token_file or os.path.join(ROOT, '.github-token')
    if os.path.exists(path):
        return open(path, encoding='utf-8').read().strip()
    die(2, '缺令牌：export GITHUB_TOKEN，或把 fine-grained PAT（Contents+Releases 读写）'
           '存到仓库根 .github-token（已 gitignore）。')


def collect(books_dir):
    series_path = os.path.join(books_dir, 'series.json')
    if not os.path.exists(series_path):
        die(1, f'缺 {series_path} —— 先跑: node textbooks/build_book.js --all --epub')
    series = json.load(open(series_path, encoding='utf-8'))
    assets = []
    for v in series['volumes']:
        for fmt in ('epub', 'pdf'):
            rel = v['artifacts'].get(fmt)
            if not rel:
                if fmt == 'epub':
                    die(1, f'第 {v["n"]} 卷没登记 EPUB —— 先重跑 --all --epub')
                continue
            p = os.path.join(ROOT, rel)
            if not os.path.exists(p):
                if fmt == 'pdf':
                    continue      # PDF 是可选的（需要 xelatex），缺了不算错
                die(1, f'第 {v["n"]} 卷 EPUB 不在盘上: {rel}')
            assets.append({
                'name': os.path.basename(p),
                'path': p,
                'bytes': os.path.getsize(p),
                'sha256': sha256_of(p),
                'format': fmt,
                'volume': v['n'],
                'chapters': v['chapters'],
                'words': v['words'],
            })
    manifest = os.path.join(books_dir, 'books-series.json')
    with open(manifest, 'w', encoding='utf-8') as f:
        json.dump({'schema': 'tcm-books-release-manifest/1', 'series': series['series'],
                   'totals': series['totals'],
                   'volumes': [{k: a[k] for k in ('name', 'format', 'volume', 'chapters', 'words', 'bytes', 'sha256')}
                               for a in assets]}, f, ensure_ascii=False, indent=2)
    assets.append({'name': 'books-series.json', 'path': manifest,
                   'bytes': os.path.getsize(manifest), 'sha256': sha256_of(manifest)})
    return series, assets


def release_body(series, assets):
    by_vol = {}
    for a in assets:
        if 'volume' not in a:
            continue
        by_vol.setdefault(a['volume'], {'chapters': a['chapters'], 'words': a['words']})[a['format']] = a
    rows = []
    for vol in sorted(by_vol):
        cells = by_vol[vol]
        epub = cells.get('epub')
        pdf = cells.get('pdf')
        rows.append(
            f"| {vol} | {cells['chapters']} | {cells['words']:,} | "
            f"{('%.1f MB' % (epub['bytes'] / 1048576)) if epub else '—'} | "
            f"{('%.1f MB / %s' % (pdf['bytes'] / 1048576, pdf['name'])) if pdf else '—'} |"
        )
    total = sum(a['bytes'] for a in assets)
    return f"""# 《{series['series']}》五卷本 · EPUB + PDF

教材正文不入此仓，二进制只作为 Release 附件。仓库里只有清单与说明。

| 卷 | 章 | 字 | EPUB | PDF |
|---:|---:|---:|---:|---|
{chr(10).join(rows)}

合计 **{series['totals']['chapters']} 章 / {total / 1048576:.1f} MB**。

## 怎么读

- **EPUB**：任何 EPUB 阅读器（Apple Books / Calibre / 微信读书 / KOReader）直接打开，可重排、可调字号；
  卷内结构为 卷首说明 → 院系部页 → 学科页 → 前置 / 章 / 附录，封面上的章数与字数是**出书时实测**。
- **PDF**：固定版式，适合打印与引用。卷一 7,178 页、卷二 5,593、卷三 6,186（单卷体量大，建议按院系分册阅读的需求后续再出）。

`books-series.json` 是逐卷 sha256 与章数的机器清单，便于校验下载完整性。

## 重新出书

```bash
node textbooks/build_book.js --all --epub --pdf   # 需要 pandoc + xelatex
node textbooks/build_book.js --publish-check      # zip 结构 / 目录 / 章数 / 封面 四项校核
python scripts/publish_books_github.py --repo DayongCai/tcmai-engineering-from-scratch --tag books-v1
```

> 本教材仅用于教育与科研，不构成临床诊疗建议。
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--repo', default='DayongCai/tcmai-engineering-from-scratch', help='owner/repo（默认主仓：公开，附件匿名可下）')
    ap.add_argument('--tag', default='books-v1')
    ap.add_argument('--books-dir', default=os.path.join(ROOT, 'textbooks', 'build'))
    ap.add_argument('--create-repo', action='store_true', help='仓库不存在时创建（私有）')
    ap.add_argument('--token-file')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--self-test', action='store_true', help='假响应跑通链路，不发任何请求')
    args = ap.parse_args()

    if args.self_test:
        _FAKE['on'] = True

    series, assets = collect(args.books_dir)
    total = sum(a['bytes'] for a in assets)
    print(f"═══ 教材发布 · {args.repo} · {args.tag} ═══\n")
    for a in assets:
        print(f"  {a['name']:<28} {a['bytes'] / 1048576:6.1f} MB  sha256 {a['sha256'][:16]}…")
    print(f"\n  合计 {len(assets)} 个附件 / {total / 1048576:.1f} MB / {series['totals']['chapters']} 章")

    if args.dry_run:
        print('\n[dry-run] 不发任何请求。')
        return

    token = read_token(args.token_file)
    owner, _, name = args.repo.partition('/')

    code, _ = req('GET', f'{API}/repos/{args.repo}', token)
    if code == 404:
        if not args.create_repo:
            die(3, f'仓库 {args.repo} 不存在；加 --create-repo 或用 --repo 指定已有仓')
        code, payload = req('POST', f'{API}/user/repos', token,
                           {'name': name, 'private': True,
                            'description': '《中医药 · 从零工程》五卷教材 EPUB 发布仓（二进制只在 Release 附件）'})
        if code not in (200, 201):
            die(1, f'建仓失败 {code}: {payload}')
        print(f'  ✓ 已创建私有仓 {args.repo}')
    elif code not in (200, 304):
        die(1, f'读仓失败 {code}: {payload if code != 304 else ""}')

    code, rel = req('GET', f'{API}/repos/{args.repo}/releases/tags/{args.tag}', token)
    if code == 200:
        upload_url = None
        existing = {a['name']: a for a in rel.get('assets', [])}
        print(f'  ↷ Release {args.tag} 已存在，复用并补齐附件（已有 {len(existing)} 个）')
    else:
        code, rel = req('POST', f'{API}/repos/{args.repo}/releases', token, {
            'tag_name': args.tag,
            'name': f'《{series["series"]}》五卷本 EPUB（{series["totals"]["chapters"]} 章）',
            'body': release_body(series, assets),
            'draft': False,
            'prerelease': False,
        })
        if code not in (200, 201):
            die(1, f'建 Release 失败 {code}: {rel}')
        existing = {}
        print(f'  ✓ 已创建 Release {args.tag}')

    upload_url = rel.get('upload_url') or ''
    base = upload_url.split('{')[0] if upload_url else f'{UPLOAD_HOST}/repos/{args.repo}/releases/{rel["id"]}/assets'

    for a in assets:
        have = existing.get(a['name'])
        if have and have.get('size') == a['bytes']:
            print(f'  ↷ {a["name"]} 已存在且大小一致，跳过')
            continue
        if have:
            req('DELETE', f'{API}/repos/{args.repo}/releases/assets/{have["id"]}', token)
            print(f'  ✗ {a["name"]} 旧附件大小不符，已删除后重传')
        code, payload = req('POST', f'{base}?name={a["name"]}', token, raw_file=a['path'],
                           extra_headers={'Content-Type': 'application/epub+zip'
                                          if a['name'].endswith('.epub') else 'application/json'})
        if code not in (200, 201):
            die(1, f'上传 {a["name"]} 失败 {code}: {payload}')
        print(f'  ↑ {a["name"]} {a["bytes"] / 1048576:.1f} MB')

    # 回读：上传完不算发完，逐个核 name + size
    code, rel = req('GET', f'{API}/repos/{args.repo}/releases/tags/{args.tag}', token)
    if code != 200:
        die(1, f'回读 Release 失败 {code}')
    got = {a['name']: a['size'] for a in rel.get('assets', [])}
    missing = [a['name'] for a in assets if got.get(a['name']) != a['bytes']]
    if missing:
        die(1, f'回读缺附件或大小不符: {missing}')
    print(f'\n✅ 已发布 {args.repo} · {args.tag} · {len(assets)} 个附件 / {total / 1048576:.1f} MB')
    print(f'   {rel.get("html_url", "")}')

    out = {
        'schema': 'tcm-books-release/1',
        'repo': args.repo,
        'tag': args.tag,
        'url': rel.get('html_url'),
        'assets': [{'name': a['name'], 'bytes': a['bytes'], 'sha256': a['sha256']} for a in assets],
        'downloadBase': f'https://github.com/{args.repo}/releases/download/{args.tag}/',
    }
    if _FAKE['on']:
        print('   [self-test] 不写 books-release.json（假 URL 不该落到成品目录）')
        return
    with open(os.path.join(args.books_dir, 'books-release.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f'   清单: textbooks/build/books-release.json')


if __name__ == '__main__':
    main()
