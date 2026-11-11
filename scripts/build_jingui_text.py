#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
scripts/build_jingui_text.py —— 《金匱要略方論》底本构建（外源·笈成）

为什么有这一步：
  `08-jingui-yaolue` 的 10 章要引《金匮要略·XX病脉证并治第N》的原文。仓库里没有金匮的
  qhzy-*.xlsx 底本（底本 100 份只覆盖 99 门教材学科），所以原文只能走**外源**，
  而外源必须能回到一份留档 + 一个 sha256 —— 这是 EXTERNAL-SOURCES.md 立的规则，
  讲经典也不例外：**不许凭记忆引原文**。

留档与复算：
  standards/jingui/source.html      原始页面（按字节留档，只读）
  standards/jingui/底本.json        解析产物：篇 → 条（条号取自源页 <p id="篇.条">）
  standards/jingui/底本.md          人读版（繁/简并列，供校勘）
  ← 全部由本脚本生成；`--check` 校验 sha256 与条数，网页改版即报错。

条号口径：
  源页每条 `<p id="2.11">` 的 id 就是「第 2 篇第 11 条」，依赵开美本一系（笈成整理）。
  本库**沿用源页条号**，不自编；引用写「《金匮要略·痉湿暍病脉证并治第二》第11条」。
  与《伤寒论》398 条不同，金匮各本条文分合略有出入，跨版本引用时须核对分条。

方剂口径：
  源页用 `<span class="h-formula">` 包住「方名 → 药味（含剂量夹注）→ 煎服法」。
  解析为结构化 formulas[]，既不丢「右六味…」的煎服法，也让第 10 章的配伍统计可复算。

繁→简：只做字形（opencc t2s），不改字词、不改方名、不做地区词替换。

用法：
  python scripts/build_jingui_text.py            # 解析并写三份产物
  python scripts/build_jingui_text.py --check    # 校验 sha256 / 条数 / 篇名
  python scripts/build_jingui_text.py --sample 血痹虚劳 3
  python scripts/build_jingui_text.py --tiao 2.11
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
SRC = os.path.join(ROOT, 'standards', 'jingui', 'source.html')
OUT_JSON = os.path.join(ROOT, 'standards', 'jingui', '底本.json')
OUT_MD = os.path.join(ROOT, 'standards', 'jingui', '底本.md')

PROVIDER = {
    'id': 'jicheng',
    'title': '中醫笈成（漢リポ 文字化本）',
    'url': 'https://jicheng.tw/tcm/book/金匱要略方論/index.html',
    'raw': 'https://gitlab.com/jicheng/jc.data/-/raw/master/pages/book/金匱要略方論/index.html',
    'edition': '《仲景全書·金匱要畧方論》，明萬曆二十七年趙開美刊本（平圖011607）；四部叢刊初編景明刊古今醫統正脈本',
}

T2S = None
try:
    from opencc import OpenCC
    T2S = OpenCC('t2s')
except Exception:  # pragma: no cover
    T2S = None


def to_simp(s: str) -> str:
    return T2S.convert(s) if T2S is not None else s


def sha256_file(p: str) -> str:
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def clean(s: str) -> str:
    s = re.sub(r'<br\s*/?>', '\n', s)
    s = re.sub(r'<[^>]+>', '', s)
    s = s.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    return re.sub(r'[ \t\u3000]+', ' ', s).strip()


def split_note(s: str):
    """把雙行夾注抽出来单独存：正文引文不该夹着小字校注，但校注不能丢。"""
    notes = [clean(m.group(1)) for m in re.finditer(r'<small class="雙行夾注">(.*?)</small>', s, re.S)]
    body = re.sub(r'<span data-rev="注">.*?</span>', '', s, flags=re.S)
    body = re.sub(r'<small class="雙行夾注">.*?</small>', '', body, flags=re.S)
    return clean(body), [n for n in notes if n]


