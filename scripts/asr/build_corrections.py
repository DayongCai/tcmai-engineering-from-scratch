#!/usr/bin/env python
"""构建 ASR 方名校正表（错形 → 规范方名），不改动原始识别文本。

为什么用 Python：同音判定要拼音。Node 没有内置拼音，而 ASR 链本来就有 Python
（faster-whisper）。这里只做**离线建表**，产物是 JSON；Node 侧只读表做替换，
所以不引入 npm 依赖。

判定纪律（每条规则都必须能说清依据，不靠"我觉得"）：
  1. 词表来自三处可核来源：底本「XX主之」抽出的方名、各讲标题里的方名、
     项目 FORMULAS（已人工分类过的 13 方）。三者取并集，逐条记 source。
  2. 候选只在**音节数相同**的方名里找，按拼音（去声调）编辑距离：
       0 → high（同音；如 五零散 → 五苓散）
       1 → medium（一个音节不同；如 大清浓汤 → 大青龙汤）
       2 → low（两个音节不同；如 大财富汤 → 大承气汤）
  3. 只有**唯一候选**才成规则；多候选一律进 unresolved（列举候选，不猜）。
  4. 规范化前先剥口语前缀（就是/所以/用/以/…），前缀本身不改。

产物：
  sources/transcripts/corrections.json   机器可用：rules + unresolved + vocabulary
  sources/transcripts/corrections-review.md  人可核：每条规则的依据、次数、定位

用法：
  python scripts/asr/build_corrections.py            # 建表并写盘
  python scripts/asr/build_corrections.py --dry      # 只打印统计，不写盘
  python scripts/asr/build_corrections.py --check    # 比对现表，不一致退出 1
"""

import argparse
import json
import os
import re
import sys
from collections import Counter, defaultdict

from pypinyin import lazy_pinyin

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'standards', 'materials', 'chenruchun-lectures', 'sources')
ASR = os.path.join(SRC, 'asr')
OUT = os.path.join(SRC, 'transcripts')
BASE = os.path.join(ROOT, 'standards', 'shanghan', '底本.json')
EPS = os.path.join(SRC, 'episodes.json')

# 方名式样：2–7 个汉字 + 剂型字。两边都不允许跨标点，避免把整句吞进来。
TOKEN = re.compile(r'[\u4e00-\u9fff]{2,7}(?:汤|散|丸|饮)')
LEAD = re.compile(r'^(就是|所以|这个|那个|一个|并没|并|用|以|喝|吃|服|把|给|和|与|从|对|在|说是|叫做|称为|所谓|叫做)+')

# 讲稿里反复出现的通用方名（人工登记）。底本「XX主之」只覆盖《伤寒论》方，
# 而陈瑞春在课上大量引用后世方（温胆汤、补中益气汤…）。不登记它们，错形会"无处可归"，
# 反而被硬配到某个伤寒方上（实测：温荡汤 曾被配成 抵当汤）。这份清单只补通用名，
# 逐条在 review 里标为「人工登记」，与底本来源分开。
VOCAB_EXTRA = [
    '温胆汤', '泻心汤', '承气汤', '四君子汤', '四物汤', '八珍汤', '十全大补汤',
    '补中益气汤', '当归补血汤', '归脾汤', '逍遥散', '平胃散', '藿香正气散',
    '参苓白术散', '六味地黄丸', '金匮肾气丸', '炙甘草汤', '小建中汤', '黄芪建中汤',
    '酸枣仁汤', '甘麦大枣汤', '血府逐瘀汤', '补阳还五汤', '龙胆泻肝汤',
    '半夏白术天麻汤', '银翘散', '桑菊饮', '清营汤', '犀角地黄汤', '黄连解毒汤',
    '玉屏风散',
]

