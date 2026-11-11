# -*- coding: utf-8 -*-
"""基础医学院四门教材课：人体解剖学 / 组织学与胚胎学 / 生物化学 / 局部解剖学。

章节 1:1 对应教材；三辨按词表现算；四位面按教材「上/中/下/末」四篇结构分区。
"""
import io
import json
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")
PY = sys.executable

COURSES = {
 "renti-jiepou-xue": {
  "dept": "departments/09-jichu/01-renti-jiepou-xue", "title": "人体解剖学",
  "xlsx": "qhzy-人体解剖学.xlsx",
  "views": {"形态与结构": ["结构", "形态", "组成", "分部", "分层", "起止"],
            "位置与毗邻": ["位置", "毗邻", "行程", "穿行", "经过", "位于"],
            "功能与临床": ["功能", "临床", "损伤", "手术", "支配", "作用"]},
  "planes": {"上篇·绪论与运动系统": [1, 2], "中篇·内脏学": [3, 4, 5, 6],
             "下篇·脉管与内分泌与感觉器": [7, 8, 9], "末篇·神经系统": [10]},
  "slugs": ["xulun", "yundong-xitong", "xiaohua-xitong", "huxi-xitong", "miniao-xitong",
            "shengzhi-xitong", "xunhuan-xitong", "neifenmi-xitong", "ganjueqi", "shenjing-xitong"],
  "why": ["绪论：解剖学的方位术语与切面是全书的地基", "运动系统：骨、关节、肌三层，起止决定动作",
          "消化系统：管道与腺体的连续关系", "呼吸系统：通气道与换气面的分界",
          "泌尿系统：产生与排出的两段", "生殖系统：管道同源与性别分化",
          "循环系统：心泵与两条循环的串联", "内分泌系统：无导管腺体的位置与毗邻",
          "感觉器：眼球与内耳的层次", "神经系统：中枢与周围、传导束与核团"],
  "chain": "运动 → 内脏 → 脉管与内分泌 → 神经：由支架到内脏，再到支配",
  "pressure": "解剖学的判据是「位置—层次—毗邻」三件套：说得清它在哪一层、与谁相邻，才算认得",
 },
 "zuzhi-peitai-xue": {
  "dept": "departments/09-jichu/02-zuzhi-peitai-xue", "title": "组织学与胚胎学",
  "xlsx": "qhzy-组织学与胚胎学.xlsx",
  "views": {"形态与结构": ["结构", "形态", "细胞", "层", "上皮", "纤维"],
            "发生与来源": ["发生", "来源", "分化", "发育", "胚", "形成"],
            "功能与联系": ["功能", "分泌", "吸收", "免疫", "运输", "调节"]},
  "planes": {"上篇·组织学基础": [1, 2, 3, 4, 5], "中篇·器官系统（上）": [6, 7, 8, 9, 10, 11],
             "中篇·器官系统（下）": [12, 13, 14, 15, 16], "下篇·胚胎与畸形": [17, 18, 19, 20]},
  "slugs": ["zuzhixue-xulun", "shangpi-zuzhi", "jiedi-zuzhi", "ji-zuzhi", "shenjing-zuzhi",
            "shenjing-xitong", "xunhuan-xitong", "mianyi-xitong", "xiaohua-xitong", "huxi-xitong",
            "miniao-xitong", "pifu", "yan-he-er", "neifenmi-xitong", "nanxing-shengzhi-xitong",
            "nvxing-shengzhi-xitong", "peitaixue-xulun", "zaoqi-fasheng", "qiguan-fasheng",
            "xiantianxing-jixing"],
  "why": ["组织学绪论：切片、染色与观察层级", "上皮组织：极性决定看哪一面",
          "结缔组织：细胞外基质才是主体", "肌组织：肌丝排列决定收缩形态",
          "神经组织：神经元与胶质的分工", "神经系统：灰质与白质的结构差别",
          "循环系统：管壁三层与心的结构", "免疫系统：淋巴器官的支架",
          "消化系统：管壁四层与腺体", "呼吸系统：气道与肺泡壁",
          "泌尿系统：肾单位的各段", "皮肤：表皮分层与附属器",
          "眼和耳：感觉上皮与支持结构", "内分泌系统：腺细胞排列与毛细血管",
          "男性生殖系统：生精上皮的周期", "女性生殖系统：卵巢周期与子宫内膜周期",
          "胚胎学绪论：分期与推算", "人体胚胎早期发生：三胚层与胚体折叠",
          "器官的发生：由胚层到器官原基", "先天性畸形：发生机制与分类"],
  "chain": "组织（四类基本组织）→ 器官（系统组织学）→ 胚胎（发生与畸形）",
  "pressure": "组织学的判据是「细胞—纤维—基质—排列」四件套：切片上认得出这四样，才谈得上判读",
 },
 "shenghua-xue": {
  "dept": "departments/09-jichu/07-shenghua-xue", "title": "生物化学",
  "xlsx": "qhzy-生物化学.xlsx",
  "views": {"物质组成与性质": ["结构", "性质", "组成", "分类", "理化"],
            "代谢与能量": ["代谢", "氧化", "合成", "分解", "能量", "酶"],
            "信息传递与调控": ["复制", "转录", "翻译", "基因", "表达", "调控", "遗传"]},
  "planes": {"上篇·生命物质与生物催化剂": [1, 2, 3, 4, 5, 6, 7],
             "中篇·物质代谢与能量代谢": [8, 9, 10, 11, 12, 13],
             "下篇·医学生化专题与遗传信息": [14, 15, 16, 17, 18, 19, 20],
             "末篇·常用技术": [21]},
  "slugs": ["xulun", "tang-huaxue", "zhizhi-huaxue", "danbaizhi-huaxue", "hesuan-huaxue", "mei",
            "weishengsu-yu-weiliang-yuansu", "shengwu-yanghua-yu-nengliang", "tang-daixie",
            "zhizhi-daixie", "anjisuan-daixie", "hegansuan-daixie", "daixie-tiaojie",
            "xueye-shenghua", "gandan-shenghua", "shuiyan-yu-suanjian-pingheng",
            "dna-shengwu-hecheng", "rna-shengwu-hecheng", "danbaizhi-shengwu-hecheng",
            "jiyin-biaoda-tiaokong", "changyong-jishu"],
  "why": ["绪论：生物化学问的是「体内发生了什么反应」", "糖化学：单糖到多糖的结构层次",
          "脂质化学：脂肪酸与复合脂的分类", "蛋白质化学：四级结构与变性",
          "核酸化学：碱基配对决定一切", "酶：催化效率与调节方式",
          "维生素与微量元素：辅酶的角色", "生物氧化：电子传递与能量货币",
          "糖代谢：三条去向与两条旁路", "脂质代谢：运输与酮体",
          "氨基酸代谢：脱氨与尿素", "核苷酸代谢：从头与补救",
          "代谢调节：激素与关键酶", "血液生化：血浆蛋白与血红素",
          "肝胆生化：胆红素与生物转化", "水盐与酸碱：缓冲与代偿",
          "DNA 合成：复制的保真", "RNA 合成：转录与加工",
          "蛋白质合成：翻译的三步", "基因表达调控：原核与真核",
          "常用技术：分离、杂交与扩增"],
  "chain": "物质（结构性质）→ 代谢（能量与调节）→ 信息（复制转录翻译）→ 技术",
  "pressure": "生物化学的判据是「底物—酶—产物—能量」四件套：这一步谁催化、能量怎么走，说不清就是没懂",
 },
 "jubu-jiepou-xue": {
  "dept": "departments/09-jichu/08-jubu-jiepou-xue", "title": "局部解剖学",
  "xlsx": "qhzy-局部解剖学.xlsx",
  "views": {"层次与间隙": ["层次", "间隙", "筋膜", "鞘", "三角", "构成"],
            "血管与神经": ["血管", "动脉", "静脉", "神经", "淋巴"],
            "器官与毗邻": ["器官", "毗邻", "位于", "境界"]},
  "planes": {"上篇·绪论与上肢": [1, 2], "中篇·下肢与头部与颈部": [3, 4, 5],
             "下篇·胸部与腹部": [6, 7], "末篇·盆部与会阴与脊柱区": [8, 9]},
  "slugs": ["xulun", "shangzhi", "xiazhi", "toubu", "jingbu", "xiongbu", "fubu",
            "penbu-huiyin", "jizhuqu"],
  "why": ["绪论：局部的分界与层次语言", "上肢：腋、臂、前臂、手的通道",
          "下肢：股三角、腘窝与踝管", "头部：颅顶、颅底与面部间隙",
          "颈部：三角分区与筋膜间隙", "胸部：胸壁、纵隔与肺门",
          "腹部：腹壁层次与腹膜间隙", "盆部与会阴：盆底与坐骨直肠窝",
          "脊柱区：椎管与椎旁层次"],
  "chain": "层次 → 通道 → 间隙 → 毗邻：由浅入深地读一个局部",
  "pressure": "局部解剖学的判据是「层次—通道—间隙」三件套：说得清切开后先见什么、通道里走什么，才算认得",
 },
}