def split_formula_blocks(block: str):
    """一个 <span class="h-formula"> 里可能并列多个方。

    源页把「大青龍湯方／小青龍湯方」「蒲灰散／滑石白魚散／茯苓戎鹽湯」这类并列方
    放在**同一个 h-formula 块**里，各自用 `<b>X方：</b>` 起头。首版按「第一段=方名、
    第二段=药味、最后一段=煎服法」取值，于是第二个方的药味被读成第一个方的法，
    方名与药文整体错位（13.11 蒲灰散、14.25 越婢加朮湯、10.19 烏頭桂枝湯）。
    所以先按加粗方名切块，块内再取值。
    """
    marks = [m for m in re.finditer(r'(?s)<p[^>]*>\s*<b>\s*([^<]{1,24}?方)\s*[：:]?\s*</b>', block)]
    if len(marks) <= 1:
        return [block] if not marks else [block[marks[0].start():]]
    out = []
    for i, m in enumerate(marks):
        end = marks[i + 1].start() if i + 1 < len(marks) else len(block)
        out.append(block[m.start():end])
    return out


def parse_formula(block: str):
    """块内：方名段 → 药味段 → 煎服法段。

    药味段的三个历史坑（底本 v2 修）：
      1. 药名与剂量之间是**单空格**、剂量在 `<small class="雙行夾注">` 里，而 class 属性
         自带空格 —— 直接剥标签再按空格切会把 class 当成药名。先把夹注换成 ⟨剂量⟩。
      2. 排版会把下一味药连剂量塞进上一味的注里（「三兩，炙細辛三兩」「三兩，黃柏三兩」
         「二兩，除目及閉口，去汗黃芩二分」）—— 必须按「，+ 药名 + 剂量」再切一刀。
      3. 有些方不用夹注、整行用全角逗号（「橘皮二升，竹茹二升，…」）—— 无 ⟨⟩ 时按逗号切。
    """
    ps = [p for p in re.findall(r'(?s)<p[^>]*>(.*?)</p>', block) if p.strip()]
    if not ps:
        return None
    name = re.sub(r'<[^>]+>', '', ps[0]).strip()
    # 「乌头汤方：治脚气疼痛…」「越婢加朮湯方：方見上。」——方名取冒号前，其余是注
    head_note = ''
    if re.search(r'[：:]', name):
        name, head_note = re.split(r'[：:]', name, 1)
        head_note = head_note.strip()
    name = name.strip()

    ingredients = []
    method = ''
    method_herbs = []
    if len(ps) >= 2:
        line = re.sub(r'<small class="雙行夾注">(.*?)</small>', r'⟨\1⟩', ps[1], flags=re.S)
        line = re.sub(r'<[^>]+>', '', line).replace('&nbsp;', ' ').strip()
        # 「洗方／坐药」这类**没有药味行**的方：2 段就是用法（「右以百合一升，以水一斗，漬之一宿…」）。
        # 首版把它当药味行切，切出「右以／以水／漬之／以洗身…」一串垃圾（百合洗方就是这么坏的）。
        if line.startswith('右'):
            method = line
            # 药名后必须紧跟「数词+单位」才算剂量：不这样卡，「右以百合一升」会被切成「百」+「合一升」
            m1 = re.search(r'右以\s*([\u4e00-\u9fff]{1,4}?)([一二三四五六七八九十百千半]+[兩两升合枚箇个斤分])',
                           line)
            if m1:
                ingredients.append({'herb': m1.group(1), 'herbSimp': to_simp(m1.group(1)),
                                    'dose': m1.group(2), 'doseSimp': to_simp(m1.group(2))})
            line = ''
        if '⟨' not in line and re.search(r'[，、]', line):
            # 无夹注的全角逗号行
            for part in re.split(r'[，、。]', line):
                part = part.strip()
                if not part:
                    continue
                m2 = re.match(r'^([\u4e00-\u9fff]{1,6}?)((?:[一二三四五六七八九十百千半兩两升合枚箇个斤分銖铢尺把具片條条]|\d)+.*)$', part)
                if m2:
                    ingredients.append({'herb': m2.group(1), 'herbSimp': to_simp(m2.group(1)),
                                        'dose': m2.group(2).strip(), 'doseSimp': to_simp(m2.group(2).strip())})
                elif re.match(r'^[\u4e00-\u9fff]{1,6}$', part):
                    ingredients.append({'herb': part, 'herbSimp': to_simp(part), 'dose': '', 'doseSimp': ''})
        else:
            tokens = re.split(r'[ \u3000]+', line)
            cur = None
            for tok in tokens:
                tok = tok.strip('，,。')
                if not tok:
                    continue
                if tok.startswith('⟨'):
                    # 整个 token 只有夹注（「⟨深師有生薑二兩⟩」）——是校注，不是药
                    continue
                m2 = re.match(r'^([^⟨]+?)(?:⟨([^⟩]*)⟩)?(?:(?:⟨[^⟩]*⟩))*$', tok)
                herb = (m2.group(1) if m2 else tok).strip()
                dose = (m2.group(2) if m2 and m2.group(2) else '').strip()
                # 纯校注碎片（「一法」「一法二分」「深師有生薑二兩」）不是药
                if is_note_token(herb):
                    continue
                if herb:
                    cur = {'herb': herb, 'herbSimp': to_simp(herb), 'dose': dose, 'doseSimp': to_simp(dose)}
                    ingredients.append(cur)
                # 剂量里夹着的下一味药（「三兩，炙細辛三兩」）
                if cur and cur['dose']:
                    cur, extra = absorb_swallowed(cur)
                    if extra:
                        ingredients.append(extra)
    if len(ps) >= 3 and not method:
        method = clean(ps[-1])
    # 服法里另用的药：如「內膠飴一升」（大建中湯，烊化）、「先煮肥大棗十枚」（十棗湯，煎法）。
    # 这些药**不在药味行**，所以不计入「右N味」，单列 methodHerbs —— 否则方解一提到它，
    # 门禁就会判「写了本方没有的药」（这两处正是这么误判的，见 tests/test_jingui_fangjie.js）。
    method_herbs = []
    if method:
        known = {i['herb'] for i in ingredients}
        for m3 in re.finditer(r'(?:內|内|入|煮|煎|投)\s*(?:肥大)?([\u4e00-\u9fff]{1,3}?)([一二三四五六七八九十百千半]+[兩两升合枚箇个斤分])', method):
            h = m3.group(1)
            if h in ('枣', '棗'):          # 「先煮肥大棗十枚」→ 大枣
                h = '大枣'
            # 单字只认这几种（蜜、饴、醋…）；其余单字多为「取」「至」「得」之类动词碎片
            if h in known or (len(h) == 1 and h not in ('蜜', '饴', '醋', '酒')):
                continue
            if any(ch in h for ch in '取内內入煮煎去更上諸诸藥药水湯汤滓汁至得一二三四五六七八九十百千半'):
                continue
            method_herbs.append({'herb': h, 'herbSimp': to_simp(h), 'dose': m3.group(2)})
            known.add(h)
    ref_only = len(ingredients) == 0
    return {'name': name, 'nameSimp': to_simp(name), 'ingredients': ingredients,
            'methodHerbs': method_herbs,
            'method': method, 'methodSimp': to_simp(method), 'refOnly': ref_only,
            'note': head_note}


