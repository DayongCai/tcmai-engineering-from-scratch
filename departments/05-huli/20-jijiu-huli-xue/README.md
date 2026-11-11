# 急救护理学

> 急救流程→决策树 / 生命体征→异常检测

| 项目 | 内容 |
|------|------|
| 院系 | 🩺 护理系 `05-huli` |
| 类型 | Clinic |
| 学期 | 第 5 学期（🌿 长·积累 / 大三） |
| 学时 | 54 |
| 章节目标 | 18 |
| 学科编号 | 085 / 150 |
| 英文名 | Emergency Nursing |

## 一、学科定位

急救护理学（Emergency Nursing）是护理系的核心学科，聚焦「中医护理特色技术 + 现代护理全科能力」中的一个完整知识域。

## 二、中医 → AI 桥梁

```text
急救流程→决策树 / 生命体征→异常检测
```

急救护理学 里的每一个传统概念，都被翻译成一个可计算、可验证的工程对象：
中医概念给出**语义与约束**，AI/工程方法给出**表示与算法**。两者必须能互相回指，
否则这个章节就还没有写完。

## 三、章节地图（目标 18 章）

章节尚未编写。运行脚手架开章：

```bash
node scripts/scaffold_chapter.js 05-huli/20-jijiu-huli-xue 01-<chapter-slug>
```

编写完成后，把章节索引写进 `chapters.json`，本表的「状态」列由
`scripts/build_catalog.js` 自动填充。

## 四、章节契约（每章必须满足）

```text
chapters/NN-<slug>/
├── docs/zh.md      # MOTTO / PROBLEM / 环境逼迫 / 知识积累 / CONCEPT / BUILD IT / USE IT / SHIP IT
├── code/           # 可运行、自终止、退出码 0（Node.js 或 Python，见 CONTRIBUTING.md 依赖白名单）
├── quiz.json       # 恰好 6 题 = 1 pre + 3 check + 2 post
└── outputs/        # 可复用产出物（prompt / skill / agent / mcp / 临床工具）
```

## 五、教材交付 [textbooks]

```text
输出: textbooks/05-huli/20-jijiu-huli-xue/
├── 00-前言.md
├── 01-第1章-<标题>.md   ...
└── figures/                # Mermaid / SVG，禁止 ASCII 框图
```

## 六、平台交付 [tcmP]

```text
输出: platform/courses/05-huli/20-jijiu-huli-xue/
├── course.yaml             # 课程元数据 + 章节 → 视频映射
├── slides/                 # 讲稿 HTML（由 docs/zh.md 派生）
├── narration/              # TTS 旁白文本 + 音频
└── video/                  # 成片 MP4（H.264 / 720p 以上）
```

## 七、进度

| 指标 | 当前 | 目标 |
|------|------|------|
| 章节 | 0 | 18 |
| 视频 | 0 | 18 |
| 教材字数 | 0 | ≈ 108000 |

> 状态字形：🌱 未开始 ⬚ · 🚧 进行中 · ✅ 完成

## 七、底本与章节（2026-11 建成）

**教材**：`F:/textbooks/qhzy-急救护理学.xlsx`（18 内容章 / 18 单元 / **312,058 汉字**）。

| 文件 | 内容 |
|---|---|
| `底本.json` | 章 → 节 → 小节 → 段 ＋ counts ＋ sha256 |
| `units.json` | 18 单元，带三辨（评估与分诊／急救处置／转运与记录）、四位面（急症类别）词频与数值计数 |
| `chapter-map.json` | 课程 **18 章** ← 教材 18 章；合章理由逐章写在 `why` 字段，**单元不复用** |
| `axes.json` | 三辨与三位面候选词表（本课的计算口径） |
| `doc-config.json` | 本课的写法口径：链条、对象压力、报告规则、缺口声明、逐章问题与引文兜底 |
| `axis-probe.json` | 四位面三候选比值 |

**章 ↔ 教材**

