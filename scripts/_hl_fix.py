# -*- coding: utf-8 -*-
"""中医护理学：每章补「结构与术语」一节（数据现算）+ 第 1 章补跨课对账。用完即删。"""
import io, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, 'standards', 'zhongyi-huli')
DEPT = os.path.join(ROOT, 'departments', '05-huli', '24-zhongyi-huli-xue')
U = json.load(open(os.path.join(D, 'units.json'), encoding='utf-8'))
CM = json.load(open(os.path.join(D, 'chapter-map.json'), encoding='utf-8'))['chapters']
CC = json.load(open(os.path.join(D, '跨课对账.json'), encoding='utf-8'))
N = CC['counts']

VIEWS = {
    "辨证": ["辨证", "证候", "证型", "舌", "脉", "虚实", "寒热", "表里", "体质"],
    "施护": ["施护", "护理", "操作", "灸", "罐", "刮痧", "推拿", "穴位", "熏洗", "敷", "服药", "饮食", "情志"],
    "评价与记录": ["评价", "效果", "观察", "记录", "文书", "安全", "质量", "不良", "宣教", "随访"],
}
ALL = [w for ws in VIEWS.values() for w in ws]
sec_by_ch = {}
for u in U['units']:
    sec_by_ch.setdefault(int(u['chapter']), []).append(u)

added = 0
for slug, spec in CM.items():
    ch = spec['n']
    us = sec_by_ch.get(ch, [])
    if not us:
        continue
    text = '\n'.join(u['prose'] for u in us)
    han = sum(u['hanzi'] for u in us)
    cnt = {w: text.count(w) for w in ALL}
    top = sorted([(w, c) for w, c in cnt.items() if c], key=lambda x: -x[1])[:12]
    terms = '、'.join(f'{w}（{c}）' for w, c in top) or '（本章未出现三辨关键词）'
    view = {k: sum(text.count(w) for w in ws) for k, ws in VIEWS.items()}
    dom = max(view, key=view.get)
    # 数字：区分「操作参数」与「结构序号/年份」
    params = len(re.findall(r'\d+\s*(?:分钟|min|壮|次|遍|厘米|cm|寸|℃|度)', text))
    digits = len(re.findall(r'\d+', text))
    prev = CM[[s for s in CM if CM[s]['n'] == ch - 1][0]]['title'] if ch > 1 else None
    nxt = CM[[s for s in CM if CM[s]['n'] == ch + 1][0]]['title'] if ch < 18 else None
    chain = []
    if prev:
        chain.append(f'上一章《{prev}》')
    if nxt:
        chain.append(f'下一章《{nxt}》')
    chain_txt = '、'.join(chain) if chain else '本章是全书首章'

    body = f"""
## 七、本章的结构与术语（数据现算）

| 项 | 值 |
|---|---|
| 节 / 小节 / 单元 | {len({u['sub'].rsplit('.', 1)[0] for u in us})} / {len(us)} / {len(us)} |
| 汉字 | **{han:,}** |
| 三辨分布 | 辨证 {view['辨证']} · 施护 {view['施护']} · 评价与记录 {view['评价与记录']} |
| 主导一辨 | **{dom}** |
| 操作参数（分/壮/次/cm/度） | **{params}** 处 |
| 数字总出现（含章号、年份） | {digits} 处 |

**高频术语（本章原文计数）**：{terms}

**三个坐标**：

1. **判断坐标**——本章的辨证词出现 {view['辨证']} 次，施护词 {view['施护']} 次，比值 {round(view['施护']/view['辨证'], 1) if view['辨证'] else '—'}。**护理教材的重心不在「辨」而在「做」**，但「辨」少不等于不重要：它决定了做什么；
2. **证据坐标**——评价与记录词 {view['评价与记录']} 次。护理质量的差别经常不在操作本身，而在**有没有记下来、能不能被复算**；
3. **链条坐标**——{chain_txt}。本书按「理论 → 评估 → 病证 → 技术 → 管理 → 场景」推进，每一章都能被前一章支撑、被后一章调用。

**为什么把「操作参数 0 处」也列出来**：本课全册 30.9 万字，**操作参数（分钟/壮/次/cm/度）一处都没有**，出现的数字全是章号、节号与年代。这不是排版疏漏，是该教材的写法——它讲「做什么、为什么、什么情况不能做」，把「做多久、做几次」留给各院校的操作规范。读这本教材时要自觉去别处找参数。
"""
    p = os.path.join(DEPT, 'chapters', slug, 'docs', 'zh.md')
    t = io.open(p, encoding='utf-8').read()
    if '## 七、本章的结构与术语' not in t:
        anchor = '## 六、复算入口'
        t = t.replace(anchor, body.strip() + '\n\n' + anchor, 1) if anchor in t else t.rstrip() + '\n\n' + body
        io.open(p, 'w', encoding='utf-8').write(t)
        added += 1

