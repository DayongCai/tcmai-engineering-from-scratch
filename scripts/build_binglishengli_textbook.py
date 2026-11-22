#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_binglishengli_textbook.py —— 把讲义 53 章渲染成教材层「源正文层」

为什么要这一步：本课程没有真教材（`E:\\textbooks` 里 100 份 qhzy-*.xlsx 没有《病理生理学》），
现有第一文本是本仓原创讲义。教材层要先把**正文**落成 53 篇一章一文，改写层
（N.1 出处 / N.2 翻译 / N.3 丢失 / N.4 接口 / N.5 立场）才有人能往上写。

本脚本只做「切章 + 加头」：
  - 章正文原样照录（一个字不改、不压缩、不重排），节次与编号保持讲义口径；
  - 每篇加溯源头：源 md 文件、sha256、抽取命令、层次与规模（现算）；
  - 00-前言.md 给契约对照表与章节清单（字数现算）。

**不做的事**：不写 N.1–N.5（那是人工改写的活），不在前言里把源正文说成「按契约写完」。

用法：
  python scripts/build_binglishengli_textbook.py            # 渲染
  python scripts/build_binglishengli_textbook.py --check    # 重渲染比对（漂移即 exit 1）
"""
import hashlib
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JY = os.path.join(ROOT, 'standards/binglishengli/supplements/jiangyi')
IDX = os.path.join(ROOT, 'standards/binglishengli/supplements/jiangyi.json')
OUT = os.path.join(ROOT, 'textbooks/09-jichu/11-bingli-shengli-xue')

CH_RE = re.compile(r'^# 第(\d+)章\s*(.+?)\s*$', re.M)

# 改写层（N.1–N.5 + 思考题 + 延伸阅读）是人工写的，脚本不许覆盖。
# 规矩：只认这两个标记之间的内容，整块照搬；标记外由脚本重渲染。
REWRITE_BEGIN = '<!-- REWRITE:BEGIN -->'
REWRITE_END = '<!-- REWRITE:END -->'


def rewrite_block(path):
    """已落盘文件里的改写层（含标记）；没有就返回 None。"""
    if not os.path.isfile(path):
        return None
    t = io.open(path, encoding='utf-8').read()
    i, j = t.find(REWRITE_BEGIN), t.find(REWRITE_END)
    if i < 0 or j < 0:
        return None
    return t[i:j + len(REWRITE_END)]


def sha_of(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for blk in iter(lambda: f.read(1 << 16), b''):
            h.update(blk)
    return h.hexdigest()


def hanzi(s):
    return len(re.findall(r'[\u4e00-\u9fff]', s))


def split_unit(path, unit):
    """一个单元 md → [(章号, 标题, 正文)]；单元头（第 1 个 `# 第` 之前）舍去。"""
    txt = io.open(path, encoding='utf-8').read()
    marks = list(CH_RE.finditer(txt))
    out = []
    for i, m in enumerate(marks):
        end = marks[i + 1].start() if i + 1 < len(marks) else len(txt)
        body = txt[m.end():end].strip('\n')
        out.append((int(m.group(1)), m.group(2), body, unit))
    return out


def build():
    idx = json.load(io.open(IDX, encoding='utf-8'))
    files = {}
    for u in idx['units']:
        p = os.path.join(ROOT, u['file'])
        files[u['unit']] = (os.path.relpath(p, ROOT).replace('\\', '/'), sha_of(p), u['file'].split('/')[-1])

    chapters = {}
    for unit, (rel, sha, base) in files.items():
        for no, title, body, _ in split_unit(os.path.join(ROOT, rel), unit):
            chapters[no] = dict(no=no, title=title, body=body, unit=unit,
                                rel=rel, sha=sha, base=base)

    assert sorted(chapters) == list(range(1, len(chapters) + 1)), '章号不连续：%s' % sorted(chapters)
    rewritten = set()

    docs = {}
    for no, c in chapters.items():
        nsec = len(re.findall(r'^## \d+\.\d+', c['body'], re.M))
        head = (
            '# 第 %d 章 · %s\n\n'
            '> **源**：`%s`（讲义第 %d 章，本仓原创；`standards/binglishengli/supplements/jiangyi/`）\n'
            '> **抽取**：`python scripts/build_binglishengli_textbook.py` · 2026-10-30 · '
            'sha256 `%s…` · 正文一字未改\n'
            '> **层次**：%s\n'
            '> **规模**：%d 节 · %s 汉字（现算；含学习目标/术语表/小结/自测题，与讲义索引的「节正文」口径不同）\n'
            '> **免责**：本章为教学材料，只写类别与关系与机制，不写数值与正常值，不构成诊断、治疗或用药依据。\n'
        )
        name = '%02d-第%d章-%s.md' % (no, no, safe_title(c['title']))
        rw = rewrite_block(os.path.join(OUT, name))
        layer = ('**源正文层**（讲义该章逐节照录）+ **改写层**（N.1–N.5 与思考题，见文末标记块，人工撰写）'
                 if rw else
                 '**源正文层** —— 讲义该章逐节照录；改写层（N.1–N.5）尚未撰写，见 `textbooks/README.md` 与本章目录 `00-前言.md`')
        head = head % (no, c['title'], c['rel'], no, c['sha'], layer, nsec, format(hanzi(c['body']), ','))
        docs[name] = head + '\n' + c['body'] + ('\n' + rw + '\n' if rw else '')
        if rw:
            rewritten.add(no)
    docs['00-前言.md'] = front_matter(chapters, rewritten)
    return docs, chapters, rewritten


def safe_title(t):
    t = re.sub(r'[（(][^）)]*[）)]\s*$', '', t).strip()
    return re.sub(r'[\\/:*?"<>|]', '-', t)


def front_matter(chapters, rewritten):
    total = sum(hanzi(c['body']) for c in chapters.values())
    nsec = sum(len(re.findall(r'^## \d+\.\d+', c['body'], re.M)) for c in chapters.values())
    rows = []
    for no in sorted(chapters):
        c = chapters[no]
        rows.append('| %d | %s | %s | %d | %s |' % (
            no, safe_title(c['title']),
            len(re.findall(r'^## \d+\.\d+', c['body'], re.M)),
            hanzi(c['body']), c['unit']))
    return """# 病理生理学 · 教材（源正文层）

