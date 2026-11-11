# -*- coding: utf-8 -*-
"""药理学（09-jichu/12-yaoli-xue）：49 教材章 → 49 课程章（1:1）+ 章群结构四位面。"""
import io
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")
PY = sys.executable
SUB, DEPT = "yaoli-xue", "departments/09-jichu/12-yaoli-xue"
TITLE = "药理学"

SLUGS = {
 1: "01-xulun", 2: "02-yaoxiao-donglixue", 3: "03-yaodai-donglixue", 4: "04-yingxiang-yinsu",
 5: "05-chuanchu-gailun", 6: "06-ni-danjian-yao", 7: "07-youji-linsuanzhi", 8: "08-kang-danjian-yao",
 9: "09-ni-shenshangxiansu-yao", 10: "10-kang-shenshangxiansu-yao", 11: "11-jubu-mazui-yao",
 12: "12-quanshen-mazui-yao", 13: "13-zhenjing-cuimian-yao", 14: "14-kang-dianxian-yao",
 15: "15-kang-jingshen-shichang-yao", 16: "16-tuixing-jibing-yao", 17: "17-jieerre-zhentong-yao",
 18: "18-zhentong-yao", 19: "19-zhongshu-xingfen-yao", 20: "20-zuan-ji-kang-zuan-yao",
 21: "21-ziti-huoxing-wuzhi", 22: "22-lizi-tongdao-yao", 23: "23-xingongneng-buquan-yao",
 24: "24-kang-gaoxueya-yao", 25: "25-kang-xinjiaotong-yao", 26: "26-kang-xinlvshichang-yao",
 27: "27-kang-dongmai-zhouyangyinghua", 28: "28-liniao-tuoshui-yao", 29: "29-xiaohua-xitong-yao",
 30: "30-huxi-xitong-yao", 31: "31-zigong-xingfen-yao", 32: "32-kang-pinxue-yao",
 33: "33-ningxue-xitong-yao", 34: "34-pizhi-jisu-yao", 35: "35-jiazhuangxian-yao",
 36: "36-jiang-xuetang-yao", 37: "37-xingjisu-biyun-yao", 38: "38-kang-bingyuan-weishengwu",
 39: "39-hecheng-kangjun-yao", 40: "40-beta-neixian-an-lei", 41: "41-dahuanneizhi-lin-ke",
 42: "42-anjitanggan-lei", 43: "43-sihuansu-lumeisu-lei", 44: "44-kang-zhenjun-bingdu-yao",
 45: "45-kang-jiehe-mayifeng-yao", 46: "46-kang-jishengchong-yao", 47: "47-kang-exing-zhongliu-yao",
 48: "48-mianyi-yizhi-yao", 49: "49-mianyi-zengqiang-yao",
}

PLANES = {"总论": [1, 2, 3, 4], "传出神经与中枢": list(range(5, 22)),
          "心血管与内脏": list(range(22, 38)), "化疗与免疫": list(range(38, 50))}

WHY = {
 1: "绪论：药理学研究什么、怎么研究", 2: "药效学：剂量—效应、受体与信号", 3: "药动学：吸收到排泄的四个参数",
 4: "影响药效的因素：机体、药物、给药方式", 5: "传出神经概论：递质与受体分类是全篇的地基",
 6: "拟胆碱药：从 M、N 受体到临床应用", 7: "有机磷酸酯中毒与胆碱酯酶复活：最典型的解毒链",
 8: "抗胆碱药：阿托品的两面性", 9: "拟肾上腺素药：α、β 受体与升压",
 10: "抗肾上腺素药：降压与前列腺", 11: "局麻药：给药途径决定毒性", 12: "全麻药：麻醉深度与呼吸抑制",
 13: "镇静催眠药：耐受与依赖", 14: "抗癫痫药：按发作类型选药", 15: "抗精神失常药：多巴胺与 5-HT",
 16: "神经退行性疾病：对症而非对因", 17: "解热镇痛抗炎：COX 与胃肠风险", 18: "镇痛药：成瘾性与呼吸抑制",
 19: "中枢兴奋药：治疗窗窄", 20: "组胺与抗组胺药：两代药的差别在血脑屏障",
 21: "自体活性物质：前列腺素、5-HT、NO", 22: "离子通道药：心律失常的药理基础",
 23: "心衰药：正性肌力与神经内分泌抑制", 24: "抗高血压药：五类一线药的取舍",
 25: "抗心绞痛药：供需两端的调节", 26: "抗心律失常药：致心律失常风险",
 27: "抗动脉粥样硬化：他汀的获益与限度", 28: "利尿药：部位决定效应与电解质紊乱",
 29: "消化系统药：抑酸、促动力、止吐", 30: "呼吸系统药：平喘的三条路", 31: "子宫兴奋药：剂量与时机",
 32: "抗贫血药：缺什么补什么", 33: "凝血与抗凝：出血风险的权衡", 34: "糖皮质激素：抗炎与副作用的同源",
 35: "甲状腺药：替代与抑制", 36: "降血糖药：按机制分层", 37: "性激素与避孕药：反馈调节",
 38: "抗微生物概论：耐药与合理用药", 39: "合成抗菌药：喹诺酮与磺胺", 40: "β-内酰胺类：过敏与耐药",
 41: "大环内酯类：肝酶相互作用", 42: "氨基糖苷类：耳肾毒性", 43: "四环素与氯霉素：牙齿与骨髓",
 44: "抗真菌与抗病毒：靶点少、疗程长", 45: "抗结核：联合与全程", 46: "抗寄生虫药",
 47: "抗肿瘤药：细胞毒与非特异", 48: "免疫抑制药：感染与肿瘤风险", 49: "免疫增强药：证据有限",
}


