#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/check_scaffold_paths.py —— 脚手架复制后的路径残留检查（10 秒，不用跑全量门）

用法：
  python scripts/check_scaffold_paths.py departments/02-zhongyao/05-zhongyao-jianding-xue
  python scripts/check_scaffold_paths.py                     # 扫全部已建章节

为什么要有这个脚本：
  复制脚手架改路径，本库已栽过四次——
    腧穴学：`'standards','jingluo','units.json'` 拆成三段，整串替换没命中；
    中药化学：SUBJ 多一层嵌套（departments/03-zhenjiu/02-zhongyao/…），目录照样建成；
    中药药剂学：`code/main.js` 头部注释仍指向上一门课的路径。
  三次都是「单章 node --test 全绿、test_chapter_code 报 10–12 个 fail」，
  而 test_chapter_code 跑一轮 2–3 分钟。本脚本只做一件事：找出**指向别处**的路径串。

判据（不看内容对不对，只看指向对不对）：
  0. 学科目录本身必须在 curriculum.json 登记的院系下——**目录建错院系时，扫哪边都是空的**（2026-11 中医护理学就这样漏过一次）；
  1. 章内的 .js / .md / .json 里出现 `departments/<院系>/<学科>`，必须等于本章所属学科；
  2. 出现 `standards/<目录>/`，必须在本学科的引用众数里被点名，否则视为上一门课的残留；
     例外只有两类：`materials`（全库共享），以及 `standards/__crossrefs.json` 里**显式登记**的跨课引用；
  3. 出现 `<旧 slug>`（本章 slug 之外、但同目录下存在的另一个 slug）同样报出。

跨课引用要显式登记，不靠猜：
  `standards/__crossrefs.json` 形如 {"01-zhongyi/10-zhongyi-neike-xue": {"fangji": "第 13 章证方疗效按方剂库现算"}}
  —— 每条都要写理由。合法引用登记后放行；未登记的一律按残留报出。
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEPT_RE = re.compile(r"departments[/\\]([0-9]{2}-[a-z-]+)[/\\]([0-9]{2}-[a-z-]+)")
STD_RE = re.compile(r"standards[/\\]([a-z0-9-]+)")
SKIP = {'.git', 'node_modules'}
SHARED = {'materials'}  # 全库共享资源（内经全文等），任何学科都可引用
CROSSREFS_FILE = os.path.join(ROOT, 'standards', '__crossrefs.json')
CURRICULUM = os.path.join(ROOT, 'curriculum.json')


def registry():
    """curriculum.json 的学科归属：{学科目录名: 院系目录名}。

    为什么要有这一条：门只看「章内文件里写的路径对不对」，看不到「这个学科目录本身建错了院系」。
    2026-11 建中医护理学时，`scaffold_*` 把 SUBJ 写成 `departments/02-zhongyao/24-zhongyi-huli-xue`，
    `makedirs` 照样建目录、18 章单测照样全绿——**门扫的是 `05-huli/24-…`，那里当时是空的，所以报「无残留」**。
    """
    if not os.path.exists(CURRICULUM):
        return {}
    try:
        cur = json.load(open(CURRICULUM, encoding='utf-8'))
    except (ValueError, OSError):
        return {}
    reg = {}
    for dep in cur.get('departments', []):
        for sub in dep.get('subjects', []):
            if isinstance(sub, (list, tuple)) and sub:
                reg[str(sub[0])] = dep['slug']
    return reg


def crossrefs(dept_rel):
    """显式登记的跨课引用：{dept: {standards目录: 理由}}。未登记的 standards 目录一律按残留报出。"""
    if not os.path.exists(CROSSREFS_FILE):
        return set()
    try:
        data = json.load(open(CROSSREFS_FILE, encoding='utf-8'))
    except (ValueError, OSError):
        return set()
    return set(data.get(dept_rel, {}).keys())


