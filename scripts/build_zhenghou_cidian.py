# -*- coding: utf-8 -*-
"""scripts/build_zhenghou_cidian.py —— 《中医证候学》三册 → 「疾病证候单元」辞典（四级编码）

## 这个脚本解决的是什么

书是扫描件（三册 2408 页、无文字层），但**目录书签是完整的**：上册 bookmarks 2268 条，
从「第一章 病证概论」一路到「附录二：322病候一览表」。目录本身已经把全书切成了四级：

    门（第N章）  →  类（第N节，码 L01…L45）  →  证（一、二、…，码 Lnn-Zmm）  →  候（（一）（二）…，码 Lnn-Zmm-Hnnn）

所以本脚本不 OCR 正文，只做一件机械的事：**把目录逐条读成树**，再给树装上一套 ICD-11
同构的四级编码与三轴坐标。正文的释义层不编造 —— 由三张语素表（位/性/态）合成，
每句都能拆回语素，每条都能回查目录行。

## 四级编码（ICD-11 同构，不改书内三码）

    ICD-11 MMS     Chapter   →  Block    →  Category   →  Subcategory
    本书           门 M01…M12 →  类 L01…45 →  证 Lnn-Zmm  →  候 Lnn-Zmm-Hnnn
    全码           M01-L01-Z01-H001

`L/Z/H` 三级是原书编码，**一字不改**；本级只补门码 `M01…M12`（书里没有门码，用章序派生）。
这样任何一条辞典条目都能同时用「全码」和「书内原码」索引，回查零损耗。

## 三轴与张量

    位轴 locus      22 个证位对（肺胃…心营）+ 62 个候位（清气/清阳/卫气…）
    性轴 cause      12 门 + 45 类（风寒…阳虚）
    态轴 property   99 个态（失宣/郁蒸/闭脱…），字面全部取自 1866 条候名尾部

张量 = 位 × 性 × 态 的稀疏计数（非零格数即「证候单元」的实测分布）。
写入 张量.json 三张切片：门×位、类×态、证×(候数分档)。

## 幂等

    python scripts/build_zhenghou_cidian.py            # 写全部产物
    python scripts/build_zhenghou_cidian.py --check     # 只比对，漂移即退出码 1

产物里**不写生成时间**：写进去的话每天都会报 DRIFT，门就废了。
"""

from __future__ import annotations

import glob
import hashlib
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STD = os.path.join(ROOT, "standards", "zhenghou-cidian")
DEPT = os.path.join(ROOT, "departments", "01-zhongyi", "14-zhongyi-zhenghou-xue")
TB = os.path.join(ROOT, "textbooks", "01-zhongyi", "14-zhongyi-zhenghou-xue")
CHECK = "--check" in sys.argv

HANZI = re.compile(r"[\u4e00-\u9fff]")


def hanzi(t: str) -> int:
    return len(HANZI.findall(t))


def jload(*parts):
    with open(os.path.join(*parts), encoding="utf-8") as f:
        return json.load(f)


def jdump(obj, *parts):
    path = os.path.join(*parts)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    txt = json.dumps(obj, ensure_ascii=False, indent=1) + "\n"
    return txt


DRIFT = []


def emit(path: str, text: str):
    """写文件；--check 时只比对。返回是否一致。"""
    old = None
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            old = f.read()
    if CHECK:
        if old != text:
            DRIFT.append(os.path.relpath(path, ROOT))
        return old == text
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if old != text:
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(text)
    return True


# ─────────────────────────── 1. 目录 → 四级树 ───────────────────────────

MEN_RE = re.compile(r"^第([一二三四五六七八九十]+)章\s*(\S+?)门（(\d+)证(\d+)候）")
LEI_RE = re.compile(r"^第([一二三四五六七八九十]+)节\s*(\S+?)证类（(L\d+)）（(\d+)证(\d+)候）")
ZHENG_RE = re.compile(r"^([一二三四五六七八九十]+)、\s*(\S+?)（(L\d+-Z\d+)）（(\d+)候）")
HOU_RE = re.compile(r"^（([一二三四五六七八九十]+)）\s*(\S+?)（(L\d+-Z\d+-H\d+)）")

CN = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}


def cn2int(s: str) -> int:
    if s == "十":
        return 10
    if s.startswith("十"):
        return 10 + CN[s[1]]
    if "十" in s:
        a, b = s.split("十")
        return CN[a] * 10 + (CN[b] if b else 0)
    return CN[s]


def parse_toc():
    men, cur_men, cur_lei, cur_zheng = [], None, None, None
    for line in open(os.path.join(STD, "目录原文.txt"), encoding="utf-8"):
        cols = line.rstrip("\n").split("\t")
        if len(cols) < 3:
            continue
        page, title = cols[1], cols[2].strip()
        m = MEN_RE.match(title)
        if m:
            # 目录里的门名带「证」：风证门 / 火证（热证）门。剥成单字，正文再拼「门」，
            # 否则会拼出「风证证门」。书名原文的括注只在这一处出现，剥掉后记在 book 字段。
            raw = m.group(2)
            zh = re.sub(r"（[^）]*）$", "", raw)
            zh = re.sub(r"证$", "", zh)
            cur_men = {"book": "第%s章" % m.group(1), "n": len(men) + 1, "zh": zh,
                       "raw": raw, "code": "M%02d" % (len(men) + 1), "zheng": int(m.group(3)),
                       "hou": int(m.group(4)), "page": page, "lei": []}
            men.append(cur_men)
            continue
        m = LEI_RE.match(title)
        if m and cur_men:
            cur_lei = {"n": cn2int(m.group(1)), "zh": m.group(2), "code": m.group(3),
                       "zheng": int(m.group(4)), "hou": int(m.group(5)), "page": page, "zhengList": []}
            cur_men["lei"].append(cur_lei)
            continue
        m = ZHENG_RE.match(title)
        if m and cur_lei:
            cur_zheng = {"n": cn2int(m.group(1)), "zh": m.group(2), "code": m.group(3),
                         "declareHou": int(m.group(4)), "page": page, "houList": []}
            cur_lei["zhengList"].append(cur_zheng)
            continue
        m = HOU_RE.match(title)
        if m and cur_zheng:
            cur_zheng["houList"].append({"n": cn2int(m.group(1)), "zh": m.group(2),
                                         "code": m.group(3), "page": page})
    return men


# ─────────────────────────── 2. 语素与拆分 ───────────────────────────

WEI = jload(STD, "语素-位.json")
XING = jload(STD, "语素-性.json")
TAI = jload(STD, "语素-态.json")

ZHENG_WEI = {w["zh"]: w for w in WEI["证位"]}
HOU_WEI = {w["zh"]: w for w in WEI["候位"]}
MEN_BY = {m["code"]: m for m in XING["门"]}
LEI_BY = {l["code"]: l for l in XING["类"]}
TAI_BY = {}
for t in TAI["态"]:
    TAI_BY.setdefault(t["zh"], t)

HOU_WEI_ORDER = sorted(HOU_WEI, key=len, reverse=True)
TAI_ORDER = sorted(TAI_BY, key=len, reverse=True)


def split_zheng(name: str, lei_zh: str):
    """证名 = 位 + 类性 + 「证」。291 条零例外，这里仍断言，破了就报。"""
    tail = lei_zh + "证"
    if name.endswith(tail):
        return name[: -len(tail)]
    return None


def split_hou(name: str):
    """候名 = 候位 + 态 + 「候」。长匹配优先，两边都必须在词表里。"""
    body = name[:-1] if name.endswith("候") else name
    for w in HOU_WEI_ORDER:
        if body.startswith(w):
            rest = body[len(w):]
            if rest in TAI_BY:
                return w, rest
            for t in TAI_ORDER:  # 兜底：位之后允许有一小段修饰（如「火不归元」的「火不」）
                if rest.endswith(t) and rest == t:
                    return w, t
    # 反向：先定态，再取位
    for t in TAI_ORDER:
        if body.endswith(t):
            head = body[: -len(t)]
            if head in HOU_WEI:
                return head, t
    return None, None


# ─────────────────────────── 3. 结构 + 张量 ───────────────────────────

def build():
    men = parse_toc()

    diffs = []          # 校勘差异（书内自述 vs 目录实条）
    bad_zheng = []      # 证名拆不动的
    bad_hou = []        # 候名拆不动的
    hou_seen = {}
    zheng_codes = {}
    hou_inst = 0
    tensor_cells = {}

    used_full = {}
    for m in men:
        for l in m["lei"]:
            for z in l["zhengList"]:
                z["men"] = m["code"]
                z["lei"] = l["code"]
                base = "%s-%s-%s" % (m["code"], l["code"], z["code"].split("-")[-1])
                # 原书 L05-Z13 一号两用（脾胃阴寒证 / 肺脾阴寒证）：全码必须唯一，
                # 否则下游拿 full 当主键就会串条。原码不改，只在扩展层加后缀 a/b。
                if base in used_full:
                    used_full[base] += 1
                    z["full"] = base + chr(ord("a") + used_full[base] - 1)
                    z["codeSuffix"] = True
                else:
                    used_full[base] = 1
                    z["full"] = base
                wei = split_zheng(z["zh"], l["zh"])
                z["wei"] = wei
                if wei is None or wei not in ZHENG_WEI:
                    bad_zheng.append({"code": z["code"], "name": z["zh"], "lei": l["zh"], "wei": wei})
                else:
                    z["weiParts"] = ZHENG_WEI[wei].get("parts", [])
                zheng_codes.setdefault(z["code"], []).append("%s/%s" % (z["full"], z["zh"]))
                for h in z["houList"]:
                    hou_inst += 1
                    h["full"] = "%s-%s" % (z["full"], h["code"].split("-")[-1])
                    h["men"], h["lei"], h["zheng"] = m["code"], l["code"], z["full"]
                    h["zhengName"] = z["zh"]
                    h["type"] = l["zh"]
                    h["place"] = m["zh"]
                    w, t = split_hou(h["zh"])
                    h["wei"], h["tai"] = w, t
                    if w is None or t is None:
                        bad_hou.append({"code": h["code"], "name": h["zh"], "men": m["zh"]})
                    key = "%s|%s|%s" % (w or "?", z["wei"] or "?", t or "?")
                    tensor_cells[key] = tensor_cells.get(key, 0) + 1
                    hou_seen[h["code"]] = h["zh"]
            # 校对：类自述 vs 实条
            zc, hc = len(l["zhengList"]), sum(len(x["houList"]) for x in l["zhengList"])
            if zc != l["zheng"] or hc != l["hou"]:
                diffs.append({"level": "类", "code": l["code"], "name": l["zh"],
                              "declare": "%d证%d候" % (l["zheng"], l["hou"]),
                              "actual": "%d证%d候" % (zc, hc)})
        zc = sum(len(l["zhengList"]) for l in m["lei"])
        hc = sum(len(x["houList"]) for l in m["lei"] for x in l["zhengList"])
        if zc != m["zheng"] or hc != m["hou"]:
            diffs.append({"level": "门", "code": m["code"], "name": m["zh"],
                          "declare": "%d证%d候" % (m["zheng"], m["hou"]),
                          "actual": "%d证%d候" % (zc, hc)})
        for z in [x for l in m["lei"] for x in l["zhengList"]]:
            if len(z["houList"]) != z["declareHou"]:
                diffs.append({"level": "证", "code": z["code"], "name": z["zh"],
                              "declare": "%d候" % z["declareHou"], "actual": "%d候" % len(z["houList"])})

    dup = {k: v for k, v in zheng_codes.items() if len(v) > 1}
    struct = {
        "$about": "《中医证候学》四级结构（门→类→证→候），由 目录原文.txt 机械解析；全码 = 门码 + 书内三级原码。",
        "counts": {
            "men": len(men), "lei": sum(len(m["lei"]) for m in men),
            "zhengInstances": sum(len(l["zhengList"]) for m in men for l in m["lei"]),
            "zhengCodes": len(zheng_codes),
            "houInstances": hou_inst, "houCodes": len(hou_seen),
            "houNumbers": len({c.split("-")[-1] for c in hou_seen}),
            "tensorCells": len(tensor_cells),
        },
        "men": men,
        "校对": {"差异": diffs, "证名拆分失败": bad_zheng, "候名拆分失败": bad_hou,
                 "证码重复": dup,
                 "口径": "书内自述的数字当对账另一端，不采信；目录实条为准，差异全部列出。"},
    }

    # ── 三张切片 ──
    cell_men = {}   # 门 × 位
    cell_tai = {}   # 类 × 态
    for m in men:
        for l in m["lei"]:
            for z in l["zhengList"]:
                for h in z["houList"]:
                    k = "%s|%s" % (m["code"], h["wei"] or "?")
                    cell_men[k] = cell_men.get(k, 0) + 1
                    k2 = "%s|%s" % (l["code"], h["tai"] or "?")
                    cell_tai[k2] = cell_tai.get(k2, 0) + 1

    def grid(prefix_keys, row_keys, cells):
        out = []
        for rk in row_keys:
            row = {"k": rk, "v": {}}
            for ck, v in cells.items():
                r, c = ck.split("|")
                if r == rk:
                    row["v"][c] = v
            row["total"] = sum(row["v"].values())
            out.append(row)
        return out

    tensor = {
        "$about": "语义张量：位×性×态 的稀疏计数。非零格 = 一个实测的证候单元簇；由 1866 条候条目现算。",
        "axes": {
            "位": {"证位": list(ZHENG_WEI), "候位": list(HOU_WEI)},
            "性": {"门": [m["code"] for m in XING["门"]], "类": [l["code"] for l in XING["类"]]},
            "态": [t for t in TAI_BY],
        },
        "shape": [len(ZHENG_WEI), len(LEI_BY), len(TAI_BY)],
        "cells": dict(sorted(tensor_cells.items(), key=lambda kv: (-kv[1], kv[0]))),
        "sliceMenWei": grid(["men"], [m["code"] for m in men], cell_men),
        "sliceLeiTai": grid(["lei"], [l["code"] for l in XING["类"]], cell_tai),
    }
    return struct, tensor, men


# ─────────────────────────── 4. 固定文字（人手写，脚本只做拼装） ───────────────────────────

JUDGE = {  # 门的判据词 —— 用在课程章节的预习题与门解里
    "M01": "动", "M02": "冷", "M03": "季节＋耗气", "M04": "重浊腻", "M05": "干", "M06": "红热急",
    "M07": "胀闷走窜", "M08": "痛有定处·色紫", "M09": "苔腻脉滑", "M10": "清稀有定处",
    "M11": "嗳腐吞酸", "M12": "久缓弱",
}

CLASSIC = {  # 《书名·篇名》级引文（课程 L3 契约要这一条）
    "M01": "《素问·风论》", "M02": "《素问·举痛论》", "M03": "《素问·生气通天论》",
    "M04": "《素问·生气通天论》", "M05": "《素问·阴阳应象大论》", "M06": "《素问·至真要大论》",
    "M07": "《素问·举痛论》", "M08": "《素问·调经论》", "M09": "《金匮要略·痰饮咳嗽病脉证并治》",
    "M10": "《金匮要略·痰饮咳嗽病脉证并治》", "M11": "《素问·痹论》", "M12": "《素问·通评虚实论》",
}

MOTTO = {
    "M01": "「风者，善行而数变」——动处即风，定处非风",
    "M02": "「寒气入经而稽迟，泣而不行」——寒的判据是收引与凝滞",
    "M03": "「因于暑，汗，烦则喘喝」——暑先耗气，后伤津",
    "M04": "「因于湿，首如裹」——湿的第一个信号是头身重",
    "M05": "「燥胜则干」——一切燥证都从「干」字起",
    "M06": "「诸热瞀瘛，皆属于火」——火有形于外，故最易被看见",
    "M07": "「百病生于气也」——气门不治病，只定位",
    "M08": "「疏其血气，令其调达」——瘀是可以被「看见」的证",
    "M09": "「病痰饮者，当以温药和之」——痰饮同一源，分在稀稠与定处",
    "M10": "「病痰饮者，当以温药和之」——饮有定处，故可指而数之",
    "M11": "「饮食自倍，肠胃乃伤」——食门十证，全部起于「过量」二字",
    "M12": "「精气夺则虚」——虚是「该有的不足」，不是「有病」",
}

PROBLEM = {
    "M01": "风证最容易犯的错是把「动」都算作风：震颤是风，抽搐是风，但眩晕也可能是虚、是痰。不先立判据，风门就成了垃圾桶。",
    "M02": "寒证最容易犯的错是把「怕冷」当寒：阳虚也怕冷、外感也怕冷，一个有邪一个无邪，治法相反。",
    "M03": "暑证最容易犯的错是脱离季节谈证：不在夏令而见暑样症状，十有八九是热证或湿证，不是暑。",
    "M04": "湿证最容易犯的错是「凡苔腻皆湿」：腻苔也见于痰、食、湿热，湿的判据要加上「重」与「缠绵」。",
    "M05": "燥证最容易犯的错是与阴虚混同：外燥有邪可祛，内燥无邪可祛，两者的方完全不是一个方向。",
    "M06": "火门 60 证是十二门之首，意味着「火」是最容易被过度诊断的一门：一切红肿热痛都往火里塞，虚火与实火就不分了。",
    "M07": "气证最容易犯的错是把「气」讲成一句空话：气门 24 证 98 候，每一证都必须能落到具体的位（肝气/胃气/宗气）上。",
    "M08": "瘀证最容易犯的错是见紫即瘀：紫舌也见于寒、见于阳虚，瘀的判据要「痛有定处＋色紫暗＋脉涩」三条同现。",
    "M09": "痰证最容易犯的错是把「怪病」都归痰：痰的判据是可征的（苔腻、脉滑、形体、痰质），不是「说不清就归痰」。",
    "M10": "饮证最容易犯的错是与痰混：痰稠而动，饮稀而定；饮有定处，故能「指而数之」，这是它可被编码的原因。",
    "M11": "食证最容易犯的错是只看见积、看不见虚：小儿食积多脾虚为本，一味消导则愈消愈积。",
    "M12": "虚证 44 证 307 候，是第二大门。它最容易犯的错是「见弱即虚」与「虚不受补」：虚有明确判据（久、缓、弱、濡），不是安慰性诊断。",
}

