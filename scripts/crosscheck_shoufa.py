#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/crosscheck_shoufa.py —— 《推拿手法学》↔《推拿学》同手法交叉校验

为什么要做：两门课共用一套手法名（一指禅推法、滚法、揉法…），但分工不同——
  手法学讲「怎么做」（着力面、节律、频率、功力）；
  推拿学讲「何时用」（适应证、部位、组合）。
同一手法在两本书里若给出不同的频率/时间/深度，那不是抄写错误，而是**教材本身的分歧**，必须单独记一笔。

方法要点（踩过一次坑，写在这里）：
  **不能按「单元」归数**。一个单元常同时讲几种手法（如推拿学 6.4.2「捏拿捻法与踩跷法」），
  单元级取数会把捻法的 120–200 次/分算到拿法头上，制造假分歧。
  正确做法：在正文里按手法名**切段**，每个数只归它所在那一段的手法。

判定（只比可对项，不比形容词）：一致 / 部分一致 / 数值不一致 / 仅一方给数 / 双方均未给数。

产出：standards/shoufa/交叉校验.json
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SF = os.path.join(ROOT, "standards", "shoufa", "units.json")
TN = os.path.join(ROOT, "standards", "tuina", "units.json")

METHODS = ["一指禅推法", "滚法", "揉法", "摩法", "擦法", "推法", "搓法", "抹法", "抖法", "振法",
           "按法", "点法", "拿法", "捏法", "捻法", "踩跷法", "拍法", "击法", "弹法",
           "摇法", "扳法", "拔伸法"]

NAME_PAT = re.compile("|".join(sorted(METHODS, key=len, reverse=True)))
FREQ = re.compile(r"(\d{2,3})\s*[～~\-—至]\s*(\d{2,3})\s*次\s*[/／]\s*分|每分钟\s*(\d{2,3})\s*[～~\-—至]\s*(\d{2,3})\s*次|每分钟\s*(\d{2,3})\s*次")
MINUTES = re.compile(r"(\d{1,2})\s*[～~\-—至]\s*(\d{1,2})\s*分钟|每次\s*(\d{1,2})\s*分钟")
DEPTH = re.compile(r"(\d(?:\.\d)?)\s*[～~\-—至]\s*(\d(?:\.\d)?)\s*寸")


def load(path):
    return json.load(open(path, encoding="utf-8"))["units"]


def segments(units):
    """把每个单元正文按手法名切段，返回 {手法名: [该手法自己的文字...]}"""
    out = {}
    for u in units:
        text = u.get("prose") or ""
        hits = list(NAME_PAT.finditer(text))
        for i, m in enumerate(hits):
            name = m.group(0)
            # 「一指禅推法」若因换行被切断，会剩一个「推法」被当成独立手法，串走它的频率
            if name == "推法" and text[max(0, m.start() - 4):m.start()].find("一指禅") >= 0:
                continue
            end = hits[i + 1].start() if i + 1 < len(hits) else len(text)
            out.setdefault(name, []).append((u["sub"], text[m.start():end]))
    return out


def nums(texts, pat):
    res = []
    for _sub, t in texts:
        for m in pat.finditer(t):
            g = [x for x in m.groups() if x]
            s = f"{g[0]}–{g[1]}" if len(g) >= 2 else g[0]
            if s not in res:
                res.append(s)
    return res


def units_of(units, name):
    return [u["sub"] for u in units if name in (u.get("title") or "") + (u.get("brief") or "")]


def main():
    sf_units, tn_units = load(SF), load(TN)
    sf_seg, tn_seg = segments(sf_units), segments(tn_units)

    rows = []
    for name in METHODS:
        a, b = sf_seg.get(name, []), tn_seg.get(name, [])
        fa, fb = nums(a, FREQ), nums(b, FREQ)
        ma, mb = nums(a, MINUTES), nums(b, MINUTES)
        da, db = nums(a, DEPTH), nums(b, DEPTH)
        seta, setb = set(fa), set(fb)

        if not a and not b:
            verdict = "两库均无"
        elif not b:
            verdict = "仅手法学有"
        elif not a:
            verdict = "仅推拿学有"
        elif seta and setb:
            if seta == setb:
                verdict = "一致"
            elif seta & setb:
                verdict = "部分一致"
            else:
                verdict = "数值不一致"
        elif seta or setb:
            verdict = "仅一方给数"
        else:
            verdict = "双方均未给数"

        rows.append({
            "手法": name,
            "手法学": {"单元": units_of(sf_units, name), "汉字": sum(u["hanzi"] for u in sf_units if u["sub"] in units_of(sf_units, name)),
                     "频率": fa, "时间": ma, "深度": da},
            "推拿学": {"单元": units_of(tn_units, name), "汉字": sum(u["hanzi"] for u in tn_units if u["sub"] in units_of(tn_units, name)),
                     "频率": fb, "时间": mb, "深度": db},
            "判定": verdict, "一致项": sorted(seta & setb), "差异项": sorted(seta ^ setb),
            "详略比": round(sum(u["hanzi"] for u in sf_units if u["sub"] in units_of(sf_units, name)) /
                        max(1, sum(u["hanzi"] for u in tn_units if u["sub"] in units_of(tn_units, name))), 2),
        })

    summary = {}
    for r in rows:
        summary[r["判定"]] = summary.get(r["判定"], 0) + 1
    # 证据：判定为「数值不一致」的，把各自那句原文摘出来，读者自行定夺
    for r in rows:
        if r["判定"] in ("数值不一致", "部分一致"):
            ev = {}
            for side, seg in (("手法学", sf_seg), ("推拿学", tn_seg)):
                for _sub, t in seg.get(r["手法"], []):
                    m = FREQ.search(t)
                    if m:
                        ev[side] = t[max(0, m.start() - 45):m.end() + 25].replace("\n", "")
                        break
            r["证据"] = ev

    detail = {
        "手法数": len(rows), "判定分布": summary,
        "手法学总汉字": sum(r["手法学"]["汉字"] for r in rows),
        "推拿学总汉字": sum(r["推拿学"]["汉字"] for r in rows),
        "数值不一致": [{"手法": r["手法"], "手法学": r["手法学"]["频率"], "推拿学": r["推拿学"]["频率"]}
                   for r in rows if r["判定"] == "数值不一致"],
        "部分一致": [{"手法": r["手法"], "共有的数": r["一致项"], "各自独有": r["差异项"]}
                 for r in rows if r["判定"] == "部分一致"],
    }
    json.dump({"口径": "按手法名切段取数，不按单元取数（单元常同时讲几种手法，会串数）",
               "可对项": "频率=次/分；时间=分钟；深度=寸；形容词不参与判定",
               "counts": detail, "rows": rows},
              open(os.path.join(ROOT, "standards", "shoufa", "交叉校验.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    print(json.dumps(detail, ensure_ascii=False, indent=1))
    print(f"\n{'手法':<8}{'手法学字':>8}{'推拿学字':>8}{'比':>6}  判定")
    for r in rows:
        print(f"{r['手法']:<8}{r['手法学']['汉字']:>8}{r['推拿学']['汉字']:>8}{r['详略比']:>6}  {r['判定']}")


if __name__ == "__main__":
    main()