def build(sub, cfg):
    std = os.path.join(S, sub)
    dept = os.path.join(ROOT, cfg["dept"])
    # 安全闸：绝不删已有正文
    chdir = os.path.join(dept, "chapters")
    if os.path.isdir(chdir):
        left = [d for d in os.listdir(chdir) if os.path.exists(os.path.join(chdir, d, "docs", "zh.md"))]
        assert not left, f"{sub} 已有正文 {len(left)} 章，拒绝重建"

    r = subprocess.run([PY, "scripts/build_course_generic.py", "--sub", sub,
                        "--xlsx", f"F:/textbooks/{cfg['xlsx']}",
                        "--views", json.dumps(cfg["views"], ensure_ascii=False),
                        "--levels", json.dumps({k: [k] for k in cfg["planes"]}, ensure_ascii=False)],
                       cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
    print("  build:", (r.stdout or r.stderr).strip().splitlines()[-1:])

    U = json.load(io.open(os.path.join(std, "units.json"), encoding="utf-8"))
    CM = {}
    for n, slug in enumerate(cfg["slugs"], 1):
        us = [u for u in U["units"] if int(u["chapter"]) == n]
        assert us, f"{sub} 第 {n} 章无单元"
        CM[slug] = {"n": n, "title": us[0]["chapterTitle"].split(" ", 1)[1], "units": [u["sub"] for u in us],
                    "srcChapters": [str(n)], "why": cfg["why"][n - 1], "derivedFrom": f"教材第{n}章"}
    json.dump({"note": f"{cfg['title']}：{len(CM)} 章 = 教材 {len(CM)} 章（1:1，无合并拆分，无单元复用）。",
               "chapters": CM},
              io.open(os.path.join(std, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    probe = {"view": U["probe"]["view"], "A_part": {k: 0 for k in cfg["planes"]}}
    for u in U["units"]:
        u["measure"]["levels"] = {k: 0 for k in cfg["planes"]}
        for p, chs in cfg["planes"].items():
            if int(u["chapter"]) in chs:
                u["measure"]["levels"][p] = u["hanzi"]
                probe["A_part"][p] += u["hanzi"]
    ratio = {"view": round(max(probe["view"].values()) / max(1, min(probe["view"].values())), 1),
             "A_part": round(max(probe["A_part"].values()) / max(1, min(probe["A_part"].values())), 1)}
    U["levels"] = {k: [k] for k in cfg["planes"]}
    U["probe"], U["ratio"] = probe, ratio
    json.dump(U, io.open(os.path.join(std, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"note": "三辨按词表现算；四位面＝教材四篇结构分区。",
               "views": U["views"], "levelsA": cfg["planes"], "probe": probe, "ratio": ratio},
              io.open(os.path.join(std, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    fb = {slug: [f"《{cfg['title']}·{v['title']}》", f"教材第{v['n']}章；章号一一对应"] for slug, v in CM.items()}
    cq = {slug: [f"{v['title']}：这一章的判据是什么，什么算「看懂了」", v["why"]] for slug, v in CM.items()}
    json.dump({"courseTitle": cfg["title"], "deptPath": cfg["dept"], "xlsx": f"F:/textbooks/{cfg['xlsx']}",
               "chain": cfg["chain"], "levelLabel": "教材篇结构",
               "objectPressure": cfg["pressure"],
               "reportRule": "观察记录写：标本或切片或切面的选择、结构所见、与教材表述的差异",
               "gapNote": "教材无插图；本课图注独立成文，可在无图条件下单独阅读（见 figures.json 与 图示缺口.md）",
               "chapterQ": cq, "fallback": fb, "defaultCite": [f"《{cfg['title']}》", "教材章名级"]},
              io.open(os.path.join(std, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"  plan: {len(CM)} 章 / {len(U['units'])} 单元 · ratio {ratio}")

    for cmd in ([PY, "scripts/scaffold_huli_chapter.py", sub, cfg["dept"], "--all"],
                [PY, "scripts/build_huli_docs.py", sub, cfg["dept"]]):
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
        print("   ", cmd[1], "→", (r.stdout or r.stderr).strip().splitlines()[-1:])


if __name__ == "__main__":
    only = sys.argv[1:] or list(COURSES)
    for sub in only:
        print("==", sub)
        build(sub, COURSES[sub])
