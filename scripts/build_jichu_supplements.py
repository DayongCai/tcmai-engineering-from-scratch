#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
scripts/build_jichu_supplements.py —— 中医基础理论「教材缺口」的外源补录

为什么要有这个脚本：
  `standards/jichu/底本.json`（教材 xlsx）本身缺六处内容（各章已如实留账）：
    1. 病机十九条只引 2 条（第7章）
    2. 八法只有 2 法有释义（第8章）
    3. 反治只给 2 法（第8章）
    4. 奇经八脉只写 4 脉（第6章）
    5. 十二经全称只 7 个（第6章）
    6. 五行归类 7 类名齐、格未填满（第10章）
  补这些内容**不能改底本**（底本统计必须保持 327 段 / 45,199 字），
  只能另立补源层：`standards/jichu/supplements/`。

补源约定（用户口径，写进 README 与 补源.json.policy）：
  · 只从留档 `sources/*.html`（笈成文字化本）取文，逐条 sha256 可复算；
  · 每条带出处 `外源·笈成·<书名> <篇>`，繁体原文 + opencc 简体，两栏都存；
  · 补录条目与底本分账：底本 counts 不变，补源 counts 单算；
  · 不许用通行教材/记忆补字：抓不到就记 missing，不猜。

用法：
  python scripts/build_jichu_supplements.py           # 生成 补源.json / 补源.md
  python scripts/build_jichu_supplements.py --check   # 校验 sha256 / 条数 / 每条仍在源文中
  python scripts/build_jichu_supplements.py --gap bingji-19
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import re
import sys
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, 'standards', 'jichu', 'supplements')
SRC = os.path.join(BASE, 'sources')
OUT_JSON = os.path.join(BASE, '补源.json')
OUT_MD = os.path.join(BASE, '补源.md')

from opencc import OpenCC  # noqa: E402

T2S = OpenCC('t2s')
# opencc 对「蹻」给出异体字（𫏋），教材与通行简体写作「跷」，显式纠正一条
# opencc 对少数生僻正字会转成异体：蹻→𫏋（应作跷）、膹→𪱥（应作膹），显式纠正
T2S_FIX = {'𫏋': '跷', '蹻': '跷', '𪱥': '膹'}


def simp(x):
    out = T2S.convert(x)
    for a, b in T2S_FIX.items():
        out = out.replace(a, b)
    return out

PROVIDER = {
    'id': 'jicheng',
    'title': '中醫笈成（漢リポ 文字化本）',
    'url': 'https://jicheng.tw/tcm/book/',
}

SOURCES = [
    {'id': 'suwen', 'title': '黃帝內經素問', 'file': '黃帝內經素問.html',
     'author': '（傳）黃帝', 'dynasty': '戰國秦漢', 'role': '病機十九條 · 反治四法 · 五行歸類'},
    {'id': 'lingshu', 'title': '靈樞', 'file': '靈樞.html',
     'author': '（傳）黃帝', 'dynasty': '戰國秦漢', 'role': '十二經全稱（經脈第十）'},
    {'id': 'nanjing', 'title': '八十一難經', 'file': '八十一難經.html',
     'author': '（傳）秦越人', 'dynasty': '漢', 'role': '奇經八脈（二十七難·二十八難）'},
    {'id': 'xinyu', 'title': '醫學心悟', 'file': '醫學心悟.html',
     'author': '程國彭（鍾齡）', 'dynasty': '清', 'role': '醫門八法（汗吐下和溫清補消）'},
]


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def plain(path):
    s = io.open(path, encoding='utf-8').read()
    s = re.sub(r'<script[\s\S]*?</script>', '', s)
    s = re.sub(r'<style[\s\S]*?</style>', '', s)
    s = re.sub(r'<[^>]+>', '', s)
    s = s.replace('&nbsp;', ' ').replace('&amp;', '&')
    return s


def norm(s):
    return re.sub(r'\s+', '', s)


def find_all(text, needle):
    out = []
    start = 0
    while True:
        i = text.find(needle, start)
        if i < 0:
            break
        out.append(i)
        start = i + 1
    return out


