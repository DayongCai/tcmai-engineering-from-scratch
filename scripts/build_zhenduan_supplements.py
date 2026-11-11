#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_zhenduan_supplements.py —— 中医诊断学「教材缺口」外源补录层

底本一个字不改；教材缺什么，另立本层补录，两笔账分开算。
详见 standards/zhenduan/supplements/README.md。

四处缺口（前三处补录、第四处拒补）：
  z1  5.1.2 段标题 27 名 / 正文 28 名，标题漏「缓」  → 《脈經》卷一 脈形狀指下秘決第一（二十四種）
  z2  第4章「十问歌」标题写十问，实际只 8 小节  → 《景岳全書》卷之一 傳忠錄 十問篇（九）
  z3  闻诊「气味」6 源无分级  → 《素問》金匱真言論 五臭（臊焦香腥腐）
  z4  全书无任何误差率/一致性数据  → 拒补（古籍无此数据，须现代研究；不得拿古籍充数）

用法：
  python scripts/build_zhenduan_supplements.py            # 生成
  python scripts/build_zhenduan_supplements.py --check    # 校验留档（源文件 sha256 + 条目原文可回查）
"""

import hashlib
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'standards', 'zhenduan', 'supplements', 'sources')
BASE = os.path.join(ROOT, 'standards', 'zhenduan', '底本.json')
BZU = os.path.join(ROOT, 'standards', 'zhenduan', 'bzu.json')
OUT = os.path.join(ROOT, 'standards', 'zhenduan', 'supplements', '补源.json')

# 素問复用中基补源层同一份留档（同一笈成本，不重复下载）
SUWEN = os.path.join(ROOT, 'standards', 'jichu', 'supplements', 'sources', '黃帝內經素問.html')

SOURCES = [
    {'id': 'maijing', 'title': '脈經', 'file': '脈經.html', 'author': '王叔和', 'dynasty': '西晉',
     'provider': '中醫笈成（漢リポ 文字化本）', 'url': 'https://jicheng.tw/tcm/book/脈經/index.html',
     'role': '脈形狀指下秘決第一（二十四種）· 緩脈定義',
     'partial': True, 'coverage': '含序、卷一、卷二（止於卷二，卷三以下未取）'},
    {'id': 'jingyue', 'title': '景岳全書', 'file': '景岳全書.html', 'author': '張介賓', 'dynasty': '明',
     'provider': '中醫笈成（漢リポ 文字化本）', 'url': 'https://jicheng.tw/tcm/book/景岳全書/index.html',
     'role': '卷之一 傳忠錄 十問篇（九）· 十問歌與十問目次',
     'partial': True, 'coverage': '含全書紀略、卷之一、卷之二前半（止於卷之二中途，其後未取）'},
    {'id': 'suwen', 'title': '黃帝內經素問', 'file': '黃帝內經素問.html', 'author': '（傳）黃帝', 'dynasty': '戰國秦漢',
     'provider': '中醫笈成（漢リポ 文字化本）', 'url': 'https://jicheng.tw/tcm/book/黃帝內經素問/index.html',
     'role': '金匱真言論篇第四 · 五臭（臊焦香腥腐）',
     'partial': False, 'coverage': '全书 27 篇（复用中基补源层留档，不重复下载）',
     'reuse': 'standards/jichu/supplements/sources/黃帝內經素問.html'},
]


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def plain(path):
    """去掉标签与笈成的 <span data-rev> 校勘标记，得到可逐字引用的正文。"""
    s = io.open(path, encoding='utf-8', errors='replace').read()
    s = re.sub(r'<script[\s\S]*?</script>', '', s)
    s = re.sub(r'<style[\s\S]*?</style>', '', s)
    s = re.sub(r'<[^>]+>', '', s)
    s = s.replace('\u3000', ' ')
    s = re.sub(r'[ \t]+', ' ', s)
    return s


def t2s(x):
    """繁→简，只用于「教材（简体）↔ 古籍（繁体）」的名称对比，不改引用原文。"""
    try:
        from opencc import OpenCC
        return OpenCC('t2s').convert(x)
    except Exception:
        return x


def hanzi(s):
    return len(re.findall(r'[\u4e00-\u9fff]', s))


# ── z1 脈經 卷一：二十四種脈 ────────────────────────────────────────────────

def parse_maijing(html):
    """脈經卷一：按笈成的 <div data-sec="p"> 逐段取，段首「X脈，释…」才是脉名条目。

    不按句号切：夹注与「一曰…」会让一条脉变成好几个句段；按段切则一条脉一段。
    """
    m = re.search(r'脈形狀指下秘決第一（二十四種）([\s\S]*?)(?:<h1[^>]*>卷二<h1|<h1[^>]*>卷二)', html)
    if not m:
        m = re.search(r'脈形狀指下秘決第一（二十四種）([\s\S]*)', html)
    if not m:
        raise SystemExit('脈經：找不到「脈形狀指下秘決第一（二十四種）」段')
    seg = m.group(1)
    STOP = {'凡診', '診', '相類', '與', '無心', '無肺', '無腎', '無脾'}
    entries, seen = [], []
    for div in re.split(r'<div[^>]*data-sec="p"[^>]*>', seg)[1:]:
        txt = re.sub(r'<[^>]+>', '', div.split('</div>')[0]).strip()
        mm = re.match(r'([\u4e00-\u9fff]{1,2})脈，', txt)
        if not mm:
            continue
        name = mm.group(1)
        if name in STOP or '診' in name or '無' in name:
            continue
        if name in seen:
            continue
        seen.append(name)
        entries.append({'name': name + '脈', 'text': txt,
                        'note': '（夹注保留原样）' if '（' in txt else ''})
    return entries


# ── z2 景岳全書 十問篇 ─────────────────────────────────────────────────────

def parse_jingyue(txt):
    m = re.search(r'十問篇（九）(.{200,20000}?)(?:論治篇|卷之二)', txt, re.S)
    if not m:
        raise SystemExit('景岳全書：找不到「十問篇（九）」段')
    seg = m.group(1)
    song = re.search(r'(一問寒熱二問汗[^。]*。)', seg)
    if not song:
        raise SystemExit('景岳全書：十問篇里找不到十問歌')
    # 十问目次：一問寒熱 / 二問汗 / 三問頭身 … （歌诀行「一問寒熱二問汗…」不是目次）
    heads, missing = [], []
    for line in seg.split('\n'):
        line = line.strip()
        mm = re.match(r'([一二三四五六七八九十])問([\u4e00-\u9fff]{1,3})', line)
        if not mm:
            continue
        tail = line[mm.end():]
        if '問' in tail[:6]:
            continue
        h = mm.group(1) + '問' + mm.group(2)
        if h not in heads:
            heads.append(h)
    # 歌诀里点名、但没有独立问答段的那几问（景岳原书即如此，如实留账）
    for num, kw in re.findall(r'([一二三四五六七八九十])(?:因|從)([\u4e00-\u9fff]{2,4})', song.group(1)):
        if not any(h.startswith(num + '問') for h in heads):
            missing.append({'num': num + '問', 'keyword': kw, 'hasSection': False})
    intro = re.search(r'上十問者[^。]*。[^。]*。', seg)
    return {
        'song': song.group(1),
        'intro': intro.group(0) if intro else '',
        'heads': heads,
        'songOnly': missing,
        'hanzi': hanzi(seg),
    }


# ── z3 素問 五臭 ───────────────────────────────────────────────────────────

ZANG = {'臊': ('肝', '東方青色'), '焦': ('心', '南方赤色'), '香': ('脾', '中央黃色'),
        '腥': ('肺', '西方白色'), '腐': ('腎', '北方黑色')}


def parse_suwen(txt):
    out = []
    for chou, (zang, dirn) in ZANG.items():
        m = re.search(r'其臭' + chou + r'[。，]', txt)
        if not m:
            raise SystemExit('素問：找不到「其臭%s」' % chou)
        # 取该脏整句的前半（其類…）中最靠近的一条归类句，用于定位
        head = txt.rfind(dirn, 0, m.start())
        ctx = txt[max(0, head):m.start() + 5] if head > 0 else ''
        out.append({'chou': chou, 'zang': zang, 'quote': '其臭%s' % chou,
                    'locator': '金匱真言論篇第四', 'zangLine': dirn,
                    'hasCtx': bool(ctx)})
    return out


# ── 组装 ──────────────────────────────────────────────────────────────────

def build():
    base = json.load(io.open(BASE, encoding='utf-8'))
    bzu = json.load(io.open(BZU, encoding='utf-8'))

    # 教材侧脉名：不在这里另写一套解析，直接取第 6 章 code/main.js 的权威实现
    #   （章内已固化「标题 15+12=27 / 正文 12+16=28 / 标题漏缓」的解析规则与断言）
    ch6 = os.path.join(ROOT, 'departments', '01-zhongyi', '05-zhongyi-zhen-duan-xue',
                       'chapters', '06-qiezhen-maixiang', 'code', 'main.js')
    import subprocess
    out = subprocess.check_output(['node', '-e',
        "const m=require(process.argv[1]);process.stdout.write(JSON.stringify({p:m.pulse(),b:m.bodyNames()}))",
        ch6], shell=False).decode('utf-8')
    P = json.loads(out)
    tnames = P['p']['compact']['names'] + P['p']['grouped']['names']
    bodynames = P['b']['union']

    maijing_html = io.open(os.path.join(SRC, '脈經.html'), encoding='utf-8', errors='replace').read()
    jingyue_txt = plain(os.path.join(SRC, '景岳全書.html'))
    suwen_txt = plain(SUWEN)

    mj = parse_maijing(maijing_html)
    jy = parse_jingyue(jingyue_txt)
    sw = parse_suwen(suwen_txt)

    mj_names = [t2s(e['name'][:-1]) for e in mj]

    # 教材十问：8 小节（读底本第4章）
    shiwen_subs = []
    for c in base['chapters']:
        if c['no'] != '4':
            continue
        for s in c['secs']:
            for u in s['subs']:
                if u['no'].startswith('4.2'):
                    shiwen_subs.append({'no': u['no'], 'title': u['title'], 'items': len(u['items'])})

    # 气味：教材 3.2 嗅气味（2 小节 3 段标题），覆盖 6 个气源但没有分级
    qiwei_subs, qiwei_items = [], []
    for c in base['chapters']:
        if c['no'] != '3':
            continue
        for sec in c['secs']:
            if sec['no'] == '3.2':
                for u in sec['subs']:
                    qiwei_subs.append({'no': u['no'], 'title': u['title'], 'chars': len(''.join(u['paras']))})
                    qiwei_items += [it['title'] for it in u['items']]
    SIX = ['口气', '汗气', '痰涕', '二便', '经带', '病室']
    sixHit = [k for k in SIX if any(k in t for t in qiwei_items)]

    gaps = [
        {
            'id': 'z1-mai-ming-que-huan',
            'chapter': '06-qiezhen-maixiang',
            'textbookLocator': '教材·第5章·5.1.2',
            'gap': '5.1.2 两个段标题拼出 %d 个脉名，5.1.2 正文实际出现 %d 个脉名；标题漏收正文里的「%s」' % (
                len(tnames), len(bodynames), '、'.join([n for n in bodynames if n not in tnames])),
            'textbookSeen': {'titleNames': tnames, 'titleCount': len(tnames),
                             'bodyNames': bodynames, 'bodyCount': len(bodynames),
                             'onlyInBody': [n for n in bodynames if n not in tnames],
                             'onlyInTitle': [n for n in tnames if n not in bodynames]},
            'source': 'maijing',
            'locator': '脈經·卷一·脈形狀指下秘決第一（二十四種）',
            'citeAs': '外源·笈成·脈經 卷一·脈形狀指下秘決第一（二十四種）第%d条',
            'entries': [{'name': e['name'], 'text': e['text']} for e in mj],
            'comparison': {
                'maijingCount': len(mj_names),
                'inBoth': [n for n in mj_names if n in bodynames],
                'aliases': [{'maijing': '软', 'textbook': '濡',
                             'why': '《脈經》同一句里注「軟，一作濡」，教材取「濡」'}],
                'onlyMaijing': [n for n in mj_names if n not in bodynames and n != '软'],
                'onlyTextbook': [n for n in bodynames if n not in mj_names and n != '濡'],
                'note': '《脈經》二十四種与教材 28 名：23 名同名（軟/濡为别名），教材多出长、短、疾、牢四名',
            },
            'note': '《脈經》二十四種里「緩脈，去來亦遲，小快於遲」是緩脈最早的定形描述；教材正文有「緩」、标题没有，'
                    '本层只补「缓脉有经典定形描述」这一条，不拿《脈經》二十四種去改教材的 28 脉体系。',
        },
        {
            'id': 'z2-shiwen-ba-jie',
            'chapter': '05-wenzhen-wenjuan',
            'textbookLocator': '教材·第4章·4.2',
            'gap': '教材标题写「问现在症（十问歌）」，4.2 实际只有 %d 个小节，对应《景岳全書》十問篇的前八问；'
                   '十问歌的第九、第十问（脉色察阴阳、气味章神）教材没有专段' % len(shiwen_subs),
            'textbookSeen': {'subs': shiwen_subs, 'count': len(shiwen_subs)},
            'source': 'jingyue',
            'locator': '景岳全書·卷之一·傳忠錄·十問篇（九）',
            'citeAs': '外源·笈成·景岳全書 卷之一·傳忠錄·十問篇（九）',
            'entries': [{'kind': 'song', 'text': jy['song']},
                        {'kind': 'intro', 'text': jy['intro']}],
            'heads': jy['heads'],
            'songOnly': jy['songOnly'],
            'sectionHanzi': jy['hanzi'],
            'note': '这里要改一条直觉：不是教材「漏抄」两节——景岳原书十問篇也只写到第八问（八問渴），'
                    '第九、第十问只有歌诀一句「九因脈色察陰陽，十從氣味章神見」，没有单独问答段。'
                    '所以教材的 8 节与景岳的 8 个问答段一一对应，两书同样缺九、十问的正文。',
        },
        {
            'id': 'z3-qiwei-wu-chou',
            'chapter': '04-wenzhen-shengyin',
            'textbookLocator': '教材·第3章·3.2',
            'gap': '教材 3.2 只有 %d 小节 / %d 个段标题，覆盖 %d 个气源（%s），没有分级，也不辨气味与脏腑归属' % (
                len(qiwei_subs), len(qiwei_items), len(sixHit), '、'.join(sixHit)),
            'textbookSeen': {'subs': qiwei_subs, 'items': qiwei_items, 'sources': sixHit, 'count': len(sixHit), 'hasGrading': False},
            'source': 'suwen',
            'locator': '素問·金匱真言論篇第四',
            'citeAs': '外源·笈成·黃帝內經素問 金匱真言論篇第四',
            'entries': sw,
            'note': '五臭（臊焦香腥腐）是《素問》对气味给出的五级归属，教材气味段没有这一层；'
                    '本层只补「气味可分五臭并各归一脏」，不改教材的六源清单。',
        },
        {
            'id': 'z4-wucha-lu',
            'chapter': '12-zhenduan-wucha',
            'textbookLocator': '教材·第14章·14.2–14.4',
            'gap': '全书写了敏感度、特异度、正确率、准确率四个名称，但没有一个数值；没有任何误差率/一致性数据',
            'refused': True,
            'reason': '这是现代临床研究方法学指标，古籍里不存在；拿《素問》《脈經》去「补」误差率是伪造证据，本层拒补。',
            'alternative': '只能另立「现代研究数据」层（须有可核验的论文出处、样本量与判读标准），不属于本仓库的外源层；'
                           '本章按原文只列误差来源结构，不给概率。',
            'evidence': {'namesOnly': ['敏感度', '特异度', '正确率', '准确率'], 'percentInTextbook': 0},
        },
    ]

    doc = {
        'generated': '2026-10-28',
        'what': '中医诊断学教材缺口的外源补录层（底本一个字不改，两笔账分开算）',
        'base': {'file': 'standards/zhenduan/底本.json', 'sha256': sha256_file(BASE)},
        'principle': [
            '教材缺什么就如实留账，缺的部分另立本层补录，补录条目不并进 底本.json。',
            '引用一律标「外源·笈成·<书名> <篇卷>」，不得标「底本」「原文」。',
            '古籍能补的才补（脉名、十问、五臭）；古籍没有的（误差率）明确拒补，不用古籍充数。',
        ],
        'sources': [],
        'stats': {},
        'gaps': gaps,
    }

    for s in SOURCES:
        p = os.path.join(SRC, s['file']) if s['id'] != 'suwen' else SUWEN
        doc['sources'].append({
            'id': s['id'], 'title': s['title'], 'author': s['author'], 'dynasty': s['dynasty'],
            'provider': s['provider'], 'url': s['url'], 'role': s['role'],
            'file': s['file'] if s['id'] != 'suwen' else s.get('reuse', s['file']),
            'bytes': os.path.getsize(p), 'sha256': sha256_file(p),
            'partial': s['partial'], 'coverage': s['coverage'],
        })

    filled = [g for g in gaps if not g.get('refused')]
    doc['stats'] = {
        'gaps': len(gaps),
        'filled': len(filled),
        'refused': len(gaps) - len(filled),
        'entries': sum(len(g.get('entries', [])) for g in filled),
        'byGap': {g['id']: len(g.get('entries', [])) for g in filled},
        'maijing24': len(mj),
        'shiwenHeads': len(jy['heads']),
        'wuChou': len(sw),
    }
    return doc


def check():
    doc = build()
    if not os.path.exists(OUT):
        print('[zhenduan-supp] ✗ 缺 补源.json')
        return 1
    old = json.load(io.open(OUT, encoding='utf-8'))
    bad = []
    for o, n in zip(old['sources'], doc['sources']):
        if o['sha256'] != n['sha256']:
            bad.append('%s 源文件变了' % n['title'])
    if old['stats']['entries'] != doc['stats']['entries']:
        bad.append('条目数 %d → %d' % (old['stats']['entries'], doc['stats']['entries']))
    if bad:
        print('[zhenduan-supp] ✗ ' + '；'.join(bad))
        return 1
    print('[zhenduan-supp] ✓ %d 处缺口（补 %d / 拒 %d）· %d 条外源' % (
        doc['stats']['gaps'], doc['stats']['filled'], doc['stats']['refused'], doc['stats']['entries']))
    return 0


def main():
    if '--check' in sys.argv:
        return check()
    doc = build()
    io.open(OUT, 'w', encoding='utf-8').write(json.dumps(doc, ensure_ascii=False, indent=1) + '\n')
    st = doc['stats']
    print('═══ 中医诊断学补源层 ═══')
    print('  缺口 %d 处：补录 %d 处 · 拒补 %d 处' % (st['gaps'], st['filled'], st['refused']))
    print('  条目 %d 条：脈經 %d 名 · 十問 %d 问 · 五臭 %d 条' % (
        st['entries'], st['maijing24'], st['shiwenHeads'], st['wuChou']))
    for g in doc['gaps']:
        tag = '拒补' if g.get('refused') else '%d 条' % len(g.get('entries', []))
        print('    %-22s %-8s %s' % (g['id'], tag, g['gap'][:60]))
    print('  → standards/zhenduan/supplements/补源.json')
    return 0


if __name__ == '__main__':
    sys.exit(main())
