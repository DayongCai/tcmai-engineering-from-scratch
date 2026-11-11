# -*- coding: utf-8 -*-
"""scripts/wire_neijing_chapters.py —— 把《内经选读》10 章接上底本

为什么需要它：
  底本（standards/neijing-xuandu）入库后，10 章 docs 里的《素问·》《灵枢·》引文仍是手写的，
  `code/` 一个字节都没读底本——课与底本之间没有可复算的连接。这个脚本补的就是那一步：

  1. 给每章定「本章篇目」（按主题，不是只按被引到的篇）；
  2. 同一篇在**教材选读本**（neijing-xuandu）与**全文**（materials/neijing-quanwen）里的字数与相似度
     → 标 `full`（全文）/ `excerpt`（节选），让读者知道教材本缺了什么；
  3. 逐条核 docs 的引文行：在全文篇内是否逐字命中（折叠已知异体），漏在哪一条；
  4. 产出 `standards/neijing-xuandu/chapter-map.json`、每章 docs 的「底本对读」块、
     每章 `code/neijing.js` + `code/neijing.test.js`（数字写死，换底本必红）。

用法：
  python scripts/wire_neijing_chapters.py            # 写全部
  python scripts/wire_neijing_chapters.py --check    # 幂等校验
"""

from __future__ import annotations

import argparse
import difflib
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XUANDU = os.path.join(ROOT, 'standards', 'neijing-xuandu')
FULL = os.path.join(ROOT, 'standards', 'materials', 'neijing-quanwen', 'content.json')
SUBJ = os.path.join(ROOT, 'departments', '01-zhongyi', '06-neijing-xuandu')
CHDIR = os.path.join(SUBJ, 'chapters')

HAN = re.compile(r'[\u3400-\u4dbf\u4e00-\u9fff\U00020000-\U0003ffff]')
# 已知异体/通假：只在核对时折叠，不改原文
FOLD = str.maketrans({'遊': '游', '於': '于', '穀': '谷', '欬': '咳', '徧': '遍', '臟': '藏'})


def norm(s: str) -> str:
    return re.sub(r'[^\u3400-\u4dbf\u4e00-\u9fff\U00020000-\U0003ffff]', '', s or '').translate(FOLD)


# 章 → 本章篇目（教材本篇名；主题覆盖，不只列被引到的篇）
CHAPTER_PIANS = {
    '01-suwen-chengshu': ['上古天真论', '阴阳应象大论', '至真要大论', '九针十二原'],
    '02-yinyang-yingxiang': ['阴阳应象大论', '阴阳离合论', '阴阳别论', '生气通天论', '四气调神大论'],
    '03-zangxiang-xitong': ['六节藏象论', '五脏生成', '五脏别论', '灵兰秘典论', '本脏'],
    '04-jingmai-bielun': ['经脉别论', '经脉', '骨空论', '营气', '经别'],
    '05-bingji-shijiu': ['至真要大论', '调经论', '举痛论'],
    '06-zhenfa-maiyao': ['脉要精微论', '平人气象论', '五色', '诊要经终论'],
    '07-zhize-biaoben': ['至真要大论', '标本病传论', '阴阳应象大论', '异法方宜论'],
    '08-lunqi-qipian': ['天元纪大论', '五运行大论', '六微旨大论', '气交变大论', '五常政大论',
                        '六元正纪大论', '至真要大论', '遗篇·刺法论', '遗篇·本病论'],
    '09-lingshu-jiuzhen': ['九针十二原', '官针', '小针解', '九针论', '刺节真邪', '针解'],
    '10-neijing-lianghua': ['经脉别论', '阴阳应象大论', '至真要大论', '六节藏象论', '九针十二原'],
}


# 教材本篇名 → 全文篇名（今字/遗篇前缀差异）
ALIAS = {
    '五脏生成': '五藏生成',
    '五脏别论': '五藏别论',
    '本脏': '本藏',
    '玉机真脏论': '玉机真藏论',
    '脏气法时论': '藏气法时论',
    '邪气脏腑病形': '邪气藏府病形',
    '忧恚无言': '忧患无言',
    '遗篇·刺法论': '刺法论',
    '遗篇·本病论': '本病论',
    '上膈': '上隔',
    '背腧': '背俞',
}