NOTE_HEADS = ('一法', '一方', '一作', '一本', '一云', '恐是', '疑是', '深師', '深师',
              '千金', '外臺', '外台', '肘後', '肘后', '聖惠', '圣惠')
COOK_WORDS = ('炙', '炮', '洗', '切', '炒', '碎', '擘', '去皮', '去節', '去节', '去尖',
              '去皮尖', '生用', '酒洗', '燒', '烧', '熬', '蒸', '別研', '别研',
              # 源里还有「去汗黃芩」「去蘆黃耆」「去毛」「去核」这类前缀，不剥掉就会把炮制词当药名
              '去汗', '去蘆', '去芦', '去毛', '去核', '去油', '去足', '去翅')


def is_note_token(herb: str) -> bool:
    if not herb:
        return True
    return any(herb.startswith(h) for h in NOTE_HEADS)


def absorb_swallowed(cur):
    """剂量夹注里塞了下一味药：拆成「本味剂量」+「新的一味」。

    只在**看起来像药名+剂量**时才拆。首版没有否决词，把煎服法也拆成了药：
    「川烏⟨五枚，㕮咀，以蜜二升，煎取一升…⟩」拆出「以蜜」，
    「半夏⟨十二枚，以水一升，煮取半升…⟩」拆出「以水」，
    「王不留行⟨十分，八月八日採⟩」拆出「八月」。所以这里要挡三类：
      · 煎服法动词／器具：以、煎、煮、取、内、服、咀、浸、渍、洗
      · 校注与剂量比较：一作、一方、强人、羸人、恐是
      · 采集时间：月、日、採、採
    """
    dose = cur['dose']
    m = re.search(r'[，,、]\s*([\u4e00-\u9fff]{1,5}?)((?:[一二三四五六七八九十百千半兩两升合枚箇个斤分銖铢尺把具片條条]|\d)+.*)$', dose)
    if not m:
        return cur, None
    seg = m.group(0)
    VETO = ('以', '煎', '煮', '取', '内', '內', '服', '咀', '浸', '渍', '漬', '一作', '一方',
            '强人', '強人', '羸人', '恐是', '月', '日', '採', '采', '洗', '去皮', '去節')
    if any(v in seg for v in VETO):
        return cur, None
    herb2 = m.group(1).strip()
    # 「去汗黃芩」「去皮尖杏仁」：把炮制词从前缀剥掉，留下药名
    for w in COOK_WORDS:
        if herb2.startswith(w):
            herb2 = herb2[len(w):].strip()
    if len(herb2) < 2 or is_note_token(herb2):
        return cur, None
    dose2 = m.group(2).strip()
    cur = dict(cur)
    cur['dose'] = dose[:m.start()].strip()
    cur['doseSimp'] = to_simp(cur['dose'])
    return cur, {'herb': herb2, 'herbSimp': to_simp(herb2), 'dose': dose2, 'doseSimp': to_simp(dose2)}


