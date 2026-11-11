# -*- coding: utf-8 -*-
"""五官系第二批：5 门合成课 + 2 门单章切分派生课（08 口腔 / 14 嗓音）。"""
import io
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = sys.executable
S = os.path.join(ROOT, "standards")

V = {"病位与解剖": ["耳", "鼻", "咽喉", "口腔", "眼", "部位"],
     "病性与证候": ["热", "虚", "风", "湿", "痰", "瘀"],
     "诊法与治法": ["诊断", "辨证", "治法", "方药", "外治", "调护"]}

PLANS = {
    "erbihou-jiepou-shengli": {
        "title": "耳鼻喉解剖生理",
        "note": "合成课：专科解剖生理取《中医耳鼻喉科学》第2章，系统解剖取《人体解剖学》感觉器与消化系统章。",
        "levels": {"概览与耳": [1, 2], "鼻与咽喉": [3, 4], "口腔与神经": [5, 6], "功能与检查": [7, 8]},
        "chapters": [
            {"title": "耳鼻咽喉的解剖概览", "picks": [["zhongyi-erbihou-xue", 2]]},
            {"title": "耳的应用解剖", "picks": [["renti-jiepou-xue", 9]]},
            {"title": "鼻与鼻窦", "picks": [["zhongyi-erbihou-xue", 6]]},
            {"title": "咽喉的解剖", "picks": [["zhongyi-erbihou-xue", 7]]},
            {"title": "口腔与涎腺", "picks": [["renti-jiepou-xue", 3]]},
            {"title": "神经与血管支配", "picks": [["renti-jiepou-xue", 10]]},
            {"title": "生理功能与免疫", "picks": [["zhongyi-erbihou-xue", 3]]},
            {"title": "检查法与正常所见", "picks": [["zhongyi-erbihou-xue", 4]]},
        ],
    },
    "kouqiang-jiepou-shengli": {
        "title": "口腔解剖生理",
        "note": "合成课：系统解剖侧取《人体解剖学》消化系统、运动系统与神经系统章，口腔临床侧取《中医耳鼻喉科学》口齿科章。库内无口腔解剖教材，已在缺口登记声明。",
        "levels": {"境界与牙": [1, 2], "颌骨与关节": [3, 4], "腺体与神经": [5, 6], "功能与检查": [7, 8]},
        "chapters": [
            {"title": "口腔的境界与分区", "picks": [["renti-jiepou-xue", 3]]},
            {"title": "牙与牙周组织", "picks": [["zhongyi-erbihou-xue", 8]]},
            {"title": "颌骨与咀嚼肌", "picks": [["renti-jiepou-xue", 2]]},
            {"title": "颞下颌关节与咬合", "picks": [["renti-jiepou-xue", 2]]},
            {"title": "唾液腺与神经支配", "picks": [["renti-jiepou-xue", 10]]},
            {"title": "咀嚼与吞咽", "picks": [["renti-jiepou-xue", 3]]},
            {"title": "口腔感觉与味觉", "picks": [["renti-jiepou-xue", 9]]},
            {"title": "口腔检查与记录", "picks": [["zhongyi-erbihou-xue", 4]]},
        ],
    },
    "zhongyi-mianbu-wangzhen": {
        "title": "中医面部望诊",
        "note": "合成课：眼科诊断取《中医眼科学》第4章，鼻咽喉与口齿望诊取《中医耳鼻喉科学》第4、7、8章。库内无望诊专书，已在缺口登记声明。",
        "levels": {"原理与色泽": [1, 2], "眼与鼻": [3, 4], "口唇咽喉": [5, 6], "舌与记录": [7, 8]},
        "chapters": [
            {"title": "望诊的原理与部位", "picks": [["zhongyi-yanke-xue", 4]]},
            {"title": "面部色泽与五色", "picks": [["zhongyi-yanke-xue", 4]]},
            {"title": "眼部望诊", "picks": [["zhongyi-yanke-xue", 6]]},
            {"title": "鼻部望诊", "picks": [["zhongyi-erbihou-xue", 6]]},
            {"title": "口唇与齿龈", "picks": [["zhongyi-erbihou-xue", 8]]},
            {"title": "咽喉望诊", "picks": [["zhongyi-erbihou-xue", 7]]},
            {"title": "舌与口腔黏膜", "picks": [["zhongyi-erbihou-xue", 4]]},
            {"title": "望诊记录与复核", "picks": [["zhongyi-yanke-xue", 3]]},
        ],
    },
    "yanke-guangxue-yanguang": {
        "title": "眼科光学验光",
        "note": "合成课：眼的光学结构取《中医眼科学》第2章，诊断与治疗概取第4、5章。验光师操作规范库内无底本，已在缺口登记声明（不写具体度数换算与处方阈值）。",
        "levels": {"结构与类型": [1, 2], "视功能": [3, 4], "矫正": [5, 6], "边界与记录": [7, 8]},
        "chapters": [
            {"title": "眼的光学结构", "picks": [["zhongyi-yanke-xue", 2]]},
            {"title": "屈光不正的类型", "picks": [["zhongyi-yanke-xue", 2]]},
            {"title": "视力与对比敏感度", "picks": [["zhongyi-yanke-xue", 4]]},
            {"title": "验光原理", "picks": [["zhongyi-yanke-xue", 4]]},
            {"title": "镜片与矫正", "picks": [["zhongyi-yanke-xue", 5]]},
            {"title": "儿童屈光与弱视", "picks": [["zhongyi-yanke-xue", 8]]},
            {"title": "屈光手术与边界", "picks": [["zhongyi-yanke-xue", 5]]},
            {"title": "验光记录与安全", "picks": [["zhongyi-yanke-xue", 3]]},
        ],
    },
    "zhongyi-wuguan-jingdian": {
        "title": "中医五官经典",
        "note": "合成课：经典原文取《医古文》医经医论与医家传记文选，五官论述取《中医眼科学》《中医耳鼻喉科学》发展史章，历史演变取《中国医学史》。",
        "levels": {"原典与源流": [1, 2], "耳咽喉": [3, 4], "演变与对接": [5, 6]},
        "chapters": [
            {"title": "五官经典原文概览", "picks": [["yiguwen", 9]]},
            {"title": "目与脏腑经络", "picks": [["zhongyi-yanke-xue", 1]]},
            {"title": "耳与肾", "picks": [["zhongyi-erbihou-xue", 1]]},
            {"title": "咽喉与肺胃", "picks": [["zhongyi-erbihou-xue", 3]]},
            {"title": "病名与证候的历史演变", "picks": [["zhongguo-yixue-shi", 3]]},
            {"title": "经典与临床的对接", "picks": [["yiguwen", 8]]},
        ],
    },
}

