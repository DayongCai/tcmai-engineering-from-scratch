#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""standards/yaoli/底本.json —— 从 qhzy-药理学.xlsx 抽出 49 章 / 196 节 / 588 小节的正文。

为什么要单独落一份 JSON：
  1. 章的正文（docs/zh.md）要引「教材·药理学·第N章·M.K」，门必须能验这个节号真实存在、
     而且「…」里的引语能在该小节原文里逐字找到 —— 每次去读 1.7 MB 的 xlsx 太慢；
  2. 底本一改（换版/补校），只要重跑本脚本，sha256 就会告警，免得引文悄悄指空。

表结构（实测，9 篇 49 章）：
  每个「NN 章名」表里，一行 = 一节 / 一小节 / 一段，靠列位区分：
    列2=节序号、列3=小节序号、列4=段序号、列5=内容。
  段序号为 1 的那行是**写作约束**（"只写药物的分类与代表药…不写品名与厂商…"），
  段序号为 11 的那行才是正文（以【学习目标】开头）。两者分开存，不混进 body。
"""
import hashlib
import io
import json
import os
import re

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = r'E:/textbooks/qhzy-药理学.xlsx'
OUT_DIR = os.path.join(ROOT, 'standards', 'yaoli')
OUT = os.path.join(OUT_DIR, '底本.json')

HAN = re.compile(r'[\u4e00-\u9fff]')
# 量值：数字 + 单位（剂量/浓度/时间）。药理学底本带剂量，所以这一门走「B 支」。
VALUE = re.compile(r'\d+(?:\.\d+)?\s*(?:mg|μg|ug|g|kg|ml|mL|L|mmol|mol|μmol|IU|U|h|min|mmHg|kPa|℃|°C|%|次|片|支|滴|单位|小时|分钟|天|日|周)')


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def cells_of(row):
    return [(str(x).strip() if x is not None else '') for x in (list(row) + [''] * 5)[:5]]


def main():
    wb = openpyxl.load_workbook(SRC, read_only=True)
    chapters = []
    for name in wb.sheetnames:
        m = re.match(r'^(\d{2}) (.+)$', name)
        if not m:
            continue
        no = int(m.group(1))
        ws = wb[name]
        chap = {'no': no, 'title': '第%d章 %s' % (no, m.group(2).strip()), 'sheet': name,
                'secs': [], 'counts': {'secs': 0, 'subs': 0, 'paras': 0, 'hanzi': 0}}
        cur_sec = None
        cur_sub = None
        for row in ws.iter_rows(values_only=True):
            c1, c2, c3, seg, content = cells_of(row)
            if c2 and re.match(r'^\d+\.\d+ ', content):
                cur_sec = {'no': content.split(' ')[0], 'title': content, 'subs': []}
                chap['secs'].append(cur_sec)
                cur_sub = None
                continue
            if c3 and re.match(r'^\d+\.\d+\.\d+ ', content):
                if cur_sec is None:
                    continue
                cur_sub = {'no': content.split(' ')[0], 'title': content, 'brief': '', 'body': ''}
                cur_sec['subs'].append(cur_sub)
                continue
            if cur_sub is None or not seg.isdigit() or not content:
                continue
            if seg == '1':
                # 写作约束行：只留约束句本身，不把它当正文
                cur_sub['brief'] = content
            else:
                body = re.sub(r'^\d+(\.\d+){3}\s*', '', content)
                cur_sub['body'] = (cur_sub['body'] + '\n' + body).strip() if cur_sub['body'] else body
        for s in chap['secs']:
            for u in s['subs']:
                chap['counts']['subs'] += 1
                chap['counts']['hanzi'] += len(HAN.findall(u['body']))
                chap['counts']['paras'] += max(1, len([p for p in u['body'].split('\n') if p.strip()]))
        chap['counts']['secs'] = len(chap['secs'])
        chap['counts']['valueLike'] = sum(
            len(VALUE.findall(u['body'])) for s in chap['secs'] for u in s['subs'])
        chapters.append(chap)

    chapters.sort(key=lambda c: c['no'])
    doc = {
        'source': {
            'file': SRC,
            'sha256': sha256(SRC),
            'bytes': os.path.getsize(SRC),
            'title': '药理学（qhzy-药理学.xlsx · 9 篇 49 章 196 节 588 小节）',
            'note': '段序号=1 的行是写作约束（brief），段序号>1 的行是正文（body）；两者分列存放。',
        },
        'counts': {
            'chapters': len(chapters),
            'secs': sum(c['counts']['secs'] for c in chapters),
            'subs': sum(c['counts']['subs'] for c in chapters),
            'paras': sum(c['counts']['paras'] for c in chapters),
            'hanzi': sum(c['counts']['hanzi'] for c in chapters),
            # 全书量值数：>0 表示这是「带数值的教材」，课程正文走 B 支（引文行放行、裸写照拦）
            'valueLike': sum(c['counts']['valueLike'] for c in chapters),
        },
        'chapters': chapters,
    }
    os.makedirs(OUT_DIR, exist_ok=True)
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(
        json.dumps(doc, ensure_ascii=False, indent=1) + '\n')
    print('写出 %s' % os.path.relpath(OUT, ROOT))
    print('  %d 章 · %d 节 · %d 小节 · %d 汉字' % (
        doc['counts']['chapters'], doc['counts']['secs'], doc['counts']['subs'], doc['counts']['hanzi']))
    empty = [(c['no'], u['no']) for c in chapters for s in c['secs'] for u in s['subs'] if not u['body']]
    print('  正文为空的小节: %d' % len(empty))
    if empty:
        print('   前 10:', empty[:10])


if __name__ == '__main__':
    main()
