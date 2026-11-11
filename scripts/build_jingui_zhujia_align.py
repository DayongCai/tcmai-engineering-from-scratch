# -*- coding: utf-8 -*-
"""scripts/build_jingui_zhujia_align.py —— 三家注的结构化与逐条对齐（校勘登记）

输入：standards/jingui/zhujia/raw/<slug>.html（已按字节留档，sha256 见 manifest.json）
输出：
  standards/jingui/zhujia/books/<slug>.json    篇 → 块（原文 / 其注文）
  standards/jingui/zhujia/align.json           398 条 → 三家注命中（条号 → {slug: 块数}）
  standards/jingui/zhujia/校勘登记.md           逐书逐篇命中/未命中/一对多，全部可复算
  standards/jingui/zhujia/manifest.json        回写结构计数（fetch 阶段只做留档）

为什么按「文本相似度」而不是「条号」对齐：
  三家注的分条与笈成本不同——心典常把两三条并作一段讲，淺註有时把一条拆成两段。
  按条号对齐会假精确。这里把注本的每个「原文块」与本篇底本条文做去标点相似度比较
  （difflib.ratio，前缀 60 字内），≥0.60 即认作同条；一条多块、一块多条都如实登记。

用法：
  python scripts/build_jingui_zhujia_align.py            # 生成 JSON + 登记表
  python scripts/build_jingui_zhujia_align.py --check    # 幂等校验
"""
from __future__ import annotations

import difflib
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZD = os.path.join(ROOT, "standards", "jingui", "zhujia")
RAW = os.path.join(ZD, "raw")
BOOKS = os.path.join(ZD, "books")
MANIFEST_PATH = os.path.join(ZD, "manifest.json")
BEN_PATH = os.path.join(ROOT, "standards", "jingui", "底本.json")

BEN = json.load(io.open(BEN_PATH, encoding="utf-8"))
HAN = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff]")
TAG = re.compile(r"<[^>]+>")
THRESH = 0.60
NL = chr(10)