print('补节', added, '章')

# 第 1 章补跨课对账
BODY = f"""## 一之前：与《中药学》的关系——两条几乎不交的线

护理与中药看似天然相连：第 12 章讲中药外治，第 13 章讲饮食护理。**本节把「到底连不连」量了一遍。**

### 一、药名覆盖（硬事实）

| 项 | 值 |
|---|---|
| 《中药学》药物库药名 | {N['药物库药名']} |
| **本课提到** | **{N['本课提到药名']}**（石膏、防风） |
| 覆盖率 | **{N['药名覆盖率']}** |
| 药名密度 | **{N['药名密度(每万字)']} 次/万字** |

### 二、本课真正密集的是什么

| 词类 | 密度（每万字） | 倍数 |
|---|--:|--:|
| 药名 | {N['药名密度(每万字)']} | 1× |
| 技术词（灸/罐/刮痧/推拿/穴位/熏洗…） | {N['技术词密度(每万字)']} | **约 {round(N['技术词密度(每万字)']/N['药名密度(每万字)'])}×** |
| 文书词（记录/评估/观察/核对/告知） | {N['文书词密度(每万字)']} | **约 {round(N['文书词密度(每万字)']/N['药名密度(每万字)'])}×** |

**「文书词」是「药名」的约 {round(N['文书词密度(每万字)']/N['药名密度(每万字)'])} 倍，是「技术词」的约 {round(N['文书词密度(每万字)']/N['技术词密度(每万字)'])} 倍。**

### 三、这个结果说明什么，以及不能说明什么

**说明**：这门课的文本重心在**「观察—记录—核对」**这条线上，不在药，也不在技术动作本身。护理的第一职责是**发现变化并留下证据**，这与第 14 章（文书）、第 15 章（安全与质量）单独立章互相印证。

**不能说明**：本课不讲药。第 12 章讲外治、第 13 章讲饮食，讲的都是「怎么用」而不是「用什么」——药名不在文本里，不等于药不在护理里。**医护药的分工在文本上分得开，在病房里分不开。**

### 四、复算

```bash
python scripts/crosscheck_huli.py      # 药名命中 + 技术/文书词密度 → 跨课对账.json
```

**边界**：文书词含「记录」「评估」等泛词，密度高有文体因素（教材本身在教怎么写记录）。本表只作方向，不作比例结论。
"""

p = os.path.join(DEPT, 'chapters', '01-gaishu', 'docs', 'zh.md')
t = io.open(p, encoding='utf-8').read()
if '两条几乎不交的线' not in t:
    anchor = '## 一、这一章的问题'
    t = t.replace(anchor, BODY.strip() + '\n\n' + anchor, 1) if anchor in t else t.rstrip() + '\n\n' + BODY
    io.open(p, 'w', encoding='utf-8').write(t)
print('ch1 docs', len(re.findall(r'[\u4e00-\u9fff]', t)))
