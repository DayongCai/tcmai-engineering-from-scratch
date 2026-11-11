# 语义张量 · 等价映射（跨语种等价翻译）

> 产物：`classes.json`（**入库** —— 它由已入库的 WHO 术语表与已核证候数据算出来，重跑即可复现）
> 建：`scripts/build_equivalence.js` · 查：`scripts/lib_equivalence.js` · 词典：`scripts/lib_zh_en.js`
> 测试：`tests/test_equivalence.js`（22 例）
> 依据：`standards/semtensor/规范-三维极坐标语义张量-v1.0.md` §5（确定性编码）· §10（张量相似）

## 一句话

**等价 = 同一个语义点。** 一个等价类绑定**恰好一个**张量坐标 (θ, φ, r)；类里的成员是同一个术语
在不同语种／不同写法下的形式。所以「翻译」不是语言转换，而是**读同一个点的另一个名字**。

```
中文「肝胆湿热证」 ─┐
繁体「肝膽濕熱證」 ─┼─▶ 张量点 (θ=8.05°, φ=45°, r=0.843, #A23286) ─▶ ICD-11 术语层 ─▶ 编码
英文「liver-gallbladder dampness-heat pattern/syndrome」 ─┘
```

为什么不按相似度阈值：阈值会说「0.83 相似，所以翻译成它」，那是**相似**；同一个点是**全等** ——
要么在类里，要么不在，没有中间地带，也就没有「看起来差不多」的假等价。
跨类的相似度另有 §10 的张量相似 `S_T`（方向 0.65 / 尺度 0.15 / 色差 0.20），它**只用来排序，不用来宣称等价**。

## 判据分级（四级，每级都要有出处）

| 级 | 判据 | 是什么 | 条数 |
|---|---|---|---|
| **A** | WHO ISTT 同一条目的 zh ↔ en（代码＋书页可回查） | 定义级等价 | 239 |
| **B** | 同条目的中文别名位、`whoEnglishAliases`、本仓库登记的 ICD-11 编码与官方英文标题 | 编码同源 | 8 |
| **C** | ICD-11 TM1 英文标题与 WHO 英文名**规范化后逐字相等** | 排版差异下的同一术语 | 4 |
| **D** | 切词后按**四轴命名法**组合出来的**检索探针**（不进 `members`） | **不是等价**，只给检索用 | 66 |

D 级内部再分两档，**下游只吃第一档**（发布门）：

| 档 | 判据 | 条数 | 下游 |
|---|---|---|---|
| **axes** | 每个英文片段都归到了官方命名法的轴（body structure / cause / property / severity），且在 472 条官方题名里有同构先例 | **42** | 进检索 |
| **glossary** | 词表切词拼起来的，含 WHO 的 TM1 英文里不用的词（`toxin`、`failure to constrain`、`non interaction`） | **24** | **仅供参考**（`referenceOnly`，带原因） |

**不做**：跨类推断、同义词猜测、机器翻译、按相似度取最近邻。查不到就进 `unresolved`。

规范化规则（`normalizeZh` / `normalizeEn`，测试钉死）：

- 中文：去括注（括注是解释位不是术语本体）、去空白；**繁简与异体字都进索引**。
- 英文：去代码前缀 → `pattern/syndrome` 三种写法归一 → 去 `(TM1)` → 修连字符断裂 →
  只留字母数字 → 去虚词 → **词序归一**。
  词序归一成立的前提是**词集完全相同**：`dampness-heat in the spleen and stomach` 与
  `spleen and stomach dampness-heat` 同串；少一个词或换一个病性就不算（测试各有一条负例）。

## 实测（2026-10-27，本机）

| 项 | 数 |
|---|---|
| 等价类 | **117**（DSU 104 · 六经域 6 · 四系统 4 · 精气神 3） |
| 成员 | **251**（zh-Hans 137 · zh-Hant 61 · en 53） |
| **DSU 可翻译** | **93 / 104（89.4%）** —— 有英文成员 33 · 仅组合探针 60 |
| 未解析（连探针都没有） | 11（如「胸阳痹阻、痰瘀互结证」：`痹阻`/`互结` 不在 WHO 表里，切词覆盖率 <0.6） |
| 同名多义 | **31 处** |
| 与已核 26 条 who-tcm 对读 | 26/26 都能在类里找到其 WHO 英文名 |

### 同名多义：这不是 bug，是数据里的事实

`气滞血瘀证`（DSU-00009）与 `气滞血瘀证(颈部)`（DSU-00017）**是同一个名字、两个单元、两个张量点**：

| 单元 | θ | φ | r | HEX |
|---|---|---|---|---|
| DSU-00009 气滞血瘀证 | 14.602° | 45° | 0.7865 | `#973D8A` |
| DSU-00017 气滞血瘀证(颈部) | −13.774° | 78.69° | 0.62 | `#D43B32` |

所以 `resolve('气滞血瘀证')` **返回两个候选**，`ambiguousForms` 里登记，绝不静默取第一个。
下游（检索、展示）必须按上下文择一 —— 替它选一个就是在替临床判断。

## 中文直查：这一层存在的理由

