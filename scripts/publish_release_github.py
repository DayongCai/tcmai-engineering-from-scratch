#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""publish_release_github.py —— 把媒体包发到 GitHub Release（只走 API，不需要 github.com）

    export GITHUB_TOKEN=...            # fine-grained: Releases + Contents 读写
    python scripts/publish_release_github.py --repo DayongCai/tcm-course-media --tag media-v1
    python scripts/publish_release_github.py --dry-run          # 只打印计划，不发请求

为什么不用 gh：
    本机 github.com 被连接重置（2026-11-01 实测：github.com 超时 / Connection reset），
    而 gh 的网页登录（device flow）走的就是 github.com/login/device/code —— 直接失败。
    但 api.github.com 与 uploads.github.com 是通的，所以整条发布链路只走 API 即可。

为什么不把 6.56 GB 提交进仓库：
    GitHub 单文件 100 MB 上限、仓库体积软上限 1 GB。媒体只能作为 Release 附件，
    仓库里只放清单（index.json / publish.json / README），这样克隆仓库仍然很快。

失败语义（都是"宁可停，不要发半个"）：
    · 令牌缺失/无效 → 立刻退出 2，不发任何请求；
    · 仓库不存在且未给 --create-repo → 退出 3，提示怎么建；
    · Release 已存在 → 复用（不重复建 tag），但仍会补齐缺失的附件；
    · 上传中断 → 下次重跑会跳过已存在且大小一致的附件（幂等）。
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request

API = 'https://api.github.com'
# --self-test 时把 req() 换成假的：验证「仓库→README→Release→上传→回读」这条链路，
# 一个字节都不往外发。没有令牌也能证明脚本逻辑是对的。
_FAKE = {'on': False, 'calls': [], 'assets': []}
UPLOAD_HOST = 'https://uploads.github.com'


def die(code, msg):
    print('✗ ' + msg)
    sys.exit(code)


def _fake_req(method, url, token, data=None, extra_headers=None, raw_file=None, timeout=120):
    name = (url.split('name=')[1] if 'name=' in url else '')
    _FAKE['calls'].append((method, url.split('?')[0], name))
    if '/repos/' in url and url.endswith('/releases/tags/media-v1') and method == 'GET':
        # 第一次读：不存在；上传后再读：全都在
        if len(_FAKE['assets']) < 13:
            return 404, {'error': 'Not Found'}
        return 200, {'html_url': 'https://example.invalid/release',
                     'assets': [{'name': n, 'size': sz, 'id': i,
                                 'browser_download_url': f'https://example.invalid/{n}'}
                                for i, (n, sz) in enumerate(_FAKE['assets'])]}
    if method == 'GET' and '/releases/tags/' in url:
        return 404, {'error': 'Not Found'}
    if method == 'GET' and '/contents/' in url:
        return 404, {'error': 'Not Found'}
    if method == 'GET' and url.endswith('/repos/DayongCai/tcm-course-media'):
        return 404, {'error': 'Not Found'}
    if method == 'POST' and url.endswith('/user/repos'):
        return 201, {'full_name': 'DayongCai/tcm-course-media'}
    if method == 'PUT' and '/contents/' in url:
        return 201, {'content': {}}
    if method == 'POST' and '/releases' in url and 'assets' not in url:
        return 201, {'upload_url': 'https://uploads.github.com/repos/x/y/releases/1/assets{?name,label}',
                     'assets': []}
    if method == 'POST' and '/assets' in url:
        import os as _os
        _FAKE['assets'].append((name, _os.path.getsize(raw_file)))
        return 201, {'name': name}
    return 200, {}


def req_retry(*args, tries=3, **kw):
    """包一层重试：本机到 api.github.com 会间歇性超时（实测约 1/3 概率），
    不带重试就会在 6.56 GB 传到一半时整体失败。"""
    last = None
    for i in range(tries):
        try:
            return req(*args, **kw)
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            last = e
            if i == tries - 1:
                break
            wait = 2 ** i
            print(f'    （网络错误 {type(e).__name__}，{wait}s 后重试 {i + 2}/{tries}）')
            time.sleep(wait)
    raise last