# 人工判定：自动判定在多候选上停住、由人给出的定论。
# 每条都要有语境依据（讲次 + 原句），写在 review 里；不凭"看着像"。
HUMAN_RULES = {
    '小财富汤': ('小柴胡汤', '第 13/14/17 讲（14 讲专讲小柴胡汤）「小财富汤本身就可以疏肝理气」'),
    '大财富汤': ('大柴胡汤', '第 13/16/18 讲（15 讲专讲大柴胡汤）'),
    '马王汤': ('麻黄汤', '第 6 讲（汗法1 麻黄汤）「马王汤证主治」'),
    '一瓶风散': ('玉屏风散', '第 7 讲（桂枝汤后讲玉屏风散）「桂枝汤、玉屏风散也是个好方法」'),
    '一瓶风扇': ('玉屏风散', '第 15 讲 860s「或者换个轻轻的玉屏风散」'),
}
# 术语层（不限"汤/散/丸/饮"剂型）：药名、证候名的错形。
# 与方名规则分开，因为这类词出现频率低、且不能靠剂型字定位。
TERM_RULES = {
    '财头翁': ('白头翁', '用户判定：白头翁（白头翁汤之君药）'),
    '人色': ('人参', '用户判定：第 21 讲「加人色」= 加人参（全语料仅 2 处，无歧义）'),
}

# 定点校正：单字/高频字（如「礼」）不能全局替换 —— 全部语料含「礼」的段有 69 个，
# 多数是「礼拜」「基礼」「理中汤」「理气」。所以只按人指认的讲次+时间点改。
POINT_RULES = [
    {'lecture': 5, 'sec': 11.5, 'wrong': '礼', 'right': '里证',
     'basis': '用户判定：第 5 讲列举方名后的「礼」= 里证'},
]

# 短语层：整条短语的错形（比方名规则更长，必须先匹配）。
# 「北斧汤加人色」不能拆成「北斧汤→大青龙汤」再补「人色→人参」—— 那是两处都对的字，
# 合起来却是另一个方。用户判定：大青龙汤加人参 = 白虎加人参汤。
PHRASE_RULES = {
    '北斧汤加人色': ('白虎加人参汤', '用户判定：大青龙汤加人参 = 白虎加人参汤（第 21 讲 784.9/789s）'),
    '北斧汤': ('白虎汤', '由上式反推：北斧汤 = 白虎汤（第 21 讲 793/809s）'),
    '北斧堂': ('白虎汤', '同「北斧汤」（第 22 讲 132/135s，堂/汤同音）'),
}

PROJECT_FORMULAS = [
    '四逆汤', '干姜附子汤', '茯苓四逆汤', '通脉四逆汤', '真武汤', '白通汤', '吴茱萸汤',
    '甘草干姜汤', '当归四逆汤', '赤石脂禹余粮汤', '生脉散', '桃红四物汤', '四妙勇安汤',
]


def pinyin(word):
    return [p for p in lazy_pinyin(word) if re.fullmatch(r'[a-z]+', p)]


def py_dist(a, b):
    """音节级编辑距离（替换/插入/删除各记 1）。"""
    if abs(len(a) - len(b)) > 3:
        return 99
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def char_dist(a, b):
    if a == b:
        return 0
    if abs(len(a) - len(b)) > 1:
        return 9
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def near_syllable(a, b):
    """两个音节算不算近音：同音，或拼写只差一个字母（wang/huang、zi/zhi、sui/si）。
    这条挡的是"声母韵母都不同"的硬配：ke≠si（磕你散≠四逆散）、lian≠mu（连鲤汤≠牡蛎汤）。"""
    return char_dist(a, b) <= 1


def one_diff_near(pa, pb):
    """同音节数、仅一个音节不同，且那一对是近音。"""
    if len(pa) != len(pb):
        return False
    diffs = [(x, y) for x, y in zip(pa, pb) if x != y]
    if len(diffs) != 1:
        return False
    return near_syllable(*diffs[0])