def load():
    B = json.load(io.open(os.path.join(XUANDU, 'units.json'), encoding='utf-8'))
    A = json.load(io.open(FULL, encoding='utf-8'))
    xuandu = {u['title']: u for u in B['units']}
    full = {}
    for s in A['sections']:
        title = s['title'].split('·')[-1]
        full[title] = ''.join(b['text'] for b in s['blocks'] if b['type'] == '原文')
    # 异名：教材本用今字（本脏/五脏生成），全文本仍作古字（本藏/五藏生成）。
    # 逐条列表，不靠模糊匹配 —— 模糊匹配把「本脏」判到别的篇，会把该篇静默算成「节选 0 字」。
    alias = {}
    for t in xuandu:
        if t in full:
            alias[t] = t
        elif t in ALIAS:
            assert ALIAS[t] in full, f'异名表指向不存在的篇：{t} → {ALIAS[t]}'
            alias[t] = ALIAS[t]
    return B, A, xuandu, full, alias


QUOTE = re.compile(r'^>\s*(?:\*\*MOTTO:\*\*\s*)?(.+?)——\s*《(?:素问|灵枢)·([^》]+)》', re.M)


def chapter_stats(slug, xuandu, full, alias):
    rows, tot_x, tot_f = [], 0, 0
    for name in CHAPTER_PIANS[slug]:
        if name not in xuandu:
            raise SystemExit(f'{slug}: 教材本没有篇「{name}」')
        u = xuandu[name]
        fname = alias.get(name)
        if not fname or fname not in full:
            raise SystemExit(f'{slug}/{name}: 全文里找不到对应篇（补 ALIAS 表，不许静默写 0）')
        body_f = full[fname]
        nx, nf = len(norm(u['body'])), len(norm(body_f))
        ratio = difflib.SequenceMatcher(None, norm(u['body']), norm(body_f)).ratio() if nf else 0.0
        rows.append({
            'title': name,
            'fullTitle': fname or '',
            'locator': u['locator'],
            'xuanduHanzi': nx,
            'fullHanzi': nf,
            'ratio': round(ratio, 3),
            'edition': 'full' if ratio >= 0.9 else 'excerpt',
        })
        tot_x += nx
        tot_f += nf
    return rows, tot_x, tot_f


def quotes_of(slug):
    """引文行 = 以「——」收尾给出《书名·篇名》的整行；「……」表示节引，按段分别核。"""
    md = io.open(os.path.join(CHDIR, slug, 'docs', 'zh.md'), encoding='utf-8').read()
    out = []
    for m in QUOTE.finditer(md):
        text, pian = m.group(1).strip(), m.group(2).strip()
        t = re.sub(r'^「|」$', '', text).strip()
        segs = [norm(x) for x in re.split(r'…+', t)]
        segs = [x for x in segs if len(x) >= 4]
        if segs:
            out.append({'pian': pian, 'segs': segs, 'text': ''.join(segs)})
    return out


def verify(quotes, full, alias):
    """逐段核：节引的每一段都要在同一篇里按序出现（允许省略，不许改字）。"""
    inv = {v: k for k, v in alias.items()}
    res = []
    for q in quotes:
        cand = [q['pian'], inv.get(q['pian'], q['pian'])]
        body = norm(next((full[c] for c in cand if c in full), ''))
        pos, ok = 0, bool(body)
        for seg in q['segs']:
            i = body.find(seg, pos)
            if i < 0:
                ok = False
                break
            pos = i + len(seg)
        res.append({**q, 'hitFull': ok, 'len': sum(len(x) for x in q['segs'])})
    return res


JS = r"""'use strict';
/**
 * 第 __N__ 章 · 底本对读
 *
 *   node code/neijing.js
 *
 * 两份语料，各管一段：
 *   · standards/neijing-xuandu/units.json         教材选读本（31 篇类 / 162 篇，含注释与通读）
 *   · standards/materials/neijing-quanwen/content.json  全文（162 篇，155,206 字）
 * 本章篇目在两边各多少字、教材本有没有节选、docs 的引文能否逐字落到全文——都从这里现算。
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const MAP = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/neijing-xuandu/chapter-map.json'), 'utf8'));
const CHAPTER = MAP.chapters.find((c) => c.slug === '__SLUG__');
if (!CHAPTER) throw new Error('chapter-map.json 里没有 __SLUG__');

function report() {
  const lines = [];
  lines.push('');
  lines.push('═══ 第 __N__ 章 · 底本对读（__SLUG__）═══');
  lines.push(`  教材本 ${CHAPTER.totals.xuanduHanzi.toLocaleString()} 字 · 全文 ${CHAPTER.totals.fullHanzi.toLocaleString()} 字 · `
    + `覆盖 ${(CHAPTER.totals.coverage * 100).toFixed(1)}% · 节选 ${CHAPTER.totals.excerpt} 篇`);
  for (const p of CHAPTER.pians) {
    lines.push(`  ${p.edition === 'excerpt' ? '节选' : '全文'} ${p.title}  教材 ${p.xuanduHanzi} / 全文 ${p.fullHanzi}  相似度 ${p.ratio}`);
  }
  lines.push(`  引文 ${CHAPTER.quotes.lines} 条 · 全文篇内命中 ${CHAPTER.quotes.hitFull}`);
  for (const b of CHAPTER.quotes.missing) lines.push(`  ✗ 未命中：${b.pian}「${b.preview}」`);
  lines.push('  边界：本章只有这 ' + CHAPTER.pians.length + ' 篇是「本章篇目」，其余篇目不在本章口径内。');
  return lines;
}

module.exports = { CHAPTER, MAP, report };

if (require.main === module) {
  for (const l of report()) console.log(l);
}
"""