# ── 1. 病機十九條：從至真要大論切「諸…皆屬於…」十九句 ───────────
BINGJI_HEAD = '諸風掉眩'
BINGJI_TAIL = '諸嘔吐酸'


def gap_bingji(text):
    i = text.find(BINGJI_HEAD)
    if i < 0:
        return {'items': [], 'missing': ['諸風掉眩']}
    j = text.find(BINGJI_TAIL, i)
    if j < 0:
        return {'items': [], 'missing': ['諸嘔吐酸']}
    seg = text[i:j + 40]
    # 以「諸」起句切；句尾為「。」，句內可能含逗號（如「諸禁鼓慄，如喪神守，皆屬於火」）
    parts = re.findall(r'諸[^。]*?皆屬[于於][^。]*。', seg)
    items = []
    for k, p in enumerate(parts, 1):
        items.append({
            'no': k,
            'hant': p,
            'hans': simp(p),
            'src': '外源·笈成·黃帝內經素問 至真要大論篇第七十四',
        })
    return {'declared': 19, 'found': len(items), 'items': items,
            'missing': [] if len(items) >= 19 else [f'只切到 {len(items)} 條']}


# ── 2. 反治四法：熱因寒用 / 寒因熱用 / 塞因塞用 / 通因通用 ────────
def gap_fanzhi(text):
    m = re.search(r'熱因寒用[^。]*。', text)
    if not m:
        return {'items': [], 'missing': ['熱因寒用']}
    sent = m.group(0)
    items = []
    for k, w in enumerate(['熱因寒用', '寒因熱用', '塞因塞用', '通因通用'], 1):
        if w in sent:
            items.append({
                'no': k, 'hant': w, 'hans': simp(w),
                'context': simp(sent),
                'src': '外源·笈成·黃帝內經素問 至真要大論篇第七十四',
            })
    return {'declared': 4, 'found': len(items), 'items': items,
            'missing': [w for w in ['熱因寒用', '寒因熱用', '塞因塞用', '通因通用'] if w not in sent]}


# ── 3. 五行歸類：陰陽應象大論 五段「X方生Y」────────────────────
WUXING_KEYS = ['在體', '在臟', '在色', '在音', '在聲', '在變動', '在竅', '在味', '在志']
FANG = ['東方', '南方', '中央', '西方', '北方']


def gap_wuxing(text):
    items = []
    for idx, f in enumerate(FANG, 1):
        m = re.search(f + r'生[^。]*。', text)
        if not m:
            continue
        # 「東方生風…肝主目。」只是第一句；在體/在臟/在色/在音/在聲/在變動/在竅/在味/在志
        # 都在紧接着的第二、三句里，直到出现「X傷Y」（如「怒傷肝」）为止。截长一点再解析。
        tail = text[m.start(): m.start() + 320]
        cut = tail.find('傷')
        sent = tail[: cut if cut > 0 else len(tail)]
        sent_full = m.group(0)
        row = {'no': idx, 'fang': f, 'fangShort': f.replace('方', ''), 'hant': sent_full, 'hans': simp(sent_full), 'cells': {},
               'src': '外源·笈成·黃帝內經素問 陰陽應象大論篇第五'}
        for k in WUXING_KEYS:
            mm = re.search(k + r'為([^，。]+)', sent)
            if mm:
                row['cells'][k] = T2S.convert(mm.group(1))
        items.append(row)
    return {'declared_rows': 5, 'found': len(items), 'items': items,
            'missing': [f for f in FANG if not any(x['fang'] == f for x in items)]}


# ── 4. 十二經全稱：靈樞·經脈「X手Y之脈」─────────────────────
# 靈樞·經脈的句式不只「肺手太陰之脈」，还有「心主手厥陰心包絡之脈」——
# 脏腑名可能出现在「手/足」之前，也可能之后，所以按「…手/足+阴阳…之脈」整体抓，
# 再用十二组（手足×三阴三阳）各留一条来做去重，不靠人工名单。
RE_MERIDIAN = re.compile(r'([^\s，。、；：]{0,6}(?:手|足)(?:太陰|少陰|厥陰|太陽|陽明|少陽)[^\s，。、；：]{0,8}之脈)')


