#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""从各讲语音识别正文里抽出「本条对应的记忆桩是 X」，得到视频原桩表。

视频口播形如：「本条对应的记忆桩是必闹，那它穴位图像取的是谐音，闭上一个闹钟必闹」。
ASR 会把穴名听错（必闹←臂臑、尖鱼←肩髃、玄机←璇玑），故：
  ① 先原样抽出 raw（不改），
  ② 再用 FIX 表把 raw 归到穴位正名，
  ③ 正名必须在经络腧穴学语料中出现，否则记 unresolved 交人工。
输出 standards/materials/shanghan-quannao/video-zhuang.json
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAT = os.path.join(ROOT, "standards", "materials", "shanghan-quannao")
ZJ = os.path.join(ROOT, "textbooks", "03-zhenjiu", "01-jingluo-xue")
XLSX = "F:/textbooks/qhzy-经络腧穴学.xlsx"
OUT = os.path.join(MAT, "video-zhuang.json")

DIG = {"零": 0, "一": 1, "二": 2, "两": 2, "三": 3, "四": 4, "五": 5, "六": 6,
       "七": 7, "八": 8, "九": 9}


def cn2int(s):
    if s.isdigit():
        return int(s)
    if "百" in s:
        a, _, b = s.partition("百")
        return (DIG.get(a, 1) if a else 1) * 100 + (cn2int(b) if b else 0)
    if "十" in s:
        a, _, b = s.partition("十")
        return (DIG.get(a, 1) if a else 1) * 10 + (DIG.get(b, 0) if b else 0)
    return DIG.get(s, 0)


# ASR 误听 → 穴位正名（人工裁定，逐条可回查 ASR 原文）
FIX = {
    "必闹": "臂臑", "闭闹": "臂臑", "尖鱼": "肩髃", "肩鱼": "肩髃", "玄机": "璇玑",
    "悬疏": "悬枢", "悬书": "悬枢",
    "淡中": "膻中", "天顶": "天鼎", "和辽": "禾髎", "聚疗": "巨髎", "大赢": "大迎",
    "人营": "人迎", "集中": "脊中", "四白": "四白", "地仓": "地仓", "中庭": "中庭",
    # 任脉 / 督脉 / 十二经的谐音误听（P04-P28 逐讲核对后增补）
    "上碗": "上脘", "中腕": "中脘", "剑里": "建里", "神雀": "神阙", "汽海": "气海",
    "官圆": "关元", "终极": "中极", "屈骨": "曲骨", "慧音": "会阴",
    "妖阳观": "腰阳关", "金梭": "筋缩", "质阳": "至阳", "灵台": "灵台", "深柱": "身柱",
    "丰符": "风府", "上兴": "上星", "京渠": "经渠", "河谷": "合谷", "杨西": "阳溪",
    "夏莲": "下廉", "手无礼": "手五里", "水秃": "水突", "气色": "气舍", "鹰窗": "膺窗",
    "子宫": "紫宫", "中书": "中枢", "天丽": "偏历", "上连": "上廉",
    "纠尾": "鸠尾", "拒缺": "巨阙", "信慧": "囟会", "浮凸": "扶突",
    # 2026-10-26 全量重转（vad=false）后重新切句，9 处口播桩名的听写变了，逐条按 ASR 原文归正
    "建理": "建里", "中级": "中极", "曲谷": "曲骨", "悬殊": "悬枢",
    "深处": "身柱", "丰府": "风府", "金曲": "经渠", "浮图": "扶突", "大营": "大迎",
    "偏利": "偏历", "俱疗": "巨髎",
}


def corpus():
    txt = []
    for fn in os.listdir(ZJ):
        if fn.endswith(".md"):
            txt.append(open(os.path.join(ZJ, fn), encoding="utf-8").read())
    try:
        import openpyxl
        wb = openpyxl.load_workbook(XLSX, read_only=True)
        for s in wb.sheetnames:
            if re.match(r"^(0[4-9]|1[0-6]) ", s):
                txt.append(" ".join(str(r[4]) for r in wb[s].iter_rows(values_only=True) if r[4]))
    except Exception:  # noqa: BLE001
        pass
    return "\n".join(txt)