def load_vocabulary():
    """三处来源取并集，并做**同音去重**：同一拼音只保留一个规范形。

    踩过的坑：底本里有一处写作「五零散主之」，若照收，词表就同时有「五苓散」与「五零散」，
    于是 ASR 的「五菱散」变成"多候选同距"，反而判不了。规范形优先取人工确认过的
    （FORMULAS / 标题），其次取底本里出现次数最多的那个写法。
    """
    raw = []  # (name, source, rank, count) —— rank 越小越可信

    def add(name, source, rank, count=1):
        name = name.strip()
        if len(name) < 3:
            return
        raw.append((name, source, rank, count))

    base = json.load(open(BASE, encoding='utf-8'))
    pat = re.compile(r'([\u4e00-\u9fff]{2,6}(?:汤|散|丸|饮))主之')
    seen = Counter()
    for p in base['pian']:
        for it in (p.get('items') or []):
            for m in pat.findall(it.get('text') or ''):
                m = re.sub(r'^(宜|属|与|本云|服|按|作|可与)', '', m)
                seen[m] += 1
    for name, n in seen.most_common():
        add(name, f'底本「{name}主之」×{n}', 2, n)

    eps = json.load(open(EPS, encoding='utf-8'))['episodes']
    for e in eps:
        for m in TOKEN.findall(e.get('title') or ''):
            add(m, f'第{e["no"]}讲标题', 1)

    for name in PROJECT_FORMULAS:
        add(name, 'FORMULAS（项目已分类）', 0)
    for name in VOCAB_EXTRA:
        add(name, '通用方名（人工登记）', 1)

    # 同音归并：同拼音取 rank 最高、次数最多者
    best = {}
    for name, source, rank, count in raw:
        py = ' '.join(pinyin(name))
        if not py:
            continue
        key = py
        cur = best.get(key)
        if cur is None or (rank, -count) < (cur[2], -cur[3]):
            best[key] = (name, source, rank, count)
    return {name: source for name, source, _r, _c in best.values()}


def collect_forms():
    """ASR 里所有方名式样 → 出现位置（讲次 + 秒 + 原句）。"""
    forms = defaultdict(list)
    for f in sorted(os.listdir(ASR)):
        if not f.endswith('.json'):
            continue
        no = int(f[4:6])
        doc = json.load(open(os.path.join(ASR, f), encoding='utf-8'))
        for seg in doc.get('segments') or []:
            for raw in TOKEN.findall(seg.get('text') or ''):
                core = LEAD.sub('', raw)
                forms[core].append({'lecture': no, 'sec': round(seg.get('start', 0), 1),
                                    'raw': raw, 'text': (seg.get('text') or '')[:120]})
    return forms


def vocabulary_by_lecture(vocab):
    """每讲里**以规范形**出现过的方名 —— 用作"讲者自己也说对过"的佐证。"""
    by = defaultdict(set)
    for f in sorted(os.listdir(ASR)):
        if not f.endswith('.json'):
            continue
        no = int(f[4:6])
        doc = json.load(open(os.path.join(ASR, f), encoding='utf-8'))
        text = ''.join(s.get('text') or '' for s in doc.get('segments') or [])
        for name in vocab:
            if name in text:
                by[no].add(name)
    return by


def collect_text_hits(word):
    """全文本精确匹配（不限剂型），用于术语层。"""
    out = []
    for f in sorted(os.listdir(ASR)):
        if not f.endswith('.json'):
            continue
        no = int(f[4:6])
        doc = json.load(open(os.path.join(ASR, f), encoding='utf-8'))
        for seg in doc.get('segments') or []:
            t = seg.get('text') or ''
            if word in t:
                out.append({'lecture': no, 'sec': round(seg.get('start', 0), 1), 'text': t[:120]})
    return out


def collect_point(p):
    """定点：只认指定讲次、时间点 ±1.5s 的那一段。"""
    f = os.path.join(ASR, f"lec-{p['lecture']:02d}.json")
    if not os.path.exists(f):
        return None
    doc = json.load(open(f, encoding='utf-8'))
    for seg in doc.get('segments') or []:
        if abs(seg.get('start', 0) - p['sec']) <= 1.5 and p['wrong'] in (seg.get('text') or ''):
            return {'lecture': p['lecture'], 'sec': round(seg['start'], 1), 'text': (seg['text'] or '')[:120]}
    return None