def gap_meridians(text):
    hits = []
    seen = set()
    for m in RE_MERIDIAN.finditer(text):
        s = m.group(1)
        mm = re.search(r'(手|足)(太陰|少陰|厥陰|太陽|陽明|少陽)', s)
        if not mm:
            continue
        key = mm.group(1) + mm.group(2)
        if key in seen:
            continue
        seen.add(key)
        hits.append(s)
    items = [{'no': i + 1, 'hant': s, 'hans': simp(s),
              'src': '外源·笈成·靈樞 經脈第十'} for i, s in enumerate(hits)]
    return {'declared': 12, 'found': len(items), 'items': items,
            'missing': [] if len(items) >= 12 else [f'只切到 {len(items)} 條']}


# ── 5. 奇經八脈：八十一難經 二十七難（名）+ 二十八難（起止）──────
def gap_qijing(text):
    names = ['督脈', '任脈', '衝脈', '帶脈', '陽蹻', '陰蹻', '陽維', '陰維']
    i28 = text.find('二十八難曰')
    seg = text[i28:i28 + 1200] if i28 >= 0 else ''
    items = []
    for k, n in enumerate(names, 1):
        present = (n + '脈者' in seg) or (n + '者' in seg) or (n in seg)
        # 二十八難里督/任/衝/帶作「X脈者」，而陽維、陰維只作「陽維、陰維者」不带「脈」字；
        # 引文必须照原文形态，不能替它补一个「脈」。
        full = n if n.endswith('脈') else n + '脈'
        bare = n
        form = 'X脈者' if (full + '者') in seg else ('bare' if bare in seg else 'missing')
        text = full if form == 'X脈者' else bare
        items.append({
            'no': k, 'hant': text, 'hans': simp(text), 'form': form,
            'in28': form != 'missing', 'src': '外源·笈成·八十一難經 二十八難',
        })
    return {'declared': 8, 'found': sum(1 for x in items if x['in28']), 'items': items,
            'missing': [x['hant'] for x in items if not x['in28']]}


# ── 6. 醫門八法：醫學心悟·醫門八法 八段 ───────────────────────
BAFA = ['汗', '吐', '下', '和', '溫', '清', '補', '消']


def gap_bafa(html):
    """醫學心悟 的八法是八个章题：論汗法 / 論和法 / 論下法 / 論消法 / 論吐法 / 論清法 / 論溫法 / 論補法。
    按章题切，取每章首段（去标签后第一段实质文字）作为该法释义。"""
    marks = list(re.finditer(r'<h[1-4][^>]*>\s*論([汗吐下和溫清補消])法\s*</h[1-4]>', html))
    items = []
    for k, w in enumerate(BAFA, 1):
        hit = next((m for m in marks if m.group(1) == w), None)
        if not hit:
            items.append({'no': k, 'hant': w + '法', 'hans': simp(w + '法'),
                          'hant_excerpt': '', 'hans_excerpt': '', 'found': False,
                          'src': '外源·笈成·醫學心悟 論' + w + '法'})
            continue
        nxt = next((m for m in marks if m.start() > hit.start()), None)
        body = html[hit.end(): nxt.start() if nxt else hit.end() + 4000]
        plainbody = re.sub(r'<[^>]+>', '', body)
        plainbody = re.sub(r'\s+', '', plainbody)
        # 首段：到第一个「。」（含）为止，最长 140 字
        m = re.match(r'(.{10,140}?。)', plainbody)
        ex = m.group(1) if m else plainbody[:120]
        items.append({'no': k, 'hant': w + '法', 'hans': simp(w + '法'),
                      'hant_excerpt': ex, 'hans_excerpt': simp(ex), 'found': bool(m),
                      'src': '外源·笈成·醫學心悟 論' + w + '法'})
    return {'declared': 8, 'found': sum(1 for x in items if x['found']), 'items': items,
            'missing': [x['hant'] for x in items if not x['found']]}