def own_standards(dept_dir):
    """本学科使用的 standards 目录：以章内引用次数的众数为准，元数据只作补足。

    为什么不用元数据作准：新建课的 meta.json 常带着上一门课的 `standards/materials` 共享资源，
    照它判定会把本课真正用的目录（如 standards/zhongyao-yaoji）全判成残留。
    残留只会是少数，众数不会被残留带偏；元数据点名的目录若引用次数不低于众数的 20%，视为共享资源一并放行。
    """
    from collections import Counter
    cnt = Counter()
    for dirpath, dirnames, filenames in os.walk(dept_dir):
        dirnames[:] = [d for d in dirnames if d not in SKIP]
        for fn in filenames:
            if not fn.endswith(('.js', '.md', '.json')):
                continue
            try:
                text = open(os.path.join(dirpath, fn), encoding='utf-8').read()
            except (UnicodeDecodeError, OSError):
                continue
            cnt.update(STD_RE.findall(text))
    if not cnt:
        return set()
    top_name, top_n = cnt.most_common(1)[0]
    named = set()
    for fn in ('chapters.json', 'meta.json', 'README.md'):
        p = os.path.join(dept_dir, fn)
        if os.path.exists(p):
            named |= set(STD_RE.findall(open(p, encoding='utf-8').read()))
    return {top_name} | SHARED | named


def scan(dept_rel):
    dept_abs = os.path.join(ROOT, dept_rel.replace('/', os.sep))
    if not os.path.isdir(dept_abs):
        sys.exit(f'目录不存在：{dept_rel}')
    own = f"{os.path.basename(os.path.dirname(dept_abs))}/{os.path.basename(dept_abs)}"
    own = own.replace(os.sep, '/')
    stds = own_standards(dept_abs)
    allowed = stds | crossrefs(own)
    bad = []
    # 断言 0：学科目录必须落在 curriculum.json 登记的院系下
    reg = registry()
    slug = os.path.basename(dept_abs)
    parent = os.path.basename(os.path.dirname(dept_abs))
    if slug in reg and reg[slug] != parent:
        bad.append((dept_rel, 'departments', f'{parent}/{slug} 建错院系（登记在 {reg[slug]}）'))
    elif slug not in reg:
        bad.append((dept_rel, 'departments', f'{parent}/{slug} 未在 curriculum.json 登记'))
    for dirpath, dirnames, filenames in os.walk(dept_abs):
        dirnames[:] = [d for d in dirnames if d not in SKIP]
        for fn in filenames:
            if not fn.endswith(('.js', '.md', '.json', '.py', '.html')):
                continue
            p = os.path.join(dirpath, fn)
            try:
                text = open(p, encoding='utf-8').read()
            except (UnicodeDecodeError, OSError):
                continue
            rel = os.path.relpath(p, ROOT).replace(os.sep, '/')
            for a, b in DEPT_RE.findall(text):
                if f'{a}/{b}' != own:
                    bad.append((rel, 'departments', f'{a}/{b}'))
            for s in STD_RE.findall(text):
                if stds and s not in allowed:
                    bad.append((rel, 'standards', s))
    return own, stds, bad


def main():
    argv = [a for a in sys.argv[1:] if not a.startswith('--')]
    quiet = '--quiet' in sys.argv[1:]
    targets = argv or [
        os.path.relpath(os.path.join(d, 'chapters'), ROOT).replace(os.sep, '/')
        for d in [os.path.join(ROOT, 'departments', a, b)
                  for a in sorted(os.listdir(os.path.join(ROOT, 'departments'))) if os.path.isdir(os.path.join(ROOT, 'departments', a))
                  for b in sorted(os.listdir(os.path.join(ROOT, 'departments', a))) if os.path.isdir(os.path.join(ROOT, 'departments', a, b))]
    ]
    total = 0
    ok = 0
    for t in targets:
        dept = t[:-len('/chapters')] if t.endswith('/chapters') else t
        own, stds, bad = scan(dept)
        if bad:
            total += len(bad)
            print(f'✗ {own}  （自称 standards：{",".join(sorted(stds)) or "未声明"}）')
            for rel, kind, val in bad[:20]:
                print(f'    {rel}  →  {kind}/{val}')
            if len(bad) > 20:
                print(f'    …另有 {len(bad) - 20} 处')
        else:
            ok += 1
            if not quiet:
                print(f'✓ {own}')
    if total:
        print(f'\n共 {total} 处路径残留（{len(targets)} 个学科中 {ok} 个干净）：复制脚手架后忘改，先修再跑全量门。'
              if quiet else f'\n共 {total} 处路径残留：复制脚手架后忘改，先修再跑全量门。')
        sys.exit(1)
    print(f'\n路径无残留（{ok} 个学科全部通过）。' if quiet else '\n路径无残留。')


if __name__ == '__main__':
    main()
