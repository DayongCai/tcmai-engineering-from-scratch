#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_fangji_text.py —— 方剂学工作簿 → 底本 + 方剂层

母本：E:\\textbooks\\qhzy-方剂学.xlsx（756,402 B · 40 表）
  40 表 = 7 前置（0封面/0历史/0改写说明/0映射1-3/0目录）+ 24 内容章（01–24）+ 9 平台表

产出：
  standards/fangji/底本.json     章 → 节 → 小节 → 段 四级 + 每段原文 + counts
  standards/fangji/formulas.json 方剂层：方名 / 章节位置 / 组成药味 / 功用 / 主治 / 君臣佐使 / 六段全文
  standards/fangji/METHOD.json   前置与平台 16 表的行数

口径（为什么这样做，都是踩过的坑）：
  1. 段号有两套：1..N 是段标题（5.1.1.1 方源与组成），11..1N 是正文。不靠段号判断，
     靠内容是否以「N.N.N.N 」开头判断；正文挂到上一条段标题下，不新建条目（否则段数翻倍）。
  2. 章列必须是纯数字：表头行会让「章」翻倍（中药学踩过 60 个假章）。
  3. 方名只从「小节标题」取，不从正文猜；第 1–4 章总论与第 24 章的小节是主题，不是方。
  4. 组成有四种写法（组成：／原方组成与用量为：／方由…组成／原方用量为：），都要认；
     药名用《中药学》287 味作词表做最长前缀匹配，剂量与炮制夹注一律剥离。
  5. 君臣佐使只认两种信号：显式「君以/臣以/佐以/使以」与「为君药/为臣药…」（窗口 25 字，
     不跨别的角色词）；抽不到留空，不猜；同一味药不重复占两个角色（除非原文写「兼」）。
