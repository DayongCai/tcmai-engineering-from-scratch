# 中医临床护理学

> 病证护理→知识图谱 / 护理方案→路径推荐

| 项目 | 内容 |
|------|------|
| 院系 | 🩺 护理系 `05-huli` |
| 类型 | Clinic |
| 学期 | 第 8 学期（🌳 壮·鼎盛 / 大四） |
| 学时 | 54 |
| 章节目标 | 18 |
| 学科编号 | 090 / 150 |
| 英文名 | TCM Clinical Nursing |

## 一、学科定位

中医临床护理学（TCM Clinical Nursing）是护理系的核心学科，聚焦「中医护理特色技术 + 现代护理全科能力」中的一个完整知识域。

## 二、中医 → AI 桥梁

```text
病证护理→知识图谱 / 护理方案→路径推荐
```

中医临床护理学 里的每一个传统概念，都被翻译成一个可计算、可验证的工程对象：
中医概念给出**语义与约束**，AI/工程方法给出**表示与算法**。两者必须能互相回指，
否则这个章节就还没有写完。

## 三、章节地图（目标 18 章）

章节尚未编写。运行脚手架开章：

```bash
node scripts/scaffold_chapter.js 05-huli/25-zhongyi-linchuang-huli 01-<chapter-slug>
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
输出: textbooks/05-huli/25-zhongyi-linchuang-huli/
├── 00-前言.md
├── 01-第1章-<标题>.md   ...
└── figures/                # Mermaid / SVG，禁止 ASCII 框图
```

## 六、平台交付 [tcmP]

```text
输出: platform/courses/05-huli/25-zhongyi-linchuang-huli/
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

**教材**：`F:/textbooks/qhzy-中医临床护理学.xlsx`（18 内容章 / 18 单元 / **320,017 汉字**）。

| 文件 | 内容 |
|---|---|
| `底本.json` | 章 → 节 → 小节 → 段 ＋ counts ＋ sha256 |
| `units.json` | 18 单元，带三辨（辨证／施护／转归与调护）、四位面（病位系统）词频与数值计数 |
| `chapter-map.json` | 课程 **18 章** ← 教材 18 章；合章理由逐章写在 `why` 字段，**单元不复用** |
| `axes.json` | 三辨与三位面候选词表（本课的计算口径） |
| `doc-config.json` | 本课的写法口径：链条、对象压力、报告规则、缺口声明、逐章问题与引文兜底 |
| `axis-probe.json` | 四位面三候选比值 |

**章 ↔ 教材**

| 章 | slug | 标题 | 教材章 | 单元 | 汉字 |
|---:|---|---|---|---:|---:|
| 1 | `01-gaishu` | 中医临床护理学概述 | 1 | 1 | 17,100 |
| 2 | `02-pinggu-chengxu` | 临床护理评估与护理程序 | 2 | 1 | 17,442 |
| 3 | `03-jishu-anquan` | 临床护理常用技术应用与安全 | 3 | 1 | 17,456 |
| 4 | `04-zhongxiyi-jiehe` | 中西医结合护理的思路与方法 | 4 | 1 | 17,507 |
| 5 | `05-feixi` | 肺系病证临床护理 | 5 | 1 | 17,754 |
| 6 | `06-xinxi` | 心系病证临床护理 | 6 | 1 | 17,795 |
| 7 | `07-piwei-gandan` | 脾胃与肝胆病证临床护理 | 7 | 1 | 18,150 |
| 8 | `08-shenxi-qixue` | 肾系与气血津液病证临床护理 | 8 | 1 | 17,186 |
| 9 | `09-naoxi-shenzhi` | 脑系与神志病证临床护理 | 9 | 1 | 18,330 |
| 10 | `10-waike` | 外科病证临床护理 | 10 | 1 | 17,213 |
| 11 | `11-gushang` | 骨伤科病证临床护理 | 11 | 1 | 19,258 |
| 12 | `12-fuchanke` | 妇产科病证临床护理 | 12 | 1 | 18,938 |
| 13 | `13-erke` | 儿科病证临床护理 | 13 | 1 | 16,833 |
| 14 | `14-wuguan-jizhong` | 五官科与急危重症临床护理 | 14 | 1 | 18,662 |
| 15 | `15-wenshu-xinxi` | 临床护理文书与信息管理 | 15 | 1 | 16,967 |
| 16 | `16-anquan-lunli` | 临床护理安全、伦理与质量管理 | 16 | 1 | 17,931 |
| 17 | `17-yanxu-shequ` | 延续护理与社区康复护理 | 17 | 1 | 18,075 |
| 18 | `18-pingtai` | 中医临床护理学与教学平台 | 18 | 1 | 17,420 |

**口径**

1. **三辨＝辨证／施护／转归与调护**，实测 **262 / 3344 / 646**，比值 **12.8×**；
2. **四位面＝病位系统，取 病位系统（3.7×）**。四位面取病位系统（3.7×）。护理层次（59.7×）弃：技术施护仅 7 次——这本教材几乎不写技术，写的是「按病位施护」；科别（5.7×）弃：与病位系统重复。
3. **本课在系里的词面签名**：`家属沟通`（六类词中密度最高的那一类，见 `standards/huli-xitong-签名.json`）。

**章的取法**

课程 18 章不是把 18 章平均切，而是按「辨证定位 → 施护落地 → 转归判断 → 调护与随访」这条链重排：相邻两章若共用同一套判据就合章，若判据不同就分章。合章处逐条写在 `chapter-map.json` 的 `why` 里。

**代价与边界**

- **只写到类别与要点**：具体方药剂量与穴位操作参数 不在正文，以现行规范与机构制度为准；
- **个案不入正文**：例子一律为说明性表述，不含可定位的机构、人名与时间地点；
- **不替代专业判断**：本课为教学材料，不构成诊疗或护理意见；发现异常按现行报告与转介流程及院内制度报告与转介。

**复算**

```bash
python scripts/build_huli_course.py zhongyi-linchuang "F:/textbooks/qhzy-中医临床护理学.xlsx"      # 工作簿 → 底本 + 单元层
python scripts/scaffold_huli_chapter.py zhongyi-linchuang departments/05-huli/25-zhongyi-linchuang-huli --all  # 全章 code/main.js + 测试
python scripts/build_huli_docs.py zhongyi-linchuang                          # 全章 docs / quiz / outputs
python scripts/crosscheck_huli5.py                               # 护理系九门课词面签名
```