SPLIT = {
    "zhongyi-kouqiang-kexue": {
        "title": "中医口腔科学",
        "src": "zhongyi-erbihou-xue", "chapter": 8, "into": 10,
        "note": "派生课：底本《中医耳鼻喉科学》口齿科章（第8章，20 小节）按顺序切成 10 讲；不另立来源，汉字不与父课相加。",
        "titles": ["口腔的中医解剖与生理", "口齿疾病的病因病机", "口齿疾病的辨证要点", "口齿疾病的治法与外治",
                   "牙痛与龋病", "牙周病与牙龈出血", "口疮与口腔黏膜病", "口臭与口干",
                   "口齿急症与外伤", "口齿调护与预防"],
    },
    "zhongyi-sangyin-yixue": {
        "title": "中医嗓音医学",
        "src": "zhongyi-erbihou-xue", "chapter": 7, "into": 8,
        "note": "派生课：底本《中医耳鼻喉科学》咽喉科章（第7章，30 小节）按顺序切成 8 讲；汉字不与父课相加。",
        "titles": ["咽喉的中医解剖与生理", "咽喉病的病因病机", "咽喉病的辨证", "咽喉病的治法",
                   "喉痹与乳蛾", "喉喑与失音", "声带疾病与用嗓卫生", "咽喉急症与调护"],
    },
}

for sub, plan in PLANS.items():
    plan.setdefault("views", V)
    os.makedirs(os.path.join(S, sub), exist_ok=True)
    json.dump(plan, io.open(os.path.join(S, sub, "plan.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    r = subprocess.run([PY, "scripts/build_mixed.py", sub], cwd=ROOT, capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    print((r.stdout or r.stderr).strip().splitlines()[-1])

for sub, sp in SPLIT.items():
    plan = {"title": sp["title"], "note": sp["note"], "views": V,
            "levels": {"前段": list(range(1, sp["into"] // 2 + 1)),
                       "中段": list(range(sp["into"] // 2 + 1, sp["into"] - 1)),
                       "后段": [sp["into"] - 1, sp["into"]]},
            "splitInto": sp["into"],
            "chapters": [{"title": t, "split": {"src": sp["src"], "chapter": sp["chapter"]}} for t in sp["titles"]]}
    os.makedirs(os.path.join(S, sub), exist_ok=True)
    json.dump(plan, io.open(os.path.join(S, sub, "plan.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    r = subprocess.run([PY, "scripts/build_mixed.py", sub], cwd=ROOT, capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    print((r.stdout or r.stderr).strip().splitlines()[-1])
