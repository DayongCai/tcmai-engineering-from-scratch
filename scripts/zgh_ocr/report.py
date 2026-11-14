# -*- coding: utf-8 -*-
"""scripts/zgh_ocr/report.py —— 十二门正文层覆盖率与校勘一览（给报告用，不写文件）

读 standards/zhenghou-cidian/正文-M*.json 与 结构.json，按门输出：
  应有 / 命中 / 缺 / 未匹配 / 重码 / 码纠正 / 名不符 / 码冲突 / 找回 / 印张区间 / 字数
"""
import glob
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STD = os.path.join(ROOT, "standards", "zhenghou-cidian")
NAME = {"M01": "风", "M02": "寒", "M03": "暑", "M04": "湿", "M05": "燥", "M06": "火",
        "M07": "气", "M08": "瘀", "M09": "痰", "M10": "饮", "M11": "食", "M12": "虚"}


def main():
    st = json.load(open(os.path.join(STD, "结构.json"), encoding="utf-8"))
    exp = {m["code"]: m["counts"]["hou"] if "counts" in m else None for m in st["men"]}
    rows, tot = [], [0, 0, 0, 0, 0, 0, 0, 0, 0]
    files = {os.path.basename(p)[3:6]: p for p in glob.glob(os.path.join(STD, "正文-M*.json"))}
    for m in st["men"]:
        code = m["code"]
        want = sum(len(z["houList"]) for l in m["lei"] for z in l["zhengList"])
        if code not in files:
            rows.append((code, NAME.get(code, ""), want, 0, want, 0, 0, 0, 0, 0, 0, "—", 0.0))
            tot[0] += want
            continue
        d = json.load(open(files[code], encoding="utf-8"))
        c = d["counts"]
        got = len(d["items"])
        conflict = sum(1 for v in d["items"].values() if v.get("codeConflict"))
        rec = sum(1 for v in d["items"].values() if v.get("recovered"))
        rows.append((code, NAME.get(code, ""), want, got, c["missing"], c["unmatched"], c["duplicates"],
                     c["codeFixes"], c["nameMismatch"], conflict, rec,
                     "%s–%s" % (c["pageFrom"], c["pageTo"]), c["chars"] / 10000))
        tot[0] += want
        tot[1] += got
        tot[2] += c["missing"]
        tot[3] += c["unmatched"]
        tot[4] += c["duplicates"]
        tot[5] += c["codeFixes"]
        tot[6] += c["nameMismatch"]
        tot[7] += conflict
        tot[8] += c["chars"]

    print("| 门 | 应有 | 命中 | 缺 | 未匹配 | 重码 | 码纠正 | 名不符 | 码冲突 | 找回 | 印张 | 字数 |")
    print("|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|--:|")
    for r in rows:
        print("| %s %s | %d | %d | %d | %d | %d | %d | %d | %d | %d | %s | %.1f 万 |"
              % (r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10], r[11], r[12]))
    print("| **合计** | **%d** | **%d（%.1f%%）** | %d | %d | %d | %d | %d | %d | — | — | **%.1f 万** |"
          % (tot[0], tot[1], 100.0 * tot[1] / max(1, tot[0]), tot[2], tot[3], tot[4], tot[5], tot[6], tot[7],
             tot[8] / 10000.0))


if __name__ == "__main__":
    main()
