# -*- coding: utf-8 -*-
"""基础医学院第二批四门教材课：正常人体学 / 疾病学基础 / 流行病学 / 免疫学基础与病原生物学。

- 章节目录直接带 NN- 前缀（audit L1 要求）
- 三辨：先量三组候选再选一组（目标 1.8–4.5×）
- 四位面：按教材「上/中/下/末」四篇分区
- 图注层由 scripts/build_figure_captions.py 另跑
"""
import io
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")
PY = sys.executable

COURSES = {
 "zhengchang-renti-xue": {
  "dept": "departments/09-jichu/05-zhengchang-renti-xue", "title": "正常人体学", "xlsx": "qhzy-正常人体学.xlsx",
  "cands": [
   {"结构与层次": ["结构", "层次", "组成", "分部", "形态"], "功能与调节": ["功能", "调节", "维持", "稳态", "平衡"],
    "发生与发育": ["发生", "发育", "胚胎", "形成", "分化"]},
   {"形态与结构": ["结构", "形态", "组成", "分层"], "功能与稳态": ["功能", "稳态", "调节", "平衡"],
    "发生与应用": ["发生", "发育", "应用", "意义"]}],
  "planes": {"上篇·总论": [1, 2, 3], "中篇·系统解剖与组织": list(range(4, 13)),
             "下篇·生理功能与整体调节": [13, 14, 15, 16], "拓展篇·整体与平台": [17, 18]},
  "slugs": ["gaishu-yu-cengci", "xibao-yu-jiben-zuzhi", "fasheng-yu-fayu-gaishu", "yundong-xitong",
            "xiaohua-xitong", "huxi-xitong", "miniao-xitong", "shengzhi-xitong", "maiguan-xitong",
            "ganjue-qiguan", "shenjing-xitong", "neifenmi-xitong", "xueye-yu-neihuanjing",
            "xunhuan-huxi-tiaojie", "xiaohua-nengliang-daixie", "paixie-tiwen-tiye",
            "zhengti-tiaojie-baohu", "pingtai-lianjie"],
  "chain": "构造层次 → 系统解剖与组织 → 生理功能与整体调节 → 平台对接",
  "pressure": "正常人体学的判据是「层次—结构—功能」三件套：说得清在哪一层、由什么构成、维持什么，才算认得",
 },
 "jibing-xue-jichu": {
  "dept": "departments/09-jichu/14-jibing-xue-jichu", "title": "疾病学基础", "xlsx": "qhzy-疾病学基础.xlsx",
  "cands": [
   {"机制与病理过程": ["机制", "损伤", "炎症", "缺血", "缺氧", "障碍"], "系统疾病与表现": ["疾病", "病变", "综合征", "表现", "症状"],
    "治疗与防治": ["治疗", "防治", "康复", "用药", "护理"]},
   {"病理过程": ["损伤", "炎症", "障碍", "紊乱", "应激"], "系统疾病": ["疾病", "病变", "综合征"],
    "干预与防治": ["治疗", "防治", "康复", "药物"]}],
  "planes": {"上篇·总论（疾病概念与基本病理过程）": [1, 2, 3], "中篇·病理过程与系统疾病": list(range(4, 13)),
             "下篇·治疗与防治": [13, 14, 15, 16], "拓展篇·伦理与平台": [17, 18]},
  "slugs": ["gaishu-jibing-gainian", "sunshang-yu-shiying", "yanzheng-yu-xiufu", "xunhuan-zhangai",
            "shuidianjie-suojian-wenluan", "queyang-yu-fare", "xiuke-yu-yingji", "zhongliu",
            "xinxueguan-jibing", "huxi-xitong-jibing", "xiaohua-miniao-jibing",
            "mianyi-bingyuan-jibing", "yaowu-zuoyong-jichu", "kangganran-kangyan",
            "zhongliu-manxingbing-zhiliao", "jibing-fangzhi-kangfu", "lunli-yu-goutong", "pingtai-lianjie"],
  "chain": "疾病概念 → 基本病理过程 → 系统疾病 → 治疗与防治",
  "pressure": "疾病学基础的判据是「病因—机制—表现」三件套：说得清从哪来、怎么发生、看见什么，才算读懂",
  "note": "教材「0目录」的中篇、下篇标题沿用了护理教材的模板（「精神障碍病人的护理」「康复与安全管理」），与本书内容不符——本课按章段命名为「病理过程与系统疾病」「治疗与防治」，此缺陷已登记在 缺口登记.md。",
 },
 "liuxingbing-xue": {
  "dept": "departments/09-jichu/15-liuxingbing-xue", "title": "流行病学", "xlsx": "qhzy-流行病学.xlsx",
  "cands": [
   {"设计与方法": ["设计", "研究", "队列", "病例对照", "抽样", "调查"], "指标与测量": ["发病率", "患病率", "率", "指标", "测量"],
    "因果与推断": ["因果", "偏倚", "混杂", "推断", "关联"]},
   {"观察与实验": ["观察", "实验", "队列", "对照", "干预"], "描述与推断": ["描述", "分布", "推断", "估计"],
    "偏倚与控制": ["偏倚", "混杂", "控制", "质量"]}],
  "planes": {"上篇·流行病学基础": [1, 2, 3, 4], "中篇·观察与实验研究": [5, 6, 7, 8, 9],
             "下篇·研究设计与数据分析": [10, 11, 12, 13, 14], "拓展篇·方法学扩展与智能化": [15, 16, 17, 18]},
  "slugs": ["xulun", "jibing-fenbu-miaoshu", "xiankuang-shaijian", "bingli-duizhao", "duilie",
            "shiyan-liuxingbingxue", "bingyin-yinguo", "chuanranbing", "manxingbing-shanghai",
            "yanjiu-sheji", "shuju-zhengli-fenxi", "pianyi-hunza", "xianchang-diaocha-zhikong",
            "jibing-jiance-gongwei", "fenzi-yichuan", "xunzheng-yixue", "zhongyi-yao-yanjiu", "pingtai-lianjie"],
  "chain": "描述（分布与测量）→ 分析（病例对照与队列）→ 推断（因果与偏倚）→ 应用（监测与循证）",
  "pressure": "流行病学的判据是「设计—测量—推断」三件套：说得清怎么选的样本、算的什么率、能不能下因果结论，才算会读一篇研究",
 },
 "mianyi-bingyuan-shengwu": {
  "dept": "departments/09-jichu/13-mianyi-bingyuan-shengwu", "title": "免疫学基础与病原生物学",
  "xlsx": "qhzy-免疫学基础与病原生物学.xlsx",
  "cands": [
   {"免疫应答与分子": ["免疫", "抗体", "补体", "细胞", "应答"], "病原生物学": ["细菌", "病毒", "真菌", "寄生虫", "病原"],
    "致病与防治": ["致病", "感染", "防治", "传播", "预防"]},
   {"免疫学": ["免疫", "抗原", "抗体", "淋巴细胞"], "病原学": ["细菌", "病毒", "真菌", "寄生虫"],
    "临床与防治": ["感染", "致病", "防治", "诊断"]}],
  "planes": {"上篇·免疫学基础": [1, 2, 3, 4, 5], "中篇·免疫病理与免疫学应用": [6, 7],
             "下篇·病原生物学总论与细菌学": [8, 9, 10, 11], "末篇·病毒与真菌与寄生虫": [12, 13, 14, 15]},
  "slugs": ["mianyi-xulun", "kangyuan", "mianyi-fenzi", "mianyi-xibao", "mianyi-yingda",
            "chaomin-fanying", "mianyi-yingyong", "bingyuan-xulun", "xijun-zonglun",
            "changjian-xijun", "bingdu-zonglun", "changjian-bingdu", "zhenjunxue",
            "jishengchong-gaishu", "changjian-jishengchong"],
  "chain": "免疫基础（抗原—分子—细胞—应答）→ 免疫病理与应用 → 病原总论 → 各论（菌—毒—真菌—虫）",
  "pressure": "免疫与病原的判据是「识别—应答—结局」三件套：认得谁、怎么应答、结局是清除还是损伤，说得清才算读懂",
 },
}