def req(method, url, token, data=None, extra_headers=None, raw_file=None, timeout=120):
    if _FAKE['on']:
        return _fake_req(method, url, token, data, extra_headers, raw_file, timeout)
    """发一个 API 请求。raw_file 给定时以流式上传（附件动辄 1.6 GB，不能读进内存）。"""
    headers = {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'tcmai-media-publisher',
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
        detail = e.read().decode('utf-8', 'replace')[:400]
        return e.code, {'error': detail}
    finally:
        if raw_file is not None:
            body.close()


def build_readme(bundle, tag):
    """给交付仓写的 README：说明"这里没有代码，视频在 Release 附件里"。"""
    rows = []
    for b in bundle['bundles']:
        for p in b['parts']:
            rows.append(f"| {b['course']} | {p['file']} | {p['bytes'] / 1048576:.0f} MB | {len(p['chapters'])} |")
    total_parts = sum(len(b['parts']) for b in bundle['bundles'])
    return f"""# 课程视频交付仓

**这里不放代码。** 6.56 GB 媒体作为 Release 附件发布，仓库里只有清单与说明，
这样克隆仍然很快（GitHub 单文件 100 MB、仓库软上限 1 GB）。

## 拿什么

- 在线播放（推荐）：APP 读 `index.json` → 每章 `master.m3u8`（HLS 两档 + 纯音频 + 字幕）。
  媒体包由 `platform/pipeline/build_hls.js` 生成，见源码仓的 `platform/MEDIA-DELIVERY.md`。
- 离线包：下载 Release `{tag}` 下的分卷，按章切分、互不重叠。

## 分卷

| 课程 | 分卷 | 体积 | 章 |
|---|---|---|--:|
{chr(10).join(rows)}

共 **{bundle['totalChapters']} 章 / {total_parts} 卷 / {bundle['totalBytes'] / 1073741824:.2f} GB**。

## 解压

```bash
tar -xf 12-yaoli-xue-v1-part-01.tar -C ./media
# 解出 09-jichu/12-yaoli-xue/<slug>/…，路径与 index.json 里一致
```

分卷 sha256 见 Release 附件里的 `bundle-index.json`。

## 播放要求

HLS 需要 `Range`（206）、`CORS`、正确的 MIME：

| 文件 | Content-Type |
|---|---|
| `.m3u8` | `application/vnd.apple.mpegurl` |
| `.m4s` | `video/iso.segment` |
| `.vtt` | `text/vtt; charset=utf-8` |

清单（m3u8/json）**不要按 Range 切片**返回 206，否则 ffmpeg 类播放器会判定"不是合法播放列表"。
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--repo', help='owner/repo')
    ap.add_argument('--tag', default='media-v1')
    ap.add_argument('--media-root', default=os.environ.get('HLS_ROOT', 'D:/tcm-media'))
    ap.add_argument('--release-root', default=os.environ.get('RELEASE_ROOT', 'D:/tcm-release'))
    ap.add_argument('--create-repo', action='store_true', help='仓库不存在时创建（私有）')
    ap.add_argument('--token-file', help='从文件读令牌（默认 .github-token）')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--self-test', action='store_true', help='用假响应跑通链路，不发任何请求')
    args = ap.parse_args()

    # 令牌三种给法（都不回显）：
    #   1) 环境变量 GITHUB_TOKEN / GH_TOKEN
    #   2) --token-file <路径>（默认读仓库根的 .github-token，已在 .gitignore 里）
    #   3) 都没有 → 退出 2
    token = os.environ.get('GITHUB_TOKEN') or os.environ.get('GH_TOKEN')
    if not token:
        tf = args.token_file or os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                                            '.github-token')
        if os.path.exists(tf):
            token = open(tf, encoding='utf-8').read().strip()
    bundle_index = os.path.join(args.release_root, 'bundle-index.json')
    if not os.path.exists(bundle_index):
        die(4, f'找不到 {bundle_index}（先跑 npm run media:pack）')
    bundle = json.load(open(bundle_index, encoding='utf-8'))

    assets = []
    for b in bundle['bundles']:
        for p in b['parts']:
            path = os.path.join(args.release_root, b['course'].replace('/', '__'), p['file'])
            if not os.path.exists(path):
                die(5, f'缺分卷文件：{path}')
            size = os.path.getsize(path)
            if size > 2 * 1024 ** 3:
                die(6, f'{p["file"]} 有 {size / 1073741824:.2f} GB，超过 GitHub 2 GB 上限')
            assets.append({'path': path, 'name': p['file'], 'bytes': size, 'sha256': p['sha256']})

    # 清单也一起发：APP 只读清单就能列出课程，不必先解压离线包
    extra = [bundle_index, os.path.join(args.media_root, 'index.json')]
    for b in bundle['bundles']:
        pj = os.path.join(args.media_root, b['course'], 'publish.json')
        if os.path.exists(pj):
            extra.append(pj)
    for path in extra:
        if not os.path.exists(path):
            continue
        name = ('index-global.json' if path.endswith(os.path.join('tcm-media', 'index.json')) else
                path.replace('\\', '/').split('/')[-2] + '-publish.json' if path.endswith('publish.json') else
                os.path.basename(path))
        assets.append({'path': path, 'name': name, 'bytes': os.path.getsize(path), 'sha256': None})

    total = sum(a['bytes'] for a in assets)
    print(f'准备发布：{len(assets)} 个附件 · {total / 1073741824:.2f} GB · tag {args.tag}')

    if args.dry_run:
        for a in assets:
            print(f'  {a["name"]:48s} {a["bytes"] / 1048576:9.1f} MB')
        print('（dry-run：未发任何请求）')
        return

    if args.self_test:
        _FAKE['on'] = True
        token = token or 'fake'
        print('（self-test：请求全部走假响应，不碰网络）')

    if not token:
        die(2, '没有令牌。这台机器连不上 github.com，网页登录不可用；'
               '请在能上网的地方建一个 fine-grained 令牌（Releases + Contents 读写），'
               '存到仓库根 .github-token（已 gitignore），或 export GITHUB_TOKEN。')
    if not args.repo or '/' not in args.repo:
        die(3, '需要 --repo owner/repo')

    # 1) 仓库是否存在
    status, info = req_retry('GET', f'{API}/repos/{args.repo}', token)
    if status == 404:
        if not args.create_repo:
            die(3, f'仓库 {args.repo} 不存在；加 --create-repo 自动建私有仓，或先手工建')
        name = args.repo.split('/')[1]
        status, info = req_retry('POST', f'{API}/user/repos', token,
                           {'name': name, 'private': True,
                            'description': '课程视频交付仓（媒体走 Release 附件，仓库只放清单）'})
        if status >= 300:
            die(3, f'建仓失败：{info}')
        print(f'✅ 已建私有仓 {info["full_name"]}')
    elif status >= 300:
        die(3, f'读仓库失败（{status}）：{info}')

    # 1.5) 仓库不要是空的：放一份 README（Contents API，同样不需要 github.com）
    status, rd = req_retry('GET', f'{API}/repos/{args.repo}/contents/README.md', token)
    if status == 404:
        readme = build_readme(bundle, args.tag)
        import base64
        status, res = req_retry('PUT', f'{API}/repos/{args.repo}/contents/README.md', token, {
            'message': 'docs: 媒体交付说明',
            'content': base64.b64encode(readme.encode('utf-8')).decode('ascii'),
        })
        if status >= 300:
            print(f'⚠ README 写入失败（{status}），不影响附件发布：{res}')
        else:
            print('✅ 已写入 README.md')

    # 2) Release：有就复用
    status, rel = req_retry('GET', f'{API}/repos/{args.repo}/releases/tags/{args.tag}', token)
    if status == 404:
        status, rel = req_retry('POST', f'{API}/repos/{args.repo}/releases', token, {
            'tag_name': args.tag,
            'name': f'课程视频 {args.tag}',
            'body': (f"{bundle['totalChapters']} 章 · "
                     f"{bundle['totalBytes'] / 1073741824:.2f} GB · "
                     f"{sum(len(b['parts']) for b in bundle['bundles'])} 卷\n\n"
                     '每卷按章切分、互不重叠；解压 `tar -xf <part>.tar -C <目录>`，'
                     '路径与 index.json 一致。分卷 sha256 见 parts.json / bundle-index.json。'),
            'draft': False,
            'prerelease': False,
        })
        if status >= 300:
            die(7, f'创建 Release 失败：{rel}')
        print(f'✅ 新建 Release {args.tag}')
    elif status >= 300:
        die(7, f'读 Release 失败（{status}）：{rel}')
    else:
        print(f'ℹ Release {args.tag} 已存在，复用（会补齐缺失附件）')

    existing = {a['name']: a for a in rel.get('assets', [])}
    upload_base = rel['upload_url'].split('{')[0]

    # 3) 逐个上传（幂等：同名且大小一致就跳过）
    for a in assets:
        have = existing.get(a['name'])
        if have and have.get('size') == a['bytes']:
            print(f'  · {a["name"]} 已在（{a["bytes"] / 1048576:.1f} MB），跳过')
            continue
        if have:
            req_retry('DELETE', f'{API}/repos/{args.repo}/releases/assets/{have["id"]}', token)
            print(f'  · {a["name"]} 旧附件大小不符，已删除重传')
        t0 = time.time()
        status, res = req_retry('POST', f'{upload_base}?name={urllib.request.quote(a["name"])}',
                                token, raw_file=a['path'], timeout=3600)
        if status >= 300:
            die(8, f'上传 {a["name"]} 失败（{status}）：{res}')
        dt = time.time() - t0
        rate = a['bytes'] / 1048576 / max(dt, 0.001)
        print(f'  ✅ {a["name"]} {a["bytes"] / 1048576:.1f} MB · {dt:.0f}s · {rate:.1f} MB/s')

    # 4) 回读确认（发布成功必须能看到附件，而不是"请求返回 200"）
    status, rel2 = req_retry('GET', f'{API}/repos/{args.repo}/releases/tags/{args.tag}', token)
    got = {x['name']: x for x in rel2.get('assets', [])}
    missing = [a['name'] for a in assets if a['name'] not in got]
    if missing:
        die(9, f'回读缺附件：{missing}')
    print(f'\n✅ 发布完成：{args.repo} {args.tag} · {len(got)} 个附件')
    print(f'   {rel2["html_url"]}')
    for a in assets:
        if a['name'].endswith('.tar'):
            print(f'   {got[a["name"]]["browser_download_url"]}')


if __name__ == '__main__':
    main()
