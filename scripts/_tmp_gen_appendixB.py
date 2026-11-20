# -*- coding: utf-8 -*-
"""生成 textbooks/02-zhongyao/18-yaoshi-guanli-xue/附录B-教学章与教材章对照.md

数据来源：standards/yaoshi-guanli/补章登记.json 的 noSupplement.mapping（28 条）
与 departments/02-zhongyao/18-yaoshi-guanli-xue/chapters.json（教学 28 章标题）。
一个字都不手写：表格由映射与章文件标题拼出。
"""
import json
import pathlib
import re

ROOT = pathlib.Path(r'E:\tcmai-engineering-from-scatch')
KB = ROOT / 'textbooks/02-zhongyao/18-yaoshi-guanli-xue'
REG = json.loads((ROOT / 'standards/yaoshi-guanli/补章登记.json').read_text(encoding='utf-8'))
MAP = REG['noSupplement']['mapping']

# 教材章标题（从文件名取：05-第5章-药品注册管理.md → 药品注册管理）
tb = {}
for f in sorted(KB.glob('[0-9][0-9]-第*章-*.md')):
    no = int(f.name[:2])
    tb[no] = f.name.split('-', 2)[2].replace('.md', '')

# 教学章标题（以映射里的 title 为准，和 chapters.json 一致）
by_plan = sorted(MAP, key=lambda x: x['plan'])
by_tb = {}
for m in by_plan:
    by_tb.setdefault(m['textbookChapter'], []).append(m)

L = []
L.append('# 附录B · 教学章与教材章对照（28 ↔ 20 的另一把尺子）\n')
L.append('> **本附录不计章数**：文件名不以 `NN-第N章-` 开头，只随书进卷。')
L.append('> **依据**：`standards/yaoshi-guanli/补章登记.json` → `noSupplement.mapping`（28 条，逐条 probe 可在所指教材章内 grep 到）；'
         '决案见 `standards/口径决案.json`。')
L.append('> **这张表的作用**：教学计划按「法规流程」切 28 章，教材按「学科体系」切 20 章。'
         '读者拿教学进度来查书，或拿书来对教学进度，都要靠这张表——它不是补章清单，是**两套切分轴的换算表**。\n')

L.append('## 一、按教学章顺序查（28 行）\n')
L.append('| 教学章 | 教学章标题 | 落在教材 | 教材章标题 | 承接处（probe） |')
L.append('|--:|---|---|---|---|')
for m in by_plan:
    t = m['textbookChapter']
    L.append(f"| 第 {m['plan']} 章 | {m['title']} | 第 {t} 章 | {tb.get(t, '?')} | `{m['probe']}` |")
L.append('')

L.append('## 二、按教材章聚合查（哪一章接了几条教学线）\n')
L.append('| 教材章 | 教材章标题 | 承接的教学章 | 条数 |')
L.append('|--:|---|---|--:|')
for t in sorted(by_tb):
    plans = '、'.join(f"第{m['plan']}章" for m in by_tb[t])
    L.append(f"| 第 {t} 章 | {tb.get(t, '?')} | {plans} | {len(by_tb[t])} |")
L.append('')

no_plan = [no for no in sorted(tb) if no not in by_tb]
L.append('## 三、没有教学章对应的教材章（本库自有内容）\n')
L.append('这些章在教材里成立（学科体系需要），但教学计划没有独立章位——**不是多写了，是教学计划没切这一块**：\n')
L.append('| 教材章 | 标题 | 判断 |')
L.append('|--:|---|---|')
for no in no_plan:
    L.append(f'| 第 {no} 章 | {tb[no]} | 教材侧内容，教学侧无独立章位；如需讲，由相邻教学章带过 |')
L.append('')

L.append('## 四、两套轴为什么并存\n')
L.append('| 轴 | 组织方式 | 章数 | 好处 | 代价 |')
L.append('|---|---|--:|---|---|')
L.append('| 教学计划 | 按**法规流程**：一条流程一章（注册、生产、经营、警戒…） | 28 | 与实务操作顺序一致，便于排课与考核 | 同一制度被拆到多章，学术体系感弱 |')
L.append('| 教材 | 按**学科体系**：一类制度一章（法律体系、注册、生产、经营…） | 20 | 与学科知识结构一致，便于成书与引用 | 一条流程跨多章，读者需换算 |')
L.append('')
L.append('**为什么不拆教材**：底本源表只有 20 章，`scripts/import_textbooks.js --check` 要求教材 ↔ 源表逐章对应；'
         '拆成 28 章会造出 8 章无底本的重复稿，并使底本统计虚增。')
L.append('')
L.append('**为什么不并课程**：13 个教学章并成 5 章（教材3←11+12+19+20+22、教材5←1–8、教材6←14+25+26、教材7←15+16+27+28、教材9←18+23+24），'
         '要删 8 个章目录、重写 13 章 docs/quiz/outputs 契约，并改动 2154 章节 / 11547 学时的审计基数——代价远大于收益。')
L.append('')
L.append('**操作层内容在哪**：法规流程怎么走，见 [`附录A-法规操作专题`](附录A-法规操作专题.md)（8 个专题、106 条外源条文逐字可查，不当章、不计章数）。')
L.append('')

out = KB / '附录B-教学章与教材章对照.md'
out.write_text('\n'.join(L) + '\n', encoding='utf-8')
print('已写', out.name, '· 教学行', len(by_plan), '· 教材聚合', len(by_tb), '· 无教学对应的教材章', no_plan)
