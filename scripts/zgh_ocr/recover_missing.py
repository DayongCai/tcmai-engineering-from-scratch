# -*- coding: utf-8 -*-
"""scripts/zgh_ocr/recover_missing.py —— 找回「码在页上、标题没被切成行首」的候

为什么会有缺口（实测三类，逐类兜底）：
  1. 标题的序号用【二）这种混搭括号，标题正则没接住 → 放宽括号后首轮就能抓到；
  2. 候标题被 OCR 并进上一行的尾巴（行聚类把两行合成一框） → 按**候码**找锚点；
  3. 书里印的 L/Z 号跟目录书签不一致（H 号一致），或整行没认出具码 → 按**候名**找。

纪律：
  · 只补「结构.json 里本来就有」的条，不新增码；
  · 候名必须在本门内唯一，且命中行必须是标题行（含候码或「（一）名候」），
    否则宁缺不猜 —— 转证/摘录里顺口提到的名字会把正文张冠李戴；
  · 抓到的正文掐到候名真正出现那行，防止把证级的病因病机当候级用；
  · L/Z 不一致记进 codeConflict，原书印刷码照留，不改。

产出：scripts/zgh_ocr/recovered-<men>.json（由 merge_bodies.py 合并，标 recovered=true）
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from _paths import DATA  # noqa: E402  数据目录（scratch，不进 git）
sys.path.insert(0, HERE)
import parse_records as P          # noqa: E402
import merge_bodies as M           # noqa: E402

CODE_RE = re.compile(r"[（(【\[]?\s*L\s*([0-9A-Za-z]{2})\s*[.·]?\s*[-－—–一]+\s*Z\s*([0-9A-Za-z]{2})\s*[.·]?\s*[-－—–一]+\s*H\s*([0-9A-Za-z]{3})\s*[）)】\]]?")
NAME_TAIL = re.compile(r"([^\s（(0-9]{2,14}?[候侯])\s*[（(【\[]?\s*$")
SERIAL_NAME = r"[（(【\[]\s*[一二三四五六七八九十]+\s*[）)】\]]\s*"


def trim_to_name(blob, nm):
    """把 blob 掐到「候名真正出现」的那一行开头。

    证条目下先排【基本证象】(证级)、再排各个候；找回来的 blob 有时从证标题起，
    不掐就会把证级的病因病机当成候级用。候正文固定以「某证·某候，为……」起句，
    所以掐到含候名的那一行最稳。
    """
    ls = blob.split("\n")
    for k, l in enumerate(ls):
        if nm in l:
            return "\n".join(ls[k:])
    return blob


def parse_fields(blob):
    """按原书字段名（【病因病机】【证象组合】【治则】【方症】…）把一段正文切开。"""
    out = {}
    marks = [(mm.start(), mm.group(1)) for mm in P.FIELD_RE.finditer(blob)]
    for k, (p0, name) in enumerate(marks):
        p1 = marks[k + 1][0] if k + 1 < len(marks) else len(blob)
        seg = blob[p0:p1]
        head = seg[:10]
        if "：" in head or ":" in head:
            seg = re.split(r"[：:]", seg, 1)[1]
        out[name] = (out.get(name, "") + " " + re.sub(r"\s+", " ", seg)).strip()
    return out


def body_end(lines, i, limit=40):
    end_i = min(i + limit, len(lines) - 1)
    for j in range(i + 1, len(lines)):
        if P.HOU_RE.search(lines[j]["text"]):
            return j
    return end_i


def main():
    for men in (sys.argv[1:] or ["M06", "M12"]):
        job = next(j for j in M.JOBS if j[0] == men)
        _, vol, a, b, name, _book = job
        expect, _m = M.expected_codes(men)
        have = {(men + "-" + r["code"]).upper() for r in P.parse_vol(vol, a, b, men)}
        missing = [c for c in expect if c not in have]

        lines = []
        for p in range(a, b + 1):
            f = os.path.join(P.OCR, "%s-%04d.json" % (vol, p))
            if not os.path.exists(f):
                continue
            for l in P.page_lines(json.load(open(f, encoding="utf-8"))):
                lines.append({"text": l["text"], "page": l["printed"], "pdf": l["page"]})

        anchors = []
        for i, l in enumerate(lines):
            for mm in CODE_RE.finditer(l["text"]):
                anchors.append((i, "L%s-Z%s-H%s" % (mm.group(1), mm.group(2), mm.group(3)),
                                mm.start(), mm.end()))
        anchors.sort()

        recs, used = [], set()

        # ── 第一遍：按码 ────────────────────────────────────────────────
        for idx, (i, code, s, e) in enumerate(anchors):
            full = (men + "-" + code).upper()
            if full not in expect or full in have or full in used:
                continue
            used.add(full)
            head = lines[i]["text"][:s]
            nm = NAME_TAIL.search(head)
            if not nm and i > 0:
                nm = NAME_TAIL.search(lines[i - 1]["text"])
            # 候名以结构.json 为准（OCR 常把序号括号认成「十--）」并粘进名字里）；
            # 认出来的写法若不同，留在 ocrName 里备查，不用它去掐正文。
            zh_ocr = (nm.group(1) if nm else "").replace("侯", "候")
            zh = expect[full]["zh"].replace("侯", "候")
            end_i = anchors[idx + 1][0] if idx + 1 < len(anchors) else body_end(lines, i)
            blob = trim_to_name(lines[i]["text"][e:] + "\n"
                                + "\n".join(lines[j]["text"] for j in range(i + 1, end_i + 1)), zh)
            recs.append({"code": code, "zh": zh, "zheng": expect[full]["zheng"],
                         "page": lines[i]["page"], "pdf_page": lines[i]["pdf"],
                         "fields": parse_fields(blob), "chars": len(re.sub(r"\s", "", blob)),
                         "raw": blob, "men": men, "recovered": True, "byCode": True,
                         **({"ocrName": zh_ocr} if zh_ocr and zh_ocr != zh else {})})

        # ── 第二遍：按候名 + (Z,H) 定位（码被认坏 / 行内无码） ──────────────
        # 候名在同一门里**不唯一**（胆胃风火证、胆胃寒火证都有「木火郁炽候」），
        # 所以只靠名字会张冠李戴。定位靠 (Z,H)：书里 H 号在证内唯一，Z 号是证码。
        # 顺序：先要求 Z+H 同时对上，再退一步只要求 H 对上；都对不上就不补。
        got = {(men + "-" + r["code"]).upper() for r in recs}
        added2 = 0
        for full, meta in expect.items():
            if full in have or full in got:
                continue
            nm = meta["zh"].replace("侯", "候")
            if len(nm) < 3:
                continue
            want = "-".join(full.split("-")[2:]).upper()   # Z15-H281（去掉门码 M06 和类码 L19）
            want_h = full.rsplit("-", 1)[1].upper()        # H281
            cand = [i for i, l in enumerate(lines)
                    if nm in l["text"] and (CODE_RE.search(l["text"])
                                            or re.search(SERIAL_NAME + re.escape(nm), l["text"]))]
            if not cand:
                continue
            pick = None
            for i in cand:
                m2 = CODE_RE.search(lines[i]["text"])
                if not m2:
                    continue
                zz_h = ("Z%s-%s" % (m2.group(2), "H" + m2.group(3))).upper()
                if zz_h == want:
                    pick = i
                    break
                if ("H" + m2.group(3)).upper() == want_h and pick is None:
                    pick = i
            if pick is None:
                continue
            i = pick
            end_i = body_end(lines, i)
            blob = trim_to_name("\n".join(lines[j]["text"] for j in range(i, end_i + 1)), nm)
            chars = len(re.sub(r"\s", "", blob))
            if not (150 <= chars <= 6000):
                continue
            fields = parse_fields(blob)
            # 有的候正文没有【病因病机】这类字段名，直接是「某证·某候，为……」的叙述体。
            # 所以两种都收：有字段名的收字段；没字段名的，只要开头 300 字里有「候，」起句即可。
            if not fields and not re.search(r"[之]?候\s*[，,]", blob[:300]):
                continue
            m2 = CODE_RE.search(lines[i]["text"])
            rec = {"code": full.split("-", 1)[1], "zh": nm, "zheng": expect[full]["zheng"],
                   "page": lines[i]["page"], "pdf_page": lines[i]["pdf"],
                   "fields": fields, "chars": chars, "raw": blob,
                   "men": men, "recovered": True, "byName": True}
            if m2:
                printed = "L%s-Z%s-H%s" % (m2.group(1), m2.group(2), m2.group(3))
                if printed.upper() != full.split("-", 1)[1].upper():
                    rec["codeConflict"] = {"printed": printed, "catalog": full.split("-", 1)[1]}
            recs.append(rec)
            got.add(full)
            added2 += 1

        out = os.path.join(DATA, "recovered-%s.json" % men)
        json.dump(recs, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        left = [c for c in expect if c not in have and c not in got]
        print("%s %s：缺 %d → 按码 %d · 按名 %d → 合计 %d · 仍缺 %d"
              % (men, name, len(missing), len(recs) - added2, added2, len(recs), len(left)))
        if left:
            print("    仍缺：", left[:8])


if __name__ == "__main__":
    main()
