#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_zhongyao_duli_text.py —— 《中药毒理学》派生底本

**没有母本。** 本库 9 院系 187 学科里没有「中药毒理学」，F:/textbooks 也没有对应工作簿。
所以这门课按本库既有的「派生课」做法建（同《中医证候学》《中医体质学》）：不从零编写原文，
而是把已有底本里散落的毒性信息按**毒理学的索引**重排一遍。

母本层的唯一来源：`standards/zhongyao-xue/units.json`（《中药学》340 单元 / 47,844 汉字）。
做法：按 8 个毒理学主题各给一组关键词，取命中的单元，locator 一律写「派生·第N章·{sub}」，
并把源 locator（教材·第X章·sub）一并记在 source 字段——**派生件必须能追回原句**。

四个反例，先说清楚：
  1. 本课的「毒性」判断完全来自《中药学》的标注（有毒/小毒/大毒、使用注意、十八反十九畏），
     不是毒理学实验数据；教材没写 LD50，这里也不编。
  2. 靶器官的归属只取教材明写的那一句（如「何首乌……肝损伤」），教材没写靶器官的药，
     不按成分类型去推——推出来的靶器官就是编的。
  3. 派生单元会与《中药学》重复计入，两门课的汉字不可相加。
  4. 无母本 ⇒ 无「教材·第N章」可引；一切引用写「派生·」前缀。

