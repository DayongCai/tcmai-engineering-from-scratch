# -*- coding: utf-8 -*-
"""scripts/zgh_ocr/merge_bodies.py —— 把两门的 OCR 页解析成「候正文」层，落到 standards/

产出：standards/zhenghou-cidian/正文-火门.json、正文-虚证.json
     每条形如 {code, zh, zheng, page, fields:{通称/病因病机/证象组合/主症/治则/方症/…}, chars}

三条纪律：
  1. 码以**结构.json**为准：OCR 出来的侯码只用来配对，配对不上的一律进 未匹配，不猜、不新增。
  2. 正文原样保留（含 OCR 错字）；只在码与候名上做「侯→候」这类确定性纠正，并在 校勘 里计数。
  3. 不写时间戳：`--check` 要能天天空跑。
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from _paths import DATA, doors_file  # noqa: E402  数据目录（scratch，不进 git）＋门区间规格
sys.path.insert(0, HERE)
import parse_records as P  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(HERE))
STD = os.path.join(ROOT, "standards", "zhenghou-cidian")

FIX_PATH = os.path.join(HERE, "归位表.json")
FIXES = json.load(open(FIX_PATH, encoding="utf-8"))["items"] if os.path.exists(FIX_PATH) else []

_DOORS_PATH = doors_file()
DOORS = json.load(open(_DOORS_PATH, encoding="utf-8")) if os.path.exists(_DOORS_PATH) else {}
# JOBS: (门码, 卷, PDF起, PDF止, 门名, 书内章题)
JOBS = [(m, d["vol"], d["from"], d["to"], d["name"], "第%d章 %s" % (d["chap"], d["name"]))
        for m, d in sorted(DOORS.items()) if m.startswith("M")] or [
    ("M06", "zhong", 205, 599, "火门", "第七章 火证（热证）门"),
    ("M12", "xia", 388, 760, "虚证门", "第十三章 虚证门"),
]
ONLY = [a for a in sys.argv[1:] if a.startswith("M")]   # 只跑指定门：python merge_bodies.py M01 M04


def expected_codes(men):
    st = json.load(open(os.path.join(STD, "结构.json"), encoding="utf-8"))
    m = next(x for x in st["men"] if x["code"] == men)
    out = {}
    for l in m["lei"]:
        for z in l["zhengList"]:
            for h in z["houList"]:
                out[h["full"]] = {"zh": h["zh"], "zheng": z["zh"], "wei": h["wei"], "tai": h["tai"]}
    return out, m


def fix_code(code, expect):
    """OCR 把 H248 认成 H24B 这类：只在「唯一近邻」时纠正，纠正了就记账。"""
    if code in expect:
        return code, None
    sug = [c for c in expect if c[:-1] == code[:-1] and len(c) == len(code)]
    if len(sug) == 1:
        return sug[0], "%s→%s" % (code, sug[0])
    return code, None


def _close(a, b):
    """两个候名是否「OCR 形近」：同长且只差一个字，或差一个字里有一个是常见形近对。

    只用于**同门内唯一空位**的归位判定，判完就记账（码纠正），不做静默合并。
    形近对只收这本扫描件里真见过的：怫/佛、燔/蟠、炽/识、宣/宜、侯/候。
    """
    if a == b:
        return True
    if len(a) != len(b):
        return False
    diff = [(x, y) for x, y in zip(a, b) if x != y]
    if len(diff) != 1:
        return False
    pairs = {"怫佛", "燔蟠", "炽识", "宣宜", "虚虑", "郁都", "滞带", "灼的", "养痒"}
    x, y = diff[0]
    return (x + y) in pairs or (y + x) in pairs


def _norm_code(s):
    """码归一：连接号、杂字符、位置补前缀、OCR 形近字，一次纠到底。

    实测到的四种坏法（都在这本书里真实出现过）：
      L11-Z18-H29%6   → 码里混进 %（印张 656 肝阳失宣候）
      L25-Z20-.H083   → 多一个点（印张 1312 枢机郁滞候）
      L36-Z16-HU83    → H 后面的 0 被认成 U（印张 1755 枢机郁滞候）
      144-Z21-H216    → L44 的 L 被认成 1（印张 731 阴虚失养候）

    规则：
      1. 先删掉分隔符以外的杂字符（% . · , ’ 空格）；
      2. 按连接号切段；首段 M## 原样保留；
      3. 其余段**按位置**补前缀：第 1 段 L、第 2 段 Z、第 3 段 H（段本身已带字母则不补）；
      4. 数字体里的形近字纠正（A→4、O→0、U→0、I/l→1、S→5、B→8、G→6、T→7 …）；
      5. L 段的数字体若形如 144（3 位且以 1 开头），去掉首位的 1 —— 那是 "L44" 被认成 "144"。
    只做这些确定性替换，不猜「H29 应该是 H296」这类需要上下文的判断。
    """
    junk = re.sub(r"[^0-9A-Za-z\u4e00\u2014\u2013\u2015\-_.· ]", "", str(s))
    parts = [p for p in re.split(r"[\u4e00\u2014\u2013\u2015\-_.·\s]+", junk.upper()) if p]
    if not parts:
        return str(s).upper()
    out = []
    body_idx = 0
    for p in parts:
        if re.match(r"^M\d+$", p):
            out.append(p)
            continue
        pos_letter = ("L", "Z", "H")[min(body_idx, 2)]
        body_idx += 1
        if p[:1] in ("L", "Z", "H"):
            letter, body = p[0], p[1:]
        else:
            letter, body = pos_letter, p
        # 一号两用的后缀（L05-Z13b）必须先摘下来：末位 B 会被下面的形近字表翻成 8、A 翻成 4。
        suffix = ""
        if len(body) > 1 and body[-1] in ("A", "B", "C"):
            suffix, body = body[-1].lower(), body[:-1]
        body = body.translate(str.maketrans({"A": "4", "O": "0", "U": "0", "I": "1", "l": "1",
                                             "S": "5", "B": "8", "G": "6", "T": "7",
                                             "Q": "0", "D": "0", "V": "0", "J": "1"}))
        body = re.sub(r"[^0-9A-Z]", "", body)
        if letter == "L" and len(body) == 3 and body.startswith("1"):
            body = body[1:]
        out.append(letter + body + suffix)
    return "-".join(out)


def main():
    write = "--check" not in sys.argv
    for men, vol, a, b, name, book in JOBS:
        if ONLY and men not in ONLY:
            continue
        expect, m = expected_codes(men)
        recs = P.parse_vol(vol, a, b, men)
        # 补段：章界页有时落在前一卷末尾（页眉不印章名），序列范围会漏掉 —— 一并解析
        for _ev, _ea, _eb in DOORS.get(men, {}).get("extra", []):
            recs += P.parse_vol(_ev, _ea, _eb, men)
        items = {}
        unmatched = []
        fixes = []
        dup = []
        for r in recs:
            # 书内码是 L18-Z12-H042；结构.json 的键是加了门码的全码 M06-L18-Z12-H042。
            # OCR 常把连接号认成「一」或全角横线，这里统一成半角，否则同一条会既算
            # 未匹配、又算缺条（一码两处报错，最误事）。
            code = _norm_code(men + "-" + r["code"])
            # 结构层的一号两用后缀是小写 a/b（L05-Z13b），_norm_code 会把它大写掉，
            # 于是「M02-L05-Z13B-H073」永远配不上 —— 这里先还原小写再比一次。
            if code not in expect:
                _parts = code.split("-")
                for _i, _p in enumerate(_parts):
                    if _p[-1:] in ("A", "B", "C"):
                        _cand = "-".join(_parts[:_i] + [_p[:-1] + _p[-1].lower()] + _parts[_i + 1:])
                        if _cand in expect:
                            code = _cand
                            break
            # 「一号两用」必须先于重码判定：原书 L05-Z13 给了两个证，结构层存成
            # L05-Z13 / L05-Z13b，书里两处都印 Z13。若等到重码判定之后就没救了 ——
            # 第二条会被当成「同码重复」直接丢掉。所以这里先按候名派到 b。
            _zh0 = r["zh"].replace("侯", "候")
            if code in expect and expect[code]["zh"] != _zh0:
                for _suf in ("b", "a"):
                    _c = code + _suf
                    if _c in expect and expect[_c]["zh"] == _zh0 and _c not in items:
                        fixes.append({"raw": r["code"], "fixed": _c, "zh": _zh0})
                        code = _c
                        break
            if code in items:
                dup.append(code)
                continue
            fixed, note = fix_code(code, expect)
            if note:
                fixes.append({"raw": r["code"], "fixed": fixed, "zh": r["zh"]})
                code = fixed
            if code not in expect:
                # 一号两用（原书 L05-Z13 同时给了「脾胃阴寒证」和「肺脾阴寒证」）：
                # 结构层把第二个存成 …Z13b，书里仍印 Z13。这种情况不能算未匹配，
                # 按**候名**分派到 a/b —— 名字对不上就还是记未匹配，不猜。
                _zh = r["zh"].replace("侯", "候")
                for _suf in ("a", "b"):
                    _c = code + _suf
                    if _c in expect and expect[_c]["zh"] == _zh:
                        fixes.append({"raw": r["code"], "fixed": _c, "zh": _zh})
                        code = _c
                        break
            if code not in expect:
                # 最后一招：**按候名归位**。码被 OCR 认坏到改不回来（如 LA2/ZO3 之外的花样）时，
                # 若本门里还空着、候名一模一样的槽位只有一个，就认这一条，并记进 码纠正。
                # 只在「唯一」时动手：同名两处空着就不动，宁可不匹配，也不把正文塞错地方。
                _zh = r["zh"].replace("侯", "候")
                _cand = [c for c, v in expect.items()
                         if v["zh"] == _zh and c not in items and c.startswith(men + "-")]
                if len(_cand) == 1 and r.get("chars", 0) >= 80:
                    fixes.append({"raw": r["code"], "fixed": _cand[0], "zh": _zh,
                                  "why": "按候名归位（码认坏，本门同名空位唯一）"})
                    code = _cand[0]
            if code not in expect:
                # 兜底顺序的最后一道：**形近字归位**。码认坏了、候名的字也被 OCR 认歪一个
                # （佛/怫、蟠/燔），这时按「同门 + 只差一个常用形近字 + 空位唯一」认下来并记账。
                # 前置条件：这条记录本身有正文（chars ≥ 80）—— 只有标题、没有正文的记录
                # 不许占位，否则会造出「有条目、零字数」的空壳（实测出现过一条）。
                _zh = r["zh"].replace("侯", "候")
                if r.get("chars", 0) >= 80:
                    _cand = [c for c, v in expect.items()
                             if c not in items and c.startswith(men + "-")
                             and _close(_zh, v["zh"]) and v["zh"] != _zh]
                    if len(_cand) == 1:
                        fixes.append({"raw": r["code"], "fixed": _cand[0], "zh": expect[_cand[0]]["zh"],
                                      "ocrZh": _zh, "why": "形近字归位（同门空位唯一）"})
                        code = _cand[0]
            if code not in expect:
                unmatched.append({"code": code, "zh": r["zh"], "page": r["page"]})
                continue
            # 码在、但候名对不上：先看是不是「一号两用」的另一半（…Z13b），
            # 名字对得上就派到 b；否则不改名，记账（OCR 错字或原书异写）
            zh_ok = r["zh"].replace("侯", "候") == expect[code]["zh"]
            if not zh_ok:
                _zh = r["zh"].replace("侯", "候")
                for _suf in ("b", "a"):
                    _c = code + _suf
                    if _c in expect and expect[_c]["zh"] == _zh and _c not in items:
                        fixes.append({"raw": r["code"], "fixed": _c, "zh": _zh})
                        code, zh_ok = _c, True
                        break
            if not zh_ok:
                # 书印码与目录不一致（如书印 H315、目录 H316）：码在、名字不是它的。
                # 若本门里「同名且还空着」的槽位唯一，按名字归位 —— 拿错码去覆盖别的候，
                # 比留一个缺条更糟：那会把甲的正文写进乙的条目里。
                _zh = r["zh"].replace("侯", "候")
                _cand = [c for c, v in expect.items() if v["zh"] == _zh and c not in items]
                if len(_cand) == 1 and _cand[0] != code:
                    fixes.append({"raw": r["code"], "fixed": _cand[0], "zh": _zh,
                                  "why": "书印码与目录不一致，按候名归位"})
                    code, zh_ok = _cand[0], True
            items[code] = {
                "zh": expect[code]["zh"],
                "zheng": expect[code]["zheng"],
                "page": r["page"],
                "fields": {k: re.sub(r"\s+", " ", v).strip() for k, v in r["fields"].items()},
                "chars": r["chars"],
                "nameMatch": zh_ok,
            }
        # ── 并入「找回层」：recover_missing.py 的产物 ────────────────────────
        # 首轮解析漏掉的候（标题括号混搭、码被认坏、行内无码）由它补。
        # 只补结构.json 里本来就有的码；已存在的码一律不覆盖（首轮优先）。
        rec_file = os.path.join(DATA, "recovered-%s.json" % men)
        recovered = []
        if os.path.exists(rec_file):
            for r in json.load(open(rec_file, encoding="utf-8")):
                code = _norm_code(men + "-" + r["code"])
                if code not in expect:
                    _parts = code.split("-")
                    for _i, _p in enumerate(_parts):
                        if _p[-1:] in ("A", "B", "C"):
                            _cand = "-".join(_parts[:_i] + [_p[:-1] + _p[-1].lower()] + _parts[_i + 1:])
                            if _cand in expect:
                                code = _cand
                                break
                if code in items or code not in expect:
                    continue
                fields = {k: re.sub(r"\s+", " ", v).strip() for k, v in (r.get("fields") or {}).items()}
                if not fields and r.get("raw"):
                    fields = {"原书段落": re.sub(r"\s+", " ", r["raw"]).strip()}
                items[code] = {
                    "zh": expect[code]["zh"],
                    "zheng": expect[code]["zheng"],
                    "page": r.get("page"),
                    "fields": fields,
                    "chars": r.get("chars", 0),
                    "nameMatch": True,
                    "recovered": True,
                    "raw": r.get("raw", ""),
                }
                if r.get("codeConflict"):
                    items[code]["codeConflict"] = r["codeConflict"]
                if r.get("ocrName"):
                    items[code]["ocrName"] = r["ocrName"]
                recovered.append(code)
        # ── 码归位：原书印刷码与目录码冲突、且已回原页看过图的那几条 ──────────
        applied = []
        for e in FIXES:
            if not e["from"].startswith(men + "-") or e["from"] not in items:
                continue
            it = items[e["from"]]
            if e.get("page") and it.get("page") != e["page"]:
                raise SystemExit("✗ 归位表页码不符：%s 实际 %s，表里写 %s"
                                 % (e["from"], it.get("page"), e["page"]))
            del items[e["from"]]
            if e.get("to"):
                if e["to"] in items:
                    raise SystemExit("✗ 归位目标已被占用：%s" % e["to"])
                it["movedFrom"] = e["from"]
                it["moveWhy"] = e["why"]
                items[e["to"]] = it
            applied.append({"from": e["from"], "to": e.get("to"),
                            "page": it.get("page"), "why": e["why"]})

        got = len(items)
        payload = {
            "$about": "《中医证候学》%s（%s）的候级正文（OCR）。字段原样保留，出处为印张页码。" % (book, men),
            "men": men,
            "book": book,
            "source": {
                "pdf": {"shang": "1-中医证候学上.pdf", "zhong": "2-中医证候学中.pdf",
                        "xia": "3-中医证候学下.pdf"}[vol],
                "pdfPages": [a, b],
                "engine": "rapidocr_onnxruntime (PP-OCR)",
                "params": {"dpi": 200, "colorspace": "gray", "det_limit_side_len": 2000,
                           "det_limit_type": "min"},
                "note": "det_limit 若用默认 736，会把相邻两行并框、只认第一行（静默丢行）。",
            },
            "counts": {
                "expected": len(expect), "parsed": len(recs), "matched": got,
                "missing": len(expect) - got, "unmatched": len(unmatched), "duplicates": len(dup),
                "chars": sum(v["chars"] for v in items.values()),
                "nameMismatch": sum(1 for v in items.values() if not v["nameMatch"]),
                "codeFixes": len(fixes),
                "recovered": len(recovered),
                "conflicts": sum(1 for v in items.values() if v.get("codeConflict")),
                "moved": len(applied),
                "pageFrom": min((v["page"] for v in items.values()), default=None),
                "pageTo": max((v["page"] for v in items.values()), default=None),
            },
            "校勘": {"未匹配": unmatched, "重码": dup, "码纠正": fixes, "归位": applied,
                      "缺条": [c for c in expect if c not in items]},
            "items": items,
        }
        out = os.path.join(STD, "正文-%s.json" % men)
        txt = json.dumps(payload, ensure_ascii=False, indent=1) + "\n"
        if write:
            open(out, "w", encoding="utf-8", newline="\n").write(txt)
        c = payload["counts"]
        if applied:
            print("   归位 %d 条：%s" % (len(applied), "；".join("%s→%s" % (a["from"], a["to"] or "(删)") for a in applied)))
        print("%s %s: 期望 %d · 解析 %d · 命中 %d · 缺 %d · 未匹配 %d · 重码 %d · 码纠正 %d · 名不符 %d · 正文 %.1f 万字"
              % (men, name, c["expected"], c["parsed"], c["matched"], c["missing"],
                 c["unmatched"], c["duplicates"], c["codeFixes"], c["nameMismatch"], c["chars"] / 10000))
        if c["missing"]:
            print("   缺条示例：", payload["校勘"]["缺条"][:6])


if __name__ == "__main__":
    main()
