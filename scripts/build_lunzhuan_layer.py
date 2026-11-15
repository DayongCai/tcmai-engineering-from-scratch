#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_lunzhuan_layer.py —— 中医临床轮转：按科室自动生成轮转要求

没有母本教材（《中医临床轮转》是流程课，本就不该有章节式教材）。
本层不从零编要求，而是**从本库已有的底本里抽**：

  必须见病   ← 内科 14 章的「节」就是病名（4.2 咳嗽、5.1 心悸…），一篇不增不删
  必须做操作 ← 每病固定 5 小节（概述／病因病机／辨证论治／预防调护／按语）＝ 5 项必做动作
  出科考什么 ← 该科「辨证论治」小节数（60 个，每个都带「代表方：」）＋ 代表方数
              ＋ 证候库 132 证里能在该科文本中找到的同名证数（白名单匹配，低噪声）

科室与教材章的映射不是一一对应：

  心病科 ← 心系病证（9 病）      肺病科 ← 肺系病证（8 病）
  脾胃病科 ← 脾胃系病证（9 病）  肾病科 ← 肾系病证（6 病）
  脑病科 ← 跨两章的 6 病（肝系 头痛/眩晕/中风 ＋ 心系 痫病/痴呆/厥证）

最后一条是本课程最重要的发现：**教材按脏腑分章，科室按病种收人，两者对不齐。**
脑病科在教材里没有独立一章，必须跨章取病——这就是真实轮转要面对的第一件事。
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NEIKE = os.path.join(ROOT, 'standards', 'neike', 'units.json')
ZH = os.path.join(ROOT, 'standards', 'zhenghou', '证候库.json')
OUT = os.path.join(ROOT, 'standards', 'lunzhuan')

SUBJECT = '21-zhongyi-linchuang-lunzhuan'

KE = [
    {"slug": "01-xinbing-lunzhuan", "title": "心病科轮转：胸痹与心悸的辨证接诊",
     "ke": "心病科", "chapters": ["心系病证"], "diseases": None},
    {"slug": "02-feibing-lunzhuan", "title": "肺病科轮转：咳嗽与喘证的辨证接诊",
     "ke": "肺病科", "chapters": ["肺系病证"], "diseases": None},
    {"slug": "03-piwei-lunzhuan", "title": "脾胃病科轮转：胃痞与泄泻的辨证接诊",
     "ke": "脾胃病科", "chapters": ["脾胃系病证"], "diseases": None},
    {"slug": "04-shenbing-lunzhuan", "title": "肾病科轮转：水肿与淋证的辨证接诊",
     "ke": "肾病科", "chapters": ["肾系病证"], "diseases": None},
    {"slug": "05-naobing-lunzhuan", "title": "脑病科轮转：眩晕与中风的辨证接诊",
     "ke": "脑病科", "chapters": ["肝系病证", "心系病证"],
     "diseases": ["头痛", "眩晕", "中风", "痫病", "痴呆", "厥证"]},
    {"slug": "06-chuke-kaohe", "title": "出科考核与病例复盘（含结构化病历）",
     "ke": "全部五科", "chapters": None, "diseases": None},
]

ACTIONS = ["概述", "病因病机", "辨证论治", "预防调护", "按语"]

# 「代表方：小柴胡汤加减（《伤寒论》）」——取处方名，去掉「加减」与两个书名号
FANG_RE = re.compile(r"代表方[：:]\s*([^。；，\n]{1,40})")


def clean_fang(raw):
    s = raw.strip()
    s = re.sub(r"[（(].*$", "", s)              # 去出处
    for suffix in ("加减", "加味", "为主", "化裁", "合用"):
        s = s.replace(suffix, "")
    s = s.strip(" 　、；，")
    return s if 2 <= len(s) <= 24 else ""


def load():
    us = json.load(open(NEIKE, encoding='utf-8'))['units']
    zh = json.load(open(ZH, encoding='utf-8'))['zheng']
    return us, zh


def by_sec(us, chapters, diseases=None):
    """按「节」聚合（一节＝一病）。"""
    out = {}
    for u in us:
        if chapters and u['chapterTitle'] not in chapters:
            continue
        name = u['secTitle']
        if diseases and name not in diseases:
            continue
        d = out.setdefault(name, {"name": name, "chapter": u['chapterTitle'], "sec": u['sec'],
                                  "hanzi": 0, "values": 0,
                                  "terms": {"病因": 0, "病机": 0, "证候表现": 0}, "subs": []})
        d["hanzi"] += u['hanzi']
        d["values"] += u['values']
        for k in d["terms"]:
            d["terms"][k] += u['terms'].get(k, 0)
        d["subs"].append(u['title'])
    for d in out.values():
        d["subs"] = sorted(d["subs"])
        d["actionsDone"] = len([a for a in ACTIONS if any(a in s for s in d["subs"])])
    return out


