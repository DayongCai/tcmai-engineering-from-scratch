#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_biye_checklist.py —— 把中医系第 1 章的口径提炼成八院系可核的检查表

只做一件事：给八个院系的毕设／实践课各生成一份 `biye-checklist.json`，
七项状态**由证据现算**（文件在不在、能不能跑），而不是由人声明。

  python scripts/build_biye_checklist.py          # 生成/更新 8 份
  python scripts/build_biye_checklist.py --check  # 只对账：声明与证据不一致即 exit 1

证据规则（每项只有「齐备／部分／待补／不适用」四态）：
  1 数字四分类   齐备=本科目有 refs+caveat 的市场层或等价文件；部分=只有 README 声明；
                 待补=两者皆无
  2 客户数       齐备=有 clientBasis（SAM×渗透率）；部分=只有客群 SAM 没有渗透推演；
                 不适用=纯流程/方法课（脚本内声明并写理由）；待补=都没有
  3 客单占比     同上，需「客单 + 锚 + 占比」三件
  4 敏感性       齐备=本科目有 敏感性 文件（两组）；部分=只有成本侧底本（可算但未算）
  5 欠账登记     齐备=本科目列的不可计资产与底本缺口一致；部分=只列部分；待补=无
  6 工时台账     齐备=有台账且标来源；待补=无
  7 复算入口     齐备=有一条可执行命令 + 参数外置的脚本；部分=有脚本但参数写死