def build():
    vocab = load_vocabulary()
    vlist = [(name, pinyin(name), source) for name, source in vocab.items()]
    forms = collect_forms()
    by_lecture = vocabulary_by_lecture(vocab)

    rules, unresolved, seen_right = [], [], []
    # 人工判定优先：这些错形的自动候选不唯一（或词表缺正确形），由人给定。
    # 处理完从 forms 里移除，避免同一错形再走一遍拼音判定。
    for wrong, (right, basis) in HUMAN_RULES.items():
        occ = forms.get(wrong)
        if not occ:
            continue
        rules.append({
            'wrong': wrong, 'right': right, 'method': '人工判定', 'level': 'human',
            'basis': basis, 'pinyinWrong': ' '.join(pinyin(wrong)),
            'pinyinRight': ' '.join(pinyin(right)),
            'vocabSource': '人工判定（HUMAN_RULES）', 'count': len(occ),
            'evidenceLectures': sorted({o['lecture'] for o in occ}),
            'occurrences': [{'lecture': o['lecture'], 'sec': o['sec'], 'raw': o['raw']} for o in occ[:8]],
            'sample': occ[0]['text'],
        })
        del forms[wrong]

    for wrong, occ in forms.items():
        if wrong in PHRASE_RULES:   # 已被短语层整条接管，不再进自动判定
            continue
        if wrong in vocab:          # 本身就在词表里：无需校正
            continue
        if len(wrong) < 3:
            continue
        pw = pinyin(wrong)
        if not pw:
            continue
        cands = []
        for name, pn, source in vlist:
            if len(pn) != len(pw):
                continue
            d = py_dist(pw, pn)
            if d > 2:
                continue
            near = d == 0 or (d == 1 and one_diff_near(pw, pn))
            cands.append((d, 0 if near else 1, name, pn, source, near))
        if not cands:
            unresolved.append({'form': wrong, 'count': len(occ), 'reason': '拼音距离 >2 或音节数不同',
                               'samples': occ[:2]})
            continue
        # 先取距离最小的；同距里优先近音的；仍不唯一就不猜。
        cands.sort(key=lambda c: (c[0], c[1]))
        best = cands[0][0]
        top = [c for c in cands if c[0] == best]
        near_top = [c for c in top if c[5]]
        if len(near_top) == 1:
            top = near_top
        if len(top) > 1:
            unresolved.append({'form': wrong, 'count': len(occ), 'reason': '多候选同距',
                               'candidates': [{'name': c[2], 'dist': c[0], 'near': c[5]} for c in top[:4]],
                               'samples': occ[:2]})
            continue
        d, _flag, name, pn, source, near = top[0]
        ev = sorted({o['lecture'] for o in occ})
        attested = [n for n in ev if name in by_lecture.get(n, set())]
        # 距离 2，或距离 1 但那一对不是近音（如 方 fang vs 黄 huang）→ 必须本讲佐证。
        # 这类只降级为 low，仍需人抽看：见 corrections-review.md。
        if not near and not attested:
            unresolved.append({'form': wrong, 'count': len(occ),
                               'reason': f'距离 {d}、非近音，且本讲未以规范形出现「{name}」',
                               'candidates': [{'name': c[2], 'dist': c[0], 'near': c[5]} for c in cands[:3]],
                               'samples': occ[:2]})
            continue
        if d >= 2 and len(attested) * 2 < len(ev):
            unresolved.append({'form': wrong, 'count': len(occ),
                               'reason': f'距离 {d}，本讲未以规范形出现「{name}」，不足以判定',
                               'candidates': [{'name': c[2], 'dist': c[0], 'near': c[5]} for c in cands[:3]],
                               'samples': occ[:2]})
            continue
        level = 'high' if d == 0 else ('medium' if near else 'low')
        rules.append({
            'wrong': wrong, 'right': name, 'method': f'拼音距离 {d}' + ('（同音）' if d == 0 else ''),
            'level': level, 'pinyinWrong': ' '.join(pw), 'pinyinRight': ' '.join(pn),
            'vocabSource': source, 'count': len(occ),
            'evidenceLectures': attested,
            'occurrences': [{'lecture': o['lecture'], 'sec': o['sec'], 'raw': o['raw']} for o in occ[:8]],
            'sample': occ[0]['text'],
        })
        seen_right.append((name, wrong))

    rules.sort(key=lambda r: (-r['count'], r['wrong']))
    unresolved.sort(key=lambda u: -u['count'])
    # 单次出现的错形同样要判：出现次数只影响"值不值得先看"，不影响判定质量。
    # 早先按 count<2 丢弃，等于让 388 种只出现一次的错形留在原文里没人管。
    ignored = [u for u in unresolved if u['count'] < 2]

    # 去掉"冗余式样"：若该式样**包含**一个已知词表名/规则（如「要用五零散」含「五零散」），
    # 真正要替换的是那个子串，整条不必再单列。
    known_forms = set(vocab) | set(PHRASE_RULES) | set(HUMAN_RULES) | set(TERM_RULES) | {r['wrong'] for r in rules}

    def redundant(f):
        return any(k in f and k != f for k in known_forms)

    unresolved = [u for u in unresolved if not redundant(u['form'])]

    # 分成"值得人看"与"语音碎片"：与某个词表名共享 ≥2 个汉字才算方名候选。
    def worth_review(f):
        s = set(f)
        return any(len(s & set(n)) >= 2 for n in vocab)

    reviewable = [u for u in unresolved if worth_review(u['form'])]
    noise = [u for u in unresolved if not worth_review(u['form'])]

    terms = []
    for wrong, (right, basis) in TERM_RULES.items():
        occ = collect_text_hits(wrong)
        if not occ:
            continue
        terms.append({
            'wrong': wrong, 'right': right, 'method': '人工判定（术语层）', 'level': 'human',
            'basis': basis, 'count': len(occ),
            'occurrences': [{'lecture': o['lecture'], 'sec': o['sec']} for o in occ[:8]],
            'sample': occ[0]['text'],
        })
    phrases = []
    for wrong, (right, basis) in sorted(PHRASE_RULES.items(), key=lambda kv: -len(kv[0])):
        occ = collect_text_hits(wrong)
        if not occ:
            continue
        phrases.append({
            'wrong': wrong, 'right': right, 'method': '人工判定（短语层）', 'level': 'human',
            'basis': basis, 'count': len(occ),
            'occurrences': [{'lecture': o['lecture'], 'sec': o['sec']} for o in occ[:8]],
            'sample': occ[0]['text'],
        })
    points = []
    for p in POINT_RULES:
        hit = collect_point(p)
        if not hit:
            continue
        points.append({**p, 'method': '人工判定（定点）', 'level': 'human', 'sample': hit['text']})
    doc = {
        '$generated': 'python scripts/asr/build_corrections.py（pypinyin 音节比对，产物可由 --check 复核）',
        'policy': {
            'scope': '只校正方名（汤/散/丸/饮），不改动原始 ASR 文本；原文本仍在 sources/asr/*.json 与 transcripts/lec-NN.md',
            'threshold': '同音节数 + 拼音编辑距离 ≤2 + 候选唯一；同距多候选进 unresolved，不猜',
            'high': '同音（距离 0），可直接应用',
            'medium': '一个音节不同（距离 1），可直接应用但需抽看',
            'low': '两个音节不同（距离 2），应用前建议人核',
        },
        'vocabulary': [{'name': n, 'pinyin': ' '.join(p), 'source': s} for n, p, s in vlist],
        'stats': {
            'vocabulary': len(vlist),
            'formsScanned': len(forms),
            'rules': len(rules),
            'high': sum(1 for r in rules if r['level'] == 'high'),
            'medium': sum(1 for r in rules if r['level'] == 'medium'),
            'low': sum(1 for r in rules if r['level'] == 'low'),
            'unresolved': len(reviewable),
            'noise': len(noise),
            'ignoredSingletons': len(ignored),
            'human': sum(1 for r in rules if r['level'] == 'human'),
            'terms': len(terms),
            'phrases': len(phrases),
            'points': len(points),
            'totalReplacements': sum(r['count'] for r in rules),
        },
        'rules': rules,
        'phrases': phrases,
        'terms': terms,
        'points': points,
        'unresolved': reviewable,
        'noiseCount': len(noise),
    }
    review = render_review(doc)
    return doc, review