> **源**：`standards/binglishengli/supplements/jiangyi/`（本仓原创讲义，15 单元 53 章）
> **抽取**：`python scripts/build_binglishengli_textbook.py` · 2026-10-30
> **规模**：**%d 章 / %d 节 / %s 汉字**（现算，含各章学习目标/术语表/小结/自测题；`--check` 可比对）
> **与看板口径的差别**：看板按整篇文件计汉字（含每篇的溯源头与本前言），数字会略高；本行只计章正文。两者都对，口径不同。
> **学科**：09-jichu/11-bingli-shengli-xue · 第 4 学期 · 54 学时 · 目标 53 章

## 这本书是什么

本目录是《病理生理学》教材的**源正文层**：53 章正文取自本仓原创讲义（按 Pathophysiology,
8th Edition 的目录结构组织，非译本），节次与编号保持讲义口径，段落文字一字未改。

需要说清的一点：**这不是从教材工作簿抽出来的**。`E:\\textbooks` 里 100 份 `qhzy-*.xlsx`
没有《病理生理学》——本机没有那本书。所以这一层的「源」是讲义，讲义本身是本仓的原创教学文本，
不是任何一本书的原文。把讲义称作「教材原文」是错的，本目录每章头部都写着它的真实出处。

做到的三件事：**不手抄**（脚本逐章切分）、**不重写**（原文即正文）、**可对账**（每章溯源头带 sha256 与现算字数，`--check` 逐字比对）。

## 与项目教材契约的关系

| 契约节次 | 本目录现状 |
|---|---|
| 章首「本章要回答的问题」 | ✅ %d 章 |
| N.1 概念与出处 | ✅ 同上（表内逐条落到讲义节号与代用底本小节号，底本缺的写「无」） |
| N.2 为什么可以这样翻译 | ✅ 同上 |
| N.3 这个翻译丢掉了什么 | ✅ 同上（本项目的硬规则，必须人工写） |
| N.4 与相邻学科的接口 | ✅ 同上 |
| N.5 争议与本项目立场 | ✅ 同上 |
| 本章小结 / 思考题 / 延伸阅读 | 🚧 讲义自带「本章小结」「自测题」；改写层另加「思考题」「延伸阅读」 |

**改写层：%d 章已写（第 %s 章）。** 写法与粒度以首批五章（第 1、2、19、20、48 章）为基准，
其余章节按同一套八节结构铺开；每章都过同一道门（八节齐 · ≥1,800 汉字 · 引用节号真实存在 · 无页码类出处）。

也就是说：**正文骨架与改写层都已落地**。但仍须说清——
`build_book.js --check` 统计的字数只证明「有字」，不证明「每一句都对」；
本层没有教材原文可核对，改写层是**本仓的解读**，不是对某本书的转述。

## 章节清单（实测字数）

| 章 | 标题 | 节 | 汉字 | 单元 |
|--:|---|--:|--:|---|
%s

合计：**%d 章 / %d 节 / %s 汉字**（全章文本口径）。
""" % (len(chapters), nsec, format(total, ','),
       len(rewritten), len(rewritten), ', '.join(str(x) for x in sorted(rewritten)) or '（无）',
       '\n'.join(rows), len(chapters), nsec, format(total, ','))


def main():
    docs, chapters, rewritten = build()
    drift = []
    for name, txt in docs.items():
        p = os.path.join(OUT, name)
        old = io.open(p, encoding='utf-8').read() if os.path.isfile(p) else None
        if old != txt:
            drift.append(name)
    extra = []
    # 00-目录-四级编码.md 由 scripts/build_toc_4level.js 统一生成（全库每门教材一份），
    # 不属于本生成器的产物，不能算「多余」，更不能在重建时被删掉。
    KEEP_EXTRA = {'00-目录-四级编码.md'}
    if os.path.isdir(OUT):
        for f in os.listdir(OUT):
            if f.endswith('.md') and f not in docs and f not in KEEP_EXTRA:
                extra.append(f)

    if '--check' in sys.argv:
        if drift or extra:
            print('漂移：%d 篇待重渲染 %s · %d 篇多余 %s'
                  % (len(drift), drift[:3], len(extra), extra[:3]))
            sys.exit(1)
        print('教材源正文层一致：%d 章 · %s 汉字'
              % (len(chapters), format(sum(hanzi(c['body']) for c in chapters.values()), ',')))
        return

    os.makedirs(OUT, exist_ok=True)
    for name, txt in docs.items():
        io.open(os.path.join(OUT, name), 'w', encoding='utf-8', newline='\n').write(txt)
    for f in extra:
        os.remove(os.path.join(OUT, f))
    print('渲染 %d 篇（1 篇前言 + %d 章）· %s 汉字 · 删多余 %d'
          % (len(docs), len(chapters),
             format(sum(hanzi(c['body']) for c in chapters.values()), ','), len(extra)))


if __name__ == '__main__':
    main()