def pick_views(cands, text):
    best = None
    for c in cands:
        tot = {k: sum(text.count(w) for w in ws) for k, ws in c.items()}
        ratio = max(tot.values()) / max(1, min(tot.values()))
        if best is None or abs(ratio - 3.0) < abs(best[1] - 3.0):
            best = (c, ratio, tot)
    return best


for sub, cfg in COURSES.items():
    std = os.path.join(S, sub)
    dept = os.path.join(ROOT, cfg["dept"])
    chdir = os.path.join(dept, "chapters")
    if os.path.isdir(chdir):
        left = [d for d in os.listdir(chdir) if os.path.exists(os.path.join(chdir, d, "docs", "zh.md"))]
        assert not left, f"{sub} 已有正文 {len(left)} 章，拒绝重建"
    print("==", sub)

    r = subprocess.run([PY, "scripts/build_course_generic.py", "--sub", sub, "--xlsx", f"F:/textbooks/{cfg['xlsx']}",
                        "--views", json.dumps(cfg["cands"][0], ensure_ascii=False),
                        "--levels", json.dumps({k: [k] for k in cfg["planes"]}, ensure_ascii=False)],
                       cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
    print("  build:", (r.stdout or r.stderr).strip().splitlines()[-1:])

    U = json.load(io.open(os.path.join(std, "units.json"), encoding="utf-8"))
    text = "\n".join(u.get("body", "") for u in U["units"])
    views, ratio, tot = pick_views(cfg["cands"], text)
    for u in U["units"]:
        u.setdefault("measure", {})
        u["measure"]["view"] = {k: sum(u.get("body", "").count(w) for w in ws) for k, ws in views.items()}
    U["views"] = views
    probe = {"view": tot, "A_part": {k: 0 for k in cfg["planes"]}}
    for u in U["units"]:
        u["measure"]["levels"] = {k: 0 for k in cfg["planes"]}
        for p, chs in cfg["planes"].items():
            if int(u["chapter"]) in chs:
                u["measure"]["levels"][p] = u["hanzi"]
                probe["A_part"][p] += u["hanzi"]
    U["probe"] = probe
    U["ratio"] = {"view": round(ratio, 1),
                  "A_part": round(max(probe["A_part"].values()) / max(1, min(probe["A_part"].values())), 1)}
    U["levels"] = {k: [k] for k in cfg["planes"]}
    json.dump(U, io.open(os.path.join(std, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    CM = {}
    for n, slug in enumerate(cfg["slugs"], 1):
        us = [u for u in U["units"] if int(u["chapter"]) == n]
        assert us, f"{sub} 第 {n} 章无单元"
        full = f"{n:02d}-{slug}"
        CM[full] = {"n": n, "title": us[0]["chapterTitle"].split(" ", 1)[1], "units": [u["sub"] for u in us],
                    "srcChapters": [str(n)], "why": "", "derivedFrom": f"教材第{n}章"}
    # why 用章名生成（逐章可读）
    for slug, v in CM.items():
        v["why"] = f"{v['title']}：这一章的判据与边界"
    json.dump({"note": f"{cfg['title']}：{len(CM)} 章 = 教材 {len(CM)} 章（1:1，无合并拆分，无单元复用）。",
               "chapters": CM},
              io.open(os.path.join(std, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    fb = {slug: [f"《{cfg['title']}·{v['title']}》", f"教材第{v['n']}章；章号一一对应"] for slug, v in CM.items()}
    cq = {slug: [f"{v['title']}：这一章的判据是什么，什么算「看懂了」", v["why"]] for slug, v in CM.items()}
    json.dump({"courseTitle": cfg["title"], "deptPath": cfg["dept"], "xlsx": f"F:/textbooks/{cfg['xlsx']}",
               "chain": cfg["chain"], "levelLabel": "教材篇结构", "objectPressure": cfg["pressure"],
               "reportRule": "观察记录写：对象与情境、所依据的指标、与教材表述的差异",
               "gapNote": "教材无插图；图注独立成文，可在无图条件下单独阅读（见 figures.json 与 图示缺口.md）",
               "chapterQ": cq, "fallback": fb, "defaultCite": [f"《{cfg['title']}》", "教材章名级"]},
              io.open(os.path.join(std, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"  plan: {len(CM)} 章 / {len(U['units'])} 单元 · 三辨 {U['ratio']['view']}× · 四位面 {U['ratio']['A_part']}×")

    for cmd in ([PY, "scripts/scaffold_huli_chapter.py", sub, cfg["dept"], "--all"],
                [PY, "scripts/build_huli_docs.py", sub, cfg["dept"]]):
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
        print("   ", cmd[1], "→", (r.stdout or r.stderr).strip().splitlines()[-1:])
