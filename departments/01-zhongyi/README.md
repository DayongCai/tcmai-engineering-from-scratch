# ☯️ 中医系

> **Traditional Chinese Medicine** · 理法方药的内核：基础理论、经典、临床各科

| 指标 | 数值 |
|------|------|
| 学科数 | 15 |
| 总学时 | 1062 |
| 章节目标 | 150 |
| 已建章节 | 3 |
| 涉及学期 | 第1, 第3, 第4, 第5, 第6, 第7 |

## 学科清单

| # | 学科 | 英文名 | 类型 | 学期 | 学时 | 章节 | 中医 → AI 桥梁 | 进度 |
|---|------|--------|------|------|------|------|--------------|------|
| 01 | [中医基础理论](01-zhongyi-jichu-lilun/) | Fundamentals of TCM Theory | Core | 1 | 72 | 3/10 | 阴阳→二分类 / 五行→多分类 / 藏象→知识图谱 | 🚧 |
| 02 | [医古文](02-yi-gu-wen/) | Classical Chinese for TCM | Core | 1 | 54 | 0/8 | 古文分词→分词器 / 训诂→语义消歧 | ⬚ |
| 03 | [中国医学史](03-zhongguo-yixue-shi/) | History of Chinese Medicine | Reference | 1 | 36 | 0/8 | 医史脉络→时间图谱 / 学派演化→谱系聚类 | ⬚ |
| 04 | [中医体质学](04-zhongyi-tizhi-xue/) | TCM Constitution Theory | Core | 4 | 54 | 0/8 | 九种体质→多分类 / 体质问卷→特征工程 | ⬚ |
| 05 | [中医诊断学](05-zhongyi-zhen-duan-xue/) | TCM Diagnostics | Core | 3 | 90 | 0/12 | 四诊→多模态特征 / 八纲→多维分类 | ⬚ |
| 06 | [内经选读](06-neijing-xuandu/) | Selected Readings from Huangdi Neijing | Core | 3 | 72 | 0/10 | 原文→语料库 / 条文检索→向量检索 | ⬚ |
| 07 | [伤寒论](07-shanghanlun/) | Treatise on Cold Damage | Core | 4 | 90 | 0/12 | 六经→状态机 / 方证→条件概率 | ⬚ |
| 08 | [金匮要略](08-jingui-yaolue/) | Synopsis of the Golden Chamber | Core | 5 | 72 | 0/10 | 杂病→规则库 / 方证对应→检索增强 | ⬚ |
| 09 | [温病学](09-wenbing-xue/) | Warm Disease Theory | Core | 5 | 72 | 0/10 | 卫气营血→分层状态机 / 传变→时序模型 | ⬚ |
| 10 | [中医内科学](10-zhongyi-neike-xue/) | TCM Internal Medicine | Clinic | 5 | 108 | 0/14 | 脏腑辨证→决策树 / 证型→集成分类 | ⬚ |
| 11 | [中医外科学](11-zhongyi-waike-xue/) | TCM External Medicine | Clinic | 6 | 72 | 0/10 | 外科辨证→图像特征 / 疮疡分期→序列标注 | ⬚ |
| 12 | [中医妇科学](12-zhongyi-fuke-xue/) | TCM Gynecology | Clinic | 6 | 72 | 0/10 | 月经周期→周期序列模型 / 妇科辨证→智能体 | ⬚ |
| 13 | [中医儿科学](13-zhongyi-erke-xue/) | TCM Pediatrics | Clinic | 6 | 72 | 0/10 | 小儿剂量→规则引擎 / 儿科辨证→ReAct 智能体 | ⬚ |
| 14 | [中医证候学](14-zhongyi-zhenghou-xue/) | TCM Syndrome Theory | Build | 7 | 72 | 0/10 | 证候→本体建模 / 证型标准化→嵌入聚类 | ⬚ |
| 15 | [中医各家学说](15-zhongyi-gejia-xueshuo/) | Schools of TCM Thought | Reference | 7 | 54 | 0/8 | 学派对比→文本相似度 / 学术谱系→图网络 | ⬚ |

## 类型分布

| 类型 | 数量 | 交付侧重 |
|------|------|---------|
| Core | 8 | 理论与方法主干，[textbooks] 教材优先 |
| Reference | 2 | 术语与脉络，[textbooks] 工具书优先 |
| Clinic | 4 | 临床能力，[tcmP] 案例视频 + [textbooks] 案例集优先 |
| Build | 1 | 从零构建，[tcmP] 视频 + 可运行代码优先 |

## 学科创建

```bash
node scripts/scaffold_subject.js --all
node scripts/scaffold_chapter.js 01-zhongyi/<subject-slug> 01-<chapter-slug> "章节标题"
```

← [返回八院系总览](../README.md)