COST = {
    "M01": "把风门写厚，代价是门内异质：外感的风与内风的风，病理完全不同，读者容易顺着「风」字一路误用辛散。",
    "M02": "寒门只有 15 证，却有 112 候：候的细度超过了证的区分度，这是原书体例的代价 —— 检索好用，教学则易碎。",
    "M03": "暑门最薄（7 证 67 候），因为暑有严格的时间窗；把它单列一门，代价是全年 3/4 的时间里这一门用不上。",
    "M04": "湿门 25 证 250 候，是「一半以上的临床都在湿里」的写法；代价是湿门与痰门、饮门的边界必须靠「稀稠定处」三条硬撑。",
    "M05": "燥门 17 证里，虚燥 6 证与阴虚门 14 证高度重叠，本书按「有无外邪」分置两门，代价是同一病人可能被登记两次。",
    "M06": "火门 60 证 313 候，体量最大。代价是分类的轴从「病位」滑向「病性」：火门里同时有风火、湿火、郁火、虚火，读者若不看类码，等于没分类。",
    "M07": "气门 24 证的编码价值在于「位」清楚；代价是气与郁、气与瘀的边界靠兼夹词承担，纯气证反而少。",
    "M08": "瘀门 22 证以兼夹分类（寒瘀/瘀热/痰瘀），好处是可治，代价是丢掉了「瘀在何位」这一维 —— 位要在证名里另找。",
    "M09": "痰门 27 证 159 候，与湿、饮、火三门交叉最多；代价是同一个病人可能同时落在痰门与湿门，统计上会重复计数。",
    "M10": "饮门 21 证，与痰门共用一句经典（「病痰饮者，当以温药和之」）；代价是两门在治法上几乎同构，区分全在「稀稠与定处」。",
    "M11": "食门最薄（10 证 64 候），且虫积 3 证在现代临床已少见；保留它的代价是让辞典背上时代局限，收益是完整性。",
    "M12": "虚门 44 证 307 候，是「虚」被当成结论而非判据的温床；代价与风险都在这里：它极容易被用来安慰性地解释一切慢性病。",
}


def cite_quote(code):
    return {
        "M01": "「风者，善行而数变」",
        "M02": "「寒气入经而稽迟，泣而不行」",
        "M03": "「因于暑，汗，烦则喘喝，静则多言」",
        "M04": "「因于湿，首如裹」",
        "M05": "「燥胜则干」",
        "M06": "「诸热瞀瘛，皆属于火」",
        "M07": "「百病生于气也」",
        "M08": "「疏其血气，令其调达」",
        "M09": "「病痰饮者，当以温药和之」",
        "M10": "「病痰饮者，当以温药和之」",
        "M11": "「饮食自倍，肠胃乃伤」",
        "M12": "「精气夺则虚」",
    }[code]


# ─────────────────────────── 5. TM1 落点 ───────────────────────────

def load_tm1():
    try:
        z = jload(ROOT, "standards", "icd11", "zh-names.json")
    except Exception:
        return []
    return [n for n in z.get("names", []) if n.get("module") == "TM1" and n.get("zh")]


def tm1_landing(tm1names, lei):
    """按类性在 TM1 472 条中文题名里找同词条 —— 只做「同词」检索，不做同义推断。

    第一版还加了一条「两字分开命中」的兜底，结果「风阳」命中了「少阳人少阳伤风证」
    （只因题名里同时有「风」和「阳」）。假阳性比没命中更糟 —— 宁可空着，让人知道
    TM1 里确实没有这一条。故只保留连续子串命中。
    """
    key = lei["zh"]
    hits = [n for n in tm1names if key in n["zh"]]
    return [{"code": n["code"], "zh": n["zh"]} for n in hits[:3]]


# ─────────────────────────── 6. 渲染：辞典正文 ───────────────────────────

NL = chr(10)       # 换行常量：脚本里不写字面量换行，防 heredoc 吃掉
BODY = {}          # 候全码 → {zh, page, fields, chars}（OCR 正文层；没有就全体空着）
BODY_SRC = {}      # 门码 → 该门正文层的 counts（覆盖率写进门解用）
BODY_KJ = {}       # 门码 → 该门正文层的校勘（未匹配/重码/码冲突/缺条，写进缺口登记）
MEN_SHORT = {"M01": "风门", "M02": "寒门", "M03": "暑门", "M04": "湿门", "M05": "燥门",
             "M06": "火门", "M07": "气门", "M08": "瘀门", "M09": "痰门", "M10": "饮门",
             "M11": "食门", "M12": "虚证门"}

for _p in sorted(glob.glob(os.path.join(STD, "正文-M*.json"))):
    _d = jload(STD, os.path.basename(_p))
    for _code, _v in _d.get("items", {}).items():
        BODY[_code] = _v
    BODY_SRC[_d["men"]] = _d.get("counts", {})
    _kj = _d.get("校勘", {})
    BODY_KJ[_d["men"]] = {
        "book": _d.get("book", ""),
        "未匹配": [x.get("code") + " " + x.get("zh", "") for x in _kj.get("未匹配", [])],
        "重码": _kj.get("重码", []),
        "码纠正": ["%s→%s（%s）" % (x["raw"], x["fixed"].split("-", 1)[-1], x.get("zh", ""))
                   for x in _kj.get("码纠正", [])],
        "缺条": _kj.get("缺条", []),
        "印张与目录不一致": [
            "%s（书印 %s）" % (k, v["codeConflict"]["printed"])
            for k, v in _d.get("items", {}).items() if v.get("codeConflict")],
        "找回条数": sum(1 for v in _d.get("items", {}).values() if v.get("recovered")),
        "归位": _kj.get("归位", []),
        "同码双证": _kj.get("同码双证", []),
    }

ALLZ = []          # 全部证（含父链与候数），main() 里由结构树填好
FAM_DESC = {}      # 态族 → 一句释（取自 语素-态.json）
for _f in TAI["族"]:
    FAM_DESC[_f["id"]] = _f["释"]


def split_terms(s: str):
    """把「恶寒重、发热轻、无汗」拆成词项；只按顿号/逗号/分号拆，不动括注。"""
    return [t.strip() for t in re.split(r"[、，；/]", s or "") if t.strip()]


def index_all(struct):
    ALLZ.clear()
    for m in struct["men"]:
        for l in m["lei"]:
            for z in l["zhengList"]:
                ALLZ.append({"full": z["full"], "zh": z["zh"], "wei": z["wei"],
                             "leiCode": l["code"], "leiZh": l["zh"], "menCode": m["code"],
                             "menZh": m["zh"], "lei": l, "nHou": len(z["houList"])})


def short_fam(k):
    """族释压到 14 字以内，开关组那行要能一眼扫完。"""
    t = FAM_DESC.get(k, "").split("：")[0].replace("。", "")
    return t if len(t) <= 14 else t[:13] + "…"


def fam_mix(z):
    """该证的 25 个候在六个态族上怎么分布 —— 这就是「同一证在不同病人身上的差异开关」。"""
    cnt = {}
    for h in z["houList"]:
        t = TAI_BY.get(h["tai"] or "", {})
        fam = t.get("族", "其他")
        cnt[fam] = cnt.get(fam, 0) + 1
    return sorted(cnt.items(), key=lambda kv: (-kv[1], kv[0]))


def neighbors(z, l):
    """两个最近的「兄弟」：一个位同、性不同；一个性同、位不同。鉴别只比一维，才说得清。"""
    same_wei = [x for x in ALLZ if x["wei"] == z["wei"] and x["full"] != z["full"]]
    same_lei = [x for x in ALLZ if x["leiCode"] == l["code"] and x["full"] != z["full"]]
    same_wei.sort(key=lambda x: -x["nHou"])
    same_lei.sort(key=lambda x: -x["nHou"])
    return (same_wei[0] if same_wei else None), (same_lei[0] if same_lei else None)


def one_line(t, n=140):
    """短字段压成一行；超长仍截断并标记，不许悄悄丢。"""
    t = re.sub(r"\s+", " ", str(t or "")).strip()
    return t if len(t) <= n else t[: n - 1] + "…"


def first_sentence(t, n=80):
    """取正文第一句当「一句话」——原书作者自己写的概括，比任何合成句都通俗。

    只在有原书正文时用；取不到就返回空串，由调用方退回语素合成并标明来源。
    """
    t = re.sub(r"\s+", "", str(t or "")).strip()
    if not t:
        return ""
    m = re.split(r"[。！？；]", t, maxsplit=1)
    s0 = (m[0] if m else t).strip()
    if len(s0) < 6:
        return ""
    return s0 if len(s0) <= n else s0[: n - 1] + "…"


def clip(t, n):
    """正文节选：超长只截不加改写。原文错字照留 —— 这一层是原文，不是释义。"""
    t = re.sub(r"\s+", " ", str(t or "")).strip()
    return t if len(t) <= n else t[: n - 1] + "…"


def md_cell(s):
    return str(s).replace("|", "／").replace("\n", " ")


def render_men(m, tm1names):
    code = m["code"]
    x = MEN_BY[code]
    lei_codes = [l["code"] for l in m["lei"]]
    hou_total = sum(len(h["houList"]) for l in m["lei"] for h in l["zhengList"])
    zheng_total = sum(len(l["zhengList"]) for l in m["lei"])
    L = []
    A = L.append
    A("# 第 %d 章 · %s证门（%s · %s–%s · %d 证 %d 候）" % (
        m["n"], m["zh"], code, lei_codes[0], lei_codes[-1], zheng_total, hou_total))
    A("")
    A("> **一句话**：%s" % x["释"])
    A(">")
    A("> **判据**：%s ｜ **经典**：%s %s" % (JUDGE[code], CLASSIC[code], cite_quote(code)))
    A(">")
    A("> **覆盖**：%d 类 · %d 证 · %d 候 ｜ **全码前缀**：`%s-` ｜ **源**：`standards/zhenghou-cidian/目录原文.txt`" % (
        len(lei_codes), zheng_total, hou_total, code))
    A("")
    A("## %d.1 门解（性轴的一个值）" % m["n"])
    A("")
    A("| 字段 | 值 |")
    A("|---|---|")
    A("| 门码 | `%s`（书内 %s %s门） |" % (code, m["book"], m.get("raw", m["zh"])))
    A("| 门名 | %s门 |" % m.get("raw", m["zh"]))
    A("| 一性 | %s |" % x["释"])
    A("| 外内之分 | %s |" % x["外内"])
    A("| 判据词 | **%s** |" % JUDGE[code])
    A("| 类目 | %s |" % " · ".join("%s %s证类" % (l["code"], l["zh"]) for l in m["lei"]))
    if code in BODY_SRC:
        _b = BODY_SRC[code]
        A("| 正文（OCR） | %d/%d 条候 · %.1f 万字 · 印张 %s–%s ｜ 引擎 rapidocr PP-OCR |" % (
            _b.get("matched", 0), _b.get("expected", 0), _b.get("chars", 0) / 10000.0,
            _b.get("pageFrom", "?"), _b.get("pageTo", "?")))
    A("| ICD-11 TM1 四轴 | cause=%s ｜ property=%s |" % (
        " + ".join(x["tm1"]["cause"]), " + ".join(x["tm1"]["property"])))
    A("")
    A("## %d.2 类目总表（块级）" % m["n"])
    A("")
    A("| 类码 | 类名 | 证 | 候 | 一句话 | TM1 同词落点 |")
    A("|---|---|--:|--:|---|---|")
    for l in m["lei"]:
        y = LEI_BY[l["code"]]
        land = tm1_landing(tm1names, y)
        A("| `%s` | %s证类 | %d | %d | %s | %s |" % (
            l["code"], l["zh"], len(l["zhengList"]),
            sum(len(z["houList"]) for z in l["zhengList"]),
            md_cell(y["释"]),
            " · ".join("%s %s" % (h["code"], h["zh"]) for h in land) if land else "—（TM1 472 条无同名词条，见附录B）"))
    A("")
    A("## %d.3 证条目（类目级·%d 条）" % (m["n"], zheng_total))
    A("")
    A("> 读法：每条 = 一个「疾病证候单元」。**位**来自证名前段，**性**来自所隶类目，**候**是该单元下的实测子型。")
    A("> 下面的「一句话」由 位语素 × 性语素 合成（`standards/zhenghou-cidian/语素-*.json`），是**检索用的规范化释义**，不是原书条文；原书条文按「目录页」回查 PDF。")
    A("")
    for l in m["lei"]:
        y = LEI_BY[l["code"]]
        A("### %s %s证类（%d 证 %d 候）" % (l["code"], l["zh"], len(l["zhengList"]),
                                          sum(len(z["houList"]) for z in l["zhengList"])))
        A("")
        A("**类解**：%s ｜ **见症**：%s ｜ **治法**：%s ｜ **代表方**：%s" % (
            y["释"], y["见症"], y["治法"], y["方"]))
        A("")
        for z in l["zhengList"]:
            w = ZHENG_WEI.get(z["wei"] or "", {})
            A("#### %s %s（%d 候）" % (z["full"], z["zh"], len(z["houList"])))
            A("")
            A("| 字段 | 值 |")
            A("|---|---|")
            A("| 全码 | `%s` ｜ 书内原码 `%s` ｜ 目录页 %s |" % (
                z["full"], z["code"], z["page"] if z["page"] not in ("", "-1") else "606 之后（书签失效）"))
            A("| 坐标 | 位＝%s（%s）｜ 性＝%s（%s） |" % (
                z["wei"] or "（未拆开）", "·".join(w.get("parts", [])), l["zh"], l["code"]))
            A("| 一句话 | %s + %s —— %s%s |" % (
                z["wei"] or "?", l["zh"], w.get("定位", "（位语素缺失）"), y["释"]))
            A("| 见症 | 位（%s）：%s ｜ 性（%s）：%s |" % (
                z["wei"] or "?", w.get("见症", ""), l["zh"], y["见症"]))
            # 治法与方必须分开写「按位」与「按性」两段：
            # 证的治法 = 位治 + 性治（先定在哪一层、再定那一层出了什么错），合成的两段都要露出来。
            # 直接把类的治法抄给证，会出现「脾胃风火证 → 清肝息风降火」这种串位的错句。
            A("| 治法 | 位（%s）：%s ｜ 性（%s）：%s |" % (z["wei"] or "?", w.get("治法", ""), l["zh"], y["治法"]))
            A("| 代表方 | 位常用方：%s ｜ 类代表方：%s |" % (w.get("方", ""), y["方"]))
            A("| 候（%d） | 见下方「调用块」与候表 |" % len(z["houList"]))
            A("")
            # ── 调用块：把这一条当函数用 ──────────────────────────────
            # 为什么写伪代码而不是再写一段解释：辞典的读者有两类 —— 人和程序。
            # 人要一句话，程序要「输入什么、命中条件、返回什么」。伪代码同时满足两者，
            # 而且它把「判定依据」逼成可见的名单（位 4 项 + 性 4 项），不能含糊。
            wpos = split_terms(w.get("见症", ""))
            wxing = split_terms(y["见症"])
            A("**调用块（把这一条当函数用）**")
            A("")
            A("```js")
            A("// %s  %s  ·  %d 候" % (z["full"], z["zh"], len(z["houList"])))
            A("match(ctx) {                                   // ctx = 四诊（问、望、闻、切）")
            A("  const 位 = hit(ctx, [%s]);" % ", ".join('"%s"' % t for t in wpos[:4]))
            A("  const 性 = hit(ctx, [%s]);" % ", ".join('"%s"' % t for t in wxing[:4]))
            A("  if (位 + 性 >= 3 && 位 >= 1 && 性 >= 1) return \"%s\";   // 阈值=实测，见附录 E.2" % z["full"])
            A("  return null;                                 // 不命中就换相邻的位/性再试（见下「鉴别」）")
            A("}")
            A("```")
            A("")
            mix = fam_mix(z)
            A("**开关组**（本证 %d 个候，按「错在哪一步」分成 %d 组）：%s" % (
                len(z["houList"]), len(mix),
                " ｜ ".join("%s %d（%s）" % (k, v, short_fam(k)) for k, v in mix)))
            A("")
            A("> 读法：**位 × 性定「这是哪个证」，开关组定「是哪一个候」**。同一个证在不同病人身上，先亮的那一组不同 —— 那就是病程走到了哪一步。")
            A("")
            nw, nl = neighbors(z, l)
            seg = []
            if nw:
                seg.append("`%s %s`（位同、性不同：%s vs %s）" % (nw["full"], nw["zh"], l["zh"], nw["leiZh"]))
            if nl:
                seg.append("`%s %s`（性同、位不同：%s vs %s）" % (nl["full"], nl["zh"], z["wei"], nl["wei"]))
            if seg:
                A("**鉴别**（一次只比一维）：%s。两句话分得开，就不是同一个证；分不开就去查 `张量.json` 的格距。" % " ｜ ".join(seg))
            else:
                A("**鉴别**：本类只此一证，无需内部区分；与邻类的差别见本节「类解」。")
            A("")
            dh = len(z["houList"])
            pg = z["page"] if z["page"] not in ("", "-1") else "606 之后（书签失效）"
            if z["declareHou"] == dh:
                A("**底本核对**：书内声明 %d 候 / 目录实列 %d 候（**一致**）｜ 目录页 %s。" % (z["declareHou"], dh, pg))
            else:
                A("**底本核对**：书内声明 **%d** 候 / 目录实列 **%d** 候（**差 %+d**，已登记 `校对.差异`）｜ 目录页 %s。"
                  % (z["declareHou"], dh, dh - z["declareHou"], pg))
            A("")
            A("| 序 | 全码 | 候名 | 位 | 态 | 合成一句（位×态） | 原书 |")
            A("|--:|---|---|---|---|---|---|")
            for h in z["houList"]:
                t = TAI_BY.get(h["tai"] or "", {})
                A("| %d | `%s` | %s | %s | %s | %s | %s |" % (
                    h["n"], h["full"], h["zh"], h["wei"] or "?",
                    (h["tai"] or "?") + ("（%s族）" % t["族"] if t.get("族") else ""),
                    "「%s」×「%s」：%s" % (h["wei"] or "?", h["tai"] or "?", t.get("释", "")),
                    ("印张 %s" % BODY[h["full"]]["page"]) if h["full"] in BODY else "—"))
            A("")
            bodies = [h for h in z["houList"] if h["full"] in BODY]
            if bodies:
                A("**原书正文（全文转写）**：本证 %d/%d 条候已录入。原文照录、不改错字，"
                  "【摘录】【病案】一并保留 —— 这一层是原书，不是释义。" % (
                      len(bodies), len(z["houList"])))
                A("")
                for h in bodies:
                    b = BODY[h["full"]]
                    f = b.get("fields", {})
                    t = TAI_BY.get(h["tai"] or "", {})
                    A("##### %s %s ｜ `%s` ｜ 位 %s × 态 %s%s ｜ 印张 %s" % (
                        "(%d)" % h["n"], h["zh"], h["full"], h["wei"] or "?",
                        h["tai"] or "?", ("（%s族）" % t["族"]) if t.get("族") else "",
                        b.get("page")))
                    A("")
                    # 一句话：原书首句优先（那是作者的通俗话），没有正文才用语素合成。
                    # 两者必须标清来源，混着写就是拿合成冒原话。
                    first = first_sentence(f.get("病因病机") or f.get("治则") or "")
                    if first:
                        A("**一句话（原书原话）**：%s" % first)
                    else:
                        A("**一句话（语素合成，非原书）**：「%s」这一层出了「%s」这种错：%s" % (
                            h["wei"] or "?", h["tai"] or "?", t.get("释", "")))
                    A("")
                    for key in ("通称", "证候别称", "内含病例", "证象组合"):
                        if f.get(key):
                            A("- **%s**：%s" % (key, one_line(f[key])))
                    for key in ("病因病机", "主症", "副症", "宾症", "治则", "方症", "摘录", "病案"):
                        if not f.get(key):
                            continue
                        A("")
                        A("**%s**" % key)
                        A("")
                        for _para in str(f[key]).split(NL):
                            if _para.strip():
                                A("> %s" % _para.strip())
                    A("")
                missing = [h for h in z["houList"] if h["full"] not in BODY]
                if missing:
                    A("> 本证另有 %d 条候暂无原书正文（目录有、扫描件里没有独立正文段落）：%s。" % (
                        len(missing), "、".join("%s `%s`" % (h["zh"], h["full"]) for h in missing)))
                    A("")
    # 本门张量切片
    A("## %d.4 本门语义张量切片" % m["n"])
    A("")
    wei_count = {}
    tai_count = {}
    for l in m["lei"]:
        for z in l["zhengList"]:
            for h in z["houList"]:
                wei_count[h["wei"]] = wei_count.get(h["wei"], 0) + 1
                tai_count[h["tai"]] = tai_count.get(h["tai"], 0) + 1
    A("| 候位 | 候数 | ｜ | 态 | 计数 |")
    A("|---|--:|---|---|--:|")
    wl = sorted(wei_count.items(), key=lambda kv: (-kv[1], str(kv[0])))
    tl = sorted(tai_count.items(), key=lambda kv: (-kv[1], str(kv[0])))
    # 只列前 12 —— 一门的完整切片动辄四十行，正文里读不动；剩下的在 张量.json 里
    CUT = 12
    for i in range(min(CUT, max(len(wl), len(tl)))):
        a = "%s | %d" % (wl[i][0], wl[i][1]) if i < len(wl) else " | "
        b = "%s | %d" % (tl[i][0], tl[i][1]) if i < len(tl) else " | "
        A("| %s | %s |" % (a, b))
    A("")
    A("本门共 **%d 个候位 / %d 个态**，上表各取前 %d；完整切片见 `standards/zhenghou-cidian/张量.json` 的 `sliceMenWei`。"
      % (len(wl), len(tl), CUT))
    A("")
    A("**读法**：本门候数最多的位是 **%s**（%d 候），最多的态是 **%s**（%d 次）。"
      "位告诉你「病在哪一层」，态告诉你「那一层出了什么错」；两者相乘即本门的张量切片。" % (
          wl[0][0], wl[0][1], tl[0][0], tl[0][1]))
    A("")
    A("## %d.5 代价与边界" % m["n"])
    A("")
    A("%s" % COST[code])
    A("")
    A("**边界声明**：本章是《中医证候学》目录层的结构化重建，用于检索、编码与教学对照，"
      "**不构成诊疗建议**；任何一条证候的临床使用都必须回到原书正文与患者四诊。"
      "候级「合成一句」由语素表机械合成，不能替代原书对该候的病机与方证的论述。")
    A("")
    A("## %d.6 自检" % m["n"])
    A("")
    A("```bash")
    A("python scripts/build_zhenghou_cidian.py --check   # 本章全部条目、码、计数与数据文件一致")
    A("node departments/01-zhongyi/14-zhongyi-zhenghou-xue/chapters/%02d-%s-men/code/main.js" % (m["n"], PINYIN[code]))
    A("```")
    A("")
    return "\n".join(L)


