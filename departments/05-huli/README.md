# 🩺 护理系

> **Nursing** · 中医护理特色技术 + 现代护理全科能力

| 指标 | 数值 |
|------|------|
| 学科数 | 15 |
| 总学时 | 882 |
| 章节目标 | 128 |
| 已建章节 | 0 |
| 涉及学期 | 第2, 第3, 第4, 第5, 第6, 第7, 第8 |

## 学科清单

| # | 学科 | 英文名 | 类型 | 学期 | 学时 | 章节 | 中医 → AI 桥梁 | 进度 |
|---|------|--------|------|------|------|------|--------------|------|
| 01 | [中医护理学基础](01-zhongyi-huli-jichu/) | Foundations of TCM Nursing | Core | 2 | 72 | 0/10 | 辨证施护→规则库 / 证护对应→映射表 | ⬚ |
| 02 | [基础护理学](02-jichu-huli-xue/) | Fundamental Nursing | Core | 2 | 72 | 0/10 | 护理操作→标准作业流程 / 生命体征→异常检测 | ⬚ |
| 03 | [健康评估](03-jiankang-pinggu/) | Health Assessment | Core | 3 | 54 | 0/8 | 问诊查体→结构化采集 / 异常体征→规则+ML 判别 | ⬚ |
| 04 | [中医护理技术](04-zhongyi-huli-jishu/) | TCM Nursing Techniques | Build | 3 | 54 | 0/8 | 拔罐艾灸刮痧→操作参数化 / 不良反应→监测预警 | ⬚ |
| 05 | [中医养生学](05-zhongyi-yangsheng-xue/) | TCM Health Cultivation | Core | 3 | 54 | 0/8 | 体质养生→个性化推荐 / 生活处方→规则引擎 | ⬚ |
| 06 | [中医心理学](06-zhongyi-xinli-xue/) | TCM Psychology | Core | 4 | 54 | 0/8 | 情志辨证→情绪分类 NLP / 五志相胜→博弈模型 | ⬚ |
| 07 | [内科护理学](07-neike-huli-xue/) | Medical Nursing | Clinic | 5 | 90 | 0/12 | 护理诊断→本体推理 / 病情变化→时序预警 | ⬚ |
| 08 | [外科护理学](08-waike-huli-xue/) | Surgical Nursing | Clinic | 5 | 72 | 0/10 | 围手术期→流程编排 / 并发症→风险预测 | ⬚ |
| 09 | [妇产科护理学](09-fuchanke-huli-xue/) | OB/GYN Nursing | Clinic | 6 | 54 | 0/8 | 产程→阶段状态机 / 母婴数据→联合建模 | ⬚ |
| 10 | [儿科护理学](10-erke-huli-xue/) | Pediatric Nursing | Clinic | 6 | 54 | 0/8 | 儿童生长发育→曲线拟合 / 用药剂量→体重规则 | ⬚ |
| 11 | [社区护理学](11-shequ-huli-xue/) | Community Nursing | Build | 6 | 54 | 0/8 | 家庭访视→路线优化 / 慢病管理→队列随访 | ⬚ |
| 12 | [急危重症护理学](12-jiwei-zhengzheng-huli/) | Critical Care Nursing | Clinic | 7 | 72 | 0/10 | 危重评分→风险模型 / 抢救流程→实时决策支持 | ⬚ |
| 13 | [护理管理学](13-huli-guanli-xue/) | Nursing Management | Reference | 7 | 36 | 0/6 | 排班优化→运筹求解 / 质量指标→控制图 | ⬚ |
| 14 | [护理伦理与法规](14-huli-lunli-fagui/) | Nursing Ethics & Law | Reference | 7 | 36 | 0/6 | 伦理困境→多准则决策 / 知情同意→合规校验 | ⬚ |
| 15 | [护理研究与循证护理](15-huli-yanjiu-zhengxun/) | Nursing Research & EBP | Build | 8 | 54 | 0/8 | 证据分级→GRADE 算法 / 文献筛选→PRISMA 流程自动化 | ⬚ |

## 类型分布

| 类型 | 数量 | 交付侧重 |
|------|------|---------|
| Core | 5 | 理论与方法主干，[textbooks] 教材优先 |
| Build | 3 | 从零构建，[tcmP] 视频 + 可运行代码优先 |
| Clinic | 5 | 临床能力，[tcmP] 案例视频 + [textbooks] 案例集优先 |
| Reference | 2 | 术语与脉络，[textbooks] 工具书优先 |

## 学科创建

```bash
node scripts/scaffold_subject.js --all
node scripts/scaffold_chapter.js 05-huli/<subject-slug> 01-<chapter-slug> "章节标题"
```

← [返回八院系总览](../README.md)