TEST = r"""'use strict';
/**
 * 第 __N__ 章的底本对读：三个数字必须能从两份语料现算，
 * 与 docs 里「底本对读」块写的一致（换底本/改引文都会红）。
 */
const assert = require('node:assert');
const test = require('node:test');
const { CHAPTER } = require('./neijing.js');

test('本章篇目 __PC__ 篇，教材本 __XH__ 字 / 全文 __FH__ 字', () => {
  assert.strictEqual(CHAPTER.pians.length, __PC__);
  assert.strictEqual(CHAPTER.totals.xuanduHanzi, __XH__);
  assert.strictEqual(CHAPTER.totals.fullHanzi, __FH__);
});

test('节选篇 __EX__ 篇（教材本 < 全文 90%）', () => {
  assert.strictEqual(CHAPTER.totals.excerpt, __EX__);
  for (const p of CHAPTER.pians) {
    if (p.edition === 'excerpt') assert.ok(p.ratio < 0.9, `${p.title} 标了节选但相似度 ${p.ratio}`);
  }
});

test('引文 __QL__ 条，全文篇内逐字命中 __QH__ 条', () => {
  assert.strictEqual(CHAPTER.quotes.lines, __QL__);
  assert.strictEqual(CHAPTER.quotes.hitFull, __QH__);
  assert.strictEqual(CHAPTER.quotes.missing.length, __QL__ - __QH__);
});

test('每篇都能回指 locator（教材·书名·篇名（第N篇））', () => {
  for (const p of CHAPTER.pians) {
    assert.ok(/^黄帝内经·(素问|灵枢)·.+（(素问|灵枢)第[0-9]+篇）$/.test(p.locator), p.locator);
  }
});
"""


def docs_block(ch, rows, tot_x, tot_f, qres):
    hit = sum(1 for q in qres if q['hitFull'])
    miss = [q for q in qres if not q['hitFull']]
    ex = sum(1 for r in rows if r['edition'] == 'excerpt')
    L = ['## 底本对读（自动生成，勿手改）', '']
    L.append(f'| 项 | 值 |')
    L.append('|---|---|')
    L.append(f"| 本章篇目 | {len(rows)} 篇（教材本 {tot_x:,} 字 / 全文 {tot_f:,} 字，覆盖 {tot_f and 100 * tot_x / tot_f:.1f}%） |")
    L.append(f"| 节选篇 | {ex} 篇（教材本 < 全文 90%） |")
    L.append(f"| docs 引文 | {len(qres)} 条，**全文篇内逐字命中 {hit} 条** |")
    L.append(f"| 底本 | 教材本 `standards/neijing-xuandu`（sha 见 README）· 全文 `standards/materials/neijing-quanwen`（155,206 字） |")
    L.append('')
    L.append('| 篇 | 版本 | 教材本字数 | 全文字数 | 相似度 | 定位 |')
    L.append('|---|---|--:|--:|--:|---|')
    for r in rows:
        L.append(f"| {r['title']} | {'节选' if r['edition'] == 'excerpt' else '全文'} | {r['xuanduHanzi']:,} | {r['fullHanzi']:,} | {r['ratio']} | {r['locator']} |")
    L.append('')
    if miss:
        L.append('未命中的引文（须改标篇名或补省略号，不许放着）：')
        for q in miss:
            L.append(f"- 《{q['pian']}》「{q['text'][:24]}…」（{q['len']} 字）")
        L.append('')
    L.append('> 口径：逐字命中＝引文去掉标点后能在**该篇全文**里连续找到（折叠 遊/游、於/于 等已知异体）。')
    L.append('> 教材本与全文不是同一文本：教材本是选读本，节选篇只保留教材要讲的部分，所以「教材本有、全文也有」才算同源；')
    L.append('> 「教材本无、全文有」的段落不能引，只能说明是教材略去。')
    L.append('')
    return '\n'.join(L)