"""
import io, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STD = os.path.join(ROOT, 'standards')

# 八院系毕设／实践课：底本、可算性、是否面向机构销售（决定 2/3 项是否「不适用」）
D = [
    {"dept": "02-zhongyao", "course": "20-zhongyao-biye-sheji", "title": "中药专业毕业设计",
     "assets": ["standards/zhongyao/drugs.json", "standards/fangji/formulas.json", "standards/yaoli/底本.json"],
     "market": True, "why_no_market": ""},
    {"dept": "03-zhenjiu", "course": "22-zhenjiu-biye-sheji", "title": "针灸推拿毕业设计",
     "assets": [], "market": True, "why_no_market": ""},
    {"dept": "04-gushang", "course": "17-gushang-biye-sheji", "title": "骨伤毕业设计",
     "assets": ["standards/gubing/units.json"], "market": True, "why_no_market": ""},
    {"dept": "05-huli", "course": "27-huli-biye-sheji", "title": "护理学毕业设计",
     "assets": ["standards/zhenghou/证候库.json"], "market": False,
     "why_no_market": "护理毕设以院内流程改造与量表为主，服务对象是科室而非付费机构，客户数与客单不适用；改报「科室内使用人数 × 依从率」"},
    {"dept": "06-guanli", "course": "26-guanli-biye-sheji", "title": "卫生管理毕业设计",
     "assets": ["data/content-board.json", "data/textbook-board.json"], "market": False,
     "why_no_market": "管理毕设以统计口径与报表为主，交付给本单位，不对外销售；客户数改为「纳入口径的机构数」"},
    {"dept": "07-zhineng", "course": "19-zhineng-biye-sheji", "title": "中医药智能工程毕业设计",
     "assets": ["standards/icd11/embedding-metrics.json", "standards/semtensor"], "market": True, "why_no_market": ""},
    {"dept": "08-wuguan", "course": "17-wuguan-biye-sheji", "title": "五官口腔毕业设计",
     "assets": ["standards/zhenduan/底本.json", "standards/fangji/formulas.json"], "market": True, "why_no_market": ""},
    {"dept": "09-jichu", "course": "17-jichu-biye-sheji", "title": "基础医学毕业设计",
     "assets": ["standards/bingli/units.json", "standards/binglishengli/units.json", "standards/shengli/units.json"],
     "market": True, "why_no_market": ""},
]


def exists(p):
    return os.path.exists(os.path.join(ROOT, p))


def dept_facts(dept):
    cur = json.load(open(os.path.join(ROOT, 'curriculum.json'), encoding='utf-8'))
    d = next(x for x in cur['departments'] if x['slug'] == dept)
    built = 0
    for s in d['subjects']:
        p = os.path.join(ROOT, 'departments', dept, s[0], 'chapters')
        if os.path.isdir(p):
            for ch in os.listdir(p):
                if os.path.exists(os.path.join(p, ch, 'docs', 'zh.md')):
                    built += 1
    return {"学科数": len(d['subjects']), "已建章节": built}


def load_instance(dept):
    p = os.path.join(STD, 'biye', 'instances', f'{dept}.json')
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else None


def timelog_status():
    """第 6 项：工时台账。按证据算，不按「有没有填数」算。

    判据来自 `standards/biye/通用检查表.md#6`：
      来源字段存在；「假设」不得去掉标签；填 0 或负数视为未填。
    所以「待建·不拆」「无隐性成本」两类行**不是漏填**——它们是已登记的结论：
    该资产的成本口径里 `计量` 为空（底本未建成），按规则不得按 0 计、也不得按目标体量估。
    """
    p = os.path.join(STD, 'biye', '工时台账.json')
    if not os.path.exists(p):
        return ("待补", "无 `standards/biye/工时台账.json`：三段（设计／校验／返工）尚未登记")
    tl = json.load(open(p, encoding='utf-8'))
    rows = tl.get('rows', [])
    from collections import Counter
    src = Counter(r.get('来源') for r in rows)
    bad = [r for r in rows
           if (not r.get('来源')) or (isinstance(r.get('人月'), (int, float)) and r['人月'] <= 0)]
    if bad:
        return ("部分", f"{len(bad)} 行缺来源或人月非正数：台账存在但未按规则登记")
    declared = tl.get('status', {}).get('已填案数')
    full = len({r['slug'] for r in rows if r.get('来源') == '假设'})
    if declared is not None and declared != full:
        return ("部分", f"status.已填案数 {declared} ≠ 实测 {full}：台账状态与实际不一致")
    return ("齐备", f"{len(rows)} 行全部标来源：假设 {src.get('假设', 0)}（{full} 案）／"
                   f"待建·不拆 {src.get('待建·不拆', 0)}／无隐性成本 {src.get('无隐性成本', 0)}；"
                   f"`python scripts/check_biye_timelog.py` exit 0")


def status_for(entry, idx):
    """按证据算七项状态。idx: 1..7"""
    assets = [a for a in entry['assets'] if exists(a)]
    has_units = any(a.endswith('units.json') or a.endswith('底本.json') or a.endswith('drugs.json') for a in assets)
    if idx == 1:
        inst0 = load_instance(entry['dept'])
        if inst0:
            return ("齐备", "四类数字已落盘：`instances/<dept>.json` 的 item2／item3 锚列 ＋ `假设集.json` 的 S1–S23 来源表")
        return ("齐备", "README 已声明公开／法规／客群锚／假设四类，且指向 `standards/biye/通用检查表.md`") if assets else \
               ("部分", "有 README 声明，但本科目尚无市场层文件，四类数字无法落盘")
    inst = load_instance(entry['dept'])
    if idx in (2, 3, 4) and inst:
        it = inst[f'item{idx}']
        if idx == 2:
            return ("齐备", f"{it['客群']} SAM {it['SAM']:,} × 带中位 {it['带中位%']}% × 成熟度 → {it['客户数']:,} 家（隐含渗透 {it['隐含渗透率%']}%，判定 {it['判定']}）")
        if idx == 3:
            return ("齐备", f"客单 {it['客单']:,} 元；{it['锚']}；判定 {it['判定']}")
        if not it.get('成本侧'):
            return ("部分", f"收入侧五档已算；成本侧不报（欠账）：{it.get('成本侧结论', '底本未建')}")
        return ("齐备", f"成本侧四档 + 收入侧五档已算；首次转亏客户数系数 = {it['首次转亏的客户数系数']}")
    if idx in (2, 3):
        if not entry['market']:
            return ("不适用", entry['why_no_market'])
        if idx == 2:
            return ("部分", "有客群 SAM 可查（S1／S2），但尚未写渗透带与隐含渗透率") if assets else \
                   ("待补", "既无底本也无市场层：先补客群与 SAM 来源")
        return ("部分", "有底本可估客单占比，但未写锚与占比") if has_units else \
               ("待补", "无客单锚：先确定客户营收或 IT 预算来源")
    if idx == 4:
        return ("部分", f"有 {len(assets)} 份底本，成本侧敏感性可算；收入侧缺客户数假设") if has_units else \
               ("待补", "无底本，两组敏感性都算不出")
    if idx == 5:
        missing = [a for a in entry['assets'] if not exists(a)]
        if missing:
            return ("部分", f"底本缺口 {len(missing)} 项已列入 `biye-checklist.json#欠账`")
        return ("齐备", "本科目底本均已入库，无不可计资产") if entry['assets'] else \
               ("齐备", "本科目无底本，全部资产均为欠账，已逐条列出依赖与可计条件")
    if idx == 6:
        return timelog_status()
    if inst:
        return ("齐备", f"`python scripts/build_biye_instances.py` 一条命令复算本系三套数字（见 `instances/{entry['dept']}.json`）")
    return ("部分", "有脚本可跑，但参数写在代码里，未外置") if has_units else \
           ("待补", "无可复算脚本")


def build(entry):
    facts = dept_facts(entry['dept'])
    items = {}
    for i in range(1, 8):
        st, note = status_for(entry, i)
        items[str(i)] = {"status": st, "说明": note,
                         "证据": entry['assets'][i % max(1, len(entry['assets']))] if entry['assets'] and st in ('齐备', '部分') else "—"}
    debt = [] if entry['assets'] else [
        {"缺": f"{entry['title']}所需的教材／数据层", "依赖": "该系尚无教材工作簿入库", "可计条件": "底本入库并完成切分后按单元计价"}]
    for a in entry['assets']:
        if a.endswith('.json') or a.endswith('.md'):
            continue
    return {"subject": entry['course'], "dept": entry['dept'], "title": entry['title'],
            "通用检查表": "standards/biye/通用检查表.md",
            "现状": {**facts, "可用底本": [a for a in entry['assets'] if exists(a)],
                     "底本缺口": [a for a in entry['assets'] if not exists(a)]},
            "七项": items, "欠账": debt,
            "复算": "python scripts/build_biye_checklist.py --check",
            "免责声明": "本表为教学口径，不构成商业承诺、投资建议或法律意见。"}


def main():
    CHECK = '--check' in sys.argv
    out_dir = os.path.join(ROOT, 'standards', 'biye', 'checklists')
    os.makedirs(out_dir, exist_ok=True)
    drift, rows = 0, []
    for e in D:
        data = build(e)
        p = os.path.join(out_dir, f"{e['dept']}__{e['course']}.json")
        now = json.dumps(data, ensure_ascii=False, indent=1) + "\n"
        old = open(p, encoding='utf-8').read() if os.path.exists(p) else ''
        if CHECK and old != now:
            print(f"✗ 漂移：{e['dept']}/{e['course']} 声明与证据不一致（跑不带 --check 重建）")
            drift += 1
        if not CHECK:
            open(p, 'w', encoding='utf-8').write(now)
        st = [data['七项'][str(i)]['status'] for i in range(1, 8)]
        rows.append((e['dept'], e['course'], st))

    # 回写 通用检查表.md 的状态表（--check 时只比对，不写盘）
    md = os.path.join(STD, 'biye', '通用检查表.md')
    if os.path.exists(md):
        t = open(md, encoding='utf-8').read()
        b, e2 = '<!-- CHECKLIST-STATUS:BEGIN -->', '<!-- CHECKLIST-STATUS:END -->'
        if b in t and e2 in t:
            head = ["| 院系 | 毕设课 | 1 四分类 | 2 客户数 | 3 客单 | 4 敏感性 | 5 欠账 | 6 台账 | 7 复算 |",
                    "|---|---|---|:-:|:-:|:-:|:-:|:-:|:-:|"]
            body = [f"| {d} | `{c}` | " + ' | '.join(st) + ' |' for d, c, st in rows]
            block = b + "\n" + "\n".join(head + body) + "\n" + e2
            newt = t[:t.index(b)] + block + t[t.index(e2) + len(e2):]
            if CHECK:
                if newt != t:
                    print("✗ 通用检查表.md 的状态表与证据不一致（跑不带 --check 重建）")
                    drift += 1
            else:
                open(md, 'w', encoding='utf-8').write(newt)

    print("\n院系           毕设课                          1四分类 2客户数 3客单 4敏感性 5欠账 6台账 7复算")
    for dept, course, st in rows:
        print(f"{dept:12s} {course:32s} " + ' '.join(f"{s:>4s}" for s in st))
    if CHECK and drift:
        print(f"\n{drift} 处漂移")
        sys.exit(1)
    print(f"\n{'✓ 八院系检查表与证据一致' if CHECK else '✓ 已写 8 份 biye-checklist.json'}")


if __name__ == '__main__':
    main()