PINYIN = {
    "M01": "feng", "M02": "han", "M03": "shu", "M04": "shi", "M05": "zao", "M06": "huo",
    "M07": "qi", "M08": "yu", "M09": "tan", "M10": "yin", "M11": "shiji", "M12": "xu",
}
SLUG_ZH = {
    "M01": "风证门", "M02": "寒证门", "M03": "暑证门", "M04": "湿证门", "M05": "燥证门",
    "M06": "火证门", "M07": "气证门", "M08": "瘀证门", "M09": "痰证门", "M10": "饮证门",
    "M11": "食证门", "M12": "虚证门",
}


def render_vol0(struct, tensor, men):
    c = struct["counts"]
    # 附录 D 与图 9 说的是同一批词项，这里算一次，避免两处数字打架
    REV_TERMS = set()
    for _w in WEI["证位"]:
        REV_TERMS.update(split_terms(_w.get("见症", "")))
    for _y in XING["类"]:
        REV_TERMS.update(split_terms(_y.get("见症", "")))
    L = []
    A = L.append
    A("# 凡例：这本辞典怎么读、怎么查、怎么接进程序")
    A("")
    A("> 一句话：这是一本**可被程序读的证候辞典**。它不是把纸书排版搬进 Markdown，")
    A("> 而是先把书的目录读成一棵树，再给树装上编码、坐标与门禁，最后才写释义。")
    A("")
    A("## 1 这本书的四个数字")
    A("")
    A("| 层 | 数量 | 来源 | 能不能机械复算 |")
    A("|---|--:|---|---|")
    A("| 门（章级） | %d | 目录「第N章 …门（A证B候）」 | 能（正则 + 逐门对账） |" % c["men"])
    A("| 类（块级） | %d | 目录「第N节 …证类（Lnn）」 | 能 |" % c["lei"])
    A("| 证（类目级） | %d 条 / %d 个码 | 目录「一、…证（Lnn-Zmm）」 | 能 |" % (c["zhengInstances"], c["zhengCodes"]))
    A("| 候（亚目级） | %d 条 / %d 个码 / %d 个候号 | 目录「（一）…候（Lnn-Zmm-Hnnn）」 | 能 |" % (
        c["houInstances"], c["houCodes"], c["houNumbers"]))
    A("")
    A("书内自述总数：「十二门、四十五类、二百九十一证、一千八百七十候」。"
      "目录实条与它的四处差异（寒 +1、湿 −1、饮 +2、食 +2）全部登记在 `standards/zhenghou-cidian/结构.json` 的 `校对.差异` 里 —— "
      "对不上就写下来，不改数字去凑。")
    A("")
    # 正文层：把「哪句是原书、哪句是合成」讲清楚。这是全书最容易被误读的一层。
    if BODY:
        A("**第五个数字：原书正文层**。%d/%d 条候已逐条 OCR 落库（%s），共 %.1f 万字原文字数，"
          "带印张页码；每条含【通称】【病因病机】【证象组合】【主症】【副症】【宾症】【治则】【方症】【摘录】【病案】。"
          % (len(BODY), c["houInstances"],
             "、".join(MEN_SHORT.get(k, k) for k in sorted(BODY_SRC)),
             sum(v.get("chars", 0) for v in BODY.values()) / 10000.0))
        A("")
        A("读书时记住三条：")
        A("")
        A("1. **候表里的「原书」列**是印张号 —— 想看原话，翻那一页；`—` 表示这一门还没 OCR。")
        A("2. **「原书正文（OCR 节选）」块**是原书的**原话**（含 OCR 错字，未做润色），每证一块，块首写「本证 m/n 条候已录入」。")
        A("3. **证级那句「合成一句」不是原书病机** —— 它是用「位×性×态」三个语素拼出来的索引句，只用来检索与比对，"
          "不能当引文，也不能当诊断依据。")
        A("")
        A("OCR 的错已经逐条记账，不藏：印张上的 L/Z 与目录不一致、目录有正文无、书内有目录无、同码两见，"
          "全部列在 `standards/zhenghou-cidian/缺口登记.json` 的 `正文层校勘` 里。")
        A("")
    A("## 2 四级编码：ICD-11 同构，书内三码一字不改")
    A("")
    A("```text")
    A("ICD-11 MMS   Chapter      →  Block       →  Category      →  Subcategory")
    A("本书          门 M01…M12    →  类 L01…L45   →  证 Lnn-Zmm     →  候 Lnn-Zmm-Hnnn")
    A("全码           M01-L01-Z01-H001")
    A("```")
    A("")
    A("四条命名原则（照 ICD-11 Reference Guide §3.2.26 与 MMS 编码规则取用，可逐条落到本辞典）：")
    A("")
    A("1. **单一主轴优先**：门按病性分（风/寒/暑/湿/燥/火/气/瘀/痰/饮/食/虚），不按病位分。位是第二轴，写在证名里。")
    A("2. **父子唯一归属**：一个证只能属于一个类，一个类只能属于一个门。若两者皆可，取更具体的那个（本书 `痰瘀证类 L30` 即在瘀门而不在痰门）。")
    A("3. **可扩展后缀**：候码 = 证码 + `-Hnnn`，追加不改父码。新增一个候不需要改动任何既有条目。")
    A("4. **同码同义、异义异码**：`L05-Z13` 在原书被「脾胃阴寒证」与「肺脾阴寒证」共用，是**原书编号冲突**。"
      "本层不改原码，只在扩展层记 `L05-Z13a / L05-Z13b`，并把它挂在 `校对.证码重复` 里报警。")
    A("")
    A("## 3 三轴与张量")
    A("")
    A("| 轴 | 取值 | 数量 | 在本辞典里的位置 |")
    A("|---|---|--:|---|")
    A("| 位 locus | 肺胃、肝脾……心营；清气、清阳、卫气…… | %d 证位 + %d 候位 | 证名前段 / 候名前段 |" % (len(ZHENG_WEI), len(HOU_WEI)))
    A("| 性 cause·property | 12 门 + 45 类 | 57 | 所隶门 / 所隶类 |")
    A("| 态 property | 失宣、郁蒸、闭脱…… | %d | 候名尾部 |" % len(tensor["axes"]["态"]))
    A("")
    A("张量形状 `%s`（位 × 类 × 态），实测非零格 **%d** 个。每个非零格的计数就是「这一类组合在书中出现了多少候」。"
      % ("×".join(str(s) for s in tensor["shape"]), len(tensor["cells"])))
    A("")
    A("## 4 三种查法")
    A("")
    A("| 你手里有的 | 怎么查 | 例 |")
    A("|---|---|---|")
    A("| 一个症状 | 先找位（哪一层），再找态（那一层出了什么错），最后落类 | 恶寒无汗＋脉浮紧 → 位＝肺卫，性＝风寒 → `M01-L01` |")
    A("| 一个古病名 | 用附录 C 的检索命令按「内含病例」反查 | `node scripts/zhenghou_query.js 肺卫风寒证` |")
    A("| **一句人话**（「我头晕、口苦」） | 查附录 D 的症状反查表，词项 → 位/性 → 候选证 | 见附录 D |")
    A("| 一个 ICD-11 码 | 用 TM1 四轴（locus/cause/property）反推本书的位与性 | 见附录 B |")
    A("")
    A("## 5 读这本辞典的三个约定")
    A("")
    A("1. **目录是底本，正文是释义**。所有码、条数、层级全部来自 `目录原文.txt`（2268 条，由 PDF 书签逐条落盘）。"
      "释义层（一句话、见症、治法、方）来自三张语素表，可拆回语素，**不是原书条文**。")
    A("2. **候级「合成一句」是检索用语，不是病机论述**。要病机，按目录页回查 PDF —— 我们只保证「找得到」，不假装「读完了」。")
    A("3. **不做诊疗建议**。这本辞典是给教学、编码、APP 数据层用的；任何临床使用都要回到四诊与原书正文。")
    A("")
    A("## 6 与仓库其它层的关系")
    A("")
    A("| 层 | 位置 | 关系 |")
    A("|---|---|---|")
    A("| 底本层（本辞典自有） | `standards/zhenghou-cidian/` | 目录原文 + 四级结构 + 三张语素表 + 张量 |")
    A("| 课程层 | `departments/01-zhongyi/14-zhongyi-zhenghou-xue/` | 12 章按三基编排（基本理论 1–4 · 基本方法 5–9 · 基本技能 10–12），由 `scripts/build_zhenghou_sanji.py` 生成；各论十二门在本书（教材层） |")
    A("| 跨课程派生层（旧） | `standards/zhenghou/证候库.json` | 四门临床课派生的 132 证，作为「另一套命名」的对照（见附录 B） |")
    A("| 规范层 | `standards/icd11/tm1/axes.json` | ICD-11 TM1 四轴词表（官方 472 条题名统计） |")
    A("")
    A("## 7 一个例子走完四步（通俗版）")
    A("")
    A("假设一个人说：「怕冷得厉害，不出汗，头和身上都疼，鼻子堵、流清鼻涕，脉浮而紧。」")
    A("")
    A("| 步 | 问什么 | 回答 | 落到哪 |")
    A("|---|---|---|---|")
    A("| 1 门 | 起病急不急、有没有「动」（抖、晕、抽）、是不是从皮毛口鼻进来 | 起病急、鼻塞脉浮 → 外风 | 门 `M01` 风 |")
    A("| 2 类 | 兼的是寒还是热（怕冷重还是发热重、痰涕清还是黄、脉紧还是数） | 怕冷重、涕清、脉紧 | 类 `L01` 风寒 |")
    A("| 3 位 | 病在哪一层（肺卫？脾胃？肝胆？） | 鼻塞咳嗽＋脉浮 → 肺与卫表 | 证 `M01-L01-Z01` 肺卫风寒证 |")
    A("| 4 候 | 这一层的哪一步先坏（宣不出？降不下？堵住了？不够用？） | 该出汗没出汗、该宣发没宣发 | 候 `M01-L01-Z01-H001` 卫气失宣候 |")
    A("")
    A("于是四步走完，得到一个**全码** `M01-L01-Z01-H001`，和一句治法动作：「宣」。")
    A("换一个症状会怎样？把「怕冷重」换成「发热重、咽痛、脉数」—— 第 2 步的类就从 `L01` 变 `L02`（风热），")
    A("全码变成 `M01-L02-Z01`。**两个证在码上只差一段，在张量上只差一维** —— 这就是「可计算」的全部含义：")
    A("鉴别不再是「两个词像不像」，而是「两条坐标差几格」。")
    A("")
    A("注意这个例子**不是诊断**：它演示的是「四诊 → 坐标」的映射怎么走。真到病人身上，还要看舌、看脉、看体质、看病程。")
    A("")
    A("## 8 插图：语义张量的十二张图")
    A("")
    A("十二张图分四组：**结构**（图 1–2，编码与张量怎么搭）、**密度**（图 3–4，1052 个非零格落在哪）、"
      "**粒度**（图 5–6，291 证与 1866 候的粗细）、**工程**（图 7–12，状态机、APP 数据流、反查覆盖、危候热力、六段流水线、四层数据栈）。"
      "每张图都有源文件（`figures/*.mmd` / `*.py`），改数据重跑即重画。")
    A("")
    A("### 图 1 四级编码与 ICD-11 同构")
    A("")
    A("![图1](figures/fig-01-四级编码与ICD11同构.svg)")
    A("")
    A("**图注**：左边是 ICD-11 MMS 的四层（Chapter → Block → Category → Subcategory），右边是本书的四层"
      "（门 M01…M12 → 类 L01…L45 → 证 Lnn-Zmm → 候 Lnn-Zmm-Hnnn）。两边的箭头一一对应，"
      "**下半部分的 `L/Z/H` 是原书编码，一字未改**，只在上头补了一层门码 —— 这正是「以 ICD-11 命名原则支撑」的落点："
      "不是把中医塞进 ICD 的格子，而是让两套码共用同一种父子语法。")
    A("")
    A("### 图 2 三轴怎么乘成一张张量")
    A("")
    A("![图2](figures/fig-02-三轴到张量.svg)")
    A("")
    A("**图注**：位（22 证位 + %d 候位）× 性（12 门 + 45 类）× 态（%d 态）三轴相乘，得到一张 %s 的稀疏张量；"
      "实测非零格 **%d** 个。图中「一个候 = 一个格子」是关键：候不是新造的概念，它是张量里一个被点亮的坐标。"
      "APP 侧的「相似证候」就是在这张张量上量距离。"
      % (len(HOU_WEI), len(TAI_BY), "×".join(str(x) for x in tensor["shape"]), len(tensor["cells"])))
    A("")
    A("### 图 3 十二门 × 候位：密度落在哪一层")
    A("")
    A("![图3](figures/fig-03-门与候位密度.svg)")
    A("")
    A("**图注**：热力的每一格是「某门下某候位出现的候数」。读法有两条：横向看，"
      "**清气与清阳**几乎在每一门都亮（说明「上焦/头面」是最常被描述的一层）；纵向看，"
      "湿门与虚门的整行最亮（25 证 249 候 / 44 证 307 候），这两门是全书的重心。"
      "空格（白色）不是「不存在」，是这本书没收到 —— 这就是本辞典的边界。")
    A("")
    A("### 图 4 四十五类 × 态：每一类的「错法」指纹")
    A("")
    A("![图4](figures/fig-04-类与态密度.svg)")
    A("")
    A("**图注**：每一行是一个类，每一列是一个态，格子里是候数。这张图可以被当成**指纹**读："
      "风寒类（L01）的亮格集中在「失宣/郁遏」，湿热类（L12）集中在「郁蒸/郁滞」，"
      "虚证四类（L42–L45）集中在「虚郁/失养」。类的边界，在态分布上是可以被看见的。")
    A("")
    A("### 图 5 二百九十一证在位 × 性平面上的分布")
    A("")
    A("![图5](figures/fig-05-位性气泡.svg)")
    A("")
    A("**图注**：横轴是 22 个证位（肺胃…心营），纵轴是 45 个类，气泡大小是该证的候数。"
      "一眼能看出三件事：① 位对集中在「肝×脾/胃」「肺×胃」一带，说明这本书的证候重心在中上二焦；"
      "② 火门（L18–L23）在纵轴上占据最长一段，且每一类都有多个位对落脚；"
      "③ 大量格子是空的 —— **291 证只覆盖了 22×45 个可能组合里的很小一部分**，"
      "空白处正是「还没被命名的证候」，也是后续扩展的候选区。")
    A("")
    A("### 图 6 粒度：每证多少候，以及十个最高频的态")
    A("")
    A("![图6](figures/fig-06-候粒度与十态.svg)")
    A("")
    A("**图注**：左图是「每证候数」的分布（1 候到 25 候），中位数落在 5–6 候；"
      "右图是全书出现最多的十个态。两张图合起来回答一个问题：**这本辞典的条目粗细是否一致？**"
      "答案是「不一致，而且不该一致」—— 火门与虚门的证天然有更多子型，"
      "强行把每条都切成同样多候，只会制造不存在的区分。")
    A("")
    A("### 图 7 传变状态机：本证 / 转证 / 变证 × 六个开关族")
    A("")
    A("![图7](figures/fig-07-传变状态机.svg)")
    A("")
    A("**图注**：证的三态（本证＝标准型、转证＝同证换位、变证＝换性换门）与候的六族（失守／郁／虚／火／陷逆／脱绝）"
      "画在一张图里。**箭头方向就是恶化方向**：越往「脱绝」走，越接近危候；`危候=true` 时必须从调理建议切成立即就医。"
      "这张图是把 1866 条候压成几个开关之后，工程上唯一需要写的转移逻辑。")
    A("")
    A("### 图 8 APP 数据流：从一句人话到一条全码")
    A("")
    A("![图8](figures/fig-08-APP数据流.svg)")
    A("")
    A("**图注**：六段流水线 —— 归一＋定维 → 候选＋取距 → 调用块＋开关组 → 分流（就医／调理）→ 医生复核 → 回写全码。"
      "**两条分叉是重点**：归一失败要如实回「未收录」（不许模糊匹配）；开关组命中「陷逆／脱绝」要直接切就医（不许走调理）。")
    A("")
    A("### 图 9 百姓入口的覆盖：一个词能落多少条证")
    A("")
    A("![图9](figures/fig-09-症状反查覆盖.svg)")
    A("")
    A("**图注**：左图是附录 D 那 %d 个词项的「可落证数」分布，右图是最泛的 12 个词。"
      "读法：能落 40–60 条证的词（如「脉弦」「苔腻」）几乎不携带鉴别信息，只适合做**初筛**；"
      "能落 3–8 条证的词（如「背冷」「嗳腐吞酸」）才是**定位词**。APP 的排序应当先问定位词，再问泛词。"
      % len(REV_TERMS))
    A("")
    # 图 10–12：为「AI 百姓应用」这一层补的三张。原九张讲结构与密度，这三张讲**工程落地**。
    A("### 图 10 十二门 × 六族：危候长在哪一格")
    A("")
    A("![图10](figures/fig-10-门与族热力图.svg)")
    A("")
    A("**图注**：行是十二门，列是六个开关族（失守→郁→虚→火→陷逆→脱绝，从左到右＝恶化方向）。"
      "格子是该门该族的候数，空格即 0，未做任何平滑。**读法两条**："
      "① 任何一门只要「脱绝」列不为 0，这个门的算法就**必须**带危候直通就医的分支（见图 11 第⑤步）；"
      "② 行与行的差别说明「门」不是均质的——湿门与虚门的候集中在失守/郁，火门集中在火，"
      "所以同一个阈值套到十二门上一定有一半判错。这也是编码器阈值写死在附录 E.2 的原因。")
    A("")
    A("### 图 11 从一句话主诉到「疾病证候单元」：一条像 CI 的流水线")
    A("")
    A("![图11](figures/fig-11-从主诉到证候单元.svg)")
    A("")
    A("**图注**：六段流水线 = 归一 → 定维 → 取候选 → 调用块 → 分流 → 回写。"
      "把它画成 CI 的形状是有意的：每一步都有**输入契约、判定条件、失败分支**，"
      "失败分支只有两种合法结局——「换相邻维度再试一次」或「如实回未收录」，"
      "**不允许模糊匹配**。末段「回写全码」对应持续迭代：医生复核的结果回流成下一轮的训练样本。")
    A("")
    A("### 图 12 四层数据栈：哪一层可以改，哪一层不许改")
    A("")
    A("![图12](figures/fig-12-四层数据栈.svg)")
    A("")
    A("**图注**：自下而上四层是目录层（书内三码，宪法层，只能追加不能改）、语素层（位/性/态，可迭代）、"
      "正文层（OCR 转写，可重跑）、接口层（/encode 等，可替换）。"
      "**这条栈是给接手的人看的**：越往下越不许动 —— 改了原书码就再也回查不到纸书，"
      "而语素层与接口层随便改，只要 `--check` 还是绿的。")
    A("")
    A("---")
    A("")
    A("**免责声明**：本辞典为教学与工程用途的证候结构重建，不构成医疗诊断或治疗建议。"
      "书中任何证候名的临床使用，均需由执业中医师结合四诊与患者具体情况判断。")
    A("")
    return "\n".join(L)