def extract_formula_blocks(part: str):
    """取出 part 里所有 <span class="h-formula"> 块（按标签配对，不能用非贪婪正则）。

    块内嵌着 `<span data-rev="注"><small>…</small></span>`，非贪婪的 `(.*?)</span>`
    会在第一个内层 </span> 就截断，导致后面的药味与煎服法整段丢失
    （9.9 烏頭赤石脂丸、12.23 小青龍湯的细辛就是这样被吞的）。
    """
    out = []
    for m in re.finditer(r'<span class="h-formula">', part):
        i = m.end()
        depth = 1
        j = i
        while depth > 0 and j < len(part):
            nxt_open = part.find('<span', j)
            nxt_close = part.find('</span>', j)
            if nxt_close < 0:
                break
            if 0 <= nxt_open < nxt_close:
                depth += 1
                j = nxt_open + 5
            else:
                depth -= 1
                j = nxt_close + 7
        out.append(part[i:max(i, j - 7)])
    return out


def parse(html: str):
    body = re.sub(r'(?s)<(script|style).*?</\1>', '', html)
    sections = []
    for chunk in re.split(r'(?s)(<h2[^>]*>.*?</h2>)', body):
        m = re.match(r'<h2[^>]*>(.*?)</h2>', chunk, re.S)
        if m:
            title = clean(m.group(1))
            if not title or title.startswith('中醫') or '笈成' in title:
                sections.append(None)
                continue
            sections.append({'name': title, 'html': ''})
            continue
        if sections and sections[-1] is not None:
            sections[-1]['html'] += chunk

    pian = []
    for sec in [s for s in sections if s]:
        # 两种标记并存：老段用 <div data-sec="p" id="1.1">，新段用 <p id="1.3">。
        # 只认 <p id> 会整条丢掉 1.1/1.2/1.13 这类老段（首版就丢了两条「上工治未病」）。
        ids = re.findall(r'<(?:p|div)[^>]*id="(\d+)\.(\d+)"', sec['html'])
        name = sec['name']
        if not ids:
            # 序 / 杂疗方 之外的附篇：无条号，整篇作为一段存
            text, notes = split_note(sec['html'])
            if len(re.sub(r'\s', '', text)) < 20:
                continue
            pian.append({
                'no': None, 'name': name, 'nameSimp': to_simp(name),
                'articles': [{'tiao': None, 'idx': None, 'zhHant': text, 'zhHans': to_simp(text),
                              'notes': notes, 'formulas': []}],
                'chars': len(to_simp(text)),
            })
            continue
        no = int(ids[0][0])
        # 以 <p id="N.M"> 为界切条；条内可含若干 <span class="h-formula">
        parts = re.split(r'(?=<(?:p id|div data-sec="p" id)="\d+\.\d+")', sec['html'])
        articles = []
        for part in parts:
            mm = re.match(r'<(?:p|div)[^>]*id="(\d+)\.(\d+)"', part)
            if not mm:
                continue
            tiao = f'{mm.group(1)}.{mm.group(2)}'
            text, notes = split_note(part)
            formulas = []
            for fb in extract_formula_blocks(part):
                for sub in split_formula_blocks(fb):
                    f = parse_formula(sub)
                    if f and f['name']:
                        formulas.append(f)
            if not text and not formulas:
                continue
            articles.append({
                'tiao': tiao, 'idx': int(mm.group(2)),
                'zhHant': text, 'zhHans': to_simp(text),
                'notes': notes, 'formulas': formulas,
            })
        if articles:
            pian.append({
                'no': no, 'name': name, 'nameSimp': to_simp(name),
                'articles': articles,
                'chars': sum(len(a['zhHans']) for a in articles),
            })
    pian.sort(key=lambda p: (p['no'] is None, p['no'] or 0))
    return pian