三辨＝毒性成分／毒性表现／减毒与救治
四位面＝靶器官（肝 / 肾 / 心与神经 / 生殖与遗传）
"""
import hashlib
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'standards', 'zhongyao-xue', 'units.json')
OUT = os.path.join(ROOT, 'standards', 'zhongyao-du-li')

VIEWS = {
    "毒性成分": ["生物碱", "苷", "萜", "内酯", "重金属", "砷", "汞", "铅", "马兜铃酸", "乌头碱",
                 "番木鳖碱", "秋水仙碱", "强心苷", "挥发油", "蛋白", "毒蛋白"],
    "毒性表现": ["中毒", "毒性", "有毒", "小毒", "大毒", "过量", "蓄积", "损伤", "坏死", "衰竭",
                 "惊厥", "心律失常", "呕吐", "腹泻", "麻木", "溶血", "过敏", "肝损伤", "肾损伤"],
    "减毒与救治": ["炮制", "减毒", "解毒", "先煎", "久煎", "配伍", "禁忌", "慎用", "忌用",
                   "解救", "对症", "洗胃", "监测", "限量", "疗程"],
}

LEVELS = {
    "肝": ["肝", "转氨酶", "黄疸", "肝损伤", "肝毒性"],
    "肾": ["肾", "肾小管", "肾功能", "马兜铃", "关木通", "肾损伤"],
    "心与神经": ["心", "心律", "心悸", "血压", "神经", "惊厥", "抽搐", "麻木", "昏迷", "呼吸抑制"],
    "生殖与遗传": ["妊娠", "孕妇", "胎", "致畸", "生殖", "哺乳", "遗传", "胚胎"],
}

CHAPTERS = [
    ("01-du-xing-gainian", "毒理学的对象：剂量、分级与安全窗", 1,
     ["剂量", "毒性", "有毒", "小毒", "大毒", "中毒", "过量", "疗程", "蓄积"],
     "同一味药，煎汤喝是药、研粉吞是毒——差在哪一步",
     "差在剂量与进入方式：汤剂一次几十克而溶出有限，散剂一次几克却全量入血。毒性不是物质的性质，是剂量与途径的函数"),
    ("02-du-xing-wuzhi", "毒性物质基础：成分类型与矿物药", 2,
     ["生物碱", "苷", "萜", "内酯", "重金属", "砷", "汞", "铅", "马兜铃酸", "乌头碱", "强心苷"],
     "为什么有毒的总是那几类成分",
     "生物碱与强心苷有明确的受体或离子通道靶点，剂量稍过就跨过治疗窗；矿物药的问题不在成分复杂，而在重金属不可代谢"),
    ("03-gan-du-xing", "肝毒性：为什么肝最先受损", 3,
     ["肝", "转氨酶", "黄疸", "肝损伤", "何首乌"],
     "口服的药都先过肝，为什么只有少数药伤肝",
     "肝是首过器官，也是代谢活化器官：原药无毒、代谢物有毒（如何首乌的蒽醌类），肝就成了第一个受害者。教材对这类药的写法是「少数人」「长期服用」——它承认个体差异"),
    ("04-shen-du-xing", "肾毒性：马兜铃酸的教训", 4,
     ["肾", "马兜铃", "关木通", "肾小管", "肾功能"],
     "马兜铃酸事件改写了什么",
     "改写了三件事：成分安全（含马兜铃酸品种被取消药用部位）、命名规范（关木通与木通分清）、以及「道地」不等于「安全」。教材在相关药材的注意项里留下了这条痕迹"),
    ("05-xin-shen-jing-du-xing", "心与神经毒性：乌头碱的半小时", 5,
     ["乌头", "附子", "细辛", "心律", "惊厥", "麻木", "呼吸抑制", "神经"],
     "附子为什么要先煎、久煎",
     "乌头碱的双酯键遇热水解成毒性小得多的单酯与醇胺；先煎久煎不是习惯，是把双酯键水解掉。教材在用法项里写「先煎、久煎」，理由是化学的"),
    ("06-shengzhi-du-xing", "生殖与遗传毒性：妊娠禁忌的分级", 6,
     ["妊娠", "孕妇", "胎", "致畸", "哺乳", "生殖"],
     "妊娠禁忌为什么分「禁用」与「慎用」两档",
     "禁用是对胎儿有明确损害或药性峻猛（如巴豆、斑蝥），慎用是活血、行气、攻下类——风险与剂量相关但证据不足。两档之分就是「已知危险」与「未知风险」的分野"),
    ("07-peiwu-paozhi-jian-du", "配伍与炮制减毒：十八反十九畏怎么读", 7,
     ["十八反", "十九畏", "相反", "相恶", "炮制", "减毒", "先煎", "久煎", "解毒"],
     "十八反、十九畏有没有实验依据",
     "有一部分，且不均匀：乌头配半夏在实验里确有毒性增强，而多数组合缺现代证据。教材把它写成「禁忌」而不是「机制」，正是承认这一点——**没有证据不等于没有风险，也不等于有机制**"),
    ("08-jian-ce-anquan-bianjie", "不良反应监测与安全边界", 8,
     ["不良反应", "监测", "报告", "限量", "标准", "说明书", "慎用", "忌用"],
     "说明书上的「尚不明确」到底是什么意思",
     "意思是没做过、或没做成；它既不是「安全」也不是「有害」。教材的中药安全性内容受制于这条：能写的写出来，写不出的留在「尚不明确」里——本课也止步于此"),
    ("09-shiyan-anquan-pingjia", "毒理实验与安全评价：LD50、亚慢性、遗传毒性与 GLP", 9,
     ["__EXTERNAL__"],
     "中药毒理学的第 1–8 章讲「教材里的药凭什么算有毒」，到第 9 章必须换证据：实验怎么做、报告怎么算数",
     "前八章的判据全部来自教材标注，没有一条是实验数据；要回答「毒到什么剂量」「重复给药多久出问题」「会不会致突变」「数据能不能被复核」，只能引外源标准——OECD 试验准则与国内的毒理研究技术指导原则"),
    ("10-zhiyanxing-changqi", "致癌性与长期暴露：从「中毒」到「肿瘤」的终点", 10,
     ["__EXTERNAL__"],
     "致癌性为什么必须单独成线：它的终点不是「中毒」，是「肿瘤发生率」",
     "急性看死亡、亚慢性看靶器官、致癌看肿瘤——三者的观察对象、时长与设计逻辑都不同。把它并进遗传毒性章，会让人以为「致突变阳性＝致癌」，而这两件事在标准体系里是两条线"),
]

# 第 9、10 章是外源章：不取《中药学》单元，取 sources/ 下已落盘 PDF 里逐字可查的条文。
# 这条界线要划清楚——前八章是「派生」（原文来自教材），后两章是「外源」（原文来自标准文本），
# 三者的 locator 前缀不同（派生· vs 外源·），汉字也不并入同一统计口径。
# 第 10 章按用户要求独立成线：致癌性不与遗传毒性混章，条款各自挂各自的章。
EXT_CHAPTERS = {
    9: {"slug": "09-shiyan-anquan-pingjia",
        "title": "毒理实验与安全评价：LD50、亚慢性、遗传毒性与 GLP",
        "ids": ["E01", "E02", "E03",      # 急性：FDP / 固定剂量档 / UDP
                "E11", "E04",             # 重复给药：28 天筛 / 90 天判
                "E05", "E10", "E06", "E12", "E13", "E14", "E26", "E27",   # 遗传毒性：体外三端点 + 体内微核 + 体内基因突变
                "E07", "E18", "E19", "E20", "E21",          # 受试物与 GLP（征求意见稿 3 条 + 正式稿 4 条）
                "E08", "E09"]},
    10: {"slug": "10-zhiyanxing-changqi",
         "title": "致癌性与长期暴露：从「中毒」到「肿瘤」的终点",
         "ids": ["E23", "E22",             # 长期毒性：目的五方面 / 给药期限跟临床疗程走
                 "E17",                    # 慢性段 12 个月的理由
                 "E15", "E16",               # 致癌性：观察对象与 24 个月
                 "E24", "E25"]},           # 慢性毒性独立设计：12 个月的理由与 6/9、18/24 的允许范围
}


def hanzi(s):
    return len(re.findall(r"[\u4e00-\u9fff]", s))


def main():
    src = json.load(open(SRC, encoding='utf-8'))
    units = src['units']
    sha = hashlib.sha256(open(SRC, 'rb').read()).hexdigest()

    out_units, used = [], set()
    for slug, title, n, kws, q, hard in CHAPTERS:
        if kws == ["__EXTERNAL__"]:
            continue  # 第 9 章走外源，不取《中药学》单元
        hits = [u for u in units if any(k in u['prose'] for k in kws)]
        # 排序：命中词越多越靠前（长尾截断用），同分按原书顺序
        hits.sort(key=lambda u: (-sum(u['prose'].count(k) for k in kws), u['sub']))
        picks = hits[:14]
        for idx, u in enumerate(picks, 1):
            used.add(u['sub'])
            views = {k: sum(u['prose'].count(w) for w in ws) for k, ws in VIEWS.items()}
            lev = {k: sum(u['prose'].count(w) for w in ws) for k, ws in LEVELS.items()}
            out_units.append({
                "chapter": str(n), "chapterTitle": title,
                # 派生单元的编号按本章重排（1.1、1.2…），保证一章的 locator 只属于这一章；
                # 源编号另存 source，追回原句不受影响。
                "sub": f"{n}.{idx}", "srcSub": u['sub'], "title": u['title'],
                "locator": f"派生·第{n}章·{n}.{idx}",
                "source": u['locator'],
                "brief": u.get("brief", ""), "goals": [], "rawBody": u['prose'], "body": u['prose'], "prose": u['prose'],
                "segments": [{"title": s['title'], "hanzi": s['hanzi']} for s in u['segments']],
                "hanzi": u['hanzi'],
                "measure": {"digits": u['measure']['digits'], "valueLike": u['measure']['valueLike'],
                            "views": views, "levels": lev},
            })

    # ── 第 9、10 章：外源条文（逐字可查者才进来）────────────────────────
    ext = json.load(open(os.path.join(OUT, '外源条文.json'), encoding='utf-8'))
    reg = json.load(open(os.path.join(OUT, '补源登记.json'), encoding='utf-8'))
    verified = {c['id']: c for c in reg['clauses'] if c['verified']}
    by_id = {c['id']: c for c in ext['clauses']}
    for n, spec in sorted(EXT_CHAPTERS.items()):
        for idx, cid in enumerate(spec['ids'], 1):
            if cid not in verified:
                continue  # 校勘未通过的不入章——宁可少一条，不引一条查不到的
            c = by_id[cid]
            meta = ext['sources'][c['source']]
            body = (f"【原文】{c['原文']}\n【{c['中文'][:2]}】{c['中文'][3:] if c['中文'].startswith('转述：') else c['中文']}\n"
                    f"【要点】{c['要点']}")
            prose = body
            views = {k: sum(prose.count(w) for w in ws) for k, ws in VIEWS.items()}
            lev = {k: sum(prose.count(w) for w in ws) for k, ws in LEVELS.items()}
            out_units.append({
                "chapter": str(n), "chapterTitle": spec['title'],
                "sub": f"{n}.{idx}", "srcSub": cid, "title": f"{meta['title'].split('：')[0][:28]} {c['clause']}",
                "locator": f"外源·{meta['title']} {c['clause']}",
                "source": meta['url'],
                "sourceFile": meta['file'],
                "brief": c['要点'], "goals": [], "rawBody": body, "body": body, "prose": prose,
                "segments": [{"title": cid, "hanzi": hanzi(body)}],
                "hanzi": hanzi(body),
                "measure": {"digits": len(re.findall(r"\d", prose)),
                            "valueLike": len(re.findall(r"\d+(?:\.\d+)?\s*(?:mg|g|kg|ml|%|天|周|个月)", prose)),
                            "views": views, "levels": lev},
            })

    counts = {"chapters": len(CHAPTERS), "units": len(out_units),
              "hanzi": sum(u['hanzi'] for u in out_units),
              "sourceUnits": len(units), "uniqueSource": len(used),
              "digits": sum(u['measure']['digits'] for u in out_units),
              "valueLike": sum(u['measure']['valueLike'] for u in out_units)}
    probe = {}
    for g, lv in (("view", VIEWS), ("organ", LEVELS)):
        probe[g] = {k: 0 for k in lv}
        for u in out_units:
            for k, v in u['measure']['views' if g == 'view' else 'levels'].items():
                probe[g][k] += v
    ratio = {g: (round(max(b.values()) / min([v for v in b.values() if v] or [1]), 1)
                 if any(b.values()) else None) for g, b in probe.items()}

    os.makedirs(OUT, exist_ok=True)
    json.dump({"source": {"kind": "派生", "from": "standards/zhongyao-xue/units.json",
                          "sha256": sha, "units": len(units), "hanzi": src['counts']['hanzi']},
               "counts": counts, "views": VIEWS, "levels": LEVELS, "probe": probe, "ratio": ratio,
               "chapters": [{"no": str(n), "title": t, "slug": s} for s, t, n, _k, _q, _h in CHAPTERS],
               "units": out_units},
              open(os.path.join(OUT, 'units.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump({"counts": counts, "probe": probe, "ratio": ratio},
              open(os.path.join(OUT, 'axis-probe.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump({"kind": "派生", "note": "无母本；由《中药学》教材单元按毒理学主题重排，locator 一律 派生·",
               "source": "standards/zhongyao-xue/units.json", "sha256": sha,
               "why": "本库 9 院系 187 学科无「中药毒理学」，F:/textbooks 无对应工作簿；按《中医证候学》《中医体质学》的派生做法建课，不虚构原文。",
               "chapters": [{"no": str(n), "slug": s, "title": t, "question": q, "hard": h}
                            for s, t, n, _k, q, h in CHAPTERS]},
              open(os.path.join(OUT, 'METHOD.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    cmap = {}
    for slug, title, n, _k, _q, _h in CHAPTERS:
        cmap[slug] = {"n": n, "title": title,
                      "units": [u['sub'] for u in out_units if u['chapter'] == str(n)]}
    json.dump({"note": "派生课无教材章号；本表把课程 8 章映射到派生单元号（每章自重排 1..14），源单元号见 units.json 的 srcSub。",
               "chapters": cmap},
              open(os.path.join(OUT, 'chapter-map.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    print(f"章 {counts['chapters']} · 派生单元 {counts['units']} · 汉字 {counts['hanzi']:,} · "
          f"去重源单元 {counts['uniqueSource']}/{counts['sourceUnits']}")
    for slug, title, n, _k, _q, _h in CHAPTERS:
        us = [u for u in out_units if u['chapter'] == str(n)]
        print(f"  {n:>2} {slug:26} 单元 {len(us):>2} · {sum(u['hanzi'] for u in us):>6,} 字")
    print('词频', json.dumps(probe, ensure_ascii=False))
    print('比值', json.dumps(ratio, ensure_ascii=False))


if __name__ == '__main__':
    main()