def render_appendix_a(struct, tensor, men):
    L = []
    A = L.append
    A("# 附录 A · 位 / 性 / 态 三张总表")
    A("")
    A("> 这三张表是整本辞典的「零件库」。所有正文条目都由它们组合而成，所以任何一条都能拆回去。")
    A("")
    A("## A.1 位轴 · 证位 22（证名前段）")
    A("")
    A("| 位 | 构件 | 证数 | 一句定位 | 见症 | 治法 | 代表方 |")
    A("|---|---|--:|---|---|---|---|")
    for w in WEI["证位"]:
        A("| **%s** | %s | %d | %s | %s | %s | %s |" % (
            w["zh"], "·".join(w["parts"]), w["n"], md_cell(w["定位"]),
            md_cell(w["见症"]), md_cell(w["治法"]), md_cell(w["方"])))
    A("")
    A("## A.2 位轴 · 候位（候名前段）")
    A("")
    A("| 候位 | 构件 | 一句定位 |")
    A("|---|---|---|")
    for w in WEI["候位"]:
        A("| **%s** | %s | %s |" % (w["zh"], "·".join(w.get("parts", [])), md_cell(w["定位"])))
    A("")
    A("## A.3 性轴 · 12 门")
    A("")
    A("| 门码 | 门 | 证 | 候 | 一性 |")
    A("|---|---|--:|--:|---|")
    for x in XING["门"]:
        A("| `%s` | %s门 | %d | %d | %s |" % (x["code"], x["zh"], x["zheng"], x["hou"], md_cell(x["释"])))
    A("")
    A("## A.4 性轴 · 45 类")
    A("")
    A("| 类码 | 类 | 门 | 证 | 候 | 一句话 | 治法 | 方 |")
    A("|---|---|---|--:|--:|---|---|---|")
    for y in XING["类"]:
        A("| `%s` | %s | %s | %d | %d | %s | %s | %s |" % (
            y["code"], y["zh"], y["men"], y["zheng"], y["hou"],
            md_cell(y["释"]), md_cell(y["治法"]), md_cell(y["方"])))
    A("")
    A("## A.5 态轴 · %d 态 × 6 族" % len(TAI_BY))
    A("")
    A("> 全部 %d 个字面取自 1866 条候名的尾部（其中 %d 个是三字态：失宣降/失清肃/失和降/不归元/不归原/损及阴/损及阳/滞不化/枯火炽），"
      "无一取自语料库外部。族是按「错在何处」分的，不是按字面。" % (len(TAI_BY), sum(1 for t in TAI_BY if len(t) == 3)))
    A("")
    for fam in TAI["族"]:
        A("### %s族 · %s" % (fam["id"], fam["释"]))
        A("")
        A("| 态 | 释 | 治法动作 |")
        A("|---|---|---|")
        for t in TAI["态"]:
            if t.get("族") == fam["id"]:
                A("| **%s** | %s | %s |" % (t["zh"], md_cell(t["释"]), md_cell(t.get("动作", ""))))
        A("")
    A("")
    return "\n".join(L)


def render_appendix_b(struct, tensor, men, tm1names):
    L = []
    A = L.append
    A("# 附录 B · ICD-11 命名原则与本书四级的对照")
    A("")
    A("> 「以 ICD-11 命名原则支撑」不是贴一个标签。这一附录把原则逐条拆开，")
    A("> 每条后面写清：本书哪一层执行了它、执行到什么程度、哪里没执行。")
    A("")
    A("## B.1 原则一：组合式命名（四轴）")
    A("")
    A("ICD-11 第 26 章（传统医学）的命名规则（Reference Guide §3.2.26）：")
    A("病与证候按 **body structures / causal explanations / properties / severity** 四轴组合命名。")
    A("本仓库已把官方 472 条 TM1 题名统计成词表：`standards/icd11/tm1/axes.json`。")
    A("")
    A("| 轴 | 官方词项数 | 本书对应 | 对应方式 |")
    A("|---|--:|---|---|")
    A("| locus（body structures） | 38 | 位轴（22 证位 + %d 候位） | 直接对应：肺/肝/脾/肾/胃/胆/肠/经络/胞宫…… |" % len(HOU_WEI))
    A("| cause（causal explanations） | 12 | 门（12） | 直接对应：风/寒/暑（heat）/湿/燥/火/phlegm/water/food/fatigue |")
    A("| property | 50 | 类（45）+ 态（108） | 部分对应：虚/气/血/阴/阳/stagnation/obstruction… 本书的「态」更细 |")
    A("| severity | 5 | 无独立轴 | **未执行**：本书用「本证/转证/变证」与「闭脱/厥脱」字面承担，未独立成轴 |")
    A("")
    A("轴序（官方题名统计得出的多数次序）：**locus > severity > cause > property**。"
      "本书证名「肺卫风寒证」= locus(肺卫) + cause(风寒) + 「证」，与官方轴序一致；"
      "候名「卫气失宣候」= locus(卫气) + property(失宣) + 「候」，也一致。**这是可以机械验证的对齐，不是类比。**")
    A("")
    A("## B.2 原则二：类目唯一、父子单归属")
    A("")
    A("| 检查项 | 结果 | 证据 |")
    A("|---|---|---|")
    zc = struct["counts"]
    A("| 每个证有且仅有一个父类 | ✅ %d/%d | 结构.json 里每个证带 `lei` 字段，来源唯一 |" % (zc["zhengInstances"], zc["zhengInstances"]))
    A("| 每个类有且仅有一个父门 | ✅ %d/%d | 每个类带 `men` 字段 |" % (zc["lei"], zc["lei"]))
    A("| 证码全局唯一 | ❌ 1 处冲突 | `L05-Z13` 被「脾胃阴寒证」与「肺脾阴寒证」共用（原书编号错），本层记 `校对.证码重复` |")
    A("| 候码全局唯一 | %s | %d 个候码 / %d 条候条目 —— 同一候号在不同证下复用是**设计**（候是类型，不是实例） |" % (
        "✅" if zc["houCodes"] == zc["houInstances"] else "⚠ 复用", zc["houCodes"], zc["houInstances"]))
    A("")
    A("## B.3 原则三：亚目可扩展（不改父码）")
    A("")
    A("```text")
    A("M01-L01-Z01         肺卫风寒证（类目）")
    A("M01-L01-Z01-H001    卫气失宣候（亚目 1）")
    A("M01-L01-Z01-H005    卫阳失宣候（亚目 5）  ← 序号沿用原书，不重排")
    A("```")
    A("")
    A("这就是 ICD-11 「postcoordination / extension」的最小实现：加一个候，不动证；加一个证，不动类。"
      "全库 %d 条候、%d 条证，全部可按此规则无限追加。" % (zc["houInstances"], zc["zhengInstances"]))
    A("")
    A("## B.4 落点：45 类在 TM1 里的同词命中")
    A("")
    A("> 口径：只在 TM1 官方 472 条中文题名里做**同词检索**，不做同义推断。命中即列码；不命中就写「无」，不编。")
    A("> 注意：题名里含同名二字的，可能属于 TM1 里的子系统（如四象医学的「太阴人…」），")
    A("> 那只是**用字相同**，不是「同一个证」—— 列出来是为了让人去核，不是为了让表格好看。")
    A("")
    A("| 类码 | 类 | TM1 同词命中 |")
    A("|---|---|---|")
    hit_n = 0
    for y in XING["类"]:
        h = tm1_landing(tm1names, y)
        if h:
            hit_n += 1
        A("| `%s` | %s | %s |" % (y["code"], y["zh"],
                                  " · ".join("%s %s" % (x["code"], x["zh"]) for x in h) or "—（无同词条）"))
    A("")
    A("命中 %d/45 类。**没命中的不是失败**：ICD-11 TM1 收的是「病与证候的最小集」，"
      "本书是「证候的全展开集」，前者 472 条、后者 291 证 1866 候，粒度差两个量级。"
      "同词命中说明「这一条在官方体系里已经被承认」，没命中说明「它只活在这本书的体系里」——两种都需要记下来。" % hit_n)
    A("")
    A("## B.5 与旧派生层（132 证）的对照")
    A("")
    old_names = []
    try:
        lib = jload(ROOT, "standards", "zhenghou", "证候库.json")
        old_names = [z["name"] for z in lib.get("zheng", [])]
    except Exception:
        old_names = []
    new_names = [z["zh"] for m in men for l in m["lei"] for z in l["zhengList"]]
    exact = sorted(set(old_names) & set(new_names))
    A("| 口径 | 数量 |")
    A("|---|--:|")
    A("| 旧层（四门临床课派生） | %d 证 |" % len(old_names))
    A("| 本层（本书目录） | %d 证 |" % len(new_names))
    A("| 两套命名完全同名的 | %d（%s） |" % (len(exact), "、".join(exact[:8]) if exact else "无"))
    A("")
    A("**这个数字就是本辞典存在的理由**：同一批临床事实，两套体系给出两批不同的名字，"
      "同名率只有 %d/%d。不先把名字与层级固定下来，任何「证候 AI」都只是在猜同义词。" % (
          len(exact), len(new_names)))
    A("")
    return "\n".join(L)


def render_appendix_c(struct, tensor):
    c = struct["counts"]
    L = []
    A = L.append
    A("# 附录 C · 把辞典接进程序：数据形状、查询、CI")
    A("")
    A("> 这一附录是给「百姓应用 APP」的数据层准备的：你要用的不是 Markdown，是三个 JSON。")
    A("")
    A("## C.1 三个数据文件")
    A("")
    A("| 文件 | 形状 | 用途 |")
    A("|---|---|---|")
    A("| `standards/zhenghou-cidian/结构.json` | 四级树 + 校对差异 | 目录树、码表、回查页码 |")
    A("| `standards/zhenghou-cidian/张量.json` | 稀疏计数 + 两张切片 | 相似度、推荐、可视化 |")
    A("| `standards/zhenghou-cidian/语素-{位,性,态}.json` | 词表 | 命名生成、释义合成、术语归一 |")
    A("")
    A("## C.2 一条记录长什么样")
    A("")
    A("```json")
    A("{")
    A('  "full": "M01-L01-Z01",           // 四级全码（门-类-证）')
    A('  "code": "L01-Z01",               // 书内原码（不改）')
    A('  "zh": "肺卫风寒证",')
    A('  "men": "M01", "lei": "L01",      // 父链：唯一归属')
    A('  "wei": "肺卫",                    // 位轴取值')
    A('  "declareHou": 25,                 // 书内声明候数')
    A('  "page": "85",                     // 目录页（606 页之后书签失效记 -1）')
    A('  "houList": [ {"full": "M01-L01-Z01-H001", "zh": "卫气失宣候", "wei": "卫气", "tai": "失宣"} ]')
    A("}")
    A("```")
    A("")
    A("## C.3 三个查询（无需数据库）")
    A("")
    A("```bash")
    A("# 1) 按全码取一条证及其全部候")
    A("node scripts/zhenghou_query.js M01-L01-Z01")
    A("")
    A("# 2) 按证名模糊查（含候名）")
    A("node scripts/zhenghou_query.js 肺卫风寒")
    A("")
    A("# 3) 按张量坐标取候选：位=肺卫，态=失宣")
    A("node scripts/zhenghou_query.js --wei 肺卫 --tai 失宣")
    A("")
    A("# 4) 四诊 → 候选证（/encode 的参考实现，见附录 E）")
    A("node scripts/zhenghou_encode.js --ctx \"恶寒重 无汗 脉浮紧\"")
    A("```")
    A("")
    A("## C.4 APP 侧建议的三个接口")
    A("")
    A("| 接口 | 输入 | 输出 | 为什么这样切 |")
    A("|---|---|---|---|")
    A("| `/unit/{full}` | 全码 | 证 + 候 + 见症 + 治法 + 方 | 详情页 |")
    A("| `/search?q=` | 自由词 | 候选证候（按同名 > 同候 > 同位排序） | 搜索框 |")
    A("| `/near?wei=&tai=` | 位/态 | 若干证候 + 张量距离 | 鉴别与相似推荐 |")
    A("")
    A("## C.5 CI：这本辞典怎么保证不烂掉")
    A("")
    A("| 门 | 命令 | 挡什么 |")
    A("|---|---|---|")
    A("| 生成物一致 | `python scripts/build_zhenghou_cidian.py --check` | 有人手改了正文却没改底本，或反之 |")
    A("| 章契约 | `node scripts/audit_curriculum.js` | 12 章缺 docs/quiz/outputs、篇幅不足 |")
    A("| 章代码 | `node tests/test_chapter_code.js` | 每章的 main.js 跑不通、测试空跑 |")
    A("| 插图出处 | `node scripts/figures/check_provenance.js` | 图里的话在正文里找不到 |")
    A("")
    A("全部由 `npm run check` 串起来 —— 也就是说，这本辞典的每一次修改都必须过一遍上面四道。")
    A("")
    A("**免责声明**：上述接口与命令是数据层的工程说明，不含任何诊疗逻辑；"
      "任何面向患者的输出都需要医生端复核。")
    A("")
    return "\n".join(L)


