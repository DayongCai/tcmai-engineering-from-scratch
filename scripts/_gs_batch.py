# -*- coding: utf-8 -*-
"""骨伤系三本教材课：03 骨伤科学基础 / 06 中医正骨学 / 09 骨科影像诊断学。

一步做：chapter-map + axes + doc-config → 调 scaffold/docs → chapters.json + README + 缺口 + CHANGELOG。
"""
import io
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")
PY = sys.executable

COURSES = [
 {
  "sub": "gushang-jichu", "dept": "departments/04-gushang/03-gushang-kexue-jichu",
  "title": "中医骨伤科学基础", "course": "中医骨伤科学基础",
  "thesis": "骨伤科的第一条纪律是「先诊断、再动手」：分类、诊查、治疗三步不能跳",
  "plan": [
   (1, "01-jianshi-bingyin", "发展简史与病因病机", [(1, ""), (2, "")], "先知道这门学科从哪来，再说病怎么来的"),
   (2, "02-linchuang-zhencha", "骨伤病的临床诊查", [(3, "")], "望、摸、量、动：手比片子更早给出线索"),
   (3, "03-zhiliao-fangfa", "骨伤病的治疗方法", [(4, "")], "手法、固定、用药、练功四条腿"),
   (4, "04-chuangshang-jijiu", "创伤急救", [(5, "")], "先保命再保肢：止血、包扎、固定、搬运"),
   (5, "05-guzhe-yi", "骨折（一）：总论与上肢", [(6, "a")], "骨折的共性判断：移位、成角、愈合分期"),
   (6, "06-guzhe-er", "骨折（二）：下肢与躯干", [(6, "b")], "负重骨与脊柱：固定强度与并发症"),
   (7, "07-tuowei", "脱位", [(7, "")], "复位窗口期与血管神经检查"),
   (8, "08-jinshang", "筋伤", [(8, "")], "筋伤是门诊量最大的一块，也最容易被轻描"),
   (9, "09-neishang-gubing", "内伤与骨病", [(9, ""), (10, "")], "内伤看脏腑，骨病看骨本身"),
   (10, "10-kangfu-shuzihua", "骨伤康复与数字化", [(11, "")], "收口：功能锻炼与影像随访"),
  ],
  "planes": {"骨折": [5, 6], "脱位与筋伤": [7, 8], "内伤骨病与康复": [9, 10], "基础诊查治疗急救": [1, 2, 3, 4]},
 },
 {
  "sub": "zhenggu", "dept": "departments/04-gushang/06-zhongyi-zhenggu-xue",
  "title": "中医正骨学", "course": "中医正骨学",
  "thesis": "正骨的核心是「手摸心会」：复位、固定、练功三件事的顺序不能倒",
  "plan": [
   (1, "01-xulun-lilun", "绪论与理论基础", [(1, ""), (2, "")], "先讲清正骨与骨伤科学的分工"),
   (2, "02-shoufa-gailun", "正骨手法概论", [(3, "")], "手法的力学与安全边界"),
   (3, "03-zhenggu-bafa", "正骨八法与常用手法", [(4, "")], "拔伸、旋转、折顶、端提……每一法的适应证"),
   (4, "04-guzhe-zonglun", "骨折总论", [(5, "")], "复位标准、固定方式、愈合判断"),
   (5, "05-shangzhi-guzhe", "上肢骨折", [(6, "")], "锁骨、肱骨、尺桡骨、腕部：门诊最常见"),
   (6, "06-xiazhi-guzhe", "下肢骨折", [(7, "")], "股骨、胫腓骨、踝：负重与力线"),
   (7, "07-qugan-guzhe", "躯干与骨盆骨折", [(8, "")], "脊柱与骨盆：搬运与固定优先于复位"),
   (8, "08-guanjie-tuowei", "关节脱位", [(9, "")], "复位时机与神经血管评估"),
   (9, "09-jinshang-zonglun", "筋伤总论", [(10, "")], "筋伤的病理分期决定手法选择"),
   (10, "10-jingjian-yaotui", "颈肩腰腿筋伤", [(11, "")], "正骨在脊柱相关病里的位置"),
   (11, "11-sizhi-xiaoer", "四肢关节筋伤与小儿骨伤", [(12, ""), (14, "")], "小儿骨伤的生理特点与禁忌"),
   (12, "12-gubing-kangfu", "骨病与康复", [(13, ""), (15, "")], "骨病不是正骨的强项，康复是收口"),
  ],
  "planes": {"手法与固定": [1, 2, 3, 4], "上肢与下肢": [5, 6], "躯干脊柱": [7, 8], "筋伤与骨病康复": [9, 10, 11, 12, 13, 14, 15]},
 },
 {
  "sub": "gushang-yingxiang", "dept": "departments/04-gushang/09-guke-yingxiang-zhenduan",
  "title": "骨科影像诊断学", "course": "骨科影像诊断学",
  "thesis": "影像课的判据是「看得见、说得清、能鉴别」：技术选择、征象识别、鉴别诊断三步",
  "plan": [
   (1, "01-xulun-jishu", "绪论与影像技术选择", [(1, ""), (2, "")], "先选对检查，再谈读片"),
   (2, "02-zhengchang-jiepou", "骨与关节正常影像解剖", [(3, "")], "正常是异常的唯一参照"),
   (3, "03-jiben-bingbian", "基本病变的影像表现", [(4, "")], "密度、边缘、骨膜、软组织四种语言"),
   (4, "04-guzhe-tuowei", "骨折与脱位的影像诊断", [(5, "")], "移位与成角的量化描述"),
   (5, "05-guanjie-chuangshang", "关节创伤与软骨损伤", [(6, "")], "X线看不见的，靠 MRI"),
   (6, "06-jizhu-sunshang", "脊柱与脊髓损伤", [(7, "")], "稳定性判断比骨折线更重要"),
   (7, "07-jizhu-tuibian", "脊柱退变与相关疾病", [(8, "")], "退变的影像与症状常常不对应"),
   (8, "08-ganran-yanxing", "感染与炎性疾病", [(9, "")], "骨髓炎与关节炎的早期征象"),
   (9, "09-guhuaisi-daixie", "骨坏死与代谢性骨病", [(10, "")], "分期决定保头还是置换"),
   (10, "10-zhongliu-ertong-jieru", "肿瘤、儿童与介入", [(11, ""), (12, ""), (13, "")], "收口：良恶性判断、儿童特点、影像引导"),
  ],
  "planes": {"技术选择与正常解剖": [1, 2], "基本病变与创伤": [3, 4, 5], "脊柱与炎症退变": [6, 7, 8, 9], "肿瘤儿童与介入": [10]},
 },
]


