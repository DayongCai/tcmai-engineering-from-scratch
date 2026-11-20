# -*- coding: utf-8 -*-
"""把某门课的单元层（standards/<x>/units.json）编成教材稿 textbooks/<dept>/<slug>/。

为什么不另写：这门课是合成课（units 已是逐字语料），教材稿只做「按章编排 + 加标题层级」，
正文一字不改；任何改写都会让教材与单元层两套口径漂移，而这正是本仓最忌讳的。

用法：
  python scripts/build_textbook_from_units.py 07-zhineng 01-yixue-rengong-zhineng-daolun [--check]
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HANZI = re.compile(r'[\u4e00-\u9fff]')


def load_json(p):
    return json.load(io.open(p, encoding='utf-8'))


def safe(name):
    return re.sub(r'[\\/:*?"<>|]', '·', name).strip()


def main():
    dept, slug = sys.argv[1], sys.argv[2]
    check = '--check' in sys.argv
    bare = re.sub(r'^\d{2}-', '', slug)
    std = os.path.join(ROOT, 'standards', bare, 'units.json')
    if not os.path.exists(std):
        std = os.path.join(ROOT, 'standards', slug, 'units.json')
    U = load_json(std)
    units = U['units']

    by_ch = {}
    for u in units:
        by_ch.setdefault(int(u['chapter']), []).append(u)

    course = load_json(os.path.join(ROOT, 'departments', dept, slug, 'chapters.json'))
    titles = {int(c.get('n') or c.get('num')): c.get('title', '') for c in course['chapters']}

    outdir = os.path.join(ROOT, 'textbooks', dept, slug)
    files = {}

    # 前言
    total = len(units)
    hanzi = sum(len(HANZI.findall(u.get('body') or '')) for u in units)
    files['00-前言.md'] = f"""# 前言

本教材稿由 `standards/{os.path.basename(os.path.dirname(std))}/units.json` 逐字编排：{len(by_ch)} 章 · {total} 单元 · {hanzi:,} 汉字。
编排只做两件事——按章归拢、加标题层级；正文一字不改，locator 保留「教材·第N章·N.M.K」，可逐条回查单元层。

> 口径：本课为合成课（无独立出版社教材），语料来自既有单元层；教材稿与教学稿（chapters/<章>/docs/zh.md）是两条线，字数不相加。
"""

    for ch in sorted(by_ch):
        title = titles.get(ch) or by_ch[ch][0].get('chapterTitle') or f'第{ch}章'
        lines = [f'# 第{ch}章 {title}', '',
                 f'> 本章 {len(by_ch[ch])} 单元 · {sum(len(HANZI.findall(u.get("body") or "")) for u in by_ch[ch]):,} 汉字；'
                 f'正文逐字取自单元层「教材·第{ch}章」。', '']
        cur_sec = None
        for u in sorted(by_ch[ch], key=lambda x: [int(p) for p in re.findall(r'\d+', x.get('secNo', '0'))[:3]] or [0]):
            sec_no = u.get('secNo') or ''
            sec_title = (u.get('sec') or '').strip()
            sec_key = '.'.join(sec_no.split('.')[:2]) if sec_no.count('.') >= 1 else sec_no
            if sec_key and sec_key != cur_sec:
                cur_sec = sec_key
                clean = bool(sec_title) and '／' not in sec_title and len(sec_title) <= 18
                if clean:
                    lines += [f'## {sec_key} {sec_title}', '']
            body = (u.get('body') or '').strip()
            if not body:
                continue
            ut = (u.get('title') or '').strip()
            if len(ut) > 18 or '／' in ut:
                ut = ''
            if ut:
                lines += [f'### {sec_no} {ut}', '']
            for para in [p.strip() for p in body.split('\n') if p.strip()]:
                lines += [para, '']
        lines += ['**边界声明：** 本章为教材稿，正文逐字取自单元层；不构成诊断或用药建议，数字口径以单元层为准。', '']
        files[f'{ch:02d}-第{ch}章-{safe(title)}.md'] = '\n'.join(lines)

    if check:
        bad = []
        for name, text in files.items():
            p = os.path.join(outdir, name)
            old = io.open(p, encoding='utf-8').read() if os.path.exists(p) else ''
            if old != text:
                bad.append(name)
        if bad:
            print(f'✗ {slug}：{len(bad)} 个文件与重算不一致（{bad[:3]}…）')
            return 1
        print(f'✓ {slug}：教材稿 {len(files)} 个文件一致')
        return 0

    os.makedirs(outdir, exist_ok=True)
    for name, text in files.items():
        io.open(os.path.join(outdir, name), 'w', encoding='utf-8', newline='\n').write(text)
    print(f'✓ 写 textbooks/{dept}/{slug}/：{len(files)} 个文件 · {len(by_ch)} 章 · {total} 单元 · {hanzi:,} 汉字')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
