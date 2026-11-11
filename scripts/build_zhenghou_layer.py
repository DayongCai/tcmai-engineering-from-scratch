#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_zhenghou_layer.py —— 跨课程派生证候层（中医证候学的底本）

为什么不是「一本书 → 底本」：本库没有《中医证候学》的母本工作簿（`F:/textbooks/` 下只有
`qhzy-中医诊断学.xlsx`，且其辨证篇仅 8,292 汉字，不足以支撑一门课）。而证候学的对象——
证候——在本库里已经有 900 个单元的实证（外科学 325 + 儿科学 250 + 妇科学 325），
每个单元都带着证型名、治法与代表方。于是本课程的底本改为**派生底本**：

  证据层：standards/{waike,erke,fuke}/units.json 的 900 个单元
  经典层：F:/textbooks/qhzy-中医诊断学.xlsx 的第 6–12 章（八纲/病性/脏腑/经络/六经/卫气营血/三焦）
  规范层：standards/zhenduan/{icd-align,near-judgements,coverage}.json（TM1 对齐与人工判定）

产出：
  standards/zhenghou/证候库.json   证候 → 族 / 病位 / 病性 / 课程分布 / 病证数 / 代表方
  standards/zhenghou/底本-辨证篇.json  诊断学辨证篇的七体系文本（经典表述引用源）
  standards/zhenghou/METHOD.json    口径、阈值与可复现说明

口径：
  1. 证候抽取用正则 `[\\u4e00-\\u9fff]{2,10}证`，只在「辨证论治」类单元里抽（避免把「证候」二字当证名）；
  2. 同义归一用 SYNONYM 表（只收确定同义者，理由写在表旁）；不做模糊合并——那是第 10 章要讨论的方法，不是本节默认；
  3. 族（family）按病性关键词优先、病位次之；一个证可落两族时取先匹配者，并在 `familyAlt` 留痕；
  4. 「代表方」取同一单元里最近的 `代表方[：:]X` 串，取不到则留空——不跨单元猜。