"""

import hashlib
import io
import json
import os
import re
import sys

import openpyxl

SRC = r"E:\textbooks\qhzy-方剂学.xlsx"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "standards", "fangji")
DRUGS = os.path.join(ROOT, "standards", "zhongyao", "drugs.json")

CONTENT_SHEET = re.compile(r"^(\d{2})\s+(.+)$")
TITLE = re.compile(r"^(\d+)\.(\d+)\.(\d+)\.(\d+)\s+(.*)$")
HANZI = re.compile(r"[\u4e00-\u9fff]")

PARTS = ["方源与组成", "用法用量", "功用与主治", "方解与配伍", "运用与鉴别", "现代研究提示"]

PREP = ["炙", "生", "炒", "制", "煅", "酒", "醋", "盐", "蜜", "姜", "焦", "清", "麸炒", "土炒", "醋炙"]
# 药名尾巴上的炮制/处理短语（教材写成「人参去芦」「橘皮不去白」「甘草炙」）
TAIL_PREP = ["去芦", "去皮尖", "去皮", "去白", "不去白", "去苗", "去节", "去心", "去核", "去毛",
             "微炒", "酒焙干", "焙干", "晒干", "研", "杵", "碎", "切", "洗", "镑", "打碎", "炙", "炒"]

# 别名牌：教材写法 → 《中药学》本名（只收证据明确、一一对应的）
ALIAS = {
    "橘皮": "陈皮", "橘红": "化橘红", "白芍药": "白芍", "赤芍药": "赤芍", "山萸肉": "山茱萸",
    "白茯苓": "茯苓", "青子芩": "黄芩", "仙半夏": "半夏", "淡竹茹": "竹茹", "生枳壳": "枳壳",
    "陈广皮": "陈皮", "青蒿脑": "青蒿", "生地黄": "生地黄", "苡仁": "薏苡仁", "瓜蒌仁": "瓜蒌",
    "象贝": "浙贝母", "川贝": "川贝母", "元参": "玄参", "於术": "白术", "冬术": "白术",
    "於潜术": "白术", "抚芎": "川芎", "广皮": "陈皮", "银花": "金银花", "连翘心": "连翘",
    "生姜皮": "生姜", "炮姜": "干姜", "煨姜": "生姜",
    "麦门冬": "麦冬", "山栀": "栀子", "苦桔梗": "桔梗", "霜桑叶": "桑叶", "全当归": "当归",
    "干地黄": "生地黄", "川贝": "川贝母", "象贝母": "浙贝母", "冬瓜仁": "冬瓜子",
    "焙蜈蚣": "蜈蚣", "乌犀屑": "水牛角", "犀角屑": "犀角", "银柴胡": "银柴胡",
}

ROLE_NAMES = ["君", "臣", "佐", "使"]

# 八法 ↔ 教材章（教材按治法分章，所以八法可以直接按章名映射，不需要另立体系）
BAFA = [
    ("汗", "解表剂"), ("吐", "涌吐剂"), ("下", "泻下剂"), ("和", "和解剂"),
    ("温", "温里剂"), ("清", "清热剂"), ("消", "消食剂"), ("补", "补益剂"),
]
# 章名里含这些词的算对应法（驱虫剂与涌吐剂同表、消食剂与驱虫剂分开时按各自算）


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def cell(v):
    return "" if v is None else str(v).strip()


def strip_prep(name):
    n = name
    for p in PREP:
        if n.startswith(p) and len(n) > len(p) + 1:
            n = n[len(p):]
            break
    return ALIAS.get(n, n)


def load_lexicon():
    """药名词表：《中药学》287 味 + 别名，长名优先（青蒿脑要先于青蒿命中）"""
    names = set(ALIAS.keys())
    if os.path.exists(DRUGS):
        with io.open(DRUGS, encoding="utf-8") as f:
            for d in json.load(f)["drugs"]:
                names.add(d["name"])
                names.add(strip_prep(d["name"]))
    names.update(ALIAS.values())
    return sorted((n for n in names if len(n) >= 2), key=len, reverse=True)


LEX = load_lexicon()
LEX_SET = set(LEX)


def parse_sheet(ws):
    rows = list(ws.iter_rows(values_only=True))
    ch = sec = sub = None
    for r in rows:
        c = [cell(x) for x in (list(r) + ["", "", "", "", ""])[:5]]
        ch_no, sec_no, sub_no, para_no, text = c
        if not text:
            continue
        if ch is None:
            if not ch_no.isdigit():
                continue
            ch = {"no": ch_no, "title": text, "secs": []}
            # 不 continue：本章第一行同时就是第一条「节」，下面照常挂节，否则节号会塌成章号
        if ch_no and not ch_no.isdigit():
            continue
        if sec_no.isdigit():
            sec = {"no": f"{ch['no']}.{sec_no}", "title": text, "subs": [], "paras": []}
            ch["secs"].append(sec)
            sub = None
            continue
        if sub_no.isdigit():
            if sec is None:
                sec = {"no": ch["no"], "title": ch["title"], "subs": [], "paras": []}
                ch["secs"].append(sec)
            sub = {"no": f"{sec['no']}.{sub_no}", "title": text, "paras": []}
            sec["subs"].append(sub)
            continue
        if para_no.isdigit():
            m = TITLE.match(text)
            target = sub if sub is not None else (sec if sec is not None else ch)
            lst = target.setdefault("paras", [])
            if m:
                lst.append({"no": m.group(0).split(" ")[0], "title": m.group(5).strip(), "text": ""})
            else:
                if lst and lst[-1]["title"] and not lst[-1]["text"]:
                    lst[-1]["text"] = text
                elif lst and lst[-1]["text"]:
                    lst[-1]["text"] += chr(10) + text
                else:
                    lst.append({"no": f"{ch['no']}.{para_no}", "title": "", "text": text})
            continue
        target = sub if sub is not None else (sec if sec is not None else ch)
        lst = target.setdefault("paras", [])
        if lst and lst[-1]["text"]:
            lst[-1]["text"] += chr(10) + text
        elif lst and lst[-1]["title"]:
            lst[-1]["text"] = text
    return ch


def walk_paras(ch):
    out = list(ch.get("paras", []))
    for s in ch["secs"]:
        out += s["paras"]
        for u in s["subs"]:
            out += u["paras"]
    return out


def counts(ch):
    paras = walk_paras(ch)
    bodies = [p for p in paras if p["text"]]
    return {
        "secs": len(ch["secs"]),
        "subs": sum(len(s["subs"]) for s in ch["secs"]),
        "paras": len(paras),
        "bodies": len(bodies),
        "hanzi": sum(len(HANZI.findall(p["text"])) for p in bodies),
    }


def split_depth0(body):
    """按 、，,； 切分，括号内的分隔符不算（「碧玉散（滑石、甘草、青黛）包煎」不能切碎）"""
    out, buf, depth = [], [], 0
    for ch in body:
        if ch in "（(":
            depth += 1
        elif ch in "）)":
            depth = max(0, depth - 1)
        if depth == 0 and ch in "、，,；":
            out.append("".join(buf))
            buf = []
            continue
        buf.append(ch)
    out.append("".join(buf))
    return [x.strip() for x in out if x.strip()]


DOSE_RE = re.compile(r"[0-9０-９一二三四五六七八九十百半]+(?:\.[0-9]+)?\s*(?:两|钱|分|斤|枚|个|片|升|合|克|g|毫升|寸)|钱半|半两|少许|适量|等分|[0-9０-９]+味")
SKIP_TOK = re.compile(r"^(?:各|共|计|全方|右|上|另|用|加|共为|同为|研|为末)")
DOSAGE_ONLY = re.compile(r"^(?:[0-9０-９一二三四五六七八九十百半两钱分斤枚个升合克g毫升寸]+|[0-9.]+)$")
NARRATIVE = re.compile(r"味组成|为散|为丸|为末|汤剂|散剂|丸剂|煎服|原方|共为|同煎|包煎|若干|服|煎|为衣|皆|切须|习称|方名|力专")
JUNK_HEAD = re.compile(r"^(?:为|乃|其|凡|仅|以|二方|五味(?!子)|其中|全方|本章|主治|习称|药仅|汤仅)")


def clean_token(tok):
    """把「赤茯苓三钱」「炙甘草十味组成」「原方为散剂」这类尾巴削成纯药名片段；叙述句返回空串"""
    t = tok
    # 只取第一个括号前的部分
    t = re.split(r"[（(]", t)[0].strip()
    if not t:
        return ""
    # 削尾部剂量（可能连着几段：「各四钱」「钱半至二钱」）
    for _ in range(3):
        t2 = re.sub(r"(?:各)?(?:钱半至二钱|钱半|半两|适量|少许|等分)$", "", t)
        t2 = DOSE_RE.sub("", t2) if DOSE_RE.search(t2[-12:]) else t2
        t2 = t2.rstrip("，, ")
        if t2 == t:
            break
        t = t2
    t = re.sub(r"[0-9０-９一二三四五六七八九十百]*味组成$", "", t)
    t = t.replace("组成", "").rstrip("各等共 ").strip()
    if (not t or len(t) < 2 or NARRATIVE.search(t) or DOSAGE_ONLY.match(t)
            or JUNK_HEAD.match(t) or re.match(r"^[一二三四五六七八九十]药$", t)):
        return ""
    return t.strip()


def parse_composition(text):
    """教材的组成写法至少有六种，都要认；药名走词表最长前缀，剂量/夹注剥离。

    六种：组成：／原方组成为：／原方组成与用量为：／组成与用量极简：／原方组成极简，仅两味：／方由…组成
    同一方里若出现两次「组成」（如同一段先讲《局方》同名方、再讲正方），**取最后一次**——
    教材总是把正方放在后面。
    """
    if not text:
        return []
    hits = [m for m in re.finditer(r"组成[^：:。]{0,14}[：:]", text)]
    if not hits:
        # 第 7 种写法：不写「组成」，直接「原方用量为：（药、药、药）」
        hits = [m for m in re.finditer(r"(?:原方|本方|古方)?用量为[：:]", text)]
    if hits:
        body_start = hits[-1].end()
        tail = text[body_start:]
        end = tail.find("。")
        body = (tail[:end] if end > 0 else tail).replace(chr(10), "")
    else:
        i = text.find("方由")
        if i >= 0:
            tail = text[i + 2:]
        else:
            tail = ""
        if tail:
            end = tail.find("。")
            body = (tail[:end] if end > 0 else tail).replace(chr(10), "")
        else:
            return []

    herbs, seen = [], set()
    for tok in split_depth0(body):
        tok = tok.strip().lstrip("另用").lstrip("用").lstrip("加").strip()
        if not tok or DOSAGE_ONLY.match(tok) or SKIP_TOK.match(tok):
            continue
        raw = tok
        tok = clean_token(tok)
        if not tok:
            continue
        # 词表最长前缀
        name = None
        for lex in LEX:
            if tok.startswith(lex):
                name = lex
                break
        if name is None:
            # 「桂府腻白滑石」：词表名挂在词尾、前面只缀修饰语（≤4 字）时认作该药
            for lex in LEX:
                if tok.endswith(lex) and 0 < len(tok) - len(lex) <= 4:
                    name = lex
                    break
        if name is None:
            m = re.match(r"^([\u4e00-\u9fff]{2,7})", tok)
            if not m:
                continue
            cand = m.group(1)
            for t in TAIL_PREP:
                if cand.endswith(t) and len(cand) > len(t) + 1:
                    cand = cand[: -len(t)]
            if cand in {"劳役热甚者", "热甚者", "病甚"} or len(cand) < 2:
                continue
            name = cand
        # 归一：《中药学》词表里有本名就用本名（炙甘草→甘草、银花→金银花、青蒿脑→青蒿）
        base = strip_prep(name)
        norm = base if base in LEX_SET else name
        if norm in seen:
            continue
        seen.add(norm)
        herbs.append({"name": norm, "raw": raw, "base": base, "prep": ""})

    return herbs


def take_after(text, label):
    # 「主治有三。」「主治有二。」这类不写冒号，也要认（第6章泻下剂全章都是这种写法）
    # 「主治：X」「主治有三。…」「主治阳虚寒积证。」三种写法都要认（第6章两种都没有冒号）
    sep = r"(?:有[一二三四五六七八九]|[：:]|为)?" if label == "主治" else r"[：:]"
    m = re.search(label + sep + r"(.+)", text)
    if not m:
        return ""
    v = m.group(1).strip().lstrip("。，、为：")
    # 功用段里若混进「主治」，截断；主治段里若混进「证候解析」，也截断
    cut = r"用法|证候解析|方解|组成" if label == "主治" else r"主治|用法|证候解析|方解|组成"
    v = re.split(cut, v)[0]
    return v.strip()


def extract_roles(jiefang, herbs):
    """君臣佐使：三级信号，每角色一条，抽不到留空（不猜）。

    ① 标签式「君药：熟地黄…」——教材最结构化的一路，最强；
    ② 显式「君以/臣以/佐以/使以」；
    ③ 回退「为君药/为臣药/为佐药/为使药」：前 60 字窗口内最近的药名，不跨别的角色词。
    同一味药不占两个角色，除非原文写「兼」。
    """
    names = [h["name"] for h in herbs]
    roles = {r: [] for r in ROLE_NAMES}
    if not jiefang or not names:
        return roles, []
    assigned, evidence = {}, []

    def first_after(seg):
        best = None
        for n in names:
            i = seg.find(n)
            if i >= 0 and (best is None or i < best[0]):
                best = (i, n)
        return best[1] if best else None

    def last_before(seg):
        best = None
        for n in names:
            i = seg.rfind(n)
            if i >= 0 and (best is None or i > best[0]):
                best = (i, n)
        return best[1] if best else None

    def assign(role, herb, how, quote):
        if not herb or herb in roles[role]:
            return False
        if herb in assigned and assigned[herb] != role and "兼" not in quote:
            return False
        roles[role].append(herb)
        assigned[herb] = role
        evidence.append({"role": role, "herb": herb, "how": how, "quote": quote.strip()})
        return True

    # ① 标签式
    for role in ROLE_NAMES:
        for m in re.finditer(role + "药[：:]", jiefang):
            if assign(role, first_after(jiefang[m.end():m.end() + 14]), "label", jiefang[m.start():m.start() + 30]):
                break
    # ② 显式「X以」
    for role in ROLE_NAMES:
        if roles[role]:
            continue
        for m in re.finditer(role + "以", jiefang):
            if assign(role, first_after(jiefang[m.end():m.end() + 12]), "explicit", jiefang[max(0, m.start() - 10):m.end() + 14]):
                break

    # ③ 「为X药」
    for role in ROLE_NAMES:
        if roles[role]:
            continue
        for m in re.finditer("为" + role + "药?", jiefang):
            head = jiefang[max(0, m.start() - 60):m.start()]
            cut = 0
            for kw in ("君药", "为君", "臣药", "为臣", "佐药", "为佐", "使药", "为使"):
                j = head.rfind(kw)
                if j >= 0:
                    cut = max(cut, j + len(kw))
            if assign(role, last_before(head[cut:]), "window60", jiefang[max(0, m.start() - 60):m.end()]):
                break
    return roles, evidence


def build():
    wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
    sheet_names = wb.sheetnames
    content = [(m.group(1), m.group(2), n) for n in sheet_names for m in [CONTENT_SHEET.match(n)] if m]
    plat = [n for n in sheet_names if not CONTENT_SHEET.match(n)]

    chapters = []
    for no, title, sheet in sorted(content, key=lambda x: int(x[0])):
        ch = parse_sheet(wb[sheet])
        if ch is None:
            print(f"[warn] {sheet} 解析为空", file=sys.stderr)
            continue
        ch["sheet"] = sheet
        ch["title"] = f"第{int(no)}章 {title}"   # 表名「05 解表剂」才是章名，首条数据行是节标题
        ch["counts"] = counts(ch)
        chapters.append(ch)

    formulas = []
    for ch in chapters:
        if not (5 <= int(ch["no"]) <= 23):
            continue
        for s in ch["secs"]:
            for u in s["subs"]:
                m = re.match(r"^(\d+\.\d+\.\d+)\s+(.+)$", u["title"])
                if not m:
                    continue
                parts = {p["title"]: p["text"] for p in u["paras"] if p["title"] in PARTS}
                herbs = parse_composition(parts.get("方源与组成", ""))
                roles, role_ev = extract_roles(parts.get("方解与配伍", ""), herbs)
                formulas.append({
                    "name": m.group(2).strip(),
                    "chapter": ch["no"],
                    "chapterTitle": ch["title"],
                    "sec": s["title"],
                    "sub": u["no"],
                    "locator": f"教材·第{ch['no']}章·{u['no']}",
                    "parts": {k: parts.get(k, "") for k in PARTS},
                    "composition": {"text": parts.get("方源与组成", ""), "herbs": herbs},
                    "gongyong": take_after(parts.get("功用与主治", ""), "功用"),
                    "zhuzhi": take_after(parts.get("功用与主治", ""), "主治"),
                    "roles": roles,
                    "roleEvidence": role_ev,
                })

    total = {k: sum(c["counts"][k] for c in chapters) for k in ["secs", "subs", "paras", "bodies", "hanzi"]}
    base = {
        "source": {
            "file": SRC,
            "bytes": os.path.getsize(SRC),
            "sha256": sha256(SRC),
            "sheets": len(sheet_names),
            "contentSheets": len(content),
            "platformSheets": plat,
        },
        "counts": {"chapters": len(chapters), **total},
        "chapters": chapters,
    }

    slots = [h for f in formulas for h in f["composition"]["herbs"]]
    unique = {h["name"] for h in slots}
    in_lex = sum(1 for h in slots if any(h["name"] == d for d in [h["base"]]))
    lex_names = set(LEX)
    not_in_lex = {}
    for h in slots:
        if h["name"] not in lex_names:
            not_in_lex[h["name"]] = not_in_lex.get(h["name"], 0) + 1

    # 八法按**章**判：教材把八法做成了七章（5/6/7/8/10/12/21），涌吐只是第22章的一节。
    # 为什么不按节名匹配：「19.2 清热祛湿剂」「20.2 清热化痰剂」含「清热」但属祛湿/祛痰，按节会误算进清法。
    FA_BY_CHAPTER = {"5": "汗", "6": "下", "7": "和", "8": "清", "10": "温", "12": "补", "21": "消"}

    def fa_of(x):
        if "涌吐" in x["sec"]:
            return "吐"
        return FA_BY_CHAPTER.get(x["chapter"], "")

    for x in formulas:
        x["fa"] = fa_of(x)

    bafa = []
    for fa in ["汗", "吐", "下", "和", "温", "清", "消", "补"]:
        fs = [x for x in formulas if x["fa"] == fa]
        bafa.append({"fa": fa, "formulas": len(fs), "names": [x["name"] for x in fs],
                     "chapters": sorted({x["chapter"] for x in fs}, key=int)})
    other = [{"name": x["name"], "chapter": x["chapter"], "sec": x["sec"]} for x in formulas if not x["fa"]]

    fdoc = {
        "source": base["source"],
        "bafa": {
            "note": "八法按教材章/节名判定（教材本身就按治法分章）：汗=解表 吐=涌吐 下=泻下 和=和解 温=温里 清=清热 消=消食 补=补益。一个方只归一法；不属八法的方单列。",
            "items": bafa,
            "others": other,
        },
        "counts": {
            "formulas": len(formulas),
            "withHerbs": sum(1 for x in formulas if x["composition"]["herbs"]),
            "withJun": sum(1 for x in formulas if x["roles"]["君"]),
            "withRoles4": sum(1 for x in formulas if all(x["roles"][k] for k in ROLE_NAMES)),
            "withRoles3": sum(1 for x in formulas if sum(1 for k in ROLE_NAMES if x["roles"][k]) >= 3),
            "herbSlots": len(slots),
            "uniqueHerbs": len(unique),
            "notInZhongyaoLexicon": len(not_in_lex),
        },
        "notInZhongyaoLexicon": dict(sorted(not_in_lex.items(), key=lambda kv: (-kv[1], kv[0]))),
        "chapters": [{"no": c["no"], "title": c["title"],
                      "formulas": sum(1 for x in formulas if x["chapter"] == c["no"])}
                     for c in chapters if 5 <= int(c["no"]) <= 23],
        "formulas": formulas,
    }

    method = {
        "sheets": [{"name": n, "rows": wb[n].max_row, "cols": wb[n].max_column} for n in plat],
        "note": "前置 7 表与平台 9 表不进底本：它们不是教材正文（封面/历史/改写说明/映射/目录 + 平台建设），行数在此留档。",
    }

    os.makedirs(OUT, exist_ok=True)
    for fn, obj in [("底本.json", base), ("formulas.json", fdoc), ("METHOD.json", method)]:
        with io.open(os.path.join(OUT, fn), "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=1)

    c = base["counts"]
    fc = fdoc["counts"]
    print(f"母本 {base['source']['bytes']:,} B · {base['source']['sha256'][:12]} · {len(sheet_names)} 表 = "
          f"{len(content)} 内容 + {len(plat)} 前置/平台")
    print(f"底本 {c['chapters']} 章 / {c['secs']} 节 / {c['subs']} 小节 / {c['paras']} 段 / {c['hanzi']:,} 汉字")
    print(f"方剂 {fc['formulas']} 首 · 有组成 {fc['withHerbs']} · 有君药 {fc['withJun']} · "
          f"三角色以上 {fc['withRoles3']} · 四角色齐 {fc['withRoles4']}")
    print(f"药位 {fc['herbSlots']} · 去重 {fc['uniqueHerbs']} 味 · 不在中药学词表 {fc['notInZhongyaoLexicon']} 味")
    return 0


if __name__ == "__main__":
    sys.exit(build())