def load(sub, name="units.json"):
    return json.load(io.open(os.path.join(S, sub, name), encoding="utf-8"))


def units_for(U, spec):
    no, half = spec
    us = [u for u in U["units"] if u["chapter"] == str(no)]
    if half == "a":
        return us[: len(us) // 2]
    if half == "b":
        return us[len(us) // 2:]
    return us


def build(cfg):
    U = load(cfg["sub"])
    base = os.path.join(S, cfg["sub"])
    cm = {}
    for n, slug, title, specs, why in cfg["plan"]:
        assert slug == slug.lower(), slug
        picked = []
        for sp in specs:
            picked += units_for(U, sp)
        cm[slug] = {"n": n, "title": title, "units": [u["sub"] for u in picked],
                    "srcChapters": [f"{sp[0]}{sp[1]}" for sp in specs], "why": why,
                    "derivedFrom": "、".join(f"教材第{sp[0]}章{('（前/后半）' if sp[1] else '')}" for sp in specs)}
    json.dump({"note": f"{cfg['title']}：{len(cm)} 章 ← 教材 {U['counts']['chapters']} 章；无单元复用。",
               "chapters": cm},
              io.open(os.path.join(base, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    # 四位面：章群结构分区
    planes = cfg["planes"]
    U["levels"] = {k: [k] for k in planes}
    probe = {"view": U["probe"]["view"], "A_part": {k: 0 for k in planes}}
    for u in U["units"]:
        u["measure"]["levels"] = {q: 0 for q in planes}
        for p, chs in planes.items():
            if int(u["chapter"]) in chs:
                u["measure"]["levels"][p] = u["hanzi"]
                probe["A_part"][p] += u["hanzi"]
    ratio = {"view": U["ratio"]["view"],
             "A_part": round(max(probe["A_part"].values()) / max(1, min(probe["A_part"].values())), 1)}
    U["probe"], U["ratio"] = probe, ratio
    json.dump(U, io.open(os.path.join(base, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"note": "三辨按词表现算；四位面＝章群结构分区（不用词频）。",
               "views": U["views"], "levelsA": planes, "probe": probe, "ratio": ratio},
              io.open(os.path.join(base, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    fb = {slug: [f"《{cfg['course']}·{v['title']}》", "教材篇名级；课程章号对应教材第 " + "、".join(v["srcChapters"]) + " 章"]
          for slug, v in cm.items()}
    cq = {slug: [f"{v['title']}这一章，学完能不能独立完成一次{cfg['course']}的判定", v["why"]] for slug, v in cm.items()}
    json.dump({"courseTitle": cfg["course"], "deptPath": cfg["dept"],
               "xlsx": f"F:/textbooks/{U['source']['file']}",
               "chain": " → ".join(t for n, s, t, sp, w in cfg["plan"]),
               "levelLabel": "章群结构", "objectPressure": cfg["thesis"],
               "reportRule": "记录写：部位、影像/体征、分类分型、处理、随访",
               "gapNote": "教材无插图与影像片；分型与数值以教材口径为准，未给数的标「教材未给」",
               "chapterQ": cq, "fallback": fb, "defaultCite": [f"《{cfg['course']}》", "教材篇名级"]},
              io.open(os.path.join(base, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{cfg['sub']}: plan {len(cm)} 章 / {sum(len(v['units']) for v in cm.values())} 单元 · ratio {ratio}")

    for cmd in ([PY, "scripts/scaffold_huli_chapter.py", cfg["sub"], cfg["dept"], "--all"],
                [PY, "scripts/build_huli_docs.py", cfg["sub"], cfg["dept"]]):
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
        print("  ", cmd[1], "→", (r.stdout or "").strip().splitlines()[-1:] or r.stderr.strip()[-200:])


if __name__ == "__main__":
    for cfg in COURSES:
        build(cfg)