ICD-11 MMS 快照只有英文。上一版靠「该证候恰好有 WHO 英文名字段」两跳，**只有 26/104 有那个字段**。
现在查询原样进来，由等价映射换成英文：

| 阶段 | 中文直查命中 |
|---|---|
| 字面通道（改造前的中文查询） | **0 / 104** |
| + 等价映射（A/B/C/D/E） | **top-1 落到 TM1 87 / 104** · **top-4 含 TM1 95 / 104** · 无命中 6 |

（`npm run icd11:terms:eval` 可复算，判据只认「编码是否属第 26 章 TM1」——
「医学上对不对」不自动判：本仓库没有临床医生，硬判就是编。）

### 硬证据：三个例子

| 中文查询 | 探针（级） | top-1 |
|---|---|---|
| 痰热壅肺证 | `phlegm + heat + lung + pattern/syndrome`（D，覆盖 0.80） | **SF89 Phlegm heat obstructing the lung pattern (TM1)** |
| 阴虚肺燥证 | `yin deficiency + lung + dryness + pattern/syndrome`（D，覆盖 1.00） | **SF81 Lung yin deficiency pattern (TM1)** |
| 失眠 | `inability to sleep`（E，词表 2.3.53） | MG41 Sleep disturbance, not elsewhere classified |

### 词表切词的效果（`node scripts/lib_zh_en.js --coverage`）

WHO 术语表 3,148 条，最长中文术语 16 字。104 个证候名：

| 口径 | 数 |
|---|---|
| 整串能在表里查到 | 32 |
| 最长匹配切词后**完全覆盖** | 44 |
| 覆盖率 ≥0.6（产出探针的门槛） | **93** |

未达门槛的 11 条，未覆盖片段都是古语/生僻搭配：`痹阻`、`外袭`、`壅`、`失养`、`内盛`、`晶珠混浊`。

## 异体字：只解决写法，不解决含义

实测踩到的坑：WHO 表写「**脇**痛」（2.3.65 hypochondriac pain），查询写「**胁**痛」——
opencc 的 `t2s` 把「脅」转成「胁」，但「脇」是另一个异体，转不过来，同一个症状词两边对不上。

于是有一张**闭集**异体字表（`脇/脅/胁`、`乾/干`、`欬/咳`、`鞕/硬`、`衂/衄`、`濕/湿/溼`、`證/证/証`），
只做字形归一。**表里没有的词仍然是未覆盖**：`咽干` 在 WHO 表里没有，就不会因为「干≈燥」被顶替成
`dryness`（测试钉了这一条）。

## 用法

```bash
npm run equivalence                    # 重建 classes.json（约 1 s）
npm run equivalence:check              # 体检（CI 用）
node scripts/lib_equivalence.js 肝胆湿热证      # 类 + 成员 + 张量点 + 英文等价 + 检索探针
npm run icd11:terms:eval               # 中文直查评测（104 证候 / 症状词 / 规格端点）
node scripts/lib_zh_en.js --coverage   # 词表切词覆盖率
python scripts/who_istt_terms.py --check        # WHO 术语表体检（锚点 + 26 条已核对读）
```

```js
const E = require('./scripts/lib_equivalence.js');
E.resolve('气滞血瘀证');        // → { candidates:[两个类], ambiguous:true }
E.translate('肝胆湿热证', 'en');
// → [{ form:'liver-gallbladder dampness-heat pattern/syndrome', strength:'A',
//      source:'WHO ISTT 2.9.91 书页 141', classId:'EQ-DSU-00007',
//      classes:['EQ-DSU-00007','EQ-DSU-00052'] }]
// 同一个形式落在两个类时**合并成一条**、把类记全 —— 两行相同的英文会让人以为有两个翻译。
E.probes('阴虚肺燥证');         // → { probes:[…], referenceOnly:[…], gate:'axes' }
// 发布门：gate 默认 'axes' —— 只有四轴探针放行；词表切词探针进 referenceOnly，
// 带 reason（指出哪个词不在官方词汇里）。要复现旧行为用 { gate:'all' }。
E.sameSemanticPoint('肝胆湿热证', 'liver-gallbladder dampness-heat pattern/syndrome'); // → true
```

## 已知边界（明写）

1. **语种只有中英两种**。藏/蒙/日文没有数据源，不做。
2. **词表是 WHO 2007 西太区版**（3,148 条）。2022 版编号空间不同，未换算 —— 与 `who-tcm.json` 同一条口径。
3. **组合探针（D）不是翻译**。它不宣称与任何一条 WHO 术语等价，`translate()` 默认不返回它；
   只有检索层（`probes()`）用它，而且**只放行 axes 那一档**（42/66）；glossary 那 24 条降级为
   「仅供参考」，仍随结果返回（`referenceOnly` + 原因），但不参与排序。
   实测：门开与门关对 104 个证候的 top-1 **零差异** —— 挡掉的正好是不起作用的那些。
4. **5 个 DSU 译不出**（另有 4 个是维度标签 生理/心理/社会/生态，本就不是证候），
   因为 WHO 表与官方 472 条题名里都没有它们的构词成分（内停/失养/浸淫/互结/晶珠混浊）。
   要补只有两条路：补术语来源，或人工登记英文名（须带出处，不许编）。