BEGIN, END = '<!-- neijing:begin -->', '<!-- neijing:end -->'


def insert_block(md, block):
    if BEGIN in md and END in md:
        head, rest = md.split(BEGIN, 1)
        _, tail = rest.split(END, 1)
        return head + BEGIN + '\n' + block + END + tail
    # 首次插入：放在「## 代价与边界」之前；没有就追加到末尾
    for anchor in ('## 代价与边界', '## 练习'):
        i = md.find(anchor)
        if i >= 0:
            return md[:i] + BEGIN + '\n' + block + END + '\n' + md[i:]
    return md.rstrip() + '\n\n' + BEGIN + '\n' + block + END + '\n'


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    a = ap.parse_args()

    B, A, xuandu, full, alias = load()
    out = {}
    chapters = []
    for n, slug in enumerate(CHAPTER_PIANS, 1):
        rows, tot_x, tot_f = chapter_stats(slug, xuandu, full, alias)
        qres = verify(quotes_of(slug), full, alias)
        hit = sum(1 for q in qres if q['hitFull'])
        chapters.append({
            'n': n, 'slug': slug, 'pians': rows,
            'totals': {'xuanduHanzi': tot_x, 'fullHanzi': tot_f,
                       'coverage': round(tot_x / tot_f, 4) if tot_f else 0,
                       'excerpt': sum(1 for r in rows if r['edition'] == 'excerpt')},
            'quotes': {'lines': len(qres), 'hitFull': hit,
                       'missing': [{'pian': q['pian'], 'len': q['len'], 'preview': q['text'][:24]}
                                   for q in qres if not q['hitFull']]},
        })
        md_path = os.path.join(CHDIR, slug, 'docs', 'zh.md')
        md = io.open(md_path, encoding='utf-8').read()
        out[md_path] = insert_block(md, docs_block(slug, rows, tot_x, tot_f, qres))
        code_dir = os.path.join(CHDIR, slug, 'code')
        out[os.path.join(code_dir, 'neijing.js')] = (JS.replace('__N__', str(n))
                                                    .replace('__SLUG__', slug))
        out[os.path.join(code_dir, 'neijing.test.js')] = (
            TEST.replace('__N__', str(n)).replace('__PC__', str(len(rows)))
            .replace('__XH__', str(tot_x)).replace('__FH__', str(tot_f))
            .replace('__EX__', str(sum(1 for r in rows if r['edition'] == 'excerpt')))
            .replace('__QL__', str(len(qres))).replace('__QH__', str(hit)))

    map_doc = {
        'book': '黄帝内经',
        'xuandu': {'dir': 'standards/neijing-xuandu', 'pians': len(xuandu),
                   'hanzi': sum(u['hanzi'] for u in xuandu.values())},
        'full': {'file': 'standards/materials/neijing-quanwen/content.json',
                 'pians': len(full), 'hanzi': sum(len(norm(v)) for v in full.values())},
        'alias': {k: v for k, v in alias.items() if k != v},
        'chapters': chapters,
        'generated': 'scripts/wire_neijing_chapters.py',
    }
    out[os.path.join(XUANDU, 'chapter-map.json')] = json.dumps(map_doc, ensure_ascii=False, indent=1) + '\n'

    if a.check:
        drift = [os.path.relpath(p, ROOT) for p, t in out.items()
                 if (io.open(p, encoding='utf-8').read() if os.path.exists(p) else '') != t]
        if drift:
            print('DRIFT:', ', '.join(drift))
            return 1
        print(f"[neijing-wire] ✓ 10 章与 chapter-map.json 一致（{sum(c['quotes']['lines'] for c in chapters)} 条引文，"
              f"命中 {sum(c['quotes']['hitFull'] for c in chapters)}）")
        return 0

    for p, t in out.items():
        os.makedirs(os.path.dirname(p), exist_ok=True)
        io.open(p, 'w', encoding='utf-8').write(t)
    print('[neijing-wire] 写入', len(out), '个文件')
    for c in chapters:
        print(f"  {c['n']:>2} {c['slug']:<24} 篇 {len(c['pians'])} · "
              f"教材 {c['totals']['xuanduHanzi']:>6,} / 全文 {c['totals']['fullHanzi']:>7,} · "
              f"节选 {c['totals']['excerpt']} · 引文 {c['quotes']['hitFull']}/{c['quotes']['lines']}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