def main():
    U = json.load(io.open(os.path.join(S, SUB, "units.json"), encoding="utf-8"))
    by = {}
    for u in U["units"]:
        by.setdefault(int(u["chapter"]), []).append(u)

    CM = {}
    for n in sorted(by):
        slug = SLUGS[n]
        assert slug == slug.lower(), slug
        CM[slug] = {"n": n, "title": by[n][0]["chapterTitle"].split(" ", 1)[1],
                    "units": [u["sub"] for u in by[n]], "srcChapters": [str(n)],
                    "why": WHY[n], "derivedFrom": f"教材第{n}章"}
    json.dump({"note": "药理学 49 章 = 教材 49 章（1:1，无合并拆分，无单元复用）。", "chapters": CM},
              io.open(os.path.join(S, SUB, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    probe = {"view": U["probe"]["view"], "A_part": {k: 0 for k in PLANES}}
    for u in U["units"]:
        u["measure"]["levels"] = {k: 0 for k in PLANES}
        for p, chs in PLANES.items():
            if int(u["chapter"]) in chs:
                u["measure"]["levels"][p] = u["hanzi"]
                probe["A_part"][p] += u["hanzi"]
    ratio = {"view": round(max(probe["view"].values()) / max(1, min(probe["view"].values())), 1),
             "A_part": round(max(probe["A_part"].values()) / max(1, min(probe["A_part"].values())), 1)}
    U["levels"] = {k: [k] for k in PLANES}
    U["probe"], U["ratio"] = probe, ratio
    json.dump(U, io.open(os.path.join(S, SUB, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"note": "三辨按词表现算；四位面＝按教材章群结构分区（不用词频）。",
               "views": U["views"], "levelsA": PLANES, "probe": probe, "ratio": ratio},
              io.open(os.path.join(S, SUB, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    fb = {slug: [f"《药理学·{v['title']}》", f"教材第{v['n']}章；章号一一对应"] for slug, v in CM.items()}
    cq = {slug: [f"{v['title']}：这一类药的共同靶点与共同风险是什么", v["why"]] for slug, v in CM.items()}
    json.dump({"courseTitle": TITLE, "deptPath": DEPT,
               "xlsx": f"F:/textbooks/{U['source']['file']}",
               "chain": "总论（药效/药动/影响因素）→ 传出神经 → 中枢 → 心血管与内脏 → 化疗与免疫",
               "levelLabel": "章群结构",
               "objectPressure": "药理学的判据是「靶点—效应—风险」三件套：说得出靶点，才说得清不良反应",
               "reportRule": "用药记录写：药名、剂量、给药途径、适应证、疗效与不良反应",
               "gapNote": "教材无图表化剂量曲线；具体剂量与说明书以现行药典与说明书为准，本课不代填",
               "chapterQ": cq, "fallback": fb, "defaultCite": ["《药理学》", "教材篇名级"]},
              io.open(os.path.join(S, SUB, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("plan:", len(CM), "章 /", sum(len(v["units"]) for v in CM.values()), "单元 · ratio", ratio)

    import shutil
    shutil.rmtree(os.path.join(ROOT, DEPT, "chapters"), ignore_errors=True)
    for cmd in ([PY, "scripts/scaffold_huli_chapter.py", SUB, DEPT, "--all"],
                [PY, "scripts/build_huli_docs.py", SUB, DEPT]):
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
        print("  ", cmd[1], "→", (r.stdout or r.stderr).strip().splitlines()[-1:])


if __name__ == "__main__":
    main()
