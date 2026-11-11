# 中药新药研发

**15-zhongyao-xinyao-yanfa** · 中药学院 · 8 章 · 8 单元 · 8,740 汉字 · **外源课（无教材）**

> 章链：源头 → 生产 → 质量 → 安全 → 上市后监测 → 注册资料 → 产业化移交

## 一、为什么立成外源课

教材盘 101 份 xlsx 里没有《中药新药研发》。而中国注册法规的公开站点在本机**不可达**：
`nmpa.gov.cn` 返回 **412**（反爬），CDE 附件链接返回经混淆的 HTML 而不是 PDF。
按《补源约定》第二条，二手转载不收；按第一条，不许硬建。

最终取到的可用来源是 **WHO 草药技术文件 4 份**（IRIS 可达、有文本层）：

| 原件 | 标题 | 版本 | 规模 | sha256 |
|---|---|---|--:|---|
| `WHO-GMP-Herbal-Medicines-2007.pdf` | WHO guidelines on good manufacturing practices (GMP) for herbal medicines | 2007 | 92 页 | `4f76eae7cfae96ae…` |
| `WHO-GACP-Medicinal-Plants-2003.pdf` | WHO guidelines on good agricultural and collection practices (GACP) for medicinal plants | 2003 | 80 页 | `ec38f61d08f8c0bc…` |
| `WHO-Quality-Herbal-Contaminants-2007.pdf` | WHO guidelines for assessing quality of herbal medicines with reference to contaminants and residues | 2007 | 118 页 | `e6c8ce92c8021700…` |
| `WHO-Safety-Monitoring-Herbal-2004.pdf` | WHO guidelines on safety monitoring of herbal medicines in pharmacovigilance systems | 2004 | 82 页 | `5a11d4abcee11116…` |

**17 条逐字校勘，29/29 → 17/17 全部通过**（`python scripts/build_zhongyao_xinyao_sources.py`）。

## 二、说清一件事：WHO 文件 ≠ 中国法规

WHO 这套文件给的是**通用技术要求**（源头、生产、质量、监测），不是中国的注册程序与药典限度。
本课因此只承诺教「通用技术判据」，**不承诺教中国注册流程**；后者登记为缺口（见 `缺口登记.md`）。
拿 WHO 文件冒充《药品注册管理办法》，是这门课最容易犯也最不能犯的错。

## 三、三辨与四位面（实测）

| 三辨 | 词频 | 四位面（证据链段） | 词频 |
|---|--:|---|--:|
| **质量与标准** | **113** | 生产 | 157 |
| **安全与监测** | **53** | 质量 | 123 |
| **工艺与产业化** | **59** | 临床与上市 | 46 |
| | | 源头 | 44 |

三辨极差 **2.1×**；四位面极差 **3.6×**。

**四位面里「源头」最低（44）不是缺陷，是这门课的判断**：源头那一章只讲「怎么把变异记录住」，
真正的源头工作在生产与质量两段被反复引用——**同一件事在链条上出现三次，是这个行业的常态**。

## 四、八章章节表

| # | 段 | 引用条文 | 为什么这么排 |
|--:|---|--:|---|
| 1 | 研发路径与证据链：从药材到上市 | W01,W02,W04 | 先立框架：中药新药不是「做一个药」，而是「把一条质量—安全证据链做实」 |
| 2 | 药材源头：GACP 与可持续供应 | W06,W07,W08 | 源头这一段决定上限：药材不稳定，后面所有工艺都是给波动做补偿 |
| 3 | 生产：GMP 与关键控制点 | W03,W05 | 生产这一段的任务不是「做得出来」，而是「每次做得一样」 |
| 4 | 质量控制：标志物、指纹图谱与质量标准 | Q01,Q05 | 质量这一段回答一个问题：凭什么说这批和那批一样 |
| 5 | 污染物与残留：限度、来源与检验 | Q02,Q03,Q04 | 污染物这一段没有「差不多」：要么在限度内，要么不合格 |
| 6 | 上市后：安全性监测与药物警戒 | S01,S02,S03,S04 | 上市不是终点：前四段证明「能不能用」，这一段回答「用久了会怎样」 |
| 7 | 注册资料：技术要求如何落成可审评的文件 | W02,Q04,W05 | 这一章讲「怎么写」，不是「怎么过」：资料的组织方式决定审评能否看懂 |
| 8 | 产业化与知识移交 | W07,S03 | 最后一段：把研发成果变成别人能接手的东西 |

## 五、代价与边界

- **不写中国注册分类、申报资料目录与药典限度**（无可用来源，登记缺口）
- **不写具体工艺参数、临床方案与统计方法**（超出外源覆盖）
- 不承诺疗效，不写「有效率／治愈率」
- 外源只补判据，不改任何底本；底本汉字与外源条数分开计：**8,740 字 ＋ 17 条**

**免责声明：** 本课正文用于教学与研发训练，不构成诊疗、法律或注册申报意见；药品注册与生产以现行法规、药典与监管机构要求为准。

## 六、可执行验证

```bash
python scripts/build_zhongyao_xinyao_sources.py     # 17/17 逐字可查
node scripts/audit_curriculum.js                    # 0 错误
node --test departments/02-zhongyao/15-zhongyao-xinyao-yanfa/chapters/03-gmp-shengchan        # 单章
```

