#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""standards/neike/底本.json —— 从 qhzy-中医内科学.xlsx 抽 12 章 / 节 / 小节 / 条目 正文。

为什么要单独落一份：
  1. 课程正文要引「教材·中医内科学·第N章·M.K」，门必须能验节号真实存在，
     且「…」里的引语能在该小节原文里逐字找到；
  2. 底本一换版，sha256 就会告警，免得引文悄悄指空。

表结构（实测，12 章）：
  列1=章、列2=节(4.1)、列3=小节(4.1.1)、列4=段序号、列5=内容。
  段序号=1 的行是**条目标题**（"4.1.1.1 概念与源流"），段序号=11 的行才是正文；
  一个 4.1.1 下面通常有 2–3 个 4.1.1.x 条目。
"""
import hashlib
import io
import json
import os
import re

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = r'E:/textbooks/qhzy-中医内科学.xlsx'
OUT_DIR = os.path.join(ROOT, 'standards', 'neike')
OUT = os.path.join(OUT_DIR, '底本.json')

HAN = re.compile(r'[\u4e00-\u9fff]')
# 中医剂量多为「钱/两/克/枚/片」，也会出现 g/mg；这一步只用于判定 A/B 支
VALUE = re.compile(r'\d+(?:\.\d+)?\s*(?:mg|μg|g|kg|ml|mL|L|克|钱|两|枚|片|粒|丸|剂|次|日|天|周|个月|年|小时|分钟)')


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
                'secs': [], 'counts': {'secs': 0, 'subs': 0, 'items': 0, 'paras': 0, 'hanzi': 0, 'valueLike': 0}}
        cur_sec = cur_sub = None
        for row in ws.iter_rows(values_only=True):
            c1, c2, c3, seg, content = cells_of(row)
            if c2 and re.match(r'^\d+\.\d+$', c2):
                cur_sec = {'no': c2, 'title': content or c2, 'subs': []}
                chap['secs'].append(cur_sec)
                cur_sub = None
                continue
            if c3 and re.match(r'^\d+\.\d+\.\d+$', c3):
                if cur_sec is None:
                    continue
                cur_sub = {'no': c3, 'title': content or c3, 'items': []}
                cur_sec['subs'].append(cur_sub)
                continue
            if cur_sub is None or not seg.isdigit() or not content:
                continue
            mm = re.match(r'^(\d+\.\d+\.\d+\.\d+)\s*(.*)$', content, re.S)
            if seg == '1':
                # 条目标题行
                title = mm.group(2).strip() if mm else content
                cur_sub['items'].append({'no': mm.group(1) if mm else '', 'title': title, 'body': ''})
            else:
                body = mm.group(2) if mm else content
                if cur_sub['items']:
                    it = cur_sub['items'][-1]
                    it['body'] = (it['body'] + '\n' + body).strip() if it['body'] else body
                else:
                    # 没有条目标题只有正文：补一个无名条目，避免正文丢失
                    cur_sub['items'].append({'no': '', 'title': '', 'body': body})
        for s in chap['secs']:
            for u in s['subs']:
                chap['counts']['subs'] += 1
                for it in u['items']:
                    chap['counts']['items'] += 1
                    chap['counts']['hanzi'] += len(HAN.findall(it['body']))
                    chap['counts']['paras'] += max(1, len([p for p in it['body'].split('\n') if p.strip()]))
                    chap['counts']['valueLike'] += len(VALUE.findall(it['body']))
        chap['counts']['secs'] = len(chap['secs'])
        chapters.append(chap)

    chapters.sort(key=lambda c: c['no'])
    doc = {
        'source': {
            'file': SRC,
            'sha256': sha256(SRC),
            'bytes': os.path.getsize(SRC),
            'title': '中医内科学（qhzy-中医内科学.xlsx · %d 章）' % len(chapters),
            'note': '段序号=1 是条目标题（4.1.1.1），段序号=11 是正文；小节 4.1.1 下 2–3 个条目。',
        },
        'counts': {
            'chapters': len(chapters),
            'secs': sum(c['counts']['secs'] for c in chapters),
            'subs': sum(c['counts']['subs'] for c in chapters),
            'items': sum(c['counts']['items'] for c in chapters),
            'paras': sum(c['counts']['paras'] for c in chapters),
            'hanzi': sum(c['counts']['hanzi'] for c in chapters),
            'valueLike': sum(c['counts']['valueLike'] for c in chapters),
        },
        'chapters': chapters,
    }
    os.makedirs(OUT_DIR, exist_ok=True)
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(json.dumps(doc, ensure_ascii=False, indent=1) + '\n')
    c = doc['counts']
    print('写出 %s' % os.path.relpath(OUT, ROOT))
    print('  %d 章 · %d 节 · %d 小节 · %d 条目 · %d 汉字 · 量值 %d'
          % (c['chapters'], c['secs'], c['subs'], c['items'], c['hanzi'], c['valueLike']))
    empty = [(ch['no'], u['no']) for ch in chapters for s in ch['secs'] for u in s['subs']
             if not any(i['body'] for i in u['items'])]
    print('  正文为空的小节: %d' % len(empty))
    if empty:
        print('   前 10:', empty[:10])
    for ch in chapters:
        print('   %2d %-28s 节 %2d · 小节 %2d · %6d 字'
              % (ch['no'], ch['title'], ch['counts']['secs'], ch['counts']['subs'], ch['counts']['hanzi']))


if __name__ == '__main__':
    main()