def render_appendix_d(struct, men):
    """附录 D · 症状反查索引 —— 百姓入口。

    为什么要有这一卷：整本辞典是按「门→类→证→候」编的，那是医生的读法；
    一个普通人只会说「我头晕」「我怕冷」。这两套词之间必须有一张桥，
    否则 APP 只能做一个搜索框，用户输什么都是碰运气。
    这张桥的建法是**穷举**：把 22 个位语素与 45 个性语素的「见症」全部拆成词项，
    去重后每个词项反查它能落到哪些证 —— 词表外的一律不猜。
    """
    # term -> {"位": set, "性": set}
    rev = {}
    for w in WEI["证位"]:
        for t in split_terms(w.get("见症", "")):
            rev.setdefault(t, {"位": set(), "性": set()})["位"].add(w["zh"])
    for y in XING["类"]:
        for t in split_terms(y.get("见症", "")):
            rev.setdefault(t, {"位": set(), "性": set()})["性"].add(y["zh"])

    def cand(entry):
        out = []
        for x in ALLZ:
            if x["wei"] in entry["位"] or x["leiZh"] in entry["性"]:
                out.append(x)
        out.sort(key=lambda x: -x["nHou"])
        return out

    rows = []
    for t, e in rev.items():
        c = cand(e)
        rows.append((t, len(e["位"]) + len(e["性"]), c[:3], c))
    rows.sort(key=lambda r: (-r[1], -len(r[3]), r[0]))

    L = []
    A = L.append
    A("# 附录 D · 症状反查索引：从「我头晕」到一条全码")
    A("")
    A("> 这一卷是给**百姓入口**用的。前面的 12 章按病理编排，是医生的读法；")
    A("> 这一卷按「你会怎么说」编排，是患者/家属的读法。两者共用同一套码。")
    A("")
    A("## D.1 怎么用")
    A("")
    A("```text")
    A("用户说：我头晕、口苦、胁胀          （自然语言）")
    A("   ↓ 查本卷：头晕 → 位=清阳/肝阳 · 性=风阳/肝火     （词项 → 维）")
    A("   ↓ 取候选：M01-L03 风阳证 / M06-L18 风火证 …      （维 → 证，按候数排序）")
    A("   ↓ 回到 12 章：读该证的调用块与开关组              （证 → 条目）")
    A("输出：3 条候选 + 「请由医生确认」                     （不是诊断，是候选）")
    A("```")
    A("")
    A("## D.2 反查表（%d 个词项，按可落维数排序）" % len(rows))
    A("")
    A("> 口径：词项**只取自语素表的「见症」字段**（位 22 条 + 类 45 条），不额外扩词、不做同义词推断。")
    A("> 一个词项可能同时属于多个位/性 —— 那正是「同一个症状、不同病机」的来源，不是数据脏。")
    A("")
    A("| 你会这么说 | 可落维 | 候选证（按候数取前 3） |")
    A("|---|---|---|")
    for t, n, top, allc in rows:
        A("| **%s** | %d | %s |" % (
            md_cell(t), n,
            " · ".join("%s %s" % (x["full"], x["zh"]) for x in top) or "—"))
    A("")
    A("合计 **%d** 个词项；平均每个词项可落 **%.1f** 条证候。这个词项数与覆盖度就是 APP 搜索框的上限："
      "词表外的说法（方言、口语、错别字）必须先归一，归一不掉的，界面上要老实写「本辞典未收录」。"
      % (len(rows), sum(len(r[3]) for r in rows) / max(1, len(rows))))
    A("")
    return "\n".join(L)


def render_appendix_e(struct, tensor):
    """附录 E · APP 开发手册：数据结构 / 状态机 / 流水线 / 迁移协议。"""
    L = []
    A = L.append
    A("# 附录 E · 应用工程手册：把辞典当服务用")
    A("")
    A("> 这一卷写给写代码的人。它回答四个问题：数据长什么样、判定怎么写成状态机、")
    A("> 改数据怎么不炸、上线前跑什么。所有数字都由 `standards/zhenghou-cidian/` 现算。")
    A("")
    A("## E.1 数据契约（三个文件，读完就能开工）")
    A("")
    A("```text")
    A("standards/zhenghou-cidian/")
    A("  结构.json   → men[].lei[].zhengList[].houList[]   // 四级树，唯一真相")
    A("  张量.json   → cells{ \"候位|证位|态\": n }，sliceMenWei / sliceLeiTai   // 相似度")
    A("  语素-*.json → 位/性/态的词典，含释义、见症、治法、TM1 构件      // 释义合成")
    A("```")
    A("")
    A("| 字段 | 类型 | 能不能为空 | 用途 |")
    A("|---|---|---|---|")
    A("| `full` | string `M01-L01-Z01[a]` | 否 | 主键（**唯一**，原书一码两用时带 a/b 后缀） |")
    A("| `code` | string `L01-Z01` | 否 | 书内原码（回查纸书用，不改） |")
    A("| `wei` | string | 否 | 位轴取值（22 证位之一） |")
    A("| `houList[].tai` | string | 否 | 态轴取值（108 态之一） |")
    A("| `page` | string / `-1` | 可 | 目录页；`-1` = 书签目标失效（不是缺页） |")
    A("| `declareHou` | int | 否 | 书内声明的候数（与实列不一致的 10 条已登记） |")
    A("")
    A("## E.2 判定怎么写：从 if 到状态机")
    A("")
    A("**阈值不是拍出来的，是跑出来的**。第一版写的是「位 ≥2 且 性 ≥2」，拿 12 门夹具一跑，")
    A("最典型的风寒表证（恶寒重、无汗、脉浮紧）被判成**零候选** —— 因为位语素写「无汗或少汗」、")
    A("类语素写「无汗」，一个词只落得住一边。改成 **合计 ≥3 且两侧各 ≥1**（`位+性≥3 && 位≥1 && 性≥1`），")
    A("并把 `位≥2 && 性≥2` 单列为 **strong 档**用于排序。这份阈值与 `scripts/zhenghou_encode.js` 同一处定义，")
    A("改阈值必须同时改 291 条证的「调用块」与本节 —— 三处不一致就是 bug。")
    A("")
    A("第一版可以直接照抄证条目的「调用块」；但真实病人会**同时命中多个证**，所以第二版写成状态机：")
    A("")
    A("```js")
    A("// 状态 = 张量里的一个格；转移 = 态族之间的移动（失守→郁→虚→脱绝 是恶化方向）")
    A("const ORDER = ['失守', '郁', '虚', '火', '陷逆', '脱绝'];   // 越靠后越危")
    A("")
    A("function step(state, ctx) {")
    A("  const hits = CANDIDATES.filter(z => score(z, ctx) >= 2)   // 候选证")
    A("                        .sort((a, b) => score(b, ctx) - score(a, ctx));")
    A("  const zi = hits[0];                                       // 主证（永远给出）")
    A("  const hou = pickHou(zi, ctx);                             // 主证下亮哪一组开关")
    A("  return { 主证: zi.full, 主候: hou.full, 危候: ORDER.indexOf(famOf(hou)) >= 4 };")
    A("}")
    A("```")
    A("")
    A("`危候` 这一位不是装饰：`脱绝` 族（闭脱/厥脱/脱绝/竭绝/阳脱）出现时，")
    A("界面必须立刻从「调理建议」切成「立即就医」。这是本辞典唯一允许的**强制性输出**。")
    A("")
    A("## E.3 流水线（CI/CD 六步，与仓库门禁一一对应）")
    A("")
    A("| 步 | 命令 | 失败意味着 |")
    A("|---|---|---|")
    A("| 1 生成 | `python scripts/build_zhenghou_cidian.py` | 底本读不动（目录格式变了） |")
    A("| 2 幂等 | `python scripts/build_zhenghou_cidian.py --check` | 有人手改产物没改底本 |")
    A("| 3 断言 | `node tests/test_zhenghou_cidian.js` | 码不唯一 / 正文缺条 / 缺口被悄悄删 |")
    A("| 4 编码器 | `node scripts/zhenghou_encode.js --check` | 15 条黄金样例有一门的门/类/危候漂了 |")
    A("| 5 契约 | `node scripts/audit_curriculum.js` | 12 章缺 docs/quiz/outputs 或篇幅不足 |")
    A("| 6 出处 | `node scripts/figures/check_provenance.js` | 图里的话在正文里找不到 |")
    A("")
    A("六步全绿才允许 `npm run build`（重出站点与看板）。这就是「CI/CD 迭代升级」在这本辞典里的具体形态：")
    A("**码不可复用、只能追加；改一条要过六道门；产物永远由底本重算，不许手改。**")
    A("")
    A("**参考实现已可运行**：`scripts/zhenghou_encode.js`（无第三方依赖，直接读这三个 JSON）。")
    A("它把这节的流水线真跑通，黄金样例在 `standards/zhenghou-cidian/encode-cases.json`（15 条 = 12 门 + 2 危候 + 1 负例）。")
    A("")
    A("```bash")
    A("node scripts/zhenghou_encode.js --ctx \"恶寒重 无汗 脉浮紧\"    # 单次编码（人读 + JSON 双输出）")
    A("node scripts/zhenghou_encode.js --all                      # 15 条黄金样例逐条打印")
    A("node scripts/zhenghou_encode.js --check                    # 只断言，给 CI 用")
    A("```")
    A("")
    A("## E.4 迁移协议（将来一定会遇到的三件事）")
    A("")
    A("| 场景 | 允许的做法 | 禁止的做法 |")
    A("|---|---|---|")
    A("| 新增一个候 | 追加 `-Hnnn`（新号段），父码不动 | 重排既有候号 |")
    A("| 改一个证名 | 保留 `full` 与 `code`，在新文件名下写「更名」，两者并存 | 直接改字符串（历史数据会断） |")
    A("| 合并两证 | 保留两个码，在新码上写 `mergedInto` | 删掉旧码 |")
    A("")
    A("理由只有一条：这本辞典的码已经要被 APP、题库、病历模板同时引用，**码是接口，不是标签**。")
    A("")
    A("## E.5 一次完整请求（往返长什么样）")
    A("")
    A("```http")
    A("POST /api/zhenghou/encode")
    A("Content-Type: application/json")
    A("")
    A('{"ctx": {"恶风寒": true, "发热": true, "无汗": true, "头身痛": true, "脉浮": true, "脉紧": true}}')
    A("```")
    A("")
    A("```json")
    A('{')
    A('  "候选": [')
    A('    {"full": "M01-L01-Z01", "zh": "肺卫风寒证", "命中位": 2, "命中性": 2,')
    A('     "主候": "M01-L01-Z01-H001", "开关组": {"失守": 11, "郁": 9, "虚": 5},')
    A('     "治法动作": "宣", "危候": false}'),
    A('    {"full": "M02-L06-Z01", "zh": "肺卫寒热证", "命中位": 2, "命中性": 1,')
    A('     "主候": null, "开关组": {"郁": 12, "火": 6, "失守": 2}, "治法动作": "和解", "危候": false}')
    A('  ],')
    A('  "提示": "候选不是诊断；请由执业中医师结合四诊确认。",'),
    A('  "未收录词": []')
    A('}')
    A("```")
    A("")
    A("三个字段值得注意：`候选`（永远 ≥1 条，按命中数排序）、`危候`（true 时前端必须切红）、")
    A("`未收录词`（用户说了词表外的话，如实返回，前端据此提示「换个说法试试」而不是静默丢掉）。")
    A("")
    A("## E.6 测试夹具：15 条黄金样例（12 门 + 2 危候 + 1 负例）")
    A("")
    # 这张表直接由 encode-cases.json 现算 —— 手抄一份等于给自己埋一个必然过期的副本。
    cases = jload(STD, "encode-cases.json")
    A("| id | 期望 | 四诊节选（ctx） | 危候 | 说明 |")
    A("|---|---|---|---|---|")
    for c in cases["cases"]:
        exp = ("`%s` · `%s`" % (c["期望门"], c["期望类"])) if c["期望门"] else "无候选"
        A("| `%s` | %s | %s | %s | %s |" % (
            c["id"], exp, md_cell("、".join(c["ctx"])), "是" if c["期望危候"] else "否", md_cell(c["说明"])))
    A("")
    A("夹具文件：`standards/zhenghou-cidian/encode-cases.json`；断言器：`node scripts/zhenghou_encode.js --check`（15/15 才放行）。")
    A("**任何一次改语素表，都要先跑这 15 条**，看主证有没有漂；漂了不一定是错（可能是语素表改对了），但必须**解释**为什么漂。")
    A("")
    A("## E.7 三条工程红线")
    A("")
    A("1. **不做诊断**：所有输出前面的名词都是「候选」「坐标」「开关」，不是「结论」。")
    A("2. **不给剂量**：本辞典所有「方」只到方名，不到克数 —— 剂量要医生按人调。")
    A("3. **危候必拦**：`脱绝` 族命中即切就医保底，不留给产品经理做 A/B。")
    A("")
    return "\n".join(L)


# ─────────────────────────── 7. 渲染：课程层（12 章 = 12 门） ───────────────────────────

def chapter_slug(m):
    return "%02d-%s-men" % (m["n"], PINYIN[m["code"]])


def render_doc(m, stat):
    code = m["code"]
    x = MEN_BY[code]
    n = m["n"]
    lei_lines = "\n".join(
        "| `%s` | %s证类 | %d | %d | %s |" % (
            l["code"], l["zh"], len(l["zhengList"]),
            sum(len(z["houList"]) for z in l["zhengList"]), LEI_BY[l["code"]]["释"])
        for l in m["lei"])
    L = []
    A = L.append
    A("# 第 %d 章 · %s（%s）" % (n, SLUG_ZH[code], code))
    A("")
    A("> **MOTTO:** %s（%s）" % (MOTTO[code], CLASSIC[code]))
    A(">")
    A("> **PROBLEM:** %s" % PROBLEM[code])
    A(">")
    A("> **双根因定位:** 环境逼迫（同一批证候在各科教材与本书里叫法不同，不先固定层级就无法比较、无法编码）"
      "＋知识积累（本书把「证」再切成「候」，%d 门共 %d 条候，体量超出任何单科教材的编排能力，"
      "只能靠码与坐标来管）" % (stat["men"], stat["houInstances"]))
    A("")
    A("**教材出处:** 《中医证候学》%s %s门（%d 证 %d 候）；目录页码见 `standards/zhenghou-cidian/结构.json`。"
      "本章数字由 `code/main.js` 读 `standards/zhenghou-cidian/结构.json` 现算，与辞典正文同源。" % (
          m["book"], m.get("raw", m["zh"]), sum(len(l["zhengList"]) for l in m["lei"]),
          sum(len(z["houList"]) for l in m["lei"] for z in l["zhengList"])))
    A("")
    A("## 课程信息")
    A("")
    A("| 项目 | 内容 |")
    A("|---|---|")
    A("| 学科 | 中医证候学（中医系第 14 门） |")
    A("| 章序号 | %d / 12（一章一门） |" % n)
    A("| 门码 | `%s`（书内 %s %s门） |" % (code, m["book"], m.get("raw", m["zh"])))
    A("| 类目 | %s |" % " · ".join("%s %s" % (l["code"], l["zh"]) for l in m["lei"]))
    A("| 规模 | %d 类 · %d 证 · %d 候 |" % (
        len(m["lei"]), sum(len(l["zhengList"]) for l in m["lei"]),
        sum(len(z["houList"]) for l in m["lei"] for z in l["zhengList"])))
    A("| 本书体例 | 辞典（操作手册型），不受教材篇幅与学时限制 |")
    A("| 判据词 | **%s** |" % JUDGE[code])
    A("")
    A("## 一、门解：这一门凭什么成立")
    A("")
    A("%s" % x["释"])
    A("")
    A("%s" % x["外内"])
    A("")
    A("「%s」是本门的判据词。判据词的作用不是修辞，是**排除**：凡是不能用这一个字（或一组字）说清的症状，"
      "就不该进这一门。十二门各有一个判据词，它们互不重叠 —— 这是全书能做成树的前提。" % JUDGE[code])
    A("")
    A("## 二、类目与证候（现算）")
    A("")
    A("| 类码 | 类名 | 证 | 候 | 一句话 |")
    A("|---|---|--:|--:|---|")
    A(lei_lines)
    A("")
    A("合计 **%d 证 %d 候**。证的读法是「位＋性＋证」：位告诉你病在哪一层，性告诉你这一层得了什么病。"
      "同一门内的证，性相同而位不同；跨门的证，位可以相同而性不同 —— 这就是把 %d 条证收进 %d 类的原因。" % (
          sum(len(l["zhengList"]) for l in m["lei"]),
          sum(len(z["houList"]) for l in m["lei"] for z in l["zhengList"]),
          sum(len(l["zhengList"]) for l in m["lei"]), len(m["lei"])))
    A("")
    A("## 三、这一门在张量里的位置")
    A("")
    A("| 维度 | 本门实测 |")
    A("|---|---|")
    A("| 位（候位） | %s |" % stat["wei_top"])
    A("| 态（前六） | %s |" % stat["tai_top"])
    A("| 候密度 | 平均每证 %.1f 候 |" % stat["per_zheng"])
    A("| 与全书比 | 本门 %d 候 / 全书 %d 候 = %.1f%% |" % (
        stat["hou"], stat["houInstances"], 100.0 * stat["hou"] / max(stat["houInstances"], 1)))
    A("")
    A("张量把「一门课怎么讲」变成「一张表怎么查」：位是行，态是列，格子里是候数。"
      "格子为 0 的地方不是不存在，是这本书没收到 —— 这句话决定了本辞典的边界。")
    A("")
    A("## 四、怎么用这一章（三步）")
    A("")
    A("1. **先认判据词**：拿到一组四诊信息，先问「能不能用『%s』说清」。不能，换门。" % JUDGE[code])
    A("2. **再定位**：在证名里找位（%s 等），在类名里找性（%s 等），拼起来就是全码前缀 `%s-`。" % (
        "、".join(w["zh"] for w in WEI["证位"][:3]), "、".join(l["zh"] for l in m["lei"]), code))
    A("3. **最后查候**：候是亚目，回答「同一证里，是哪一层的哪一步先坏」。查到候，治法动作就出来了（见附录 A.5）。")
    A("")
    A("## 五、代价与边界")
    A("")
    A("%s" % COST[code])
    A("")
    A("还有一层代价要写在明处：本层只重建了**目录级结构**（门/类/证/候的名称、编码、从属与计数），"
      "原书每条候的【基本证象】【证象组合】【治则】【方症】【摘录】等正文段并未逐条录入。"
      "因此「查得到」不等于「读完了」：临床与考试使用都必须回查原书。")
    A("")
    A("## 六、验证")
    A("")
    A("```bash")
    A("node code/main.js          # 本章统计（现算，与辞典正文同源）")
    A("node --test code/main.test.js")
    A("python scripts/build_zhenghou_cidian.py --check   # 辞典与课程两层是否仍一致")
    A("```")
    A("")
    A("**免责声明**：本章为教学与工程用途的证候结构重建，不构成诊疗建议。"
      "任何证候判定都必须由执业中医师结合四诊完成。")
    A("")
    return "\n".join(L)