| 章 | slug | 标题 | 教材章 | 单元 | 汉字 |
|---:|---|---|---|---:|---:|
| 1 | `01-gaishu` | 急救护理学概述 | 1 | 1 | 17,320 |
| 2 | `02-moshi-tuandui` | 急救护理的工作模式与团队协作 | 2 | 1 | 17,242 |
| 3 | `03-pinggu-fenzhen` | 急救评估与预检分诊 | 3 | 1 | 16,592 |
| 4 | `04-jishu-peihe` | 急救常用技术与配合 | 4 | 1 | 16,989 |
| 5 | `05-xinbo-junting` | 心搏骤停与心肺复苏的护理配合 | 5 | 1 | 16,915 |
| 6 | `06-xiuke-guomin` | 休克与严重过敏反应的急救护理 | 6 | 1 | 17,617 |
| 7 | `07-huxi-jizheng` | 呼吸急症的急救护理 | 7 | 1 | 17,614 |
| 8 | `08-xiongton-futong` | 胸痛与急性腹痛的急救护理 | 8 | 1 | 16,816 |
| 9 | `09-yishi-chouchu` | 意识障碍与抽搐的急救护理 | 9 | 1 | 18,959 |
| 10 | `10-zhongdu-yiwai` | 急性中毒与意外伤害的急救护理 | 10 | 1 | 16,850 |
| 11 | `11-chuangshang` | 创伤急救护理 | 11 | 1 | 17,949 |
| 12 | `12-huanjing-liliao` | 环境与理化因素所致急症的急救护理 | 12 | 1 | 17,569 |
| 13 | `13-fuchanke` | 妇产科急症的急救护理 | 13 | 1 | 18,374 |
| 14 | `14-erke` | 儿科急症的急救护理 | 14 | 1 | 17,308 |
| 15 | `15-laonian-teshu` | 老年与特殊人群急症的急救护理 | 15 | 1 | 16,989 |
| 16 | `16-zainan-qunti` | 灾难与群体伤害的急救护理 | 16 | 1 | 17,208 |
| 17 | `17-zhiliang-fengxian` | 急救护理质量与风险管理 | 17 | 1 | 17,209 |
| 18 | `18-pingtai` | 急救护理学与教学平台 | 18 | 1 | 16,538 |

**口径**

1. **三辨＝评估与分诊／急救处置／转运与记录**，实测 **2670 / 1063 / 5045**，比值 **4.7×**；
2. **四位面＝急症类别，取 急症类别（16.4×）**。四位面取急症类别（7.6×）。**急救环节（16.4×）弃**：急诊只有 21 次、院前 344 次——教材讲的是「哪些急症」，不是「在哪个环节」；**时效（4.7×）虽更小也弃**：时限窗只有 18 次，撑不起一轴。
3. **本课在系里的词面签名**：`时间急救`（六类词中密度最高的那一类，见 `standards/huli-xitong-签名.json`）。

**章的取法**

课程 18 章不是把 18 章平均切，而是按「识别与分诊 → 处置与配合 → 转运与交接 → 复盘与改进」这条链重排：相邻两章若共用同一套判据就合章，若判据不同就分章。合章处逐条写在 `chapter-map.json` 的 `why` 里。

**代价与边界**

- **只写到类别与要点**：具体给药剂量与抢救操作参数 不在正文，以现行规范与机构制度为准；
- **个案不入正文**：例子一律为说明性表述，不含可定位的机构、人名与时间地点；
- **不替代专业判断**：本课为教学材料，不构成诊疗或护理意见；发现异常按现行报告与转介流程及院内制度报告与转介。

**复算**

```bash
python scripts/build_huli_course.py jijiu-huli "F:/textbooks/qhzy-急救护理学.xlsx"      # 工作簿 → 底本 + 单元层
python scripts/scaffold_huli_chapter.py jijiu-huli departments/05-huli/20-jijiu-huli-xue --all  # 全章 code/main.js + 测试
python scripts/build_huli_docs.py jijiu-huli                          # 全章 docs / quiz / outputs
python scripts/crosscheck_huli5.py                               # 护理系九门课词面签名
```