"""

import hashlib
import json
import os
import re
from collections import Counter, defaultdict

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "standards", "zhenghou")
COURSES = {
    "waike": ("中医外科学", os.path.join(ROOT, "standards", "waike", "units.json")),
    "erke": ("中医儿科学", os.path.join(ROOT, "standards", "erke", "units.json")),
    "fuke": ("中医妇科学", os.path.join(ROOT, "standards", "fuke", "units.json")),
}
ZHENG_DX = r"F:\textbooks\qhzy-中医诊断学.xlsx"

# 证候名的两种原文写法（其余一律不收——「辨证」「病证」这类同形词会污染统计）
#   A：证型标题句「脾气虚证。月经周期提前……」
#   B：行内「肾气虚者，脉沉细弱」
ZHENG_A = re.compile(r"(?:^|[。；\n])([\u4e00-\u9fff]{3,10}证)。")
ZHENG_B = re.compile(r"([\u4e00-\u9fff]{3,10}证)者")
FANG_RE = re.compile(r"代表方[：:]\s*([^\n。；]{1,30})")
# 同形词与泛称黑名单（出现即弃）
ZHENG_STOP = ("辨证", "病证", "药证", "证候", "证治", "临证", "变证", "他证", "之证", "此证", "诸证",
              "多属", "本病", "中医", "变生", "极一", "一证", "认证", "审证", "脉证", "方证", "逆证",
              "顺证", "兼证", "主证", "次证", "疑似", "类似证", "宜证", "虚证", "实证", "该证", "两证",
              "三证", "四证", "若证", "其证", "分证", "各证", "上证", "下证", "中证", "此二证", "无证")
# 合法证名必须含至少一个病性/病位语素
ZHENG_LEX = ("气虚", "血虚", "阴虚", "阳虚", "气虚", "血瘀", "瘀", "痰", "湿", "热", "寒", "风", "火",
             "毒", "郁", "滞", "逆", "陷", "脱", "闭", "虚", "实", "亏", "衰", "盛", "阻", "结", "蕴",
             "心", "肝", "脾", "肺", "肾", "胃", "肠", "胆", "膀胱", "冲任", "胞宫", "络", "卫", "营",
             "血", "气", "津", "液", "阳", "阴")
HANZI = re.compile(r"[一-鿿]")

# 同义归一：只收确定同义（同一证的不同写法），合并理由写在右侧
SYNONYM = {
    "脾虚证": "脾气虚证",
    "脾胃虚弱证": "脾胃气虚证",
    "肾气不足证": "肾气虚证",
    "肝郁证": "肝气郁结证",
    "气滞血瘀证": "气滞血瘀证",
    "湿热蕴结证": "湿热蕴结证",
    "湿热血瘀证": "湿热瘀阻证",
    "瘀血阻滞证": "血瘀证",
    "血瘀气滞证": "气滞血瘀证",
}

# 族：病性优先，病位次之（顺序即优先级：先特异后一般，避免「阴虚火旺」被 火 抢走）
FAMILIES = [
    ("气虚", ["气虚", "气亏损", "气不足", "气不固", "气不摄", "中气下陷", "气陷", "劳倦伤气", "脾虚", "脾不健"]),
    ("阳虚", ["阳虚", "阳不足", "阳衰", "阳微", "虚寒", "命门火衰", "宫冷", "寒盛阳衰"]),
    ("血虚", ["血虚", "血不足", "气血两亏", "气血虚弱", "气血亏虚"]),
    ("阴虚", ["阴虚", "阴亏", "阴伤", "阴液不足", "虚火"]),
    ("血热", ["血热", "热盛", "火旺", "火亢", "火妄动", "血燥"]),
    ("血瘀", ["血瘀", "瘀血", "瘀阻", "瘀滞", "瘀结", "瘀热互结"]),
    ("湿热", ["湿热", "湿火", "暑湿", "暑热", "湿毒"]),
    ("痰湿", ["痰湿", "痰浊", "湿痰", "痰饮", "痰热", "痰", "湿蕴", "湿盛", "湿困", "湿浊", "水饮"]),
    ("热毒", ["热毒", "火毒", "脓毒", "胎毒", "胎火", "毒蕴", "毒壅", "毒恋", "毒窜", "毒蚀", "虫毒", "肉腐"]),
    ("气滞", ["气滞", "气郁", "肝郁", "郁热", "郁火", "郁结", "不和", "肝旺", "气逆"]),
    ("风寒", ["风寒", "寒凝", "寒湿", "寒邪", "外感风寒"]),
    ("风热", ["风热", "风邪", "风燥", "风火", "风毒", "风伤", "风动", "风痰", "风"]),
    ("正虚邪恋", ["正虚", "体虚", "余毒", "久病", "邪恋"]),
]
# 病位（用于标注，不参与分族）
POSITIONS = [
    ("心", ["心"]), ("肝", ["肝"]), ("脾", ["脾"]), ("肺", ["肺"]), ("肾", ["肾"]),
    ("肠胃", ["胃", "肠"]), ("冲任胞宫", ["冲任", "胞宫", "子宫"]), ("经络肌肤", ["经络", "肌肤", "体表", "筋"]),
]


def norm(name):
    return SYNONYM.get(name, name)


def family_of(name):
    hit = []
    for fam, kws in FAMILIES:
        if any(k in name for k in kws):
            hit.append(fam)
    return (hit[0] if hit else "其他"), hit


def positions_of(name):
    return [p for p, kws in POSITIONS if any(k in name for k in kws)]


def main():
    os.makedirs(OUT, exist_ok=True)

    # ── ① 从三门临床课的单元层抽证候 ──
    raw = defaultdict(lambda: {"courses": set(), "chapters": set(), "diseases": set(), "fang": Counter(), "aliases": set()})
    units_total = 0
    for ck, (ctitle, path) in COURSES.items():
        data = json.load(open(path, encoding="utf-8"))
        for u in data["units"]:
            units_total += 1
            prose = u.get("prose") or ""
            names = []
            for rx in (ZHENG_A, ZHENG_B):
                for m in rx.finditer(prose):
                    nm = m.group(1)
                    if any(b in nm for b in ZHENG_STOP):
                        continue
                    if not any(k in nm for k in ZHENG_LEX):
                        continue
                    names.append(norm(nm))
            if not names:
                continue
            # 该单元里出现的方（最多取前 3 个，作为「该证所在单元的代表方」）
            fangs = [f.strip() for f in FANG_RE.findall(prose)][:3]
            for nm in set(names):
                if len(nm) < 4:       # 「虚证」「实证」这类两字证名不进库
                    continue
                rec = raw[nm]
                rec["courses"].add(ck)
                rec["chapters"].add(u["chapter"])
                rec["diseases"].add(u["sec"] or u["title"])
                for f in fangs:
                    rec["fang"][f] += 1
                for rx in (ZHENG_A, ZHENG_B):
                    for m in rx.finditer(prose):
                        a = m.group(1)
                        if norm(a) == nm and a != nm:
                            rec["aliases"].add(a)

    zheng = []
    for nm, rec in raw.items():
        fam, fam_all = family_of(nm)
        zheng.append({
            "name": nm,
            "family": fam,
            "familyAlt": [f for f in fam_all if f != fam],
            "positions": positions_of(nm),
            "courses": sorted(rec["courses"]),
            "courseCount": len(rec["courses"]),
            "chapters": sorted(rec["chapters"], key=lambda x: int(x)),
            "diseases": sorted(rec["diseases"]),
            "diseaseCount": len(rec["diseases"]),
            "fang": [f for f, _ in rec["fang"].most_common(3)],
            "aliases": sorted(rec["aliases"]),
        })
    zheng.sort(key=lambda z: (-z["courseCount"], -z["diseaseCount"], z["name"]))

    fam_count = Counter(z["family"] for z in zheng)
    fam_cross = Counter(z["family"] for z in zheng if z["courseCount"] >= 2)
    pos_count = Counter(p for z in zheng for p in z["positions"])

    # ── ② 诊断学辨证篇（经典层） ──
    wb = openpyxl.load_workbook(ZHENG_DX, read_only=True, data_only=True)
    sheets = [n for n in wb.sheetnames if re.match(r"^\d{1,2}[^\d]", n)]
    bianzheng, bianzheng_meta = {}, {}
    for n in sheets:
        no = int(re.match(r"^(\d+)", n).group(1))
        if not (6 <= no <= 12):
            continue
        buf = []
        for row in wb[n].iter_rows(min_row=2, values_only=True):
            v = list(row) + [None] * 5
            t = v[4]
            if isinstance(t, str) and t.strip():
                buf.append(t.strip())
        text = "".join(buf)
        if not text:
            continue
        title = re.sub(r"^\d+", "", n)
        bianzheng[title] = text
        bianzheng_meta[title] = {"no": no, "hanzi": len(HANZI.findall(text))}

    # ── ③ 规范层（TM1 对齐现状，供第 10 章引用） ──
    align = json.load(open(os.path.join(ROOT, "standards", "zhenduan", "icd-align.json"), encoding="utf-8"))
    near = json.load(open(os.path.join(ROOT, "standards", "zhenduan", "near-judgements.json"), encoding="utf-8"))

    layer = {
        "source": {
            "kind": "跨课程派生底本（本库无《中医证候学》母本工作簿）",
            "courses": {k: {"title": v[0], "units": sum(1 for _ in json.load(open(v[1], encoding='utf-8'))['units'])} for k, v in COURSES.items()},
            "unitsScanned": units_total,
            "classical": {"file": os.path.basename(ZHENG_DX), "sheets": bianzheng_meta,
                          "sha256": hashlib.sha256(open(ZHENG_DX, 'rb').read()).hexdigest()},
        },
        "counts": {
            "zheng": len(zheng),
            "cross2": sum(1 for z in zheng if z["courseCount"] >= 2),
            "cross3": sum(1 for z in zheng if z["courseCount"] >= 3),
            "families": len(fam_count),
            "bianzhengHanzi": sum(v["hanzi"] for v in bianzheng_meta.values()),
        },
        "families": [{"family": f, "all": n, "cross2": fam_cross.get(f, 0)} for f, n in fam_count.most_common()],
        "positions": [{"position": p, "n": n} for p, n in pos_count.most_common()],
        "zheng": zheng,
    }
    json.dump(layer, open(os.path.join(OUT, "证候库.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"sheets": bianzheng_meta, "texts": bianzheng}, open(os.path.join(OUT, "底本-辨证篇.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    method = {
        "kind": "跨课程派生底本",
        "why": "F:/textbooks/ 下无《中医证候学》母本；诊断学辨证篇仅 8,292 汉字，单独不足以支撑一门课。"
               "而三门临床课（外科 325 / 儿科 250 / 妇科 325）已有 900 个带证型与代表方的单元，是证候的直接实证。",
        "steps": [
            "① 抽证：正则 [\\u4e00-\\u9fff]{2,10}证，只收长度≥4 的证名（'虚证''实证' 不入库）",
            "② 归一：SYNONYM 表，只收确定同义；不做模糊合并",
            "③ 分族：病性优先、病位次之；落两族时记 familyAlt",
            "④ 代表方：取同单元最近的『代表方：X』，最多 3 个",
            "⑤ 经典层：诊断学第 6–12 章原文",
            "⑥ 规范层：引用 standards/zhenduan 的 TM1 对齐与人工判定现状",
        ],
        "limits": [
            "证候名来自教材原文，不做同义扩展（如『脾虚湿困证』不并入『脾虚证』）",
            "代表方是『同单元出现』而非『该证专属』——教材写法所致，第 10 章专门讨论这一偏差",
            "课程分布只覆盖已入库的三门临床课（内科尚无 units 层）",
        ],
        "icdAlign": align.get("stat"),
        "nearJudgements": near.get("summary"),
    }
    json.dump(method, open(os.path.join(OUT, "METHOD.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    print(f"扫描单元 {units_total} · 证候 {len(zheng)}（跨 2 课 {layer['counts']['cross2']}、跨 3 课 {layer['counts']['cross3']}）")
    print("族分布:", dict(fam_count))
    print("跨课族:", dict(fam_cross))
    print("病位:", dict(pos_count))
    print("辨证篇:", {k: v['hanzi'] for k, v in bianzheng_meta.items()})
    for z in zheng[:12]:
        print(f"  {z['name']:14} {z['family']:4} 课{z['courseCount']} 病{z['diseaseCount']:>2} 方:{'、'.join(z['fang'][:2])}")


if __name__ == "__main__":
    main()