def render_quiz(m):
    code = m["code"]
    x = MEN_BY[code]
    zheng_n = sum(len(l["zhengList"]) for l in m["lei"])
    hou_n = sum(len(z["houList"]) for l in m["lei"] for z in l["zhengList"])
    l0 = m["lei"][0]
    others = [str(y["zheng"]) + "证" + str(y["hou"]) + "候" for y in XING["门"] if y["code"] != code][:3]
    judge_others = [JUDGE[y["code"]] for y in XING["门"] if y["code"] != code][:3]
    states = sorted({h["tai"] for l in m["lei"] for z in l["zhengList"] for h in z["houList"] if h["tai"]})
    st = states[0] if states else "失宣"
    other_states = [s for s in states if s != st][:3]
    while len(other_states) < 3:
        other_states.append("郁蒸")
    q = {
        "lesson": chapter_slug(m),
        "title": SLUG_ZH[code],
        "subject": "14-zhongyi-zhenghou-xue",
        "questions": [
            {"stage": "pre",
             "question": "本门（%s门）的判据词是下面哪一个？" % m["zh"],
             "options": [JUDGE[code], judge_others[0], judge_others[1], judge_others[2]],
             "correct": 0,
             "explanation": "门解一节定的判据词是「%s」；其余三个是别的门的判据词，混用就会串门。" % JUDGE[code]},
            {"stage": "check",
             "question": "本书 %s门一共收了多少证、多少候？" % m["zh"],
             "options": ["%d 证 %d 候" % (zheng_n, hou_n), others[0], others[1], others[2]],
             "correct": 0,
             "explanation": "由 standards/zhenghou-cidian/结构.json 现算：%d 证 %d 候。" % (zheng_n, hou_n)},
            {"stage": "check",
             "question": "%s证类的书内原码是哪一个？" % l0["zh"],
             "options": [l0["code"], m["lei"][-1]["code"], "M%02d" % m["n"], "Z01"],
             "correct": 0,
             "explanation": "类码是 L 系列，L01–L45 连续；M 码是门码（本层新增），Z/H 是证与候。"},
            {"stage": "check",
             "question": "候名尾部的「%s」属于态轴的哪一族？" % st,
             "options": [TAI_BY.get(st, {}).get("族", "失守"),
                         [f["id"] for f in TAI["族"] if f["id"] != TAI_BY.get(st, {}).get("族")][0],
                         [f["id"] for f in TAI["族"] if f["id"] != TAI_BY.get(st, {}).get("族")][1],
                         "其他"],
             "correct": 0,
             "explanation": "态表里「%s」归 %s 族：%s" % (
                 st, TAI_BY.get(st, {}).get("族", ""), TAI_BY.get(st, {}).get("释", ""))},
            {"stage": "post",
             "question": "把「%s」拆成位与性，正确的一组是？" % (m["lei"][0]["zhengList"][0]["zh"]),
             "options": [
                 "%s + %s" % (m["lei"][0]["zhengList"][0]["wei"], l0["zh"]),
                 "%s + %s" % (l0["zh"], m["lei"][0]["zhengList"][0]["wei"]),
                 "%s + %s" % (m["zh"], l0["zh"]),
                 "%s + 证" % m["lei"][0]["zhengList"][0]["wei"]],
             "correct": 0,
             "explanation": "证名 = 位 + 类性 + 「证」；位来自证名前段，性来自所隶类目。"},
            {"stage": "post",
             "question": "本门共 %d 条候，其编码规则是？" % hou_n,
             "options": ["证码 + `-Hnnn`，序号沿用原书不重排",
                         "门码 + 顺序号",
                         "类码 + 证码 + 顺序号（与证无关）",
                         "按出现页码重排"],
             "correct": 0,
             "explanation": "候码 = Lnn-Zmm-Hnnn，第四级只追加不改父码；这是 ICD-11 亚目扩展的最小实现。"},
        ],
    }
    return json.dumps(q, ensure_ascii=False, indent=2) + "\n"


def render_prompt(m, base):
    code = m["code"]
    L = []
    A = L.append
    A("# %s · 提示词：把一章门变成一次可复述的判定" % SLUG_ZH[code])
    A("")
    A("## 用途")
    A("")
    A("把本章的「门 → 类 → 证 → 候」四层，压成一段可以直接交给模型或交给学生的判定话术。"
      "适用于三件事：教学复述、术语归一、以及给下游 APP 写检索排序规则。")
    A("")
    A("## 可直接粘贴的提示词")
    A("")
    A("```text")
    A("你是中医证候学的编码助手。给出一组四诊信息后，按下面四步回答，每步只给一行：")
    A("1) 门：判断能否用「%s」说清；不能就换门，并说明为什么不能。" % JUDGE[code])
    A("2) 类：在 %s 内选一个类（%s），给出类码。" % (
        SLUG_ZH[code], "、".join(l["code"] + l["zh"] for l in m["lei"])))
    A("3) 证：给出「位＋性」的组合，输出全码前缀 %s-类码-证码。" % code)
    A("4) 候：给出候名与态（态只能从附录 A.5 的 108 态里选），并写出治法的动作字。")
    A("禁止：不要发明词表外的态；不要把病名当证名；不要给处方剂量。")
    A("```")
    A("")
    A("## 为什么这样写")
    A("")
    A("四步对应四个层级，每一步都绑定一个**封闭词表**（门 12 / 类 45 / 位 22+71 / 态 108）。"
      "封闭词表是让「证候」可被程序处理的前提：开放词表下，两个说法是不是同一个证，永远只能靠猜。")
    A("")
    A("## 边界")
    A("")
    A("本提示词产出的是编码与检索结果，不是诊断。**不构成诊疗建议**；用于患者侧时必须有医生端复核。")
    A("")
    return "\n".join(L)


def render_skill(m, base):
    code = m["code"]
    L = []
    A = L.append
    A("---")
    A("name: %s" % base)
    A('description: 用「门→类→证→候」四级编码解析 %s门（%s）的证候条目，输出可复算的全码与态。' % (m["zh"], code))
    A("version: 1.0.0")
    A("---")
    A("")
    A("# %s" % base)
    A("")
    A("## 何时用")
    A("")
    A("需要把一段中医四诊描述，或一个既有证候名，落到《中医证候学》%s门的编码上时。" % m["zh"])
    A("")
    A("## 输入")
    A("")
    A("| 输入 | 形态 | 例 |")
    A("|---|---|---|")
    A("| 四诊描述 | 自由文本 | 恶寒重、无汗、头身痛、脉浮紧 |")
    A("| 既有证候名 | 字符串 | 肺卫风寒证 |")
    A("| 全码 | 字符串 | %s-%s" % (code, m["lei"][0]["code"]))
    A("")
    A("## 步骤")
    A("")
    A("1. 读 `standards/zhenghou-cidian/结构.json`，取 `men` 中 `code == \"%s\"` 的子树。" % code)
    A("2. 判据词过滤：不能用「%s」说清的，直接返回「不属于本门」。" % JUDGE[code])
    A("3. 位匹配：把描述里的部位/层次映射到 `语素-位.json` 的证位（22）或候位（62）。")
    A("4. 性匹配：选类（%s）。" % "、".join(l["code"] for l in m["lei"]))
    A("5. 态匹配：从 `语素-态.json` 的 108 态里选，禁止新造。")
    A("6. 输出全码 `%s-Lnn-Zmm[-Hnnn]` 与一句治法动作。" % code)
    A("")
    A("## 输出")
    A("")
    A("```text")
    A("门 %s｜类 Lnn ｜证 M%s-Lnn-Zmm ｜候 -Hnnn ｜态 xxx｜治法动作 xxx" % (code, code))
    A("```")
    A("")
    A("## 边界")
    A("")
    A("只做编码与检索，不做诊断；**不构成诊疗建议**。词表外的说法一律返回「无法归码」，不许模糊匹配。")
    A("")
    return "\n".join(L)


def render_code_main(m):
    code = m["code"]
    slug = chapter_slug(m)
    L = []
    A = L.append
    A("#!/usr/bin/env node")
    A("/**")
    A(" * 中医证候学 · 第 %d 章 %s（%s）：本章统计口径" % (m["n"], SLUG_ZH[code], code))
    A(" * 课程: departments/01-zhongyi/14-zhongyi-zhenghou-xue/chapters/%s/docs/zh.md" % slug)
    A(" * 数据: standards/zhenghou-cidian/结构.json（本书目录 2268 条 → 12 门 / 45 类 / 291 证 / 1866 候条目）")
    A(" * 依赖: 仅 Node.js 标准库")
    A(" *")
    A(" * 数字全部现算：本门的类/证/候、候位与态的分布、每证平均候数、占全书候数的比例。")
    A(" * 不写死任何一个计数 —— 底本一变，本章的表就跟着变。")
    A(" */")
    A("")
    A("'use strict';")
    A("")
    A("const fs = require('node:fs');")
    A("const path = require('node:path');")
    A("")
    A("function findRoot(start) {")
    A("  let dir = start;")
    A("  for (let i = 0; i < 12; i += 1) {")
    A("    if (fs.existsSync(path.join(dir, 'standards', 'zhenghou-cidian', '结构.json'))) return dir;")
    A("    const up = path.dirname(dir);")
    A("    if (up === dir) break;")
    A("    dir = up;")
    A("  }")
    A("  throw new Error('没找到 standards/zhenghou-cidian/结构.json —— 章节目录是否已脱离仓库？');")
    A("}")
    A("")
    A("const ROOT = findRoot(__dirname);")
    A("const LIB = path.join(ROOT, 'standards', 'zhenghou-cidian', '结构.json');")
    A("const MEN = '%s';" % code)
    A("")
    A("const load = () => JSON.parse(fs.readFileSync(LIB, 'utf8'));")
    A("")
    A("function menOf(lib) {")
    A("  const m = lib.men.find((x) => x.code === MEN);")
    A("  if (!m) throw new Error('结构.json 里没有门 ' + MEN);")
    A("  return m;")
    A("}")
    A("")
    A("function chapters(m) {")
    A("  return m.lei.flatMap((l) => l.zhengList.map((z) => ({ lei: l, zheng: z })));")
    A("}")
    A("")
    A("function hous(m) {")
    A("  return m.lei.flatMap((l) => l.zhengList.flatMap((z) => z.houList));")
    A("}")
    A("")
    A("function tally(list, key) {")
    A("  const map = new Map();")
    A("  for (const x of list) map.set(x[key], (map.get(x[key]) || 0) + 1);")
    A("  return [...map.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));")
    A("}")
    A("")
    A("function stats(lib) {")
    A("  const m = menOf(lib);")
    A("  const zs = chapters(m);")
    A("  const hs = hous(m);")
    A("  const all = lib.men.flatMap((x) => x.lei.flatMap((l) => l.zhengList.flatMap((z) => z.houList)));")
    A("  return {")
    A("    men: m,")
    A("    lei: m.lei.length,")
    A("    zheng: zs.length,")
    A("    hou: hs.length,")
    A("    perZheng: zs.length ? hs.length / zs.length : 0,")
    A("    wei: tally(hs, 'wei'),")
    A("    tai: tally(hs, 'tai'),")
    A("    share: all.length ? hs.length / all.length : 0,")
    A("    allHou: all.length,")
    A("  };")
    A("}")
    A("")
    A("function main() {")
    A("  const lib = load();")
    A("  const s = stats(lib);")
    A("  const x = s.men;")
    A("  console.log('═══ 《中医证候学》· ' + '%s' + '（' + MEN + '）═══');" % SLUG_ZH[code])
    A("  console.log('书内位置  : ' + x.book + '（目录页 ' + x.page + '）');")
    A("  console.log('规模      : ' + s.lei + ' 类 · ' + s.zheng + ' 证 · ' + s.hou + ' 候');")
    A("  console.log('每证候数  : ' + s.perZheng.toFixed(1));")
    A("  console.log('占全书候数: ' + (s.share * 100).toFixed(1) + '%（全书 ' + s.allHou + ' 条候条目）');")
    A("  console.log('');")
    A("  console.log('类目：');")
    A("  for (const l of x.lei) {")
    A("    const h = l.zhengList.reduce((a, z) => a + z.houList.length, 0);")
    A("    console.log('  ' + l.code + ' ' + l.zh + '证类 · ' + l.zhengList.length + ' 证 ' + h + ' 候');")
    A("  }")
    A("  console.log('');")
    A("  console.log('候位 top5：' + s.wei.slice(0, 5).map(([k, v]) => k + '×' + v).join('  '));")
    A("  console.log('态   top5：' + s.tai.slice(0, 5).map(([k, v]) => k + '×' + v).join('  '));")
    A("  console.log('');")
    A("  console.log('本输出为教学样例，不构成诊疗建议；证候判定须由执业中医师结合四诊完成。');")
    A("}")
    A("")
    A("if (require.main === module) main();")
    A("")
    A("module.exports = { load, menOf, chapters, hous, tally, stats, MEN };")
    A("")
    return "\n".join(L)


def render_code_test(m):
    code = m["code"]
    L = []
    A = L.append
    A("#!/usr/bin/env node")
    A("/**")
    A(" * 第 %d 章 %s（%s）单元测试：断言全部从底本现算，不写死数字。" % (m["n"], SLUG_ZH[code], code))
    A(" */")
    A("")
    A("'use strict';")
    A("")
    A("const assert = require('node:assert');")
    A("const test = require('node:test');")
    A("const lib = require('./main.js');")
    A("")
    A("const data = lib.load();")
    A("const s = lib.stats(data);")
    A("")
    A("test('本门存在于结构.json，且门码相符', () => {")
    A("  assert.strictEqual(s.men.code, lib.MEN);")
    A("  assert.ok(s.men.zh.length > 0);")
    A("});")
    A("")
    A("test('类 / 证 / 候 三个计数与逐条遍历一致', () => {")
    A("  const zs = lib.chapters(s.men);")
    A("  const hs = lib.hous(s.men);")
    A("  assert.strictEqual(zs.length, s.zheng);")
    A("  assert.strictEqual(hs.length, s.hou);")
    A("  assert.ok(s.lei === s.men.lei.length);")
    A("});")
    A("")
    A("test('每个证的候数与其声明候数一致（原书自述 vs 目录实条）', () => {")
    A("  const bad = [];")
    A("  for (const l of s.men.lei) {")
    A("    for (const z of l.zhengList) {")
    A("      if (z.houList.length !== z.declareHou) bad.push(z.code + ':' + z.houList.length + '/' + z.declareHou);")
    A("    }")
    A("  }")
    A("  // 原书自述与目录实条的差异允许存在，但必须被 结构.json 的 校对.差异 登记过")
    A("  const logged = new Set((data.校对.差异 || []).map((d) => d.code));")
    A("  const unlogged = bad.filter((b) => !logged.has(b.split(':')[0]));")
    A("  assert.deepStrictEqual(unlogged, []);")
    A("});")
    A("")
    A("test('每个候都有位与态（拆分无残留）', () => {")
    A("  const holes = lib.hous(s.men).filter((h) => !h.wei || !h.tai);")
    A("  assert.deepStrictEqual(holes.map((h) => h.code), []);")
    A("});")
    A("")
    A("test('候码以本门码为前缀，四级编码可拼接', () => {")
    A("  for (const h of lib.hous(s.men)) {")
    A("    assert.ok(h.full.startsWith(lib.MEN + '-'), h.full + ' 的前缀不是 ' + lib.MEN);")
    A("    assert.strictEqual(h.full, h.zheng + '-' + h.code.split('-').pop());")
    A("  }")
    A("});")
    A("")
    A("test('本门候数不超过全书候数，比例为 0..1', () => {")
    A("  assert.ok(s.hou <= s.allHou);")
    A("  assert.ok(s.share > 0 && s.share <= 1);")
    A("});")
    A("")
    A("test('tally 按计数降序返回', () => {")
    A("  const t = lib.tally(lib.hous(s.men), 'tai');")
    A("  for (let i = 1; i < t.length; i += 1) assert.ok(t[i - 1][1] >= t[i][1]);")
    A("});")
    A("")
    return "\n".join(L)


# ─────────────────────────── 8. main ───────────────────────────