def main():
    body = corpus()
    # 正名校验以「十四经 361 穴」为准（该表本身已逐名在歌诀中检出，见 build_xue_route.py）；
    # 歌诀用简称入韵（灵台→灵、悬钟→绝骨），单纯查教材语料会对正名产生假阴性
    xr = os.path.join(MAT, "xue-route.json")
    canon = set()
    if os.path.exists(xr):
        canon = {r["xue"] for r in json.load(open(xr, encoding="utf-8"))["rows"]}
    found, unresolved = {}, []
    canonical = canon
    files = sorted(f for f in os.listdir(os.path.join(MAT, "asr")) if f.startswith("p") and f.endswith(".json"))
    for f in files:
        d = json.load(open(os.path.join(MAT, "asr", f), encoding="utf-8"))
        # 先建「第N条」时间轴：每讲一条都会先念条号，桩名归属取「最近的前一次条号」。
        # 朴素累加器会被讲述中的串话带偏（P13 曾把第31条的桩记成第14条）
        marks = []
        for sg in d["segments"]:
            for mm in re.finditer(r"第([一二三四五六七八九十百零两\d]{1,4})条", sg["text"]):
                vv = cn2int(mm.group(1))
                if 1 <= vv <= 398:
                    marks.append((sg["start"], vv))
        marks.sort()

        def cur_of(sec):
            # 归属规则：默认取「最近的前一次第N条」；但如果紧接着的下一个条号在 45s 内、
            # 而前一个已过 45s，则判为「先说桩、后念条号」的情形，归给后一个
            # （P20 第76条：桩在 83s、条号在 101s，曾误记成第74条）
            prev = [m for m in marks if m[0] <= sec + 0.5]
            nxt = [m for m in marks if m[0] > sec + 0.5]
            if nxt and (nxt[0][0] - sec) <= 45 and (not prev or sec - prev[-1][0] > 45):
                return nxt[0][1]
            return prev[-1][1] if prev else (nxt[0][1] if nxt else None)

        cur = None
        for si, s in enumerate(d["segments"]):
            t = s["text"]
            cur = cur_of(s["start"])
            # ASR 把「记忆桩是」听成「记忆装饰」/「记忆桩是X」断句，三种写法都要认：
            #   ① 记忆桩是X   ② 记忆装饰X（桩→饰，无系词）   ③ 记忆桩是（X 落到下一段）
            m = re.search(r"(?:记忆桩|记忆装[饰]?)(?:是|叫|为|就是|：)\s*([\u4e00-\u9fff]{2,4})?", t) or \
                re.search(r"记忆装[饰]?([\u4e00-\u9fff]{2,4})?", t)
            if m and cur:
                raw = (m.group(1) or "").strip()
                if raw and any(w in raw for w in ("场景", "图像", "谐音", "穴位", "对应")):
                    continue
                if not raw:
                    # ASR 把「记忆桩是X」断在句尾，穴名落到下一段：在紧邻两段里找正名
                    for nxt in d["segments"][si + 1:si + 3]:
                        hit = [c for c in canonical if c in nxt["text"]]
                        if hit:
                            raw = sorted(hit, key=len, reverse=True)[0]
                            break
                if not raw:
                    # 下一段开头就是「谐音穴名」（淡中／和辽／偏利／俱疗），正名当然查不到，
                    # 但 raw 必须原样留下交给 FIX 表——否则这条口播桩会静默丢失（11-26 重转后丢了 5 条）
                    nxt = d["segments"][si + 1] if si + 1 < len(d["segments"]) else None
                    m2 = re.match(r"\s*([\u4e00-\u9fff]{2,4})", nxt["text"]) if nxt else None
                    if m2 and not any(w in m2.group(1) for w in ("我们", "那么", "这个", "那这",
                                                                 "图像", "谐音", "可以")):
                        raw = m2.group(1)
                if not raw:
                    continue
                canon = FIX.get(raw, raw)
                rec = {"no": cur, "p": d["no"], "sec": int(s["start"]), "raw": raw,
                       "xue": canon, "inCorpus": canon in body or canon in canonical}
                if canon not in canonical:
                    unresolved.append(rec)
                elif cur not in found:
                    found[cur] = {"no": cur, "p": d["no"], "sec": int(s["start"]), "raw": raw,
                                  "xue": canon, "inCorpus": True,
                                  "src": "口播", "basis": f"P{d['no']:02d} {int(s['start'])}s「{t[:24]}」"}

    # 人工归位：ASR 断句/系词脱落在正则覆盖之外，逐条读过原话后钉住（basis 即凭证）
    MANUAL = {
        10: ("鸠尾", 4, 427, "纠尾", "P04 427-429「那这条对应的记忆装饰／纠尾」"),
        11: ("巨阙", 5, 30, "拒缺", "P05 30「本条对应的记忆装饰、拒缺」"),
        18: ("阴交", 7, 121, "阴交", "P07 121-124「本条对应的记忆桩呢／是阴交」"),
        31: ("中枢", 13, 80, "中书", "P13 80「本条对应的记忆桩是中书」"),
        72: ("上廉", 19, 316, "上连", "P19 316-319「正好它们对应的记忆桩也差不多／上连」"),
        78: ("肩髃", 21, 80, "尖鱼", "P21 80-83「本条对应的记忆桩是／尖鱼」"),
    }
    for no, (xue, p, sec, raw, basis) in MANUAL.items():
        if no not in found:
            found[no] = {"no": no, "p": p, "sec": sec, "raw": raw, "xue": xue,
                         "inCorpus": xue in canonical, "src": "口播·人工归位", "basis": basis}

    # 口播没念名字、但画面字直标了的：属图形识别层，单独记来源（比「推定」硬）
    INFER = {
        15: ("下脘", 6, 130,
             "P06 口播只说「正好这个记忆桩的名字也有一个下」，未念全名；但同段画面左下角直标「下脘」"
             "（见「一穴一图」第15条左图），条文与配图一致，故按画面字采信"),
    }
    for no, (xue, p, sec, basis) in INFER.items():
        found[no] = {"no": no, "p": p, "sec": sec, "raw": "（口播未念名，画面字直标）", "xue": xue,
                     "inCorpus": xue in canonical, "src": "画面字确认", "basis": basis}
    done = set(MANUAL) | set(INFER)
    unresolved = [u for u in unresolved if u["no"] not in done]
    doc = {"$generated": "python scripts/build_video_zhuang.py",
           "note": "src=口播：正则从口播原话直接抽出；src=口播·人工归位：ASR 断句/系词脱落，"
                   "读过原话后钉住（basis 为凭证）；src=画面字确认：口播未念名，但视频画面字直标（图形识别层）",
           "counts": {"covered": len(found), "unresolved": len(unresolved)},
           "fixTable": FIX,
           "rows": [found[k] for k in sorted(found)],
           "unresolved": unresolved}
    json.dump(doc, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("覆盖条数", len(found), "· 待人工", len(unresolved))
    for k in sorted(found):
        r = found[k]
        print(f"  条{r['no']:3d} P{r['p']:02d} {r['sec']:4d}s  raw={r['raw']} → {r['xue']}")
    if unresolved:
        print("未解析：", [(r["no"], r["raw"]) for r in unresolved])


if __name__ == "__main__":
    main()