def render_review(doc):
    s = doc['stats']
    L = ['# 方名校正表 · 人核清单', '']
    L.append(f"词表 {s['vocabulary']} 个方名 · 扫到 {s['formsScanned']} 种方名式样 · "
             f"成规则 {s['rules']} 条（high {s['high']} / medium {s['medium']} / low {s['low']}）· "
             f"待人工判定 {s['unresolved']} 种 · 语音碎片 {s.get('noise', 0)} 种 · 合计替换 {s['totalReplacements']} 处。")
    L += ['', '> 原文本不动：`sources/asr/lec-NN.json` 与 `transcripts/lec-NN.md` 保持机器识别原样。',
          '> 校正文本另存 `transcripts/corrected/lec-NN.md`，发生替换的段落末尾标 `〔原「错形」→「正名」〕`。', '']
    L += ['## 规则', '', '| 错形 | 正名 | 依据 | 置信 | 次数 | 示例 |', '|---|---|---|---|---|---|']
    for r in doc['rules']:
        basis = f" · {r['basis']}" if r.get('basis') else ''
        L.append(f"| {r['wrong']} | {r['right']} | {r['method']}{basis} | {r['level']} | {r['count']} | {r['sample'][:40]} |")
    L += ['', '## 短语层（整条错形，最优先）', '', '| 错形 | 正名 | 依据 | 次数 | 示例 |', '|---|---|---|---|---|']
    for t in doc.get('phrases') or []:
        L.append(f"| {t['wrong']} | {t['right']} | {t['basis']} | {t['count']} | {t['sample'][:40]} |")
    L += ['', '## 术语层（不限剂型：药名/证候名）', '', '| 错形 | 正名 | 依据 | 次数 | 示例 |', '|---|---|---|---|---|']
    for t in doc.get('terms') or []:
        L.append(f"| {t['wrong']} | {t['right']} | {t['basis']} | {t['count']} | {t['sample'][:40]} |")
    L += ['', '## 定点校正（讲次 + 时间点）', '', '| 讲次 | 时间 | 错形 | 正名 | 依据 |', '|---|---|---|---|---|']
    for p in doc.get('points') or []:
        L.append(f"| 第{p['lecture']}讲 | {p['sec']}s | {p['wrong']} | {p['right']} | {p['basis']} |")
    L += ['', '## 待人工判定（未自动应用）', '', '| 式样 | 次数 | 原因 | 候选 |', '|---|---|---|---|']
    for u in doc['unresolved'][:40]:
        cands = '、'.join(f"{c['name']}({c['dist']})" for c in (u.get('candidates') or [])) or '—'
        L.append(f"| {u['form']} | {u['count']} | {u['reason']} | {cands} |")
    L.append('')
    return '\n'.join(L)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry', action='store_true')
    ap.add_argument('--check', action='store_true')
    args = ap.parse_args()

    doc, review = build()
    s = doc['stats']
    print(f"词表 {s['vocabulary']} · 式样 {s['formsScanned']} · 规则 {s['rules']} "
          f"(high {s['high']} / medium {s['medium']} / low {s['low']}) · 待判定 {s['unresolved']} · 替换 {s['totalReplacements']} 处")
    for r in doc['rules'][:15]:
        print(f"  {r['wrong']} → {r['right']}  [{r['level']}] ×{r['count']}  ({r['method']})")

    if args.dry:
        return 0
    body = json.dumps(doc, ensure_ascii=False, indent=1) + '\n'
    path = os.path.join(OUT, 'corrections.json')
    rpath = os.path.join(OUT, 'corrections-review.md')
    if args.check:
        old = open(path, encoding='utf-8').read() if os.path.exists(path) else None
        oldr = open(rpath, encoding='utf-8').read() if os.path.exists(rpath) else None
        if old != body or oldr != review:
            print('✗ corrections.json / corrections-review.md 与当前 ASR 不一致（跑一遍不带 --check 的命令重建）')
            return 1
        print('✅ 校正表与 ASR 现状一致')
        return 0
    os.makedirs(OUT, exist_ok=True)
    open(path, 'w', encoding='utf-8', newline='\n').write(body)
    open(rpath, 'w', encoding='utf-8', newline='\n').write(review)
    print(f"  → {os.path.relpath(path, ROOT)}")
    print(f"  → {os.path.relpath(rpath, ROOT)}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