def render_appendix_f():
    """附录 F · 百姓问句黄金集 —— APP 入口的验收单。

    为什么单独一附录：正文的编码器与接口只在开发者手里，验收却要靠「百姓这么说」
    的句子。这张表把口语问句、期望门、是否危候、实测结果排在一起，测试逐条比对；
    known_gap 的三条故意留着不填 —— 缺口被悄悄填平时 A8 会红。
    """
    qa = jload(STD, "问答样例.json")["用例"]
    alias = jload(STD, "口语别名.json")
    L = []
    A = L.append
    A("# 附录 F · 百姓问句黄金集：APP 入口的回归清单")
    A("")
    A("这张表不是示例，是**验收单**：每条都写「期望哪个门、是不是危候」，"
      "跑 `node --test tests/test_zhenghou_api.js` 逐条比对。门错了、危候没置真，测试直接红。")
    A("")
    A("| # | 百姓这么说 | 期望门 | 危候 | 实测 | 备注 |")
    A("|---|---|---|:--:|---|---|")
    for c in qa:
        A("| %s | %s | %s | %s | %s | %s |" % (
            c["id"], c["text"], c.get("期望门") or "—", "是" if c["期望危候"] else "否",
            c.get("实测档") or ("零候选" if c.get("known_gap") else "—"), c.get("note") or ""))
    A("")
    _gap = [c for c in qa if c.get("known_gap")]
    if _gap:
        A("**known_gap %d 条是故意留着的**：它们答不出来，说明位语素缺词（如「皮肤干」没有对应位），"
          "不是测试写错。缺口被悄悄填平时 A8 会报错 —— 宁可红，不许假装变好。" % len(_gap))
    else:
        A("**本轮 known_gap 已清零**：q10（身重·关节痛·苔白）与 q11（干咳·咽干·皮肤干）原先零候选，"
          "原因是位语素缺词。补法不是改测试，而是把候级正文里已有的用词回填到位级（见 F.3），"
          "再用别名把口语接上去。known_gap 机制保留：下次再出现答不出的问句，照样标 true 并让 A8 盯着。")
    A("")
    A("## F.1 口语别名表（%d 条）" % len(alias.get("别名", {})))
    A("")
    A("百姓说的和辞典写的不是一套词。这张表只做同义改写，右值必须是词表里已有的词项"
      "（`standards/zhenghou-cidian/口语别名.json`）：")
    A("")
    items = list(alias.get("别名", {}).items())
    half = (len(items) + 1) // 2
    A("| 百姓说法 | 词表说法 | ｜ | 百姓说法 | 词表说法 |")
    A("|---|---|---|---|---|")
    for i in range(half):
        a = items[i]
        b = items[i + half] if i + half < len(items) else ("", "")
        A("| %s | %s | ｜ | %s | %s |" % (a[0], a[1], b[0], b[1]))
    A("")
    A("## F.2 危象词（%d 条）：命中即分流就医" % len(alias.get("危象", {})))
    A("")
    A("危象词**不参与位/性计分**，只做一件事：把 `危候` 置真，让 APP 从「调理建议」切到「立即就医」。"
      "安全优先、宁可误报 —— 但误报要在日志里看得见（响应带 `危象词` 字段）。匹配用「包含」，"
      "因为百姓会说「突然昏倒」「刚才晕过去一次」，状语裹在词里。")
    A("")
    ds = list(alias.get("危象", {}).items())
    h2 = (len(ds) + 1) // 2
    A("| 百姓说法 | 归到 | ｜ | 百姓说法 | 归到 |")
    A("|---|---|---|---|---|")
    for i in range(h2):
        a = ds[i]
        b = ds[i + h2] if i + h2 < len(ds) else ("", "")
        A("| %s | %s | ｜ | %s | %s |" % (a[0], a[1], b[0], b[1]))
    A("")
    A("## F.3 位词补记：哪些位补了词、凭什么")
    A("")
    A("位语素的见症是**回填**来的，不是凭印象想出来的：只收原书候级正文里真出现过的用词，"
      "并在 `语素-位.json` 的 `见症补记` 里写明取自哪一条候（印张可回查）。")
    A("")
    A("| 位 | 补入的词 | 证据（候级正文，可回查印张） |")
    A("|---|---|---|")
    for w in WEI["证位"]:
        if w.get("见症补记"):
            A("| %s | %s | %s |" % (w["zh"], w["见症补记"].split("：")[0], w["见症补记"].split("：")[-1]))
    A("")
    A("**为什么值得这么做**：补这三组词之前，q10/q11 是零候选 —— 不是算法不行，是「身重/关节痛/皮肤干」"
      "根本没有位可落。补完之后 q10 从零候选变 strong，q11 变 weak（只命中一位，仍需补问）。"
      "这就是「先修数据、再谈功能」：功能层加十个接口，也救不回缺的那一个位。")
    A("")
    A("## F.4 追问策略：弱证据补哪一问")
    A("")
    A("百姓只会说两句，位与性各命中 1 个，算法只能给 weak。这时**不硬答、也不判空**，"
      "而是返回一组 `ask`：哪一维薄就问哪一维。规则写死在 `zhenghou_encode.js` 的 `followUps()`：")
    A("")
    A("| 情形 | 追问 | 为什么问这个 |")
    A("|---|---|---|")
    A("| 位命中 < 2 | 「还牵连到哪儿：头面、胸肺、胃脘、腰腹、四肢关节？」 | 位是定位轴，问清楚一层就能把候选缩一半 |")
    A("| 性命中 < 2 | 「更怕冷还是更怕热？痰/涕清稀还是黄稠？舌苔偏白偏黄？」 | 性定寒热燥湿，是唯一能分开同门内相邻证的轴 |")
    A("| 有未收录词 | 「这几个说法辞典没收录：…」 | 老实回缺口，逼产品补词表，而不是偷偷模糊匹配 |")
    A("| 已 strong | **空数组** | 证据够了就别再问 —— 没事也追问，是把用户当问卷 |")
    A("")
    A("接口层同样暴露这个字段：`POST /encode` 的响应里有 `ask[]`，每项 `{维度, 问}`。"
      "A10 断言盯着两件事：弱证据必须带追问、strong 必须为空数组。")
    A("")
    return NL.join(L)


def _load_json_optional(name):
    p = os.path.join(STD, name)
    if not os.path.exists(p):
        return None
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def render_appendix_g(struct):
    """附录 G · 证象总表（原书附录一，75 证象 / 实测 72 格）"""
    zx = _load_json_optional("附录-证象.json")
    L = []
    A = L.append
    A("# 附录 G · 证象总表（原书附录一：75 证象一览表）")
    A("")
    A("> 这一附录是补回来的：上一版我在缺口登记里写「附录一/二在扫描件里找不到」，**那是错的**。"
      "两张表就印在印张 2290–2292（下册 PDF 第 756–758 页），只是它们不在门/类/证/候四级目录里，"
      "按章范围扫自然看不见。错误已改，数据已落库。")
    A("")
    if not zx:
        A("（缺 `standards/zhenghou-cidian/附录-证象.json`，先跑 `python scripts/zgh_ocr/parse_appendix.py`。）")
        return NL.join(L)
    A("## G.1 这张表在说什么")
    A("")
    A("原表是一张**矩阵**：行是病机（不宣 / 不利 / 不通 / 闭塞 / 不降 / 不升 / 蕴蒸 / 蕴灼 / 蕴炽 / "
      "腐败 / 溃乱 / 不和 / 不宁 / 不振 / 不养 / 不荣 / 不固 / 枯竭 / 脱绝），"
      "列是部位与属性（腠理 · 经脉 · 络脉 · 清空 · 清窍 · 气机 · 神志 · 津 · 液 · 营 · 血 · 阳 · 阴）。"
      "格内文字就是「部位 + 病机」拼出来的证象，例如 **腠理 × 不宣 = 腠理不宣**。")
    A("")
    A("用工程的话说：这是本书的**证象词法表** —— 它不是证、不是候，而是「证候名里那些两字组合」的"
      "合法词库。候名的尾巴（态）从这里取，证的名称（部位+病机）也从这里取。")
    A("")
    A("| 项 | 实测 | 怎么来的 |")
    A("|---|---|---|")
    A("| 行（病机） | **%d** | 原表左列竖排字，逐行读 |" % len(zx.get("rows", [])))
    A("| 列（位/属性） | **%d** | 原表两级表头 |" % len(zx.get("cols", [])))
    A("| 格（证象） | **%d** | 300 DPI 渲染页逐象限人工读表；每格用字回 OCR 兑现 |" % zx.get("count", 0))
    A("| 书名声明 | %d | 原页标题「附录一：75证象一览表」 |" % zx.get("declare", 75))
    A("")
    A("**为什么是人工读表而不是自动解析**：OCR 把格内两个字拆成两个文本框（「腠理」「不宣」），"
      "又把表头拆成单字（「腧」「理」），自动拼格会整列错位。宁可慢，不可错 —— "
      "自动拼出来的 103 个「格」里有一半是错的，人工读的 72 格每一格都能回页兑现。")
    A("")
    A("## G.2 逐行总表")
    A("")
    A("| 病机 | 该行出现的证象（列 · 格内文字） |")
    A("|---|---|")
    for row in zx.get("rows", []):
        cells = [c for c in zx.get("cells", []) if c["row"] == row]
        if not cells:
            A("| %s | —（本行在表上为空） |" % row)
            continue
        A("| %s | %s |" % (row, " · ".join("**%s** %s" % (c["col"], c["text"]) for c in cells)))
    A("")
    gap = zx.get("校勘", {})
    A("## G.3 差额与校验")
    A("")
    A("- 读到 **%d 格**，书名声明 **%d**，差 **%s** 格。" % (
        gap.get("读到格数", zx.get("count", 0)), gap.get("书名声明", 75), gap.get("差", "?")))
    A("- %s" % gap.get("差额说明", "（未填）"))
    A("- 表右侧另有一窄列性质注记：%s —— 它是行性质的标注，不是格，未计入。" %
      "、".join(gap.get("表右侧性质注记", [])))
    A("- 方法：%s" % gap.get("方法", ""))
    A("")
    A("## G.4 与 108 态的关系（别混）")
    A("")
    A("附录 A.5 的 **108 态**是从 1866 条候名**尾部实测**得来（失宣、蕴蒸、郁结…），"
      "本附录的 **%d 格证象**是原书表格里**部位+病机**的组合。两者词形大量重合，但不是一回事：" %
      zx.get("count", 0))
    A("")
    A("| | 证象（本附录） | 态（附录 A.5） |")
    A("|---|---|---|")
    A("| 出处 | 原书附录一原表 | 候名尾部实测 |")
    A("| 形态 | 部位 + 病机（腠理不宣） | 病机片段（不宣 / 蕴蒸） |")
    A("| 用途 | 校验候名/证名里的组合是否合法 | 给候打「这一步坏在哪」的标签 |")
    A("")
    A("## G.5 这张表已经接进编码器（不是只躺在附录里）")
    A("")
    A("上面 72 格被编成 `standards/zhenghou-cidian/证象-合法组合.json`（部位×病机 → 格内文字），"
      "编码器新增 `validateName()`，只在**提示层**用，不改候选、不改分数：")
    A("")
    A("| 输入 | 判定 | 说明 |")
    A("|---|---|---|")
    A("| 腠理不宣 | **true** | 附录一「腠理×不宣」这一格就是它 |")
    A("| 气机郁结 | **true** | 组合等于「气机×不通」，表内写法一致 |")
    A("| 腠理枯竭 | **false** | 该格是空格：原书没有这个证象，回「腠理不宣 / 腠理不调 / 腠理不实」等该位合法组合 |")
    A("| 心脉痹阻 | **null** | 拆不成「表内位 + 表内病机」，**不判**——认不出不等于错 |")
    A("")
    A("三处入口：`node scripts/zhenghou_encode.js --name 腠理不宣`、`/encode` 响应的 `nameChecks[]`、"
      "`GET /name?q=`；百姓页跑同一套判定，页面与 Node 由 S6 对齐测试盯着。")
    A("")
    A("**为什么只做提示不改分**：合法格只有 72 个，而候名 1866 条里大量说法不在表内（如「卫气失宣」"
      "是「卫气 + 失宣」，表里只有「不宣」）。拿它当分数门槛会把大半候选误杀；当提示用，"
      "既能回答「这个说法原书有没有」，又能指出「原表怎么写」。")
    A("")
    A(_audit_g())
    return NL.join(L)


def _audit_g():
    """G.6 证象组合质检（读 证象组合-质检.json，只呈现不判断）"""
    q = _load_json_optional("证象组合-质检.json")
    L = []
    A = L.append
    A("## G.6 质检：1863 条候的【证象组合】到底能不能用这张表校验")
    A("")
    if not q:
        A("（缺 `standards/zhenghou-cidian/证象组合-质检.json`，先跑 `python scripts/zgh_ocr/audit_xiangzuhe.py`。）")
        return NL.join(L)
    c = q["counts"]
    A("先说结论，免得被数字骗：**这两个字段不是同一套词，72 格只能校验其中一小撮。**")
    A("")
    A("| 字段形态 | 候数 | 长什么样 | 能不能用附录一校验 |")
    A("|---|--:|---|---|")
    A("| 证象型（带【…】全称） | **%d** | `主证：【清空不宣】…` | **能**，逐条比对 |" % c["字段形态"].get("证象型（带【…】全称）", 0))
    A("| 标签型（位缩写+态缩写） | **%d** | `气郁+气滞+阳浮+液灼` | **不能**，语义层不同 |" % c["字段形态"].get("标签型（位缩写+态缩写）", 0))
    A("")
    A("为什么不能：附录一的格是「位 + **病机**」（不宣 / 不利 / 闭塞 / 蕴灼 / 溃乱 / 脱绝…），"
      "而标签串用的是「位 + **态根**」（郁 / 滞 / 逆 / 虚 / 溢 / 浮 / 灼…）。"
      "原表里根本没有「郁」「滞」「虚」这些字 —— 拿它去比，只会得到一堆假的不合格。")
    A("")
    A("### 证象型（%d 条候里的全部 %d 个标签，逐条判定）" % (
        c["字段形态"].get("证象型（带【…】全称）", 0), sum(c["证象型判定"].values())))
    A("")
    A("| 候 | 印张 | 标签 | 判定 | 原页核对（回页面看过才写） |")
    A("|---|---|---|---|---|")
    kind_zh = {"exact": "与格内文字一致", "variant": "组合合法·写法不同", "empty": "该格为空",
               "clipped": "位名被截首字（OCR 丢字）", "unknown": "拆不开/不在表"}
    rows = q.get("证象型明细", [])
    if rows:
        for r in rows:
            note = r.get("原页核对") or "—"
            if r.get("更正后判定") == "exact":
                note += "；更正后与格内文字一致"
            A("| %s | %s | %s | **%s** | %s |" % (r["zh"], r["page"], r["label"],
                                                kind_zh.get(r["判定"], r["判定"]), note))
    else:
        A("| — | — | — | — | 全部与格内文字一致 |")
    A("")
    A("### 标签型（%d 种 / %d 次，按可解释性分类）" % (c["标签种类"], c["标签出现总次"]))
    A("")
    A("| 分类 | 次数 | 占比 | 含义 |")
    A("|---|--:|--:|---|")
    total = max(1, c["标签出现总次"])
    meaning = {
        "可解释（位在附录一 + 态根映得回病机）": "位在 13 位里，且态根能映到 19 病机（如 气宣→气机×不宣）",
        "位在附录一·态根是缩写（原表无对应病机）": "位在表里，但「郁/滞/虚/逆/浮」这类态根原表没有",
        "纯位标签（有位无态）": "只写部位（空窍 / 清空 / 清窍）",
        "位不在附录一 13 位": "位名不在表（精 / 热 / 空 / 扰…），多为倒序写法",
        "纯态或纯病机标签（有位无位不齐）": "只写态（精滑 / 火炽）",
        "拆不开（无态根）": "既没位也没态",
    }
    for k, v in sorted(c["标签型判定"].items(), key=lambda kv: -kv[1]):
        A("| %s | %d | %.1f%% | %s |" % (k, v, 100.0 * v / total, meaning.get(k, "")))
    A("")
    A("**这张质检表的用处**：它量化了一件事 —— 「用附录一校验证象组合」这条路只覆盖 %d 条候；"
      "其余 %d 条要靠 108 态表，而不是 72 格。谁要是拿 72 格去给这 %d 条打分，会得到 70%% 以上的假不合格。"
      % (c["字段形态"].get("证象型（带【…】全称）", 0),
         c["字段形态"].get("标签型（位缩写+态缩写）", 0),
         c["字段形态"].get("标签型（位缩写+态缩写）", 0)))
    A("")
    A("明细见 `standards/zhenghou-cidian/证象组合-质检.json`（逐条带 code / 印张 / 标签 / 判定）。")
    A("")
    _root_map_g(L)
    _root_fine_g(L)
    return NL.join(L)


def _root_fine_g(L):
    """G.8 待核 8 根的「位 × 根 → 病机」细表"""
    r = _load_json_optional("态根-病机对照.json")
    A = L.append
    A("## G.8 待核 8 根：按位拆开，逐格给原表锚点")
    A("")
    if not r:
        A("（缺 `态根-病机对照.json`。）")
        A("")
        return
    c = r["counts"]
    sub = []
    for x in r["roots"]:
        for y in x.get("细分", []):
            sub.append((x["态根"], y))
    if not sub:
        A("（无细分数据。）")
        A("")
        return
    A("判法只有一条：**先看该位在原表有没有能对上的格**，有就拿原表格里的写法当依据，不凭语感。"
      "所以「气机×热」判成表外，是因为气机位在原表 10 格里确实没有「蕴炽」这一格，不是我不判。")
    A("")
    A("| 位 | 根 | 次数 | 判定 | 病机 | 原表该格 | 依据 |")
    A("|---|---|--:|---|---|---|---|")
    seen = {"映射": 0, "表外": 0, "低频待核": 0, "未细分": 0}
    for root, y in sub:
        seen[y["判定"]] = seen.get(y["判定"], 0) + y["次数"]
        A("| %s | %s | %d | %s | %s | %s | %s |" % (
            y["位"], root, y["次数"], y["判定"], y["病机"] or "—",
            y.get("原表该格") or "—", y["依据"]))
    A("")
    A("合计：**映射 %d 次**（都能落在原表已有的格里）· 表外 %d 次（该位原表无此格）· "
      "低频待核 %d 次 · 未细分 %d 次（不属 8 根，多为 OCR 残字）。"
      % (seen.get("映射", 0), seen.get("表外", 0), seen.get("低频待核", 0), seen.get("未细分", 0)))
    A("")
    A("**两个「表外」值得单独说**：气机×热（72 次）与 液×泄（16 次）。前者在临床上到处都是"
      "（气分热盛），但附录一的「气机」这一位只给了不宣/不利/不通/闭塞/不降/不升/不宁/不振/不养/脱绝 十格，"
      "**热不在其中**——这说明原书的「位」用的是分形结构，热归「火」类而不归「气机」位。"
      "这不是我的映射能力问题，是原书矩阵的覆盖边界。要判它，得回到门级（M06 火门），不能靠 72 格。")
    A("")
    A("**仍然不接进计分。** 细表把可解释率推到 %.2f%%，但性质没变：这是「事后能把说法归位」，"
      "不是「原书就是这么写的」。表里「原表该格」那一列把原书写法摆在旁边，就是要让任何用它的人"
      "一眼看见差在哪。" % c.get("细分后可解释率(%)", 0.0))
    A("")


