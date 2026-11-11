#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/crosscheck_huli5.py —— 护理系八门课的词面分工（签名矩阵）

为什么做这一层：
  护理系同一批对象（病人/家庭/社区）被八门课分别讲一遍，最容易出现「每门课都差不多」。
  这一层不比较对错，只比较**词面重心**：每门课在六个词类上的每万字密度，谁高谁低，
  能看出这门课在系里承担的到底是哪一块。

六个词类（同一组词量所有课）：
  辨证       —— 辨证 / 证候 / 舌脉 / 寒热虚实
  技术操作   —— 注射 / 导尿 / 吸痰 / 无菌 / 换药 / 灸罐
  安全风险   —— 并发症 / 不良事件 / 核对 / 感染 / 跌倒
  家属沟通   —— 家长 / 家属 / 照护者 / 宣教 / 依从
  功能康复   —— 功能 / 评定 / 训练 / ADL / 吞咽 / 转移
  时间急救   —— 急救 / 抢救 / 分诊 / 黄金 / 分钟 / 立即
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "standards", "huli-xitong-签名.json")

COURSES = [
    ("huli-daolun", "护理学导论"),
    ("jichu-huli", "基础护理学"),
    ("neike-huli", "内科护理学"),
    ("zhongyi-huli", "中医护理学"),
    ("waike-huli", "外科护理学"),
    ("erke-huli", "儿科护理学"),
    ("jijiu-huli", "急救护理学"),
    ("kangfu-huli", "康复护理学"),
    ("fuchanke-huli", "妇产科护理学"),
    ("laonian-huli", "老年护理学"),
    ("zhongyi-linchuang", "中医临床护理学"),
]

GROUPS = {
    "辨证": ["辨证", "证候", "证型", "舌", "脉", "寒热", "虚实"],
    "技术操作": ["注射", "穿刺", "导尿", "吸痰", "无菌", "换药", "灸", "罐", "刮痧"],
    "安全风险": ["并发症", "不良事件", "核对", "查对", "感染", "跌倒", "坠床", "风险"],
    "家属沟通": ["家长", "家属", "照护者", "宣教", "沟通", "依从"],
    "功能康复": ["功能", "评定", "训练", "ADL", "日常生活", "吞咽", "转移", "康复"],
    "时间急救": ["急救", "抢救", "分诊", "黄金", "立即", "争分夺秒", "复苏"],
}


def main():
    rows = {}
    for sub, title in COURSES:
        p = os.path.join(ROOT, "standards", sub, "units.json")
        if not os.path.exists(p):
            continue
        d = json.load(open(p, encoding="utf-8"))
        text = "\n".join(u["prose"] for u in d["units"])
        han = sum(u["hanzi"] for u in d["units"]) or 1
        rows[title] = {
            "sub": sub, "汉字": han, "章": d["counts"]["chapters"], "单元": d["counts"]["units"],
            "密度": {g: round(sum(text.count(w) for w in ws) / han * 10000, 1) for g, ws in GROUPS.items()},
        }
    # 每门课的签名：密度最高的那一类
    for title, r in rows.items():
        top = max(r["密度"], key=r["密度"].get)
        r["签名"] = top
    json.dump({"note": "同一组词量九门课；数值为每万字密度。签名＝该课密度最高的词类，用于看系内分工。",
               "groups": list(GROUPS), "courses": rows},
              open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    hdr = "| 课程 | 章 | 汉字 | " + " | ".join(GROUPS) + " | 签名 |"
    print(hdr)
    print("|---|--:|--:|" + "--:|" * len(GROUPS) + "---|")
    for title, r in rows.items():
        cells = " | ".join(str(r["密度"][g]) for g in GROUPS)
        print(f"| {title} | {r['章']} | {r['汉字']:,} | {cells} | **{r['签名']}** |")


if __name__ == "__main__":
    main()