def scan_bianzheng(us, chapters, diseases=None, zh_names=()):
    """统计该科「辨证论治」小节：单元数、代表方数、与证候库同名的证数。"""
    units = 0
    fangs, zhit = set(), set()
    for u in us:
        if u['chapterTitle'] not in (chapters or []):
            continue
        if diseases and u['secTitle'] not in diseases:
            continue
        if '辨证论治' not in u['title']:
            continue
        units += 1
        for raw in FANG_RE.findall(u['prose']):
            f = clean_fang(raw)
            if f:
                fangs.add(f)
        for z in zh_names:
            if z in u['prose']:
                zhit.add(z)
    return {"units": units, "fang": len(fangs), "zhengKB": len(zhit),
            "fangSample": sorted(fangs)[:12], "zhengSample": sorted(zhit)[:12]}


def cross_courses(disease, others):
    return sum(1 for subj, units in others.items()
               if any(disease in (u.get('secTitle') or '') or disease in (u.get('title') or '') for u in units))


def main():
    us, zh = load()
    zh_names = [z['name'] for z in zh]
    others = {}
    for subj in ['waike', 'fuke', 'erke', 'gubing', 'laonian', 'jingshen', 'jizhen']:
        p = os.path.join(ROOT, 'standards', subj, 'units.json')
        if os.path.exists(p):
            d = json.load(open(p, encoding='utf-8'))
            others[subj] = d['units'] if isinstance(d, dict) else d

    units_out, ke_stats, all_disease = [], [], set()

    for ch in KE[:5]:
        secs = by_sec(us, ch['chapters'], ch['diseases'])
        items = sorted(secs.values(), key=lambda x: -x['hanzi'])
        must, opt = items[:6], items[6:]
        kb = scan_bianzheng(us, ch['chapters'], ch['diseases'], zh_names)
        cross = {i['name']: cross_courses(i['name'], others) for i in items}
        all_disease |= {i['name'] for i in items}

        st = {"ke": ch['ke'], "diseases": len(items), "must": len(must), "opt": len(opt),
              "actions": len(items) * 5, "bianzhengUnits": kb['units'], "fang": kb['fang'],
              "zhengKB": kb['zhengKB'], "values": sum(i['values'] for i in items),
              "crossed": sum(1 for v in cross.values() if v > 0),
              "maxCross": max(cross.values()) if cross else 0,
              "hanzi": sum(i['hanzi'] for i in items),
              "mustNames": [i['name'] for i in must], "optNames": [i['name'] for i in opt],
              "fangSample": kb['fangSample'], "zhengSample": kb['zhengSample']}
        ke_stats.append(st)

        prose = (
            f"{st['ke']}轮转的病名全部来自教材的「节」，一篇不增不删：共 {st['diseases']} 病、{st['hanzi']:,} 汉字。"
            f"每病固定 5 项必做动作（{'／'.join(ACTIONS)}），合计 {st['actions']} 项；"
            f"必修取篇幅前 6（{'、'.join(st['mustNames'])}），其余 {st['opt']} 病列选做。"
            f"出科考核的三件可核证据：辨证论治小节 {st['bianzhengUnits']} 个、代表方 {st['fang']} 首、"
            f"与证候库同名的证 {st['zhengKB']} 个；数值判据 {st['values']} 处。"
            f"跨科校验：{st['crossed']} 个病在本库其他临床课里也出现（最多跨 {st['maxCross']} 门）。"
        )
        units_out.append({
            "no": f"{int(ch['slug'][:2])}.1", "sub": f"{int(ch['slug'][:2]):02d}.1",
            "title": f"{st['ke']}轮转要求", "chapter": str(int(ch['slug'][:2])),
            "measure": {"views": {"病种覆盖": st['diseases'], "动作完成": st['actions'],
                                  "考核证据": st['bianzhengUnits'] + st['fang']},
                        "levels": {"必须见病": st['diseases'], "必须做操作": st['actions'],
                                   "出科考核": st['bianzhengUnits'], "跨科衔接": st['crossed']},
                        "valueLike": st['values'], "digits": st['values']},
            "tri": {"view": {"primary": "考核证据"},
                    "level": {"primary": "必须做操作"}},
            "chapterTitle": ch['title'], "sec": ch['slug'], "secTitle": ch['ke'],
            "locator": f"派生·第{int(ch['slug'][:2])}章·{ch['ke']}",
            "ke": ch['ke'], "sources": ch['chapters'],
            "diseaseCount": st['diseases'], "must": st['mustNames'], "optional": st['optNames'],
            "actions": ACTIONS, "actionCount": st['actions'],
            "bianzhengUnits": st['bianzhengUnits'], "fang": st['fang'], "zhengKB": st['zhengKB'],
            "values": st['values'], "crossed": st['crossed'], "maxCross": st['maxCross'],
            "hanzi": st['hanzi'], "fangSample": st['fangSample'], "zhengSample": st['zhengSample'],
            "prose": prose,
        })

    tot = {"ke": 5,
           "diseases": sum(s['diseases'] for s in ke_stats),
           "must": sum(s['must'] for s in ke_stats),
           "opt": sum(s['opt'] for s in ke_stats),
           "actions": sum(s['actions'] for s in ke_stats),
           "bianzhengUnits": sum(s['bianzhengUnits'] for s in ke_stats),
           "fang": sum(s['fang'] for s in ke_stats),
           "zhengKB": sum(s['zhengKB'] for s in ke_stats),
           "values": sum(s['values'] for s in ke_stats),
           "crossed": sum(s['crossed'] for s in ke_stats),
           "hanzi": sum(s['hanzi'] for s in ke_stats)}
    prose6 = (
        f"五科合计 {tot['diseases']} 病、{tot['actions']} 项动作、{tot['hanzi']:,} 汉字。"
        f"出科考核不考「学完了没有」，考三件可核的事：必修 {tot['must']} 病能否各讲一遍、"
        f"{tot['bianzhengUnits']} 个辨证论治小节里的代表方能否对上号、{tot['values']} 处数值判据能否报出。"
        f"结构化病历的字段由此定：病名（教材的节）＋证候（证候库 132 证中能在本科找到的 {tot['zhengKB']} 证）＋方（代表方）。"
        f"合格线不是「讲得对」，而是三者能互相对上，且能说出为什么不用另两个近似证。"
    )
    units_out.append({
        "no": "06.1", "sub": "06.1", "title": "五科汇总与出科考核要求",
        "chapter": "6", "chapterTitle": KE[5]['title'], "sec": KE[5]['slug'],
        "measure": {"views": {"病种覆盖": tot['diseases'], "动作完成": tot['actions'],
                              "考核证据": tot['bianzhengUnits'] + tot['fang']},
                    "levels": {"必须见病": tot['diseases'], "必须做操作": tot['actions'],
                               "出科考核": tot['bianzhengUnits'], "跨科衔接": tot['crossed']},
                    "valueLike": tot['values'], "digits": tot['values']},
        "tri": {"view": {"primary": "考核证据"}, "level": {"primary": "必须做操作"}},
        "secTitle": "五科汇总", "locator": "派生·第6章·五科汇总",
        "ke": "全部五科", "sources": [k['ke'] for k in KE[:5]],
        "diseaseCount": tot['diseases'], "must": [], "optional": [],
        "actions": ACTIONS, "actionCount": tot['actions'],
        "bianzhengUnits": tot['bianzhengUnits'], "fang": tot['fang'], "zhengKB": tot['zhengKB'],
        "values": tot['values'], "crossed": tot['crossed'], "maxCross": 0,
        "hanzi": tot['hanzi'], "fangSample": [], "zhengSample": [],
        "prose": prose6,
    })

    os.makedirs(OUT, exist_ok=True)
    counts = {"ke": 5, "chapters": 6, "units": len(units_out), **{k: tot[k] for k in
              ('diseases', 'must', 'opt', 'actions', 'bianzhengUnits', 'fang', 'zhengKB', 'values', 'crossed', 'hanzi')}}
    json.dump({"subject": SUBJECT, "title": "中医临床轮转 · 科室要求层",
               "source": "standards/neike/units.json（病名／5 动作／辨证论治与代表方）＋ standards/zhenghou/证候库.json（132 证白名单）",
               "counts": counts, "actions": ACTIONS, "ke": ke_stats},
              open(os.path.join(OUT, '科室库.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump({"subject": SUBJECT,
               "source": "派生：standards/neike/units.json（节＝病，384 单元）＋ standards/zhenghou/证候库.json（132 证白名单）；流程课，无章节式教材",
               "counts": counts, "units": units_out},
              open(os.path.join(OUT, 'units.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump({"subject": SUBJECT,
               "why": "《中医临床轮转》是流程课，无章节式教材。本层从 standards/neike 的 384 个单元按「节＝病」聚合出 5 个轮转科室的病单；动作取教材每病固定的 5 小节；考核证据取「辨证论治」小节数、代表方数、证候库同名证数（白名单匹配，不用开放式正则）；科室与教材章不是一一对应（脑病科跨肝系与心系两章取 6 病）。",
               "sources": ["standards/neike/units.json", "standards/zhenghou/证候库.json"],
               "rules": {"必须见病": "教材「节」标题，一篇不增不删",
                          "必须做操作": "每病 5 小节：概述／病因病机／辨证论治／预防调护／按语",
                          "出科考核": "辨证论治小节数（每节带「代表方：」）＋代表方去重数＋证候库 132 证的同名命中数＋数值判据",
                          "科室映射": "心病=心系；肺病=肺系；脾胃=脾胃系；肾病=肾系；脑病=肝系(头痛/眩晕/中风)+心系(痫病/痴呆/厥证)",
                          "噪声处理": "证名不使用开放式正则（会捞到「尚须与喘证」这类片段），改用证候库 132 证白名单匹配"}},
              open(os.path.join(OUT, 'METHOD.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    print(json.dumps(counts, ensure_ascii=False))
    for s in ke_stats:
        print(f"{s['ke']} 病{s['diseases']} 动作{s['actions']} 必{s['must']} 字{s['hanzi']:,} "
              f"辨证单元{s['bianzhengUnits']} 方{s['fang']} 证候库{s['zhengKB']} 值{s['values']} 跨{s['crossed']}/{s['maxCross']}")


if __name__ == '__main__':
    main()