def build():
    if not os.path.exists(SRC):
        sys.exit(f'✗ 缺留档 {os.path.relpath(SRC, ROOT)} —— 先抓 source.html（见 README）')
    raw = open(SRC, 'rb').read()
    pian = parse(raw.decode('utf-8', 'replace'))
    formulas = [f for p in pian for a in p['articles'] for f in a['formulas']]
    herbs = {i['herb'] for f in formulas for i in f['ingredients']}
    return {
        'book': '金匱要略方論',
        'bookSimp': '金匮要略方论',
        'author': '張機（仲景）',
        'dynasty': '漢',
        'source': {
            'provider': PROVIDER['id'],
            'providerTitle': PROVIDER['title'],
            'url': PROVIDER['url'],
            'rawUrl': PROVIDER['raw'],
            'edition': PROVIDER['edition'],
            'bytes': len(raw),
            'sha256': sha256_file(SRC),
            'fetchedAt': date.fromtimestamp(os.path.getmtime(SRC)).isoformat(),
        },
        'numbering': '沿用源页 <p id="篇.条"> 的条号（依赵开美本一系）；金匮各本分条略有出入',
        't2s': 'opencc t2s（仅字形）' if T2S is not None else '未安装 opencc，繁简未转换',
        'pian': pian,
        'counts': {
            'pian': len(pian),
            'articles': sum(len(p['articles']) for p in pian),
            'formulas': len(formulas),
            'formulasWithText': sum(1 for f in formulas if not f.get('refOnly')),
            'formulasRefOnly': sum(1 for f in formulas if f.get('refOnly')),
            'herbs': len(herbs),
            'charsHant': sum(len(a['zhHant']) for p in pian for a in p['articles']),
            'charsHans': sum(len(a['zhHans']) for p in pian for a in p['articles']),
        },
    }