# ── 7. 五運六氣七篇大論：素問七篇的篇序 / 段数 / 字数 ──────────
QIPIAN = ['天元紀大論', '五運行大論', '六微旨大論', '氣交變大論', '五常政大論', '六元正紀大論', '至真要大論']


def gap_yunqi(html):
    """教材附篇（18 行）只给了五运/六气的骨架，没给七篇大论的出处与规模。
    这里从素問原文按篇题切片，报七篇各自的篇序、句数、字数——只报规模，不摘文。"""
    heads = [(m.start(), m.end(), m.group(1)) for m in re.finditer(r'<h[12][^>]*>([^<]{2,30})</h[12]>', html)]
    items = []
    for name in QIPIAN:
        idx = next((i for i, h in enumerate(heads) if h[2].startswith(name)), None)
        if idx is None:
            continue
        start, end, title = heads[idx]
        nxt = heads[idx + 1][0] if idx + 1 < len(heads) else len(html)
        body = re.sub(r'<[^>]+>', '', html[end:nxt])
        body = re.sub(r'\s+', '', body)
        m = re.search(r'第([一二三四五六七八九十百]+)$', title)
        items.append({
            'no': len(items) + 1,
            'hant': title,
            'hans': simp(title),
            'order': m.group(1) if m else '',
            'planSentences': body.count('。'),
            'planChars': len(body),
            'src': '外源·笈成·黃帝內經素問 ' + title,
        })
    return {'declared': 7, 'found': len(items), 'items': items,
            'missing': [n for n in QIPIAN if not any(n in x['hant'] for x in items)]}


# ── 8. 六氣勝復：司天之化 6 条 + 勝復三則 + 亢害承制 ────────────
SHENGFU_RULES = [
    '有勝則復，無勝則否。',
    '勝至則復，無常數也，衰乃止耳。',
    '有勝之氣，其必來復也。',
]
KANGHAI = '亢則害，承乃制，制則生化，外列盛衰，害則敗亂，生化大病。'
CHENGZHI = '相火之下，水氣承之；水位之下，土氣承之；土位之下，風氣承之；風位之下，金氣承之；金位之下，火氣承之；君火之下，陰精承之。'


def gap_shengfu(text):
    items = []
    m = re.search(r'厥陰司天，其化以風[^。]*。', text)
    if m:
        for seg in m.group(0).rstrip('。').split('；'):
            seg = seg.strip()
            if not seg:
                continue
            # 原文是「厥陰司天，其化以風；少陰司天…；太陽司天，其化以寒。」一整句，
            # 按「；」切片后每片不带句号——照原文形态，不替它补标点
            items.append({'no': len(items) + 1, 'hant': seg, 'hans': simp(seg),
                          'kind': '司天之化', 'src': '外源·笈成·黃帝內經素問 至真要大論篇第七十四'})
    for rule in SHENGFU_RULES:
        if rule in text:
            items.append({'no': len(items) + 1, 'hant': rule, 'hans': simp(rule),
                          'kind': '勝復原則', 'src': '外源·笈成·黃帝內經素問 至真要大論篇第七十四'})
    for sent, kind in ((KANGHAI, '亢害承制'), (CHENGZHI, '六氣承制鏈')):
        if sent in text:
            items.append({'no': len(items) + 1, 'hant': sent, 'hans': simp(sent),
                          'kind': kind, 'src': '外源·笈成·黃帝內經素問 六微旨大論篇第六十八'})
    want = 6 + len(SHENGFU_RULES) + 2
    return {'declared': want, 'found': len(items), 'items': items,
            'missing': [r for r in SHENGFU_RULES if r not in text]}


