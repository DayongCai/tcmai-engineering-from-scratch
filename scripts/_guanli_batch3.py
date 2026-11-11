# -*- coding: utf-8 -*-
"""管理系收尾：07 中医教育学 / 15 中医国际教育（合成课）+ 25 实习实践 / 26 毕设（sem910）。"""
import io
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = sys.executable
S = os.path.join(ROOT, "standards")

V = {"制度与规则": ["制度", "政策", "规定", "标准", "职责", "培养"],
     "组织与流程": ["组织", "流程", "部门", "岗位", "运行", "课程"],
     "绩效与评价": ["绩效", "评价", "指标", "质量", "评估", "效果"]}

MIXED = {
    "07-zhongyi-jiaoyu-xue": {
        "title": "中医教育学",
        "note": "合成课：教育管理与人才培养侧取《管理学基础》（17 课）的人力资源、培训与组织章，学科与标准化侧取《中医信息学》（智能 17 课）第 5 章。库内无教育学教材，已在缺口登记声明。",
        "levels": {"教育与学科": [1, 2], "培养与课程": [3, 4], "评价与质量": [5, 6], "国际与趋势": [7, 8]},
        "chapters": [
            {"title": "中医教育的对象与目标", "picks": [["zhongyi-xinxi-xue", 5]]},
            {"title": "学科建设与人才培养", "picks": [["zhongyi-xinxi-xue", 5], ["17-guanli-xue-jichu", 9]]},
            {"title": "课程与教学组织", "picks": [["17-guanli-xue-jichu", 7]]},
            {"title": "师资与培训体系", "picks": [["17-guanli-xue-jichu", 9], ["22-yiyao-renli-ziyuan", 5]]},
            {"title": "教学评价与质量保障", "picks": [["17-guanli-xue-jichu", 13]]},
            {"title": "临床教学与师承", "picks": [["06-yiyuan-guanli-xue", 7], ["22-yiyao-renli-ziyuan", 13]]},
            {"title": "中医教育标准化与认证", "picks": [["zhongyi-xinxi-xue", 3]]},
            {"title": "教育研究与改革趋势", "picks": [["17-guanli-xue-jichu", 14], ["17-guanli-xue-jichu", 15]]},
        ],
    },
    "15-zhongyi-guojijiaoyu": {
        "title": "中医国际教育",
        "note": "合成课：国际比较与治理侧取《公共管理学》（16 课）第 17 章与国际专题，标准化与传播侧取《中医信息学》（智能 17 课）第 5 章与《中国医学史》第 8 章。库内无国际教育教材，已在缺口登记声明。",
        "levels": {"历史与标准": [1, 2], "课程与认证": [3, 4], "合作与治理": [5, 6]},
        "chapters": [
            {"title": "中医走出去的历史脉络", "picks": [["zhongguo-yixue-shi", 8]]},
            {"title": "国际标准与术语对接", "picks": [["zhongyi-xinxi-xue", 5], ["zhongyi-xinxi-xue", 3]]},
            {"title": "海外课程与教材", "picks": [["17-guanli-xue-jichu", 7]]},
            {"title": "学历互认与执业准入", "picks": [["16-gonggong-guanli-xue", 17]]},
            {"title": "国际合作办学与机构", "picks": [["16-gonggong-guanli-xue", 4], ["16-gonggong-guanli-xue", 17]]},
            {"title": "跨文化传播的边界", "picks": [["16-gonggong-guanli-xue", 13], ["zhongyi-xinxi-xue", 5]]},
        ],
    },
}

