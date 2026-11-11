#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_zhongyao_supplements.py —— 中药学「教材缺口」补录层

底本一个字不改；教材缺什么，另立本层补录，两笔账分开算。
详见 standards/zhongyao/supplements/README.md。

三处缺口：
  g1 shengjiang-fuchen  升降浮沉没有逐药标注
        · 教材侧：第 5.3 两节里的**示例药 + 两条规则**（逐字可查，约 14 味）
        · 外源侧：《醫學衷中參西錄》里与该药同句、且句中出现升降浮沉字的片段（线索，不判标注）
        · 其余 → 拒补：287 味里没有逐药来源，不按性味规则硬推成「标注」
  g2 zonglun-7zhang     教材第 1/2/3/4/6/7/8 章（绪论·简史·产地采集·炮制·配伍·禁忌·剂量用法）未进课程
  g3 gongdu-badu        教材第 28/29 章（攻毒杀虫止痒·拔毒化腐生肌）12 味药未进课程

用法：
  python scripts/build_zhongyao_supplements.py
  python scripts/build_zhongyao_supplements.py --check
"""

from __future__ import annotations

import hashlib
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, 'standards', 'zhongyao', '底本.json')
DRUGS = os.path.join(ROOT, 'standards', 'zhongyao', 'drugs.json')
OUT_DIR = os.path.join(ROOT, 'standards', 'zhongyao', 'supplements')
SRC_DIR = os.path.join(OUT_DIR, 'sources')
OUT = os.path.join(OUT_DIR, '补源.json')

# 教材第 5.3 两节里点名的官药与趋向（名字必须真出现在对应段里，脚本会逐条核）
SHIJI = [
    ('升麻', '升', '5.3.1', '升——上升提陷（升麻升阳举陷）'),
    ('代赭石', '降', '5.3.1', '降——下降平逆（代赭石降逆）'),
    ('浮萍', '浮', '5.3.1', '浮——向外发散（浮萍发汗）'),
    ('大黄', '沉', '5.3.1', '沉——向内泄利（大黄泻下）'),
    ('桑叶', '升浮', '5.3.1', '花叶皮枝质轻者多升浮（升麻、桑叶）'),
    ('苏子', '沉降', '5.3.1', '种子果实矿石质重者多沉降（苏子、磁石）'),
    ('磁石', '沉降', '5.3.1', '种子果实矿石质重者多沉降（苏子、磁石）'),
    ('羌活', '升浮', '5.3.2', '头痛用羌活、白芷上行'),
    ('白芷', '升浮', '5.3.2', '头痛用羌活、白芷上行'),
    ('麻黄', '升浮', '5.3.2', '表证用麻黄、薄荷外散'),
    ('薄荷', '升浮', '5.3.2', '表证用麻黄、薄荷外散'),
    ('芒硝', '沉降', '5.3.2', '便秘用大黄、芒硝下行'),
    ('石决明', '沉降', '5.3.2', '肝阳上亢用石决明、牡蛎镇潜'),
    ('牡蛎', '沉降', '5.3.2', '肝阳上亢用石决明、牡蛎镇潜'),
    ('半夏', '降', '5.3.2', '呕吐用半夏降逆'),
    ('杏仁', '降', '5.3.2', '喘咳用杏仁降气'),
    ('柴胡', '升', '5.3.2', '久泻脱肛用升麻、柴胡升提'),
]

RULES = [
    ('5.3.1', '一般升浮药主上行向外（发表、升阳、涌吐），沉降药主下行向内（泻下、清热、平肝、降逆）。', '总则'),
    ('5.3.1', '升降浮沉与性味、质地相关：凡味辛甘、性温热者多升浮（辛温解表药）；味酸苦咸、性寒凉者多沉降（苦寒泻下药）', '性味与质地'),
    ('5.3.2', '升降浮沉指导顺病位选药', '应用'),
    ('5.3.2', '炮制可改变趋向：酒制升提（酒大黄上行）、醋制收敛、盐制下行入肾（盐杜仲）、姜汁炒散', '炮制改趋向'),
]

KEYWORDS = ['升浮', '沉降', '升提', '升阳', '上行', '下降', '下行', '镇潜', '降逆']


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def plain(path):
    s = io.open(path, encoding='utf-8', errors='replace').read()
    s = re.sub(r'<script[\s\S]*?</script>', '', s)
    s = re.sub(r'<style[\s\S]*?</style>', '', s)
    s = re.sub(r'<[^>]+>', '', s)
    s = s.replace('\u3000', ' ')
    return re.sub(r'[ \t]+', ' ', s)


def sections(path):
    """把书切成 (h2 篇名, 正文)；用于给外源片段一个可核对的定位。"""
    s = io.open(path, encoding='utf-8', errors='replace').read()
    s = re.sub(r'<script[\s\S]*?</script>', '', s)
    parts = re.split(r'<h2[^>]*>([^<]{1,40})</h2>', s)
    out = []
    for i in range(1, len(parts), 2):
        title = parts[i].strip()
        body = re.sub(r'<[^>]+>', '', parts[i + 1] if i + 1 < len(parts) else '')
        out.append((title, body))
    return out


def build():
    base = json.load(io.open(BASE, encoding='utf-8'))
    drugs = json.load(io.open(DRUGS, encoding='utf-8'))
    ch = {c['no']: c for c in base['chapters']}

    # ── g1 教材侧：5.3 两节原文 + 示例药逐条核 ────────────────────────────
    paras53 = {}
    for sec in ch['5']['secs']:
        if sec['no'] == '5.3':
            for sub in sec['subs']:
                paras53[sub['no']] = sub['paras']
    flat53 = '\n'.join(p for ps in paras53.values() for p in ps)

    examples, missing = [], []
    for name, trend, loc, quote in SHIJI:
        if name in flat53:
            examples.append({'drug': name, 'trend': trend, 'locator': f'教材·第5章·{loc}', 'quote': quote})
        else:
            missing.append(name)
    if missing:
        raise SystemExit('教材 5.3 段里找不到这些药名：%s' % '、'.join(missing))

    rules = []
    for loc, text, kind in RULES:
        if text not in flat53:
            raise SystemExit('教材 5.3 段里找不到规则原句：%s' % text[:30])
        rules.append({'locator': f'教材·第5章·{loc}', 'kind': kind, 'text': text})

    # ── g1 外源侧：醫學衷中參西錄 同句线索 ──────────────────────────────
    src_book = os.path.join(SRC_DIR, '醫學衷中參西錄.html')
    clues = {}
    if os.path.exists(src_book):
        for title, body in sections(src_book):
            for sent in re.split(r'(?<=[。；])', body):
                sent = sent.strip()
                if len(sent) < 8 or len(sent) > 120:
                    continue
                hit = [k for k in KEYWORDS if k in sent]
                if not hit:
                    continue
                for d in drugs['drugs']:
                    n = d['name']
                    if n in clues or n not in sent:
                        continue
                    clues[n] = {'drug': n, 'section': title, 'keywords': hit, 'sentence': sent}
                    break

    # ── g2 / g3 未进课程的两块教材内容 ────────────────────────────────
    zonglun = ['1', '2', '3', '4', '6', '7', '8']
    zl_chars = sum(ch[n]['counts']['chars'] for n in zonglun)
    gd = ['28', '29']
    gd_chars = sum(ch[n]['counts']['chars'] for n in gd)
    gd_drugs = [d['name'] for d in drugs['drugs'] if d['chapter'] in gd]

    gaps = [
        {
            'id': 'g1-shengjiang-fuchen',
            'chapter': '12-xingneng-bianma',
            'textbookLocator': '教材·第5章·5.3',
            'gap': '教材只在 5.3 两节里点名 %d 味药的趋向、给出 %d 条一般性规则；各论 287 味的「来源与性味归经」段**没有逐药标注**升降浮沉' % (len(examples), len(rules)),
            'textbook': {'examples': examples, 'rules': rules, 'namedDrugs': len(examples)},
            'source': 'yizhongcanxilu',
            'locator': '醫學衷中參西錄（逐篇同句线索）',
            'citeAs': '外源·笈成·醫學衷中參西錄 <篇名>',
            'clues': sorted(clues.values(), key=lambda x: x['drug']),
            'clueCount': len(clues),
            'note': '外源只给「同句线索」：该书某篇同时出现该药名与升降浮沉词。'
                    '这**不是**逐药标注——要当标注用，得人工逐条判读句子在讲什么。',
            'refused': False,
            'residual': {
                'total': len(drugs['drugs']),
                'withTextbook': len(examples),
                'withClue': len([c for c in clues.values() if c['drug'] not in {e['drug'] for e in examples}]),
                'noSource': len(drugs['drugs']) - len(examples) - len([c for c in clues.values() if c['drug'] not in {e['drug'] for e in examples}]),
                'why': '剩余药物既不在教材 5.3 的示例里、也没有外源同句线索；按性味规则（辛甘温热→升浮）推演可以做，'
                       '但那是**推断**不是标注，本层不把推断写成数据。',
            },
        },
        {
            'id': 'g2-zonglun-7zhang',
            'chapter': '(未建课程章)',
            'textbookLocator': '教材·第1/2/3/4/6/7/8章',
            'gap': '教材总论 7 章（绪论·简史·产地采集·炮制·配伍·禁忌·剂量用法）共 %d 字，课程 12 章里**没有对应章**' % zl_chars,
            'textbook': {
                'chapters': [{'no': n, 'title': ch[n]['title'], 'chars': ch[n]['counts']['chars']} for n in zonglun],
                'chars': zl_chars,
            },
            'proposal': '并成一章「药材之前：产地·采集·炮制·配伍·禁忌·剂量」（课程第 13 章），只做教材已有内容的再组织，不引外源。',
            'refused': False,
        },
        {
            'id': 'g3-gongdu-badu',
            'chapter': '(未建课程章)',
            'textbookLocator': '教材·第28/29章',
            'gap': '教材两章（攻毒杀虫止痒·拔毒化腐生肌）共 %d 字 / %d 味药，课程 12 章里没有对应章' % (gd_chars, len(gd_drugs)),
            'textbook': {
                'chapters': [{'no': n, 'title': ch[n]['title'], 'chars': ch[n]['counts']['chars']} for n in gd],
                'chars': gd_chars,
                'drugs': gd_drugs,
            },
            'proposal': '并成一章「攻毒杀虫与拔毒化腐：毒性与用法边界」（课程第 14 章）；这 12 味药毒性集中，恰恰是「性能编码化」最需要单独标注毒性的地方。',
            'refused': False,
        },
    ]

    doc = {
        'generated': '2026-10-29',
        'what': '中药学教材缺口的补录层（底本一个字不改，两笔账分开算）',
        'base': {'file': 'standards/zhongyao/底本.json', 'sha256': sha256_file(BASE)},
        'principle': [
            '教材缺什么就如实留账，缺的部分另立本层，补录条目不并进 底本.json。',
            '引用一律标「外源·笈成·<书名> <篇>」，不得标「底本」「原文」。',
            '能逐字查到的才写成条目；只能同句共现的写「线索」，不写成标注；两者都没有的写「拒补」。',
        ],
        'sources': [],
        'stats': {},
        'gaps': gaps,
    }

    if os.path.exists(src_book):
        s = io.open(src_book, encoding='utf-8', errors='replace').read()
        doc['sources'].append({
            'id': 'yizhongcanxilu', 'title': '醫學衷中參西錄', 'author': '張錫純', 'dynasty': '清末民初',
            'provider': '中醫笈成（漢リポ 文字化本）',
            'url': 'https://jicheng.tw/tcm/book/醫學衷中參西錄/index.html',
            'role': '升降浮沉的同句线索（逐篇标题可核对）',
            'file': 'standards/zhongyao/supplements/sources/醫學衷中參西錄.html',
            'bytes': os.path.getsize(src_book), 'sha256': sha256_file(src_book),
            'structure': {'h1': len(re.findall(r'<h1[^>]*>', s)), 'h2': len(re.findall(r'<h2[^>]*>', s)),
                          'h3': len(re.findall(r'<h3[^>]*>', s))},
            'partial': False, 'coverage': '全本（自「治陰虛勞熱方」起至末篇「效果　煎服一劑…」止）',
        })

    doc['stats'] = {
        'gaps': len(gaps),
        'refused': sum(1 for g in gaps if g.get('refused')),
        'textbookExamples': len(examples),
        'textbookRules': len(rules),
        'clues': len(clues),
        'drugs': len(drugs['drugs']),
        'zonglunChars': zl_chars,
        'gongduChars': gd_chars,
        'gongduDrugs': len(gd_drugs),
        'residualNoSource': gaps[0]['residual']['noSource'],
    }
    return doc


def check():
    doc = build()
    if not os.path.exists(OUT):
        print('[zhongyao-supp] ✗ 缺 补源.json')
        return 1
    old = json.load(io.open(OUT, encoding='utf-8'))
    bad = []
    if old['base']['sha256'] != doc['base']['sha256']:
        bad.append('底本.json 变了')
    for k in ('textbookExamples', 'textbookRules', 'clues', 'residualNoSource'):
        if old['stats'][k] != doc['stats'][k]:
            bad.append(f"{k}：{old['stats'][k]} → {doc['stats'][k]}")
    if bad:
        print('[zhongyao-supp] ✗ ' + '；'.join(bad))
        return 1
    s = doc['stats']
    print(f"[zhongyao-supp] ✓ 3 处缺口 · 教材示例 {s['textbookExamples']} 味 / 规则 {s['textbookRules']} 条 · "
          f"外源线索 {s['clues']} 味 · 无源 {s['residualNoSource']} 味")
    return 0


def main():
    if '--check' in sys.argv:
        return check()
    doc = build()
    os.makedirs(OUT_DIR, exist_ok=True)
    io.open(OUT, 'w', encoding='utf-8').write(json.dumps(doc, ensure_ascii=False, indent=1) + '\n')
    s = doc['stats']
    print('═══ 中药学补源层 ═══')
    print(f"  缺口 {s['gaps']} 处（拒补 {s['refused']}）")
    print(f"  g1 升降浮沉：教材示例 {s['textbookExamples']} 味 + 规则 {s['textbookRules']} 条；"
          f"外源《醫學衷中參西錄》同句线索 {s['clues']} 味；无源 {s['residualNoSource']} 味")
    print(f"  g2 总论未进课程：7 章 {s['zonglunChars']:,} 字")
    print(f"  g3 攻毒杀虫+拔毒化腐：{s['gongduDrugs']} 味 / {s['gongduChars']:,} 字")
    print('  → standards/zhongyao/supplements/补源.json')
    return 0


if __name__ == '__main__':
    sys.exit(main())