def write_text(path: str, text: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with io.open(path, "w", encoding="utf-8", newline=NL) as f:
        f.write(text)


def write_json(path: str, obj) -> None:
    write_text(path, json.dumps(obj, ensure_ascii=False, indent=1) + NL)


def clean(s: str) -> str:
    s = re.sub(r"<br\s*/?>", NL, s)
    s = TAG.sub("", s)
    s = s.replace("&nbsp;", " ").replace("\u3000", " ").replace("\xa0", " ")
    return s.strip()


# 异体/异文归一：只影响「对齐」计算，不改输出文本。
# 三个最常见的是 臟/藏（心典「餘臟准此」vs 底本「餘藏准此」）、癉/疸、噦/哕；
# 不做这一步，1.1 这种长条会因为末 12 字里有一个异体而整段判不出注文（第一版就是这么漏的）。
VARIANT = str.maketrans({
    "臟": "藏", "藏": "藏", "癉": "疸", "疸": "疸", "噦": "哕", "哕": "哕",
    "痙": "痓", "痓": "痓", "欬": "咳", "鞕": "硬", "硬": "硬", "胷": "胸",
    "鬲": "膈", "麤": "粗", "藭": "穷", "芎": "穷", "準": "准", "准": "准",
})


def only_han(s: str) -> str:
    return "".join(HAN.findall(s)).translate(VARIANT)


PAREN = re.compile(r"（[^（）]*）|\([^()]*\)|〔[^〔〕]*〕")


def strip_gloss(s: str) -> str:
    """去掉行内夹注（全角/半角括号、〔〕），只留主文。

    为「对齐」而做：淺註把注文用小字夹在原文句中（`見肝（邪）之（為實）病`），
    不去夹注的话，整段与底本的相似度会被注文稀释到阈值以下——第一版只认出 46 块就是这个原因。
    输出（books/*.json）里仍然保留原样段落，夹注不删，只是不参与相似度计算。
    """
    prev = None
    out = s
    while prev != out:
        prev = out
        out = PAREN.sub("", out)
    return out


def parse_book(slug: str) -> list:
    """按 h1（卷/序）→ h2（篇）切块，返回 [{juan,title,paras}]。"""
    html = io.open(os.path.join(RAW, "%s.html" % slug), encoding="utf-8", errors="replace").read()
    heads = [(m.start(), int(m.group(1)), clean(m.group(2))) for m in
             re.finditer(r"<h([12])[^>]*>(.*?)</h\1>", html, re.S)]
    paras = [(m.start(), clean(m.group(1))) for m in re.finditer(r"<p[^>]*>(.*?)</p>", html, re.S)]
    sections = []
    for i, (pos, level, title) in enumerate(heads):
        if level != 2:
            continue
        end = len(html)
        for pos2, _lv2, _t2 in heads[i + 1:]:
            end = pos2
            break
        juan = ""
        for pos0, lv0, t0 in heads[:i]:
            if lv0 == 1:
                juan = t0
        body = [t for p, t in paras if pos < p < end and t]
        sections.append({"juan": juan, "title": title, "paras": body})
    return sections


def ben_pians() -> dict:
    """按顺序给底本 26 段编号（22 正文 + 序 + 3 附），与注本 h2 的出现顺序一一对应。"""
    out = {}
    i = 0
    for p in BEN["pian"]:
        if p.get("no"):
            out[i] = p
            i += 1
    for p in BEN["pian"]:
        if not p.get("no"):
            out[i] = p
            i += 1
    return out


def split_inline_note(para: str, ben_hant: str) -> tuple:
    """把「原文 + 同段注文」拆开（心典的写法：一段里先原文，紧接「按、……」。）

    做法：取底本该条去标点后的**尾 12 字**作锚点，在注本段落里去标点文本中定位；
    锚点之后的部分即注文。找不到锚点（句式差异太大）就整段当原文、不拆。
    返回 (原文段, 注文段) —— 两段都是原文原样（未删字），只是切开。
    """
    n = only_han(para)
    bn = only_han(ben_hant)
    if len(bn) < 12 or len(n) < len(bn) + 8:
        return para, ""
    anchor = bn[-12:]
    idx = n.rfind(anchor)
    if idx < 0:
        # 退一步：末 12 字里仍有异文时，用末 8 字再试一次（宁可少切，不可错切）
        anchor = bn[-8:]
        idx = n.rfind(anchor)
    if idx < 0:
        return para, ""
    end_norm = idx + len(anchor)
    # 归一化下标 → 原串下标（按汉字计数走）
    count = 0
    cut = len(para)
    for i, ch in enumerate(para):
        if HAN.match(ch):
            count += 1
            if count == end_norm:
                cut = i + 1
                break
    src = para[:cut].strip()
    note = para[cut:].strip().strip("。，、；：！？（）()「」『』　 ")
    # 只留下了夹注残片（如「（余臟。他臟也……）」）时不算注文：宁可空，不可把夹注当注
    if len(only_han(note)) < 20:
        return para, ""
    return src, note


def pair_blocks(section: dict, pian: dict) -> list:
    arts = sorted(pian.get("articles") or [], key=lambda a: a["idx"])
    ben_norm = [(a, only_han(a["zhHant"])) for a in arts]
    blocks = []
    cur = None
    for para in section["paras"]:
        n = only_han(strip_gloss(para))
        if len(n) < 4:
            continue
        best, best_r = None, 0.0
        for a, bn in ben_norm:
            k = min(len(n), len(bn), 60)
            if k < 8:
                continue
            r = difflib.SequenceMatcher(None, n[:k], bn[:k]).ratio()
            if r > best_r:
                best, best_r = a, r
        if best is not None and best_r >= THRESH:
            src, inline = split_inline_note(para, best["zhHant"])
            notes = [inline] if inline else []
            cur = {"tiao": best["tiao"], "src": src, "notes": notes, "ratio": round(best_r, 3)}
            blocks.append(cur)
        elif cur is not None:
            cur["notes"].append(para)
        else:
            blocks.append({"tiao": None, "src": None, "notes": [para], "ratio": 0})
    return blocks


# ─────────────────────────────────────────────────────────────────────────────
# 《醫宗金鑑·訂正仲景全書金匱要略註》：**字段式**版式（笈成「條列版」）
#   每条一个 <pre>：「篇名：… 編號：藏府001 經文：… 按：[1]… 註：[1]… 集註：徐彬曰…」
# 与三家注的 h2/p 结构完全不同，所以单走一条解析路径；但出来的块结构一致，
# 后面的对齐、校勘登记、教材落引文全部复用。
# 对齐优势：金鑑自己带「編號」（篇内序号），可与底本条号交叉验证，不必只靠相似度。
# ─────────────────────────────────────────────────────────────────────────────
YIZONG_RAW = os.path.join(RAW, "yizong-tiaolie.html")
FIELD = re.compile(r"(集註|篇名|編號|經文|按|註|方|附)：")
YIZONG_NOTE_LABELS = ("按", "註", "集註", "方", "附")

# 底本的篇名存的是**简体**（`nameSimp`，`title` 为 None）；金鑑是繁体。
# 不转字形直接算相似度，「藏府經絡先後病脈證第一」对「脏腑经络先后病脉证第一」只有 0.36，
# 22 篇里只认出 4 篇（第一版就是这个结果）——所以比较前先 t2s。
try:
    import opencc  # noqa: E402

    _T2S = opencc.OpenCC("t2s")
except Exception:  # opencc 缺失时退化为不转换（--check 会因此显形）
    class _NoT2S:
        @staticmethod
        def convert(s):
            return s

    _T2S = _NoT2S()


FANG_LABEL = re.compile(r"方[剂劑]：")


def extract_formulas(fields: dict) -> list:
    """从「註／集註／按」里切出「方剂：」之后的方文。

    笈成條列版把方剂写在注文里（`方剂： 栝蒌桂枝汤方 栝蒌根二两 …`），没有独立字段；
    所以按标签切：`方剂：` 之后直到该字段末尾都是方文，首词即方名。
    附篇那 191 个「經文=方名」的块，方文同样在 `方剂：` 之后，一套规则通吃。
    """
    out = []
    for src_label in ("方", "按", "註", "集註"):
        for v in fields.get(src_label, []):
            for m in FANG_LABEL.finditer(v):
                body = v[m.end():].strip()
                if len(only_han(body)) < 4:
                    continue
                name = re.split(r"[\s　]", body)[0] if body else ""
                out.append({"name": name, "text": body, "from": src_label})
    return out


def parse_yizong() -> list:
    """條列版 → [{juan, title, blocks:[{tiao, src, notes, ratio, bianhao}]}]"""
    if not os.path.exists(YIZONG_RAW):
        return []
    raw = io.open(YIZONG_RAW, encoding="utf-8", errors="replace").read()
    pres = re.findall(r'<pre data-sec="p">(.*?)</pre>', raw, re.S)
    items = []
    for body in pres:
        txt = re.sub(r"\s+", " ", TAG.sub("", body)).strip()
        if not txt:
            continue
        pos = [(m.start(), m.group(1)) for m in FIELD.finditer(txt)]
        if not pos or pos[0][1] != "篇名":
            continue  # 卷首「前言」等非条块
        fields = {}
        for i, (s, lab) in enumerate(pos):
            e = pos[i + 1][0] if i + 1 < len(pos) else len(txt)
            val = txt[s + len(lab) + 1:e].strip()
            fields.setdefault(lab, []).append(val)
        items.append({
            "title": (fields.get("篇名") or [""])[0],
            "bianhao": (fields.get("編號") or [""])[0],
            "jingwen": (fields.get("經文") or [""])[0],
            "notes": [v for lab in YIZONG_NOTE_LABELS for v in fields.get(lab, []) if len(only_han(v)) >= 4],
            "formulas": extract_formulas(fields),
        })
    # 篇名 → 底本篇：名字相似度（金鑑篇序与底本不同，如「驚悸吐衄」在金鑑是十二、在底本是十六，不能按序号）
    def best_pian(title_):
        best, br = None, 0.0
        ts = only_han(_T2S.convert(title_))  # 金鑑繁体 → 底本简体，再比
        for p in BEN["pian"]:
            for cand in (p.get("title"), p.get("nameSimp")):
                if not cand:
                    continue
                r = difflib.SequenceMatcher(None, ts, only_han(cand)).ratio()
                if r > br:
                    best, br = p, r
        return best, br

    sections, index = [], {}
    for it in items:
        p, r = best_pian(it["title"])
        if p is None or r < 0.70:
            continue
        no = p.get("no")
        # 附篇（23-25）在底本里没有 `no`，若只用 no 做键，三篇会被并成一篇（第一版 191 块挤进「雜療方」）
        key = no if no is not None else ("附", p.get("nameSimp") or it["title"])
        if key not in index:
            index[key] = {"no": no, "juan": "", "title": p.get("title") or p.get("nameSimp") or it["title"],
                          "blocks": [], "meta": {"yizongTitle": it["title"], "pianRatio": round(r, 3)}}
            sections.append(index[key])
        sec = index[key]
        arts = sorted(p.get("articles") or [], key=lambda a: a["idx"])
        jn = only_han(it["jingwen"])
        best, br = None, 0.0
        for a in arts:
            bn = only_han(a["zhHant"])
            k = min(len(jn), len(bn), 60)
            if k < 8:
                continue
            rr = difflib.SequenceMatcher(None, jn[:k], bn[:k]).ratio()
            if rr > br:
                best, br = a, rr
        tiao = best["tiao"] if (best is not None and br >= THRESH) else None
        sec["blocks"].append({
            "tiao": tiao,
            "src": it["jingwen"],
            "notes": it["notes"],
            "ratio": round(br, 3),
            "bianhao": it["bianhao"],
            "formulas": it.get("formulas") or [],
        })
        for _f in it.get("formulas") or []:
            sec.setdefault("formulas", []).append(dict(_f, tiao=tiao, bianhao=it["bianhao"]))
    # 相似度未认出的块，按「篇内序号」兜底（金鑑每篇自 001 起，序号即条序）
    for sec in sections:
        seq = 0
        arts = sorted([p for p in BEN["pian"] if p.get("no") == sec["no"]][0].get("articles") or [], key=lambda a: a["idx"])
        for blk in sec["blocks"]:
            if blk["tiao"]:
                try:
                    seq = max(seq, int(blk["bianhao"][-3:]) if blk["bianhao"] else seq)
                except ValueError:
                    pass
                continue
            seq += 1
            if 0 < seq <= len(arts):
                blk["tiao"] = arts[seq - 1]["tiao"]
    return sections


def build() -> tuple:
    manifest = json.load(io.open(MANIFEST_PATH, encoding="utf-8"))
    pians = ben_pians()
    books = {}
    align = {"byTiao": {}, "meta": {}}
    for b in manifest["books"]:
        slug = b["slug"]
        out_sections = []
        hits = 0
        note_chars = 0
        note_tiao = 0
        if slug == "yizong":
            # 《醫宗金鑑》走字段式解析：篇与块已自带 tiao，不再按段落配对
            for sec in parse_yizong():
                for blk in sec["blocks"]:
                    c = sum(len(only_han(strip_gloss(x))) for x in blk["notes"])
                    note_chars += c
                    if blk["tiao"]:
                        note_tiao += c
                        hits += 1
                        align["byTiao"].setdefault(blk["tiao"], {})
                        align["byTiao"][blk["tiao"]][slug] = align["byTiao"][blk["tiao"]].get(slug, 0) + 1
                out_sections.append(sec)
            sections = out_sections
        else:
            sections = parse_book(slug)
            for idx, sec in enumerate(sections):
                pian = pians.get(idx)
                if pian is None:
                    continue
                blocks = pair_blocks(sec, pian)
                for blk in blocks:
                    c = sum(len(only_han(strip_gloss(x))) for x in blk["notes"])
                    note_chars += c
                    if blk["tiao"]:
                        note_tiao += c
                        hits += 1
                        align["byTiao"].setdefault(blk["tiao"], {})
                        align["byTiao"][blk["tiao"]][slug] = align["byTiao"][blk["tiao"]].get(slug, 0) + 1
                out_sections.append({"no": pian.get("no"), "juan": sec["juan"], "title": sec["title"], "blocks": blocks})
            sections = out_sections
        books[slug] = {
            "book": b["book"], "author": b["author"], "dynasty": b["dynasty"],
            "kind": b["kind"], "edition": b["edition"],
            "rawFile": b["rawFile"], "rawSha256": b["rawSha256"], "rawBytes": b["rawBytes"],
            "sections": out_sections,
            "counts": {"sections": len(out_sections), "srcBlocks": hits,
                       "noteChars": note_chars, "noteCharsTiao": note_tiao},
        }
        align["meta"][slug] = {"title": b["book"], "author": b["author"],
                               "srcBlocks": hits, "noteChars": note_chars,
                               "noteCharsTiao": note_tiao}
    # 回写 manifest：结构计数以本脚本为准
    for mb in manifest["books"]:
        bk = books.get(mb["slug"])
        if bk:
            mb["sectionCount"] = bk["counts"]["sections"]
            mb["srcBlocks"] = bk["counts"]["srcBlocks"]
            mb["chars"] = bk["counts"]["noteChars"]
    manifest["counts"] = {
        "books": len(books),
        "sections": sum(v["counts"]["sections"] for v in books.values()),
        "srcBlocks": sum(v["counts"]["srcBlocks"] for v in books.values()),
        "noteChars": sum(v["counts"]["noteChars"] for v in books.values()),
    }
    return books, align, manifest


def render_register(books: dict, align: dict) -> str:
    tiao_all = [a["tiao"] for p in BEN["pian"] for a in (p.get("articles") or []) if a.get("tiao")]
    covered = set(align["byTiao"])
    L = []
    L.append("# 《金匮要略》四家注 · 校勘登记" + NL)
    L.append("> 生成：`python scripts/build_jingui_zhujia_align.py`。四家注全部来自 **外源·笈成**，"
             "按字节留档于 `raw/`，sha256 见 `manifest.json`。" + NL)
    L.append("> 本表只回答一件事：**每条注文落在 402 条的哪一条上；哪些条没有注文**。" + NL)
    L.append("> 注家分条与底本不同，对齐按文本相似度（≥0.60）而非条号，因此会同时出现「一块对多条」与「一条多块」。" + NL)
    L.append("## 一、总量" + NL)
    L.append("| 书 | 作者 | 形态 | 篇 | 原文块 | 注文汉字 | 命中底本条（去重） |")
    L.append("|---|---|---|--:|--:|--:|--:|")
    for slug, b in books.items():
        hit = len({t for t, m in align["byTiao"].items() if slug in m})
        L.append("| %s | %s | %s | %d | %d | %d | %d / 398 |" % (
            b["book"], b["author"], b["kind"], b["counts"]["sections"],
            b["counts"]["srcBlocks"], b["counts"]["noteChars"], hit))
    L.append("| **合计** | — | — | **%d** | **%d** | **%d** | **%d / 398** |" % (
        sum(b["counts"]["sections"] for b in books.values()),
        sum(b["counts"]["srcBlocks"] for b in books.values()),
        sum(b["counts"]["noteChars"] for b in books.values()), len(covered)))
    L.append("")
    L.append("## 二、逐篇命中" + NL)
    SHORT = {"xindian": "心典", "qianzhu": "淺註", "jiyi": "輯義", "yizong": "金鑑"}
    slugs = list(books.keys())
    L.append("| 篇 | 条 | " + " | ".join(SHORT.get(k, k) for k in slugs) + " | 全部命中 | 皆未命中 |")
    L.append("|--:|--:|" + "--:|" * len(slugs) + "--:|--:|")
    for p in BEN["pian"]:
        arts = [a for a in (p.get("articles") or []) if a.get("tiao")]
        if not arts:
            continue
        per = {slug: 0 for slug in books}
        n_all = n_none = 0
        for a in arts:
            m = align["byTiao"].get(a["tiao"], {})
            cnt = sum(1 for slug in books if slug in m)
            for slug in books:
                if slug in m:
                    per[slug] += 1
            if cnt == len(slugs):
                n_all += 1
            if cnt == 0:
                n_none += 1
        L.append("| %s | %d | %s | %d | %d |" % (
            p.get("no") if p.get("no") else "附", len(arts),
            " | ".join(str(per.get(k, 0)) for k in slugs), n_all, n_none))
    L.append("")
    missing = sorted(set(tiao_all) - covered, key=lambda t: (int(t.split(".")[0]), int(t.split(".")[1])))
    L.append("## 三、无注文的条（%d 条）" % len(missing) + NL)
    if missing:
        L.append("```text")
        for i in range(0, len(missing), 20):
            L.append("、".join(missing[i:i + 20]))
        L.append("```" + NL)
        L.append("这些条的原文在注本里或被并入他条、或注家未注。教材引用时如实标注「本条无注家引文」，不补写。" + NL)
    else:
        L.append("无。" + NL)
    L.append("## 四、口径" + NL)
    L.append("1. **注文不改字**：四家注一律逐字引用（繁体照录），引用写「外源·笈成·<书名> <卷>·<篇>」；教材里只做 t2s 字形转换。")
    L.append("2. **不并入 402 条统计**：注文是解释层，与条文层分开计数；教材里注文单独成行、加「注·」前缀。")
    L.append("3. **对齐误差照录**：`align.json` 保留每个块的 `ratio`，0.60–0.80 的块供人工复核；本项目不静默丢块。")
    L.append("4. **注家观点不等于原文**：凡「按、」「愚按」「註：」「集註：」之后的话都是注家判断，教材里必须与原文判词分栏。" + NL)
    L.append("5. **《醫宗金鑑》另走字段式解析**：笈成條列版每条一个 `<pre>`（篇名/編號/經文/按/註/集註），"
             "篇按**名字**匹配而非序号（金鑑篇序与底本不同：驚悸吐衄在金鑑是十二、底本是十六），"
             "篇名比对前先把繁体 t2s——不转字形时 22 篇只能认出 4 篇。" + NL)
    L.append("6. **金鑑附篇（23-25）不参与条级对齐**：底本附篇按整篇 1 条计，金鑑逐方分立，块数不等，如实单列。" + NL)

    # 五、方名对校（金鑑方段 ↔ 底本 174 方）
    yz = books.get("yizong", {})
    jf = [f for sec in (yz.get("sections") or []) for f in (sec.get("formulas") or [])]
    if jf:
        ben_f = [(a["tiao"], f["nameSimp"].replace("方", ""))
                 for p_ in BEN["pian"] for a in (p_.get("articles") or []) for f in (a.get("formulas") or [])]
        jnames = []
        for f in jf:
            jnames.append(_T2S.convert(f.get("name") or "").replace("方", ""))
        hit, miss = 0, []
        for tiao, nm in ben_f:
            ok = nm in jnames or any(
                difflib.SequenceMatcher(None, nm, x).ratio() >= 0.8 for x in jnames if x)
            if ok:
                hit += 1
            else:
                miss.append("%s %s" % (tiao, nm))
        L.append("## 五、方名对校（《醫宗金鑑》方段 ↔ 底本 %d 方）" % len(ben_f) + NL)
        L.append("| 项 | 值 |")
        L.append("|---|--:|")
        L.append("| 金鑑切出的方段 | %d |" % len(jf))
        L.append("| 金鑑唯一方名 | %d |" % len({x for x in jnames if x}))
        L.append("| 底本 174 方中有同名/近似方段 | **%d / %d** |" % (hit, len(ben_f)))
        L.append("| 未对上 | %d |" % len(miss))
        L.append("")
        L.append("口径：先 t2s，再去末尾「方」字，同名即算对上；否则取 difflib ≥0.80。"
                 "未对上的方多为金鑑把该方并入他条注文、或方名用字有异（如「藜芦甘草汤」金鑑不载），"
                 "逐条列在下面，**不补写、不强行配对**。" + NL)
        if miss:
            L.append("```text")
            for i in range(0, len(miss), 6):
                L.append("；".join(miss[i:i + 6]))
            L.append("```" + NL)
    return NL.join(L)


def main() -> int:
    check = "--check" in sys.argv[1:]
    books, align, manifest = build()
    reg = render_register(books, align)
    targets = {}
    for slug, b in books.items():
        targets[os.path.join(BOOKS, slug + ".json")] = json.dumps(b, ensure_ascii=False, indent=1) + NL
    targets[os.path.join(ZD, "align.json")] = json.dumps(align, ensure_ascii=False, indent=1) + NL
    targets[os.path.join(ZD, "校勘登记.md")] = reg
    targets[MANIFEST_PATH] = json.dumps(manifest, ensure_ascii=False, indent=1) + NL
    changed = []
    for path, text in targets.items():
        old = io.open(path, encoding="utf-8").read() if os.path.exists(path) else None
        if old != text:
            changed.append(os.path.basename(path))
            if not check:
                write_text(path, text)
    total_src = manifest["counts"]["srcBlocks"]
    total_note = manifest["counts"]["noteChars"]
    covered = len(align["byTiao"])
    if check:
        if changed:
            print("✗ 三家注结构化/对齐与现算不一致：%s" % ", ".join(changed))
            return 1
        print("✓ 三家注对齐一致：%d 原文块 · %d 注文汉字 · 命中 %d/398 条" % (total_src, total_note, covered))
        return 0
    print("✓ 三家注结构化：%d 原文块 · %d 注文汉字 · 命中 %d/398 条" % (total_src, total_note, covered))
    for slug, b in books.items():
        print("   %-8s %-14s 篇 %2d · 块 %4d · 注文 %6d 字" % (
            slug, b["book"], b["counts"]["sections"], b["counts"]["srcBlocks"], b["counts"]["noteChars"]))
    print("  → standards/jingui/zhujia/（books/*.json · align.json · 校勘登记.md · manifest.json）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
