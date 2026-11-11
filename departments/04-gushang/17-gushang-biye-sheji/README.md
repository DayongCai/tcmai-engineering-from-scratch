# 骨伤毕业设计与知识移交

**17-gushang-biye-sheji** · 骨伤学院 · 6 章 · 21 单元 · 164,697 汉字

> 毕设的判据是「可复算」：数据能重算、结论能回到数据、规范能被人照做

**课程类型：派生课（无教材，sem910 模板课）**。
章名与顺序来自 `data/new-subjects-chapters.json`，由 `scripts/scaffold_sem910.js` 生成，**不得手改**；
`locator` 一律 `派生·第N章·m.k`，单元正文逐字取自父课。

六阶：选题 → 数据准备 → 实现 → 疗效与并发症评价 → 写作答辩 → 知识移交。

## 一、父课

- `gushang-chuangshang-jijiu`
- `gushang-jichu`
- `gushang-kangfu-pingding`
- `gushang-shoufa-zhiliao`
- `gushang-yingxiang`
- `huli-yanjiu-zhengxun`

## 二、章表

| # | slug | 章 | 单元 | 汉字 |
|--:|---|---|--:|--:|
| 1 | xuan-ti | 选题：从复位方案到可量化命题 | 3 | 34,991 |
| 2 | yingxiang-shuju | 影像与生物力学数据准备 | 5 | 11,980 |
| 3 | shoufa-zhiju | 手法与支具的系统实现 | 4 | 11,504 |
| 4 | liaoxiao-pingjia | 疗效与并发症评价 | 3 | 50,888 |
| 5 | lunwen-dabian | 论文写作与答辩 | 3 | 18,560 |
| 6 | zhishi-yijiao | 知识移交：操作规范与交接 | 3 | 36,774 |

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
| **选题与数据** | **245** |
| **实现与评价** | **497** |
| **写作与移交** | **620** |

三辨极差 **2.5×**。

| 四位面（章群结构分区） | 汉字 |
|---|---:|
| 选题与数据 | 46,971 |
| 实现与评价 | 62,392 |
| 写作答辩 | 18,560 |
| 知识移交 | 36,774 |

四位面极差 **3.4×**。

## 四、判据

毕设的判据是「可复算」：数据能重算、结论能回到数据、规范能被人照做。六阶：选题 → 数据准备 → 实现 → 疗效与并发症评价 → 写作答辩 → 知识移交。

## 五、章内可执行验证

```bash
node scripts/scaffold_sem910.js --check
node scripts/audit_curriculum.js | grep -A2 "17-gushang-biye-sheji"
node tests/test_chapter_code.js | grep -c "17-gushang-biye-sheji"
python scripts/_derive_sem910_gushang.py
```

**免责声明：** 本课为教学材料；无独立教材，内容为本库已建课程的二次编排。
轮转中的临床决策与毕设中的数据结论，须由执业医师与导师复核，不构成诊疗或研究结论。

## 六、与 `standards/biye` 骨伤实例的对接

本课不是孤立讲写作：六章逐章对上了本系毕设实例（`standards/biye/instances/04-gushang.json`）。

| 项 | 值 |
|---|---|
| 实例产物 | 骨病单元层（60 单元 / 149,316 字）＋四候选轴实测 |
| 三份案例 | 骨伤专科路径底座 / 轴选择留痕报告 / 康复量表可复现包 |
| 基准回本 | 18.6 月（三年毛利 2,889,000 元，不亏损） |
| 七项检查表 | 1–5 项齐备；6 项看工时台账、7 项看欠账清单 |

详细对位与现算数据见 **`毕设对接.md`**（由 `scripts/_gushang_biye_link.py` 从实例 JSON 现算，手改无效）。

各章 docs 末尾都加了「与骨伤毕设实例的对应」一节，把该章的交付物映射到实例字段。