def _root_map_g(L):
    """G.7 态根 ↔ 病机 可疑对照表（读 态根-病机对照.json）"""
    r = _load_json_optional("态根-病机对照.json")
    A = L.append
    A("## G.7 态根 ↔ 病机：逐个判一次「能不能映」，以及为什么不都映")
    A("")
    if not r:
        A("（缺 `standards/zhenghou-cidian/态根-病机对照.json`，先跑 `python scripts/zgh_ocr/build_root_map.py`。）")
        A("")
        return
    c = r["counts"]
    A("G.6 里那 72.5%「位对得上、态根原表没有」，逐个态根判完是这样：")
    A("")
    A("| 判定 | 次数 | 占标签总次 | 含义 |")
    A("|---|--:|--:|---|")
    tot = max(1, c["出现总次"])
    mean = {"映射": "语义与原表某病机格同一（蒸→蕴蒸、灼→蕴灼、涸→枯竭…）",
            "性质不映": "是性质/程度，不是「哪一步坏了」（郁、虚、浮、衰、弱、伤）",
            "待核": "拿不准，按位不同会落到不同格（滞、逆、溢、滑…），不设全局映射",
            "噪声": "分词/OCR 残留，不是真实态根（脉、志、法…）"}
    for k in ("映射", "性质不映", "待核", "噪声"):
        v = c["按判定"].get(k, 0)
        A("| %s | %d | %.1f%% | %s |" % (k, v, 100.0 * v / tot, mean[k]))
    A("")
    A("**能真正落格的只有 %d 次**：映射项里有些「位 × 病机」在原表本来就是空格"
      "（例如 津×闭塞 没有这一格），所以「根能映」不等于「这一格存在」。"
      % c["映射项能真正落格的次数"])
    A("")
    A("| 口径 | 可解释标签次 | 占全部标签 |")
    A("|---|--:|--:|")
    A("| 现状（只用附录一原格） | %d | 21.0%% |" % c["原可解释"])
    A("| 若把「映射项能落格」计入 | **%d** | **%.2f%%** |" % (c["映射后可解释上限"], c["映射后可解释率(%)"]))
    if "细分后可解释" in c:
        A("| 再把待核 8 根的「位×根」细判计入（G.8） | **%d** | **%.2f%%** |"
          % (c["细分后可解释"], c["细分后可解释率(%)"]))
    A("")
    A("### 逐个态根（次数 ≥ 20 的全列，其余见 JSON）")
    A("")
    A("| 态根 | 次数 | 判定 | 映到病机 | 依据 |")
    A("|---|--:|---|---|---|")
    for x in r["roots"]:
        if x["次数"] < 20:
            continue
        A("| %s | %d | %s | %s | %s |" % (x["态根"], x["次数"], x["判定"],
                                        x["病机"] or "—", x["依据"]))
    A("")
    waitting = [x["态根"] for x in r["roots"] if x["判定"] == "待核" and x["次数"] >= 20]
    A("**待核的是这几个**（次数 ≥20）：%s。它们不是「懒」，是按位不同会落到不同格 ——"
      "「滞」在血是不利（血滞不行）、在血瘀是不通（血滞瘀结），设一个全局映射必然错一半。"
      "这 8 根已按「位 × 根」逐个判完，见下一节 G.8。" % "、".join(waitting))
    A("")
    A("**这张表不接进计分。** 理由两条：① 21.0% → 44.0% 的提升全押在「映射」这一栏，"
      "而映射里最容易错的是 结→不通、扰→不宁 这类「近义但不同义」；② 一旦进计分，"
      "错了不会报错，只会让候选排序悄悄偏移 —— 这正是本项目一直在防的那种静默错误。"
      "要用，先在样例上量准了再说。")
    A("")


def render_appendix_h(struct):
    """附录 H · 病候总表（原书附录二，322 条）"""
    bh = _load_json_optional("附录-病候.json")
    L = []
    A = L.append
    A("# 附录 H · 病候总表（原书附录二：322 病候一览表）")
    A("")
    A("> 原表在印张 2291–2292，四列流水，每条一个病候号（H001–H322）+ 候名。"
      "这份是**机器解析**（同号同名的正则抓取），322/322 齐、缺号 0、同号异名 0。")
    A("")
    if not bh:
        A("（缺 `standards/zhenghou-cidian/附录-病候.json`，先跑 `python scripts/zgh_ocr/parse_appendix.py`。）")
        return NL.join(L)
    items = bh.get("items", {})
    kj = bh.get("校勘", {})
    A("## H.1 一句话说清它和正文层的关系")
    A("")
    A("正文层是按**门→类→证→候**组织的 1866 条候实例；本表是按**病候号**索引的 **322 个病候**。"
      "同一个候号会跨证复用（例如 083 在气门、饮门都出现），所以 322 ≠ 1866：")
    A("")
    A("| | 候实例（正文层） | 病候（本附录） |")
    A("|---|---|---|")
    A("| 计数 | **%d** 条 | **%d** 条 |" % (struct["counts"]["houInstances"], len(items)))
    A("| 主键 | 全码 M01-L01-Z01-H001 | 病候号 H001 |")
    A("| 出处 | 各门正文（OCR 逐条） | 书末附录二原表 |")
    A("")
    A("## H.2 全表（按病候号）")
    A("")
    A("| 号 | 附录二原表写法 | 结构层同号写法 | 备注 |")
    A("|---|---|---|---|")
    for h in sorted(items):
        v = items[h]
        names = v.get("structNames") or []
        shown = "、".join(names) if names else "—（结构层无同号）"
        note = ""
        if v.get("nameGuess"):
            note = "原表字形与结构层不同，疑为「%s」" % v["nameGuess"]
        elif names and v["name"] not in names:
            note = "原表写法与结构层不一致"
        A("| %s | %s | %s | %s |" % (h, v["name"], shown, note or "一致"))
    A("")
    A("## H.3 校勘")
    A("")
    A("- 页：%s" % "、".join(str(p) for p in bh.get("pages", [])))
    A("- 缺号：%s" % ("无" if not kj.get("缺号") else "、".join("H%03d" % n for n in kj["缺号"])))
    A("- 同号异名：%s" % ("无" if not kj.get("同号异名") else "%d 处" % len(kj["同号异名"])))
    A("- 形近命中（原表字形与结构层只差一个已知形近字）：**%d** 条 —— 这些**没有改名**，"
      "原样保留原表写法，另给 `nameGuess` 供检索时兼容。" % kj.get("形近命中", 0))
    A("")
    A("**这份表怎么用**：APP 里用户报的是「西医病名 + 症状」，落到证需要的是「病候号 → 候」这条索引。"
      "有了 322 条，`/hou?code=` 之外还能按**病候号**查：同一号在不同门下的证，一次列全。")
    A("")
    return NL.join(L)


def render_appendix_i(struct):
    """附录 I · 参考书目（原书书末 144 条）"""
    b = _load_json_optional("参考书目.json")
    L = []
    A = L.append
    A("# 附录 I · 参考书目（原书书末「参考书目」全 144 条）")
    A("")
    A("> 原书在正文与附录之后另有「参考书目」四页（印张 2293–2296），共 144 条。"
      "这份逐条落库：书名 / 著者 / 出版者 / 年份 / 印张页码。它是这部辞典**引证范围**的边界 —— "
      "凡是标「原书正文」的段落，出处都能在这 144 条里找到源头；不在此列的医籍，本辞典不引用。")
    A("")
    if not b:
        A("（缺 `standards/zhenghou-cidian/参考书目.json`，先跑 `python scripts/zgh_ocr/parse_biblio.py`。）")
        return NL.join(L)
    items = b.get("items", [])
    kj = b.get("校勘", {})
    A("## I.1 口径")
    A("")
    A("| 项 | 值 |")
    A("|---|---|")
    A("| 条数 | **%d** |" % len(items))
    A("| 页 | %s |" % "、".join(str(p) for p in b.get("pages", [])))
    A("| 校名（OCR 形近字已改，原样存 `ocrTitle`） | %d 条 |" % len([x for x in items if x.get("ocrTitle")]))
    A("| 无年份 | %d 条（多为「民国年间手抄本」类） |" % len([x for x in items if not x["year"]]))
    A("| 无出版者 | %d 条 |" % len([x for x in items if not x["publisher"]]))
    A("| 重复（同书名同年份） | %d 条 |" % len(kj.get("重复", [])))
    A("")
    A("**为什么单列一附录**：这部辞典的每条候正文都标了印张页码，但页码只说明「书里第几页」，"
      "不说明「这一页引的是哪家的书」。有了参考书目，读者能顺着 `原书 → 参考书目 → 原典` 三层回查，"
      "而不是只信我转述。")
    A("")
    A("## I.2 全表")
    A("")
    A("| # | 书名 | 著者／整理者 | 出版者 | 年份 | 印张 |")
    A("|---|---|---|---|---|---|")
    for x in items:
        title = x["title"]
        if x.get("ocrTitle"):
            title = "%s（原印「%s」）" % (x["title"], x["ocrTitle"])
        A("| %d | %s | %s | %s | %s | %s |" % (
            x["n"], title, x["author"] or "—", x["publisher"] or "—", x["year"] or "—", x["page"]))
    A("")
    A("## I.3 校勘")
    A("")
    A("- 续行并入 **%d** 处（OCR 把一条书目的出版者/年份甩到下一框，已拼回上一条）。"
      % len(kj.get("续行并入", [])))
    A("- 跳过 **%d** 行（页眉、页码、残行，逐条列在 `参考书目.json·校勘.跳过的行`）。"
      % len(kj.get("跳过的行", [])))
    if kj.get("重复"):
        A("- 重复 **%d** 条：%s" % (len(kj["重复"]), "、".join(d["text"] for d in kj["重复"])))
    A("- 校名只收「与传世书名对照后确定」的形近字（如 金医钩玄 → 金匮钩玄、医骗 → 医碥）；"
      "把握不足的保留原样（如「吴方医案」），列进 `缺口登记.md` 待人工核。")
    A("")
    return NL.join(L)


def main():
    struct, tensor, men = build()
    tm1names = load_tm1()

    out = []
    out.append((os.path.join(STD, "结构.json"), jdump(struct, STD, "结构.json")))
    out.append((os.path.join(STD, "张量.json"), jdump(tensor, STD, "张量.json")))

    # 缺口登记（校勘 + 拆分残留，显式列出，不吞）
    gap = {
        "$about": "本层未解决/未覆盖的事项。机器可读的门禁看这里，人读的结论也看这里 —— 不许静默。",
        "未做": [
            ("正文 OCR 覆盖 %d/%d 条候（%.1f%%）：%s 已逐条录入【通称】【病因病机】【证象组合】【主症】【副症】"
             "【宾症】【治则】【方症】【摘录】【病案】与印张页码（原文 %.1f 万字）；尚缺 %d 条，逐条列在 正文层校勘.缺条 —— "
             "缺的那些条目仍有结构与合成句，但没有原书正文节选。") % (
                len(BODY), struct["counts"]["houInstances"],
                100.0 * len(BODY) / max(1, struct["counts"]["houInstances"]),
                "、".join(MEN_SHORT.get(k, k) for k in sorted(BODY_SRC)),
                sum(v.get("chars", 0) for v in BODY.values()) / 10000.0,
                struct["counts"]["houInstances"] - len(BODY)),
            ("附录一（75 证象）与附录二（322 病候）**已落库**：原表在印张 2290–2292（下册 PDF 756–758 页），"
             "不在四级目录里，早先按章范围扫漏掉、被误记为「扫描件没有」。现 附录二 322/322 机器解析、"
             "附录一 72 格人工读表（书名声明 75，差 4 格在 附录-证象.json 的 校勘 里逐条交代）。"
             "注：附录 A.5 的 108 态仍是从候名尾部实测得来，与附录一不是一回事，别混。"),
            ("正文层逐条校勘：书内印刷码的 L/Z 与目录码不一致 %d 条（以目录为准配对，原印刷码留在 items[*].codeConflict）；"
             "目录有、扫描正文找不到 %d 条（列在 正文层校勘.缺条）；书内有、目录没有 %d 条（列在 未匹配）；"
             "同码出现两次 %d 条。") % (
                sum(len(v["印张与目录不一致"]) for v in BODY_KJ.values()),
                sum(len(v["缺条"]) for v in BODY_KJ.values()),
                sum(len(v["未匹配"]) for v in BODY_KJ.values()),
                sum(len(v["重码"]) for v in BODY_KJ.values())),
            ("缺条已逐条回原页核实（见 缺条核实）：阴虚失养候是正文缺印、肾阴虚炽候（肝肾湿热）在卷界被切掉、"
             "清气怫郁候（痰火版）是撞码被误去重 —— 三条都不是「没扫到」。另有 %d 条已按原页标题归位（见 码归位）。") % (
                sum(len(v.get("归位") or []) for v in BODY_KJ.values())),
            "severity 轴未独立建模：只用「闭脱/厥脱/脱绝」等态字面承担危候标记。",
        ],
        "校对差异": struct["校对"]["差异"],
        "证名拆分失败": struct["校对"]["证名拆分失败"],
        "候名拆分失败": struct["校对"]["候名拆分失败"],
        "证码重复": struct["校对"]["证码重复"],
        "正文层校勘": BODY_KJ,
        "缺条核实": [
            {"code": "M12-L44-Z21-H216", "候": "阴虚失养候", "结论": "原书没有这一条的正文",
             "依据": "印张 2137 起是（十五）阴竭阳脱候，其摘录与病案续到 2139；2140 页已是（十七）阴血失养候。"
                     "结构图（印张 731）确实列着（十六）阴虚失养候 —— 是正文缺印，不是扫描漏页。",
             "处理": "保持缺条，不补写、不挪用别条正文。"},
            {"code": "M04-L12-Z21-H315", "候": "肾阴虚炽候（肝肾湿热证·十一）", "结论": "扫描件里没有这一条",
             "依据": "上册末页（印张 842）止于（十）肾阴消灼候；下一卷首页（印张 843）已是第六章燥门。"
                     "目录给肝肾湿热证列 11 候，实得 10 候，缺的正是（十一）。",
             "处理": "保持缺条。（注：同名的肾阴虚炽候在脾肾湿热证里有正文，印张 826，已归位到 M04-L12-Z19-H316。）"},
        ],
        "缺条已解决": [
            {"code": "M09-L33-Z12-H039", "候": "清气怫郁候（痰火版）", "页面": "印张 1617",
             "原判": "正文已解析，但去重按「码」不按「码+证段」，被判重码丢弃",
             "现解": "merge 增加「印刷码两解」分派：目录自己把同一印刷码挂在两个 full 码上时，"
                     "按目录顺序把第 k 条记录给第 k 个槽 → 热痰版（印张 1595）落 M09-L32-Z12-H039、"
                     "痰火版（印张 1617）落 M09-L33-Z12-H039。M09 痰门 159/159，重码 0。"},
            {"code": "M02-L05-Z13-H180", "候": "（寒门一号两用后半）",
             "原判": "同一印刷码在 证 Z13 / Z13b 上重复，早先记重码",
             "现解": "同一分派规则覆盖：目录把该码挂在 Z13a/Z13b 两处，按目录顺序落槽，寒门 113/113。"},
        ],
        "码归位": [a for _v in BODY_KJ.values() for a in (_v.get("归位") or [])],
        "同码分派": [{"from": a.get("raw") or a.get("from"), "to": a.get("fixed") or a.get("to"),
                      "zh": a.get("zh"), "page": a.get("page"), "why": a.get("why")}
                     for _v in BODY_KJ.values() for a in (_v.get("同码双证") or [])],
        "计数": struct["counts"],
    }
    out.append((os.path.join(STD, "缺口登记.json"), jdump(gap, STD, "缺口登记.json")))

    # 证象合法组合（附录 G 的机器可用形态）：编码器用它校验「部位×病机」是否在原表里。
    # 只做索引与查询，不改一个字：cells 就是附录-证象.json 的 cells。
    zx = _load_json_optional("附录-证象.json")
    if zx:
        by_wei = {}
        multi = {}
        for c in zx["cells"]:
            slot = by_wei.setdefault(c["col"], {})
            if c["row"] in slot and slot[c["row"]] != c["text"]:
                # 同一格有两个写法（原表「气机×不宁」既有「气机冲逆」也有「气机逆乱」）：
                # 保留第一个作 canonical，另一个记进 multiText，两个都算合法。
                multi.setdefault("%s×%s" % (c["col"], c["row"]), [slot[c["row"]]]).append(c["text"])
                continue
            slot[c["row"]] = c["text"]
        legal = {
            "$about": "附录一（75 证象）的机器索引：部位×病机 → 原表格内文字。"
                      "编码器 validateName() 只用这张表判「这个证象名在原书里有没有」，"
                      "表里没有就是没有，不做相似推断。",
            "source": "附录-证象.json",
            "page": zx.get("source", {}).get("printed"),
            "rows": zx.get("rows", []),
            "cols": zx.get("cols", []),
            "count": len(zx["cells"]),
            "byWei": by_wei,
            "multiText": multi,
            "phrases": sorted({c["text"] for c in zx["cells"]}),
        }
        out.append((os.path.join(STD, "证象-合法组合.json"), jdump(legal, STD, "证象-合法组合.json")))

    index_all(struct)
    out.append((os.path.join(TB, "00-凡例与使用.md"), render_vol0(struct, tensor, men)))
    for m in men:
        out.append((os.path.join(TB, "%02d-第%d章-%s.md" % (m["n"], m["n"], SLUG_ZH[m["code"]])),
                    render_men(m, tm1names)))
    out.append((os.path.join(TB, "附录A-位性态总表.md"), render_appendix_a(struct, tensor, men)))
    out.append((os.path.join(TB, "附录B-ICD11命名原则对照.md"), render_appendix_b(struct, tensor, men, tm1names)))
    out.append((os.path.join(TB, "附录C-数据与接口.md"), render_appendix_c(struct, tensor)))
    out.append((os.path.join(TB, "附录D-症状反查索引.md"), render_appendix_d(struct, men)))
    out.append((os.path.join(TB, "附录E-应用工程手册.md"), render_appendix_e(struct, tensor)))
    out.append((os.path.join(TB, "附录F-百姓问句黄金集.md"), render_appendix_f()))
    out.append((os.path.join(TB, "附录G-证象总表.md"), render_appendix_g(struct)))
    out.append((os.path.join(TB, "附录H-病候总表.md"), render_appendix_h(struct)))
    out.append((os.path.join(TB, "附录I-参考书目.md"), render_appendix_i(struct)))

    # 课程层不在本脚本里出：2026-11-13 起课程正文按「基本理论—基本方法—基本技能」三基编排，
    # 由 scripts/build_zhenghou_sanji.py 生成（母本＝概论十节）。本脚本只负责辞典侧：
    # standards/zhenghou-cidian/* + textbooks/01-zhongyi/14-zhongyi-zhenghou-xue/*。

    for path, text in out:
        emit(path, text)

    print("═══ 中医证候学 · 疾病证候单元辞典 ═══")
    print("  门 %d · 类 %d · 证 %d · 候 %d · 张量非零格 %d" % (
        struct["counts"]["men"], struct["counts"]["lei"], struct["counts"]["zhengInstances"],
        struct["counts"]["houInstances"], struct["counts"]["tensorCells"]))
    print("  校对差异 %d 条（书内自述 vs 目录实条）" % len(struct["校对"]["差异"]))
    print("  证名拆不开 %d · 候名拆不开 %d · 证码重复 %d" % (
        len(struct["校对"]["证名拆分失败"]), len(struct["校对"]["候名拆分失败"]),
        len(struct["校对"]["证码重复"])))
    print("  产物 %d 个文件" % len(out))
    if CHECK:
        if DRIFT:
            print("\n❌ DRIFT %d 个文件与底本不一致：" % len(DRIFT))
            for d in DRIFT[:20]:
                print("   - " + d)
            sys.exit(1)
        print("\n✅ 全部产物与底本一致")
    return 0


if __name__ == "__main__":
    sys.exit(main())


