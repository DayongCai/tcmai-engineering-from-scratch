# -*- coding: utf-8 -*-
"""scripts/build_classics_units.py —— 三部经典底本 → 单元层（units.json）

母本（都在库，sha256 见各 units.json 的 source 块）：
  standards/shanghan/tiao-398.json   《伤寒论》宋本 398 条（条文层，带六经标签）
  standards/jingui/底本.json          《金匮要略方論》26 篇 402 条 174 方（笈成文字化本）
  standards/wenbing/底本.json         《温病条辨》《温热论》《温疫论》108 卷篇 630 条（同）

产出：
  standards/shanghan/units.json   398 单元
  standards/jingui/units.json     402 单元
  standards/wenbing/units.json    630 单元
合计 1430 单元，与三份底本自报条数逐一对齐（脚本结尾自检，不等即失败）。

切分口径：**一条一单元**。经典没有教材的「章—节—小节」，它的知识单位就是条；
强行按主题合并会把「397 条条文」压成几十个摘要，反而丢掉可引用性。于是：

  章（chapter）＝篇/卷；节（sec）＝病类或六经；小节（sub）＝条号；单元＝条。

三条轴按各自底本的**原生坐标系**取，不套用教材的「三辨／四位面」：
  伤寒论  三辨→ 脉证 / 病机 / 治法        四位面→ 六经六层 + 霍乱 + 差后劳复（8 面）
  金匮要略 三辨→ 病因 / 病机 / 证候        四位面→ 总论 / 内科杂病 / 妇人 / 杂疗禁忌（4 面）
  温病    三辨→ 病因 / 病机 / 证候        四位面→ 上焦 / 中焦 / 下焦（3 面）

证据口径（写入产物，可复核）：
  · 金匮、温病的正文取自 **底本**（jicheng 笈成文字化本），unit.text = 简体条文；
    方文随条（底本中方在条后），拼进 body 但单元里另存 formulas 结构。
  · 伤寒论的 398 条取自**外源**（xukongwen/shanghan_learn SH_text.json，sha256 已登记），
    因为底本（识典古籍刻本）无条号、无法与 398 条编号对齐；每条保留 witness
    （dibenIn / dibenRecall）与 src 标注，按《补源约定》记「外源·来源 第N条」。

用法：
  python scripts/build_classics_units.py            # 写盘
  python scripts/build_classics_units.py --check    # 只比对，不写
"""
from __future__ import annotations

import hashlib
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STD = os.path.join(ROOT, "standards")
HANZI = re.compile(r"[\u4e00-\u9fff]")
DOSE = re.compile(
    r"(?:\d+(?:\.\d+)?|[一二三四五六七八九十百半]+)\s*"
    r"(?:两|兩|升|合|枚|钱|錢|分|斤|铢|銖|寸|日|服|沸|味|个|個|把|片|茎|莖|斗|壮|握)"
)

# 字形统一走 opencc t2s —— 与 scripts/convert_t2s.py 同一个转换器、同一条规矩：
# 只动字形，不动字词。底本声明「opencc t2s（仅字形）」，但注文与部分异体漏转
# （金匮注文残留「兩/脈/氣…」455+ 处，温病注文残留「隂」502 处），单元层统一补齐；
# 另外「隂」opencc 不覆盖，用 VARIANT_MAP 兜底。
try:
    import opencc
except ImportError:  # 与 convert_t2s.py 一致：缺依赖就明确报错，不静默降级
    sys.stderr.write(
        "缺依赖 opencc：pip install opencc-python-reimplemented -i https://mirrors.aliyun.com/pypi/simple/\n"
    )
    raise SystemExit(2)

CONVERTER = opencc.OpenCC("t2s")
VARIANT_MAP = {"隂": "阴"}


def normalize(text: str) -> str:
    text = CONVERTER.convert(text or "")
    for a, b in VARIANT_MAP.items():
        text = text.replace(a, b)
    return text

CN_NUM = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}


def cn2int(s: str) -> int | None:
    """温病条辨的条号是汉数字（一 / 二二 / 三五 / 一百）——解析不出来就返回 None，不猜。"""
    s = (s or "").strip()
    if not s:
        return None
    if s.isdigit():
        return int(s)
    total, section, num = 0, 0, 0
    for ch in s:
        if ch == "百":
            section = (section or 1) * 100
        elif ch == "十":
            section += (num or 1) * 10
            num = 0
        elif ch in CN_NUM:
            num = CN_NUM[ch]
        else:
            return None
    return section + num or None