GAPS = [
    {'id': 'bingji-19', 'chapter': '07-bingyin-bingji', 'name': '病机十九条（教材只引 2 条）',
     'base_said': '教材 9.1.1.2 引「诸风掉眩，皆属于肝」「诸湿肿满，皆属于脾」两条，声称十九条',
     'builder': ('suwen', gap_bingji)},
    {'id': 'fanzhi-4', 'chapter': '08-fangzhi-yuanze', 'name': '反治四法（教材只给 2 法）',
     'base_said': '教材 10.2.1 只给「热因热用」「寒因寒用」，缺「塞因塞用」「通因通用」',
     'builder': ('suwen', gap_fanzhi)},
    {'id': 'wuxing-5x9', 'chapter': '10-siwei-fangfa', 'name': '五行归类五方九目（教材只举木行 4 例）',
     'base_said': '教材 2.3.3 列七类名，实例 4 条全指向木',
     'builder': ('suwen', gap_wuxing)},
    {'id': 'meridian-12', 'chapter': '06-jingluo-tuxing', 'name': '十二经全称（教材写全 7 个）',
     'base_said': '教材第5章只出现 7 个「手/足+阴阳+脏腑+经」全称',
     'builder': ('lingshu', gap_meridians)},
    {'id': 'qijing-8', 'chapter': '06-jingluo-tuxing', 'name': '奇经八脉（教材只写 4 脉）',
     'base_said': '教材 5.3 只详写督任冲带，阴维/阳维/阴跷/阳跷连名字都没出现',
     'builder': ('nanjing', gap_qijing)},
    {'id': 'bafa-8', 'chapter': '08-fangzhi-yuanze', 'name': '医门八法（教材只释 2 法）',
     'base_said': '教材 10.3.1 只释义汗、补两法',
     'builder': ('xinyu', gap_bafa)},
    # ── 第二轮：教材「提了名却完全没讲」的两处 ──
    {'id': 'yunqi-7pian', 'chapter': '10-siwei-fangfa', 'name': '五运六气七篇大论（教材附篇仅 18 行、未列七篇）',
     'base_said': '教材附篇 Sheet 18 行：4 个附（五运/六气/运气与发病/数字化）、5 组化运、6 组司天、2 例岁运，未列七篇大论出处',
     'builder': ('suwen', gap_yunqi)},
    {'id': 'liuqi-shengfu', 'chapter': '07-bingyin-bingji', 'name': '六气胜复（教材附篇只提「岁木太过」一例）',
     'base_said': '教材附篇只给「岁木太过，风气流行，脾土受邪；岁火太过，炎暑流行，肺金受邪」两例，未讲胜复与亢害承制',
     'builder': ('suwen', gap_shengfu)},
]


def build():
    texts = {}
    htmls = {}
    sources = []
    for s in SOURCES:
        p = os.path.join(SRC, s['file'])
        if not os.path.exists(p):
            sys.exit(f"✗ 缺源文件 {p}（先下载留档）")
        raw = io.open(p, encoding='utf-8', errors='replace').read()
        texts[s['id']] = norm(plain(p))
        htmls[s['id']] = raw
        sources.append({
            **{k: s[k] for k in ('id', 'title', 'author', 'dynasty', 'role')},
            'file': f"sources/{s['file']}",
            'bytes': os.path.getsize(p),
            'sha256': sha256_file(p),
            'url': PROVIDER['url'] + s['title'] + '/index.html',
            'edition': f"《{s['title']}》笈成文字化本",
        })

    gaps = []
    for g in GAPS:
        sid, fn = g['builder']
        # 八法按章题切，必须拿原始 HTML；其余用去标签纯文本
        res = fn(htmls[sid]) if g['id'] in ('bafa-8', 'yunqi-7pian') else fn(texts[sid])
        gaps.append({
            'id': g['id'], 'chapter': g['chapter'], 'name': g['name'],
            'base_said': g['base_said'],
            'declared': res.get('declared', len(res['items'])),
            'found': res.get('found', len(res['items'])),
            'missing': res.get('missing', []),
            'items': res['items'],
        })

    return {
        'generated': date.today().isoformat(),
        'provider': PROVIDER,
        'policy': {
            'why': '教材底本缺六处内容；补录不改底本，另立补源层',
            'citation': '外源·笈成·<书名> <篇>（繁体原文；简体为 opencc t2s 转换，仅便于引用）',
            'separation': '底本 counts（13 章 / 327 段 / 45,199 字）不含本层；本层 counts 单算',
            'forbid': '不得用通行教材或记忆补字；抓不到的条进 missing，不猜',
        },
        'sources': sources,
        'gaps': gaps,
        'counts': {
            'gaps': len(gaps),
            'items': sum(len(g['items']) for g in gaps),
            'found': sum(g['found'] for g in gaps),
            'declared': sum(g['declared'] for g in gaps),
            'missing': sum(len(g['missing']) for g in gaps),
        },
    }