def write_md(doc):
    s = doc['source']
    L = ['# 金匱要略方論 · 底本（外源·笈成）\n',
         f"- 来源：{s['providerTitle']} · {s['url']}",
         f"- 底本：{s['edition']}",
         f"- 留档：`standards/jingui/source.html` · {s['bytes']:,} 字节 · sha256 `{s['sha256']}`",
         f"- 抓取：{s['fetchedAt']} · 繁简：{doc['t2s']}",
         f"- 条号：{doc['numbering']}",
         f"- 规模：{doc['counts']['pian']} 篇 · {doc['counts']['articles']} 条 · {doc['counts']['formulas']} 方 · "
         f"{doc['counts']['herbs']} 味药 · {doc['counts']['charsHant']:,} 字（繁）\n",
         '> 引用格式：**外源·笈成·金匱要略方論 第N篇·第M条**；不得标为「底本」（底本 = qhzy-*.xlsx）。\n']
    for p in doc['pian']:
        L.append(f"## 第{p['no']}篇 · {p['nameSimp']}（{p['chars']} 字）\n")
        L.append(f"`{p['name']}`\n")
        for a in p['articles']:
            L.append(f"**{a['tiao']}**  {a['zhHans']}")
            if a['notes']:
                L.append(f"  · 注：{'；'.join(a['notes'])}")
            for f in a['formulas']:
                comp = '、'.join(f"{i['herb']}{i['dose']}" for i in f['ingredients'])
                L.append(f"  · 方：**{f['nameSimp']}** —— {comp}")
                if f['methodSimp']:
                    L.append(f"    法：{f['methodSimp']}")
            L.append('')
    return '\n'.join(L) + '\n'


def check():
    doc = build()
    prev = json.load(io.open(OUT_JSON, encoding='utf-8'))
    errs = []
    if prev['source']['sha256'] != doc['source']['sha256']:
        errs.append(f"sha256 变化：留档 {prev['source']['sha256'][:16]} ≠ 现场 {doc['source']['sha256'][:16]}")
    for k in ('pian', 'articles', 'formulas'):
        if prev['counts'][k] != doc['counts'][k]:
            errs.append(f"{k} 变化：{prev['counts'][k]} → {doc['counts'][k]}")
    if errs:
        print('[jingui] ✗ 底本与留档不一致（网页改版？）\n  ' + '\n  '.join(errs))
        return 1
    c = doc['counts']
    print(f"[jingui] ✓ sha256 {doc['source']['sha256'][:16]} · {c['pian']} 篇 · {c['articles']} 条 · {c['formulas']} 方 · {c['herbs']} 味药")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--sample', nargs=2, metavar=('KEYWORD', 'N'))
    ap.add_argument('--tiao', metavar='篇.条')
    args = ap.parse_args()

    if args.check:
        return check()

    doc = build()
    if args.tiao:
        for p in doc['pian']:
            for a in p['articles']:
                if a['tiao'] == args.tiao:
                    print(f"第{p['no']}篇 {p['nameSimp']} · 第{a['idx']}条")
                    print(f"  简：{a['zhHans']}")
                    print(f"  繁：{a['zhHant']}")
                    if a['notes']:
                        print(f"  注：{'；'.join(a['notes'])}")
                    for f in a['formulas']:
                        comp = '、'.join(f"{i['herb']}{i['dose']}" for i in f['ingredients'])
                        print(f"  方：{f['nameSimp']} —— {comp}\n      法：{f['methodSimp']}")
        return 0

    if args.sample:
        kw, n = args.sample[0], int(args.sample[1])
        for p in doc['pian']:
            if kw in p['nameSimp']:
                print(f"── 第{p['no']}篇 {p['nameSimp']}（{p['chars']} 字）")
                for a in p['articles'][:n]:
                    print(f"  {a['tiao']} {a['zhHans'][:90]}")
                    for f in a['formulas']:
                        print(f"      方：{f['nameSimp']}")
        return 0

    with io.open(OUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write('\n')
    with io.open(OUT_MD, 'w', encoding='utf-8') as f:
        f.write(write_md(doc))
    c = doc['counts']
    print('═══ 金匮要略底本 ═══')
    print(f"  篇 {c['pian']} · 条 {c['articles']} · 方 {c['formulas']} · 药 {c['herbs']} · 繁字 {c['charsHant']:,}")
    print(f"  sha256 {doc['source']['sha256']}")
    print('  → standards/jingui/底本.json · 底本.md')
    return 0


if __name__ == '__main__':
    sys.exit(main())