def sha256_of(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def count(s: str) -> dict:
    t = s or ""
    return {
        "hanzi": len(HANZI.findall(t)),
        "digits": len(re.findall(r"\d", t)),
        "valueLike": len(DOSE.findall(t)),
    }


# ── 三条轴：每部底本各取自己的坐标系 ─────────────────────────────────────────

VIEWS_SH = {
    "脉证": ["脉浮", "脉沉", "脉迟", "脉数", "脉紧", "脉缓", "脉微", "脉细", "脉滑", "脉实", "脉洪",
             "发热", "恶寒", "身痛", "头痛", "汗出", "无汗", "口渴", "烦躁", "呕", "吐", "利",
             "小便", "大便", "胸满", "心下", "腹满", "谵语", "手足", "舌上", "面"],
    "病机": ["虚", "实", "寒", "热", "表", "里", "阴", "阳", "气", "血", "津液", "痰", "水",
             "传", "转属", "合病", "并病", "坏病", "结胸", "痞", "厥", "亡阳", "伤", "损"],
    "治法": ["汗", "吐", "下", "和", "温", "清", "补", "攻", "发汗", "解肌", "和解", "攻下",
             "温经", "清热", "回阳", "救逆", "汤", "丸", "散", "承气", "四逆", "理中", "白虎",
             "五苓", "柴胡", "泻心", "桂枝", "麻黄"],
}

VIEWS_JG = {
    "病因": ["风", "寒", "湿", "暑", "燥", "火", "热", "邪", "疫", "毒", "饮食", "房劳", "虫", "虚劳"],
    "病机": ["虚", "实", "气", "血", "津", "液", "痰", "饮", "水", "瘀", "郁", "结", "逆", "陷",
             "上冲", "下利", "闭塞", "不通", "内伤", "外感"],
    "证候": ["脉", "发热", "恶寒", "疼痛", "痛", "汗出", "咳", "喘", "呕", "吐", "利", "小便",
             "大便", "满", "痞", "渴", "悸", "眩", "痿", "肿", "黄", "衄", "下血", "舌"],
}

VIEWS_WB = {
    "病因": ["温邪", "风温", "温热", "暑", "湿", "燥", "寒", "疫", "疠", "毒", "秽", "伏邪", "时邪"],
    "病机": ["卫", "气分", "营", "血分", "上焦", "中焦", "下焦", "三焦", "逆传", "内陷", "闭",
             "脱", "阴", "阳", "津", "液", "化燥", "伤阴", "入血"],
    "证候": ["发热", "恶寒", "口渴", "汗", "烦躁", "神昏", "谵语", "痉", "厥", "斑", "疹", "舌",
             "苔", "脉", "咳嗽", "喘", "胸", "脘", "腹", "便", "溲", "小便", "面赤", "目赤"],
}

LEVELS_SH = {
    "太阳病": ["太阳"],
    "阳明病": ["阳明"],
    "少阳病": ["少阳"],
    "太阴病": ["太阴"],
    "少阴病": ["少阴"],
    "厥阴病": ["厥阴"],
    "霍乱": ["霍乱"],
    "差后劳复": ["差后", "劳复", "阴阳易"],
}

LEVELS_JG = {
    "总论": ["脏腑经络", "先后病", "治未病"],
    "内科杂病": ["痉", "湿", "暍", "百合", "狐惑", "疟", "中风", "历节", "血痹", "虚劳",
                 "肺痿", "肺痈", "咳嗽", "奔豚", "胸痹", "腹满", "寒疝", "宿食", "积聚",
                 "痰饮", "消渴", "淋", "水气", "黄疸", "惊悸", "吐衄", "下血", "瘀血",
                 "呕吐", "哕", "下利"],
    "妇人病": ["妊娠", "产后", "妇人杂病", "带下", "经水"],
    "杂疗禁忌": ["杂疗", "禽兽", "鱼虫", "果实", "菜谷", "禁忌"],
}

LEVELS_WB = {
    "上焦": ["上焦", "肺", "心包", "卫分", "太阴温病"],
    "中焦": ["中焦", "胃", "脾", "阳明温病", "气分"],
    "下焦": ["下焦", "肾", "肝", "血分", "少阴", "厥阴"],
}


def measure(text: str, views: dict, levels: dict) -> dict:
    v = {k: sum(text.count(w) for w in ws) for k, ws in views.items()}
    lv = {k: sum(text.count(w) for w in ws) for k, ws in levels.items()}
    return [v, lv]


def tri_of(v: dict, lv: dict) -> dict:
    def pick(d):
        total = sum(d.values()) or 1
        primary = max(d, key=d.get) if max(d.values()) else "none"
        return {"primary": primary, "share": round(d.get(primary, 0) / total, 3),
                "mix": ">".join(f"{k}{val}" for k, val in sorted(d.items(), key=lambda kv: -kv[1])[:3])}
    return {"view": pick(v), "level": pick(lv)}


def first_sentence(text: str, limit: int = 46) -> str:
    t = re.sub(r"\s+", "", text or "")
    m = re.split(r"[。！？]", t)
    s = m[0] if m else t
    return s[:limit]


def mk_unit(*, chapter, chapterTitle, sec, sub, title, locator, text, body=None,
            formulas=None, notes=None, extra=None) -> dict:
    body = body or text
    c = count(body)
    v, lv = measure(body, CURRENT_VIEWS, CURRENT_LEVELS)
    u = {
        "chapter": str(chapter),
        "chapterTitle": chapterTitle,
        "sec": sec,
        "sub": sub,
        "title": title,
        "locator": locator,
        "brief": first_sentence(text),
        "goals": [],
        "rawBody": body,
        "body": body,
        "prose": text,
    }
    if formulas:
        u["formulas"] = formulas
    if notes:
        u["notes"] = notes
    u["segments"] = [{"title": first_sentence(text, 24) or sub, "hanzi": c["hanzi"]}]
    u["hanzi"] = c["hanzi"]
    u["measure"] = {"digits": c["digits"], "valueLike": c["valueLike"],
                    "valueSamples": DOSE.findall(body)[:6], "listItems": 0,
                    "views": v, "levels": lv}
    u["tri"] = tri_of(v, lv)
    if extra:
        u.update(extra)
    return u


# ── 三部分别构建 ───────────────────────────────────────────────────────────

CURRENT_VIEWS: dict = {}
CURRENT_LEVELS: dict = {}


def build_shanghan() -> dict:
    global CURRENT_VIEWS, CURRENT_LEVELS
    CURRENT_VIEWS, CURRENT_LEVELS = VIEWS_SH, LEVELS_SH
    p_tiao = os.path.join(STD, "shanghan", "tiao-398.json")
    d_tiao = json.load(io.open(p_tiao, encoding="utf-8"))
    p_diben = os.path.join(STD, "shanghan", "底本.json")
    d_diben = json.load(io.open(p_diben, encoding="utf-8"))

    pian_order = [p["name"] for p in d_tiao["pian"]]
    chap_no = {name: i + 1 for i, name in enumerate(pian_order)}
    units = []
    for t in d_tiao["tiao"]:
        pname = t["pian"]
        cno = chap_no[pname]
        fangs = t.get("fang") or []
        body = t["text"]
        if fangs:
            body = body + "\n【方】" + "、".join(fangs)
        units.append(mk_unit(
            chapter=cno,
            chapterTitle=f"第{cno}篇 {pname}",
            sec=t.get("liu") or "",
            sub=f"{t['no']}",
            title=(first_sentence(t["text"], 30) or f"第{t['no']}条"),
            locator=f"伤寒论·{pname}·第{t['no']}条",
            text=t["text"],
            body=body,
            formulas=[{"name": f} for f in fangs] or None,
            extra={
                "no": t["no"],
                "liu": t.get("liu"),
                "liuKey": t.get("liuKey"),
                "juan": t.get("juan"),
                "witness": t.get("witness"),
                "src": t.get("src"),
                "textPure": t["text"],
            },
        ))
    chapters = []
    for name in pian_order:
        cno = chap_no[name]
        us = [u for u in units if u["chapter"] == str(cno)]
        chapters.append({"no": str(cno), "title": f"第{cno}篇 {name}",
                         "units": len(us), "hanzi": sum(u["hanzi"] for u in us)})
    src = d_tiao["source"]["primary"]
    return {
        "source": {
            "file": src["file"], "sha256": src["sha256"], "script": "scripts/build_classics_units.py",
            "label": "外源", "origin": src["origin"],
            "witness": d_tiao["source"].get("witness", []),
            "diben": {"file": "standards/shanghan/底本.json", "sha256": sha256_of(p_diben),
                      "edition": d_diben["source"]["edition"], "bytes": d_diben["source"]["bytes"]},
            "evidence": "398 条取自外源 SH_text.json；底本（识典古籍刻本）无条号，仅作见证，"
                        "逐条记 witness.dibenIn / dibenRecall。外源条目按《补源约定》标「外源·来源 第N条」。",
        },
        "basis": {
            "unit": "一条一单元（宋本 398 条）",
            "views": "脉证 / 病机 / 治法（条文自身的三类判据）",
            "levels": "六经六层 + 霍乱 + 差后劳复（底本原生的八面，不压成四面）",
        },
        "views": VIEWS_SH, "levels": LEVELS_SH,
        "chapters": chapters,
        "units": units,
    }


def build_jingui() -> dict:
    global CURRENT_VIEWS, CURRENT_LEVELS
    CURRENT_VIEWS, CURRENT_LEVELS = VIEWS_JG, LEVELS_JG
    p_diben = os.path.join(STD, "jingui", "底本.json")
    d = json.load(io.open(p_diben, encoding="utf-8"))
    units = []
    for idx, pian in enumerate(d["pian"], start=1):
        cno = pian.get("no") or idx  # 底本最后四篇（序/杂疗/禁忌）没有 no 字段，按篇序补
        pname = pian.get("nameSimp") or pian.get("name")
        for art in pian.get("articles", []):
            fangs = art.get("formulas") or []
            text = normalize(art.get("zhHans") or art.get("zhHant") or "")
            body = text
            # 笈成有时把方文写进条后正文（"X方："），有时只把方留在 formulas 里。
            # 逐方判断：该方的名或首味药已出现在正文里就不重复拼。
            for f in fangs:
                fname_s = f.get("nameSimp") or ""
                fname_t = f.get("name") or ""
                first_herb = ((f.get("ingredients") or [{}])[0] or {}).get("herbSimp") or ""
                if (fname_s and fname_s in text) or (fname_t and fname_t in text):
                    continue
                if first_herb and first_herb in text:
                    continue
                ings = "、".join(f"{i.get('herbSimp') or i.get('herb')}{i.get('doseSimp') or i.get('dose') or ''}"
                                for i in (f.get("ingredients") or []))
                body += f"\n【方】{fname_s or fname_t}　{ings}"
                if f.get("methodSimp"):
                    body += f"；{f['methodSimp']}"
            notes = [normalize(n) for n in (art.get("notes") or []) if n]
            if notes:
                body += "\n" + "\n".join(f"【注】{n}" for n in notes)
            units.append(mk_unit(
                chapter=cno,
                chapterTitle=f"第{cno}篇 {pname}",
                sec=pname,
                sub=art.get("tiao") or "",
                title=first_sentence(text, 30) or f"{pname}·{art.get('tiao')}",
                locator=f"金匮要略·{pname}·{art.get('tiao')}",
                text=text,
                body=body,
                formulas=[{"name": f.get("nameSimp") or f.get("name"),
                           "ingredients": f.get("ingredients"),
                           "method": f.get("methodSimp"),
                           "refOnly": f.get("refOnly", False)} for f in fangs] or None,
                notes=art.get("notes") or None,
                extra={"no": art.get("tiao"), "idx": art.get("idx")},
            ))
    chapters = []
    for idx, pian in enumerate(d["pian"], start=1):
        cno = pian.get("no") or idx
        us = [u for u in units if u["chapter"] == str(cno)]
        chapters.append({"no": str(cno),
                         "title": (f"第{cno}篇 {pian.get('nameSimp') or pian.get('name')}"
                                   if pian.get("no") else (pian.get("nameSimp") or pian.get("name"))),
                         "units": len(us), "hanzi": sum(u["hanzi"] for u in us)})
    s = d["source"]
    return {
        "source": {
            "file": "standards/jingui/底本.json", "sha256": sha256_of(p_diben),
            "script": "scripts/build_classics_units.py", "label": "底本",
            "provider": s.get("provider"), "providerTitle": s.get("providerTitle"),
            "url": s.get("url"), "rawUrl": s.get("rawUrl"), "edition": s.get("edition"),
            "rawBytes": s.get("bytes"), "rawSha256": s.get("sha256"),
            "evidence": "正文与方文逐条取自底本（笈成文字化本，26 篇 402 条 174 方）；方随条拼进 body，另存 formulas 结构。"
                        "底本正文已含方文时不再重复拼接（逐方按名/首味药判重）；"
                        "字形统一走 opencc t2s（与 scripts/convert_t2s.py 同一转换器），注文残留的 兩/脈/氣 等一并归正。"
                        "字数口径：单元 31,007 = 条文 26,730 + 注文 3,334 + 未内嵌方文 943（含【方】【注】标记）；"
                        "底本自报 charsHans 34,462 的方文计法未写明，未反推，两者不同源、不必相等。",
        },
        "basis": {
            "unit": "一条一单元（26 篇 402 条）",
            "views": "病因 / 病机 / 证候",
            "levels": "总论 / 内科杂病 / 妇人 / 杂疗禁忌（按篇目分四门类）",
        },
        "views": VIEWS_JG, "levels": LEVELS_JG,
        "chapters": chapters,
        "units": units,
    }


def build_wenbing() -> dict:
    global CURRENT_VIEWS, CURRENT_LEVELS
    CURRENT_VIEWS, CURRENT_LEVELS = VIEWS_WB, LEVELS_WB
    p_diben = os.path.join(STD, "wenbing", "底本.json")
    d = json.load(io.open(p_diben, encoding="utf-8"))
    units = []
    chapters = []
    chap_no = 0
    for bk in d["books"]:
        btitle = bk.get("titleSimp") or bk.get("title")
        # 卷＝章（条辨六卷、温疫论上中下卷、温热论通篇一卷），篇＝节（风温/暑温/湿温…）
        groups: "list[tuple[str, list[dict]]]" = []
        for sec in bk.get("sections", []):
            if not sec.get("articles"):
                continue
            juan = sec.get("juan") or "通篇"
            if groups and groups[-1][0] == juan:
                groups[-1][1].append(sec)
            else:
                groups.append((juan, [sec]))
        for juan, secs in groups:
            chap_no += 1
            ctitle = f"《{btitle}》{juan}"
            cnt = hz = 0
            for sec in secs:
                pian = sec.get("pian") or ""
                for art in sec.get("articles", []):
                    text = normalize(art.get("zhHans") or art.get("zhHant") or "")
                    notes = [normalize(n) for n in (art.get("notes") or []) if n]
                    body = text + ("\n" + "\n".join(f"【注】{n}" for n in notes) if notes else "")
                    no = art.get("no") or ""
                    kind = "正文"
                    if juan in ("凡例", "自敘", "自叙"):
                        kind = "凡例" if juan == "凡例" else "序"
                    elif juan == "原病篇":
                        kind = "原病篇"
                    units.append(mk_unit(
                        chapter=chap_no,
                        chapterTitle=ctitle,
                        sec=pian or juan,
                        sub=str(no),
                        title=first_sentence(text, 30) or f"第{no}条",
                        locator=f"{ctitle}" + (f"·{pian}" if pian else "") + f"·第{no}条",
                        text=text,
                        body=body,
                        notes=notes or None,
                        extra={"no": no, "noInt": cn2int(str(no)), "book": bk.get("id"),
                               "juan": juan, "pian": pian, "kind": kind},
                    ))
                    cnt += 1
                    hz += len(HANZI.findall(body))
            chapters.append({"no": str(chap_no), "title": ctitle, "units": cnt, "hanzi": hz})
    return {
        "source": {
            "file": "standards/wenbing/底本.json", "sha256": sha256_of(p_diben),
            "script": "scripts/build_classics_units.py", "label": "底本",
            "provider": "jicheng", "providerTitle": "中醫笈成（漢リポ 文字化本）",
            "books": [{"id": b.get("id"), "title": b.get("title"), "author": b.get("author"),
                       "dynasty": b.get("dynasty"), "edition": b.get("edition"),
                       "sha256": (b.get("source") or {}).get("sha256"),
                       "url": (b.get("source") or {}).get("url"),
                       "fetchedAt": (b.get("source") or {}).get("fetchedAt")} for b in d["books"]],
            "evidence": "三书逐条取自底本；条号保留汉数字（另存 noInt 供排序），注文作【注】拼进 body。"
                        "底本声明 opencc t2s（仅字形）但注文漏转（隂 502 处、兩/脈/氣 等），单元层用同一转换器补齐，opencc 不覆盖的「隂」按 VARIANT_MAP 归「阴」。"
                        "底本自报《温病条辨》243 方是按条文提及统计的（方文未入底本正文），"
                        "故单元层不列 formulas 结构，只给 counts.formulaMentions 供对账。",
        },
        "basis": {
            "unit": "一条一单元（3 书 108 卷篇 630 条，含凡例与原病篇）",
            "views": "病因 / 病机（卫气营血·三焦） / 证候",
            "levels": "上焦 / 中焦 / 下焦（三焦是温病的原生分层）",
        },
        "views": VIEWS_WB, "levels": LEVELS_WB,
        "chapters": chapters,
        "units": units,
    }


# ── 收尾：计数、三轴汇总、写盘、自检 ───────────────────────────────────────

def finalize(payload: dict, expect: int, name: str) -> dict:
    units = payload["units"]
    body_all = "".join(u["body"] for u in units)
    c = count(body_all)
    by_view, by_level = {}, {}
    for u in units:
        pv = u["tri"]["view"]["primary"]
        pl = u["tri"]["level"]["primary"]
        if pv != "none":
            by_view[pv] = by_view.get(pv, 0) + 1
        if pl != "none":
            by_level[pl] = by_level.get(pl, 0) + 1
    payload["counts"] = {
        "chapters": len(payload["chapters"]),
        "units": len(units),
        "hanzi": c["hanzi"],
        "digits": c["digits"],
        "valueLike": c["valueLike"],
        "formulas": sum(len(u.get("formulas") or []) for u in units),
        # 方案提及数：用于与底本自报的方数对账（温病的方文不在底本正文里，只有方名出现）
        "formulaMentions": len(re.findall(r"[\u4e00-\u9fff]{1,6}(?:汤|湯|散|丸|膏|丹|饮|飲)\s*(?:主之|方)", body_all)),
    }
    payload["triaxis"] = {"byPrimaryView": by_view, "byPrimaryLevel": by_level}
    assert len(units) == expect, f"{name}: 单元数 {len(units)} ≠ 底本自报 {expect}"
    assert sum(ch["units"] for ch in payload["chapters"]) == expect, f"{name}: 章计数与条数不符"
    return payload


TARGETS = [
    ("shanghan", build_shanghan, 398, "《伤寒论》宋本 398 条"),
    ("jingui", build_jingui, 402, "《金匮要略》402 条"),
    ("wenbing", build_wenbing, 630, "温病三书 630 条"),
]


def main() -> int:
    check = "--check" in sys.argv
    drift, total = [], 0
    for name, fn, expect, label in TARGETS:
        payload = finalize(fn(), expect, name)
        total += payload["counts"]["units"]
        out = os.path.join(STD, name, "units.json")
        text = json.dumps(payload, ensure_ascii=False, indent=1)
        if check:
            old = io.open(out, encoding="utf-8").read() if os.path.exists(out) else ""
            ok = old == text
            print(f"[{name}] {'✓' if ok else 'DRIFT'} {payload['counts']['units']} 单元 · "
                  f"{payload['counts']['hanzi']:,} 字 · 方 {payload['counts']['formulas']}")
            if not ok:
                drift.append(name)
            continue
        io.open(out, "w", encoding="utf-8").write(text)
        print(f"[{name}] saved {out}  {round(os.path.getsize(out) / 1024)} KB · "
              f"{payload['counts']['units']} 单元 · {payload['counts']['hanzi']:,} 字 · "
              f"方 {payload['counts']['formulas']} · 章 {payload['counts']['chapters']}（{label}）")
    print(f"合计 {total} 单元")
    if check and drift:
        print("DRIFT:", ", ".join(drift), "—— 请跑 npm run classics:units")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
