#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/crosscheck_xiaoer.py —— 第四层对账：《小儿推拿学》×《推拿治疗学》同名病证

前三层：
  两书对手法（手法学 × 推拿学）——参数层；
  三书对方案（治疗学 × 推拿学 × 手法学）——方案层；
  本层：**小儿 vs 成人同名病证**——体系层。

为什么要单独一层：小儿推拿不是「成人手法缩小版」。
  · 它有一套自己的**特定穴**（三关、六腑、天河水、脾经、大肠…多为线状/面状，与成人经穴不是一套）；
  · 手法以推、揉、摩、运、掐为主，**次数**代替时间（「推 300 次」）；
  · 同一病证（泄泻、便秘）在成人书里是「取穴＋手法组合＋疗程」，在小儿书里是「特定穴＋次数＋年龄限制」。

因此对账分三栏：手法集合、特定穴集合、剂量口径（次数/时间）。

产出：standards/xiaoer-tuina/四层对账.json
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XT = os.path.join(ROOT, "standards", "xiaoer-tuina", "units.json")
ZL = os.path.join(ROOT, "standards", "zhiliao", "units.json")

METHODS = ["推法", "揉法", "摩法", "运法", "掐法", "捏法", "按法", "拿法", "搓法", "擦法", "捣法",
           "一指禅推法", "滚法", "㨰法", "点法", "拍法", "击法", "弹法", "摇法", "扳法", "拔伸法", "捏脊", "摩腹"]
XT_POINTS = ["三关", "六腑", "天河水", "板门", "坎宫", "脾经", "肝经", "心经", "肺经", "肾经",
             "大肠", "小肠", "四横纹", "小横纹", "掌小横纹", "七节骨", "龟尾", "脊柱", "丹田", "肚角",
             "百会", "太阳", "迎香", "二人上马", "五指节", "内八卦", "外劳宫"]

PAIRS = [
    ("腹泻", "泄泻"),   # 小儿教材叫「腹泻」，成人教材叫「泄泻」，同一病证两个名字
    ("便秘", "便秘"),
]


def load(p):
    return json.load(open(p, encoding="utf-8"))["units"]


def norm(t):
    t = (t or "").replace("\n", "").replace(" ", "")
    return t.replace("㨰法", "滚法")


def hit(text, names):
    t = norm(text)
    return sorted({n for n in names if n in t}, key=lambda x: -len(x))


def nums(text):
    t = norm(text)
    return {
        "次数": sorted(set(re.findall(r"(\d{2,4})\s*次", t)), key=int)[:8],
        "分钟": sorted(set(re.findall(r"(\d{1,2})\s*[～~\-至]?\s*(\d{0,2})\s*分钟", t)), key=str)[:6],
        "年龄": sorted(set(re.findall(r"(\d{1,2})\s*(?:岁|个月)", t)), key=str)[:8],
    }


def main():
    xt, zl = load(XT), load(ZL)
    rows = []
    for kid, adult in PAIRS:
        xu = [u for u in xt if kid in (u.get("title") or "") + (u.get("brief") or "") + (u.get("sec") or "")]
        zu = [u for u in zl if adult in (u.get("sec") or "") + (u.get("title") or "")]
        xtext = "".join(u["prose"] for u in xu)
        ztext = "".join(u["prose"] for u in zu)
        xm, zm = hit(xtext, METHODS), hit(ztext, METHODS)
        xp, zp = hit(xtext, XT_POINTS), hit(ztext, XT_POINTS)
        inter, union = set(xm) & set(zm), set(xm) | set(zm)
        rows.append({
            "小儿病证": kid, "成人病证": adult,
            "小儿": {"单元": [u["sub"] for u in xu], "汉字": sum(u["hanzi"] for u in xu),
                   "手法": xm, "特定穴": xp, "剂量": nums(xtext)},
            "成人": {"单元": [u["sub"] for u in zu], "汉字": sum(u["hanzi"] for u in zu),
                   "手法": zm, "特定穴": zp, "剂量": nums(ztext)},
            "手法Jaccard": round(len(inter) / len(union), 2) if union else None,
            "仅小儿手法": sorted(set(xm) - set(zm)),
            "仅成人手法": sorted(set(zm) - set(xm)),
            "小儿特定穴数": len(xp), "成人特定穴数": len(zp),
        })

    # 全库结构性对比：小儿特定穴体系 vs 成人手法体系
    xt_all = "".join(u["prose"] for u in xt)
    zl_all = "".join(u["prose"] for u in zl)
    xt_hit, zl_hit = hit(xt_all, XT_POINTS), hit(zl_all, XT_POINTS)
    detail = {
        "同名病证对": len(rows),
        "小儿特定穴（全库出现）": len(xt_hit),
        "成人治疗学里出现的同名特定穴": len(zl_hit),
        "成人书里出现同名词语的（同名≠同义）": zl_hit,
        "小儿书未用成人手法的": sorted(set(METHODS) - set(hit(xt_all, METHODS))),
    }
    json.dump({"口径": "同名病证逐项比：手法集合（Jaccard）、特定穴集合、剂量口径（次数/分钟/年龄）",
               "counts": detail, "rows": rows},
              open(os.path.join(ROOT, "standards", "xiaoer-tuina", "四层对账.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    print(json.dumps(detail, ensure_ascii=False, indent=1))
    for r in rows:
        print(f"\n== {r['小儿病证']}（小儿 {r['小儿']['汉字']} 字）vs {r['成人病证']}（成人 {r['成人']['汉字']} 字）")
        print(f"   小儿手法 {r['小儿']['手法']}")
        print(f"   成人手法 {r['成人']['手法']}")
        print(f"   Jaccard {r['手法Jaccard']}｜小儿特定穴 {r['小儿特定穴数']} 个｜成人特定穴 {r['成人特定穴数']} 个")
        print(f"   小儿剂量 {r['小儿']['剂量']}")


if __name__ == "__main__":
    main()