for sub, plan in MIXED.items():
    plan.setdefault("views", V)
    os.makedirs(os.path.join(S, sub), exist_ok=True)
    json.dump(plan, io.open(os.path.join(S, sub, "plan.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    r = subprocess.run([PY, "scripts/build_mixed.py", sub], cwd=ROOT, capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    print((r.stdout or r.stderr).strip().splitlines()[-1])

# ---- sem910：25 实习实践 / 26 毕设 ----
SEM = {
    "25-guanli-shixi-shijian": {
        "title": "管理实习实践",
        "plan": [
            (1, "医院职能部门实习（医务与质控）", [["06-yiyuan-guanli-xue", 3]]),
            (2, "病案与信息科实习", [["11-yiyuan-xinxihua-bingan", 4]]),
            (3, "医保结算与费用结构分析", [["09-yiliao-baoxian-jingji", 5]]),
            (4, "中医药政策落地调研", [["02-zhongyiyao-zhengce-fagui", 7]]),
            (5, "管理改进项目（PDCA）", [["17-guanli-xue-jichu", 13]]),
            (6, "实践报告与答辩", [["01-yixue-tongjixue", 10]]),
        ],
    },
    "26-guanli-biye-sheji": {
        "title": "管理毕业设计与知识移交",
        "plan": [
            (1, "选题：从管理问题到可测量命题", [["13-linchuang-keyan-fangfa", 1]]),
            (2, "数据获取与指标定义", [["01-yixue-tongjixue", 1]]),
            (3, "分析与方案实现", [["01-yixue-tongjixue", 5]]),
            (4, "效果评价与成本-效益", [["09-yiliao-baoxian-jingji", 7]]),
            (5, "论文写作与答辩", [["21-yixue-lunli-xue", 11]]),
            (6, "知识移交：制度文件与交接", [["11-yiyuan-xinxihua-bingan", 7]]),
        ],
    },
}
VIEWS = {"问题与数据": ["问题", "数据", "指标", "样本", "调研", "定义"],
         "方法与执行": ["方法", "流程", "执行", "分析", "评价", "改进"],
         "交付与移交": ["报告", "文档", "答辩", "交接", "制度", "复用"]}

for sub, job in SEM.items():
    units, idx, meta = [], 0, []
    for ci, title, picks in job["plan"]:
        h = 0
        for src, ch in picks:
            U = json.load(io.open(os.path.join(S, src, "units.json"), encoding="utf-8"))
            for u in U["units"]:
                if int(u["chapter"]) != int(ch):
                    continue
                body = u.get("body") or u.get("prose") or ""
                hh = u.get("hanzi") or 0
                if hh < 20:
                    continue
                idx += 1
                units.append({"chapter": str(ci), "sub": f"{ci}.{idx}", "sec": u["title"],
                              "secNo": f"{ci}.{u.get('sub', idx)}", "title": u["title"], "chapterTitle": title,
                              "locator": u.get("locator", ""), "source": u.get("source", ""),
                              "body": body, "prose": re.sub(r"\s+", " ", body).strip(), "hanzi": hh,
                              "segments": u.get("segments") or [{"seg": "1", "text": body}],
                              "brief": "只写阶段任务、依据与交付物，不写具体机构与个人",
                              "measure": {"views": {k: sum(body.count(w) for w in ws) for k, ws in VIEWS.items()},
                                          "levels": {k: (hh if ci in v else 0) for k, v in
                                                     {"前期": [1, 2], "中期": [3, 4], "收尾": [5, 6]}.items()},
                                          "valueLike": len(re.findall(r"\d+(?:\.\d+)?\s*(?:例|%|天|月|项)", body))}})
                h += hh
        meta.append((ci, title, h))
        print(f"  {sub} ch{ci} {title[:18]} · {h:,}")
    tv = {k: sum(u["measure"]["views"][k] for u in units) for k in VIEWS}
    tl = {k: sum(u["hanzi"] for u in units if int(u["chapter"]) in v) for k, v in {"前期": [1, 2], "中期": [3, 4], "收尾": [5, 6]}.items()}
    OUT = {"subject": sub, "title": job["title"], "views": VIEWS,
           "levels": {"前期": [1, 2], "中期": [3, 4], "收尾": [5, 6]},
           "source": {"kind": "derived", "file": "F:/textbooks/qhzy-管理学基础.xlsx",
                      "note": "sem910 实践课：材料取自本系已建课程单元层"},
           "probe": {"view": tv, "A_part": tl},
           "ratio": {"view": round(max(tv.values()) / max(1, min(tv.values())), 1),
                     "A_part": round(max(tl.values()) / max(1, min(tl.values())), 1)},
           "counts": {"chapters": 6, "units": len(units), "hanzi": sum(u["hanzi"] for u in units),
                      "valueLike": sum(u["measure"]["valueLike"] for u in units)},
           "units": units,
           "chapters": [{"no": c, "title": t, "units": sum(1 for u in units if int(u["chapter"]) == c)} for c, t, _ in meta]}
    os.makedirs(os.path.join(S, sub), exist_ok=True)
    json.dump(OUT, io.open(os.path.join(S, sub, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"note": "sem910 实践课", "views": VIEWS, "levelsA": OUT["levels"],
               "probe": {"view": tv, "A_part": tl}, "ratio": {"view": OUT["ratio"]["view"], "A_part": OUT["ratio"]["A_part"]}},
              io.open(os.path.join(S, sub, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{sub}: 6 章 / {len(units)} 单元 / {OUT['counts']['hanzi']:,} 汉字")