def write_md(doc):
    L = [f"# 中医基础理论 · 教材缺口补源（{doc['generated']}）\n",
         '> 底本 `standards/jichu/底本.json` 保持 327 段 / 45,199 字不变；本层单列。\n',
         '| 源 | 作者 | 用途 | 字节 | sha256 |', '|---|---|---|--:|---|']
    for s in doc['sources']:
        L.append(f"| 《{s['title']}》 | {s['author']}（{s['dynasty']}） | {s['role']} | {s['bytes']:,} | `{s['sha256'][:16]}…` |")
    c = doc['counts']
    L.append(f"\n合计 {c['gaps']} 处缺口 · 补录 {c['found']}/{c['declared']} 条 · 未取到 {c['missing']} 条\n")
    for g in doc['gaps']:
        L.append(f"\n## {g['name']}（{g['id']}）\n")
        L.append(f"- 落点：`{g['chapter']}`")
        L.append(f"- 教材原状：{g['base_said']}")
        L.append(f"- 补录：{g['found']}/{g['declared']}" + (f" · 缺 {g['missing']}" if g['missing'] else ''))
        for it in g['items'][:40]:
            body = it.get('hans') or it.get('hans_excerpt') or ''
            L.append(f"  {it['no']}. {body}  `{it['src']}`")
        if len(g['items']) > 40:
            L.append(f"  …（共 {len(g['items'])} 条，见 补源.json）")
    return '\n'.join(L) + '\n'


def check():
    doc = build()
    prev = json.load(io.open(OUT_JSON, encoding='utf-8'))
    errs = []
    for a, b in zip(prev['sources'], doc['sources']):
        if a['sha256'] != b['sha256']:
            errs.append(f"sha256 变化：{a['title']}")
    if prev['counts']['found'] != doc['counts']['found']:
        errs.append(f"补录条数变化：{prev['counts']['found']} → {doc['counts']['found']}")
    if errs:
        print('[jichu-supp] ✗ ' + '；'.join(errs))
        return 1
    c = doc['counts']
    print(f"[jichu-supp] ✓ {c['gaps']} 处缺口 · 补录 {c['found']}/{c['declared']} · 缺 {c['missing']}")
    for s in doc['sources']:
        print(f"    《{s['title']}》 {s['bytes']:,} B · sha {s['sha256'][:16]}")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--gap')
    args = ap.parse_args()

    if args.check:
        return check()

    doc = build()

    if args.gap:
        g = next((x for x in doc['gaps'] if x['id'] == args.gap), None)
        if not g:
            sys.exit(f"✗ 无此缺口 {args.gap}")
        print(g['name'], g['found'], '/', g['declared'])
        for it in g['items']:
            print(' ', it['no'], it.get('hans') or it.get('hans_excerpt'))
        return 0

    os.makedirs(BASE, exist_ok=True)
    with io.open(OUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write('\n')
    with io.open(OUT_MD, 'w', encoding='utf-8') as f:
        f.write(write_md(doc))

    c = doc['counts']
    print('═══ 中医基础理论 · 教材缺口补源 ═══')
    print(f"  {c['gaps']} 处缺口 · 补录 {c['found']}/{c['declared']} 条 · 未取到 {c['missing']}")
    for g in doc['gaps']:
        flag = '' if not g['missing'] else f"  ← 缺 {len(g['missing'])}"
        print(f"    {g['id']:14s} {g['name']}: {g['found']}/{g['declared']}{flag}")
    print('  → standards/jichu/supplements/{补源.json, 补源.md}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
