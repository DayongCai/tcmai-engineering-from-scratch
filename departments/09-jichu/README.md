# 🧬 基础医学院

> **Preclinical Sciences** · 形态 · 功能 · 病理 · 药理四条基线：中医概念落地前必须先有的正常与异常人体图景

| 指标 | 数值 |
|------|------|
| 学科数 | 17（必修 17） |
| 总学时 | 1035 |
| 章节目标 | 315 |
| 已建章节 | 315 |
| 涉及学期 | 第1, 第2, 第3, 第4, 第5, 第9, 第10 |

## 学科清单

| # | 学科 | 英文名 | 类型 | 学期 | 学时 | 章节 | 中医 → AI 桥梁 | 进度 |
|---|------|--------|------|------|------|------|--------------|------|
| 01 | [人体解剖学](01-renti-jiepou-xue/) | Human Anatomy | Core | 1 | 72 | 10/10 | 解剖结构→本体图谱 / 断层影像→空间配准 | ✅ |
| 02 | [组织学与胚胎学](02-zuzhi-peitai-xue/) | Histology & Embryology | Core | 1 | 54 | 20/20 | 组织切片→图像分类 / 胚胎分期→时序建模 | ✅ |
| 03 | [医学细胞生物学](03-yixue-xibao-shengwu-xue/) | Medical Cell Biology | Core | 1 | 36 | 12/12 | 细胞信号→微分方程 / 通路→有向图 | ✅ |
| 04 | [医学生物学](04-yixue-shengwu-xue/) | Medical Biology | Core | 2 | 36 | 16/16 | 遗传变异→序列比对 / 进化→系统发生树 | ✅ |
| 05 | [正常人体学](05-zhengchang-renti-xue/) | Normal Human Structure & Function | Core | 2 | 72 | 18/18 | 结构与功能→多模态融合 / 指标体系→特征工程 | ✅ |
| 06 | [生理学](06-shengli-xue/) | Physiology | Core | 2 | 72 | 11/11 | 稳态调节→反馈控制 / 生理信号→时间序列 | ✅ |
| 07 | [生物化学](07-shenghua-xue/) | Biochemistry | Core | 2 | 72 | 21/21 | 代谢通路→网络流 / 酶动力学→ODE 参数辨识 | ✅ |
| 08 | [局部解剖学](08-jubu-jiepou-xue/) | Regional Anatomy | Core | 3 | 54 | 9/9 | 层次毗邻→空间索引 / 术区→三维重建 | ✅ |
| 09 | [医学遗传学](09-yixue-yichuan-xue/) | Medical Genetics | Core | 3 | 36 | 12/12 | 家系→贝叶斯网络 / 基因型—表型→关联分析 | ✅ |
| 10 | [病理学](10-bingli-xue/) | Pathology | Core | 3 | 72 | 21/21 | 病变形态→病理图像分类 / 病机演变→因果图 | ✅ |
| 11 | [病理生理学](11-bingli-shengli-xue/) | Pathophysiology | Core | 4 | 54 | 53/53 | 病机演变→状态机 / 代偿失调→阈值模型 | ✅ |
| 12 | [药理学](12-yaoli-xue/) | Pharmacology | Core | 4 | 72 | 49/49 | 量效关系→S 型曲线拟合 / 受体作用→药靶网络 | ✅ |
| 13 | [免疫学基础与病原生物学](13-mianyi-bingyuan-shengwu/) | Immunology & Pathogen Biology | Core | 4 | 54 | 15/15 | 免疫应答→多智能体仿真 / 病原谱→分类检索 | ✅ |
| 14 | [疾病学基础](14-jibing-xue-jichu/) | Foundations of Disease | Core | 4 | 54 | 18/18 | 病因—病理—表现→因果链 / 疾病命名→ICD-11 编码 | ✅ |
| 15 | [流行病学](15-liuxingbing-xue/) | Epidemiology | Core | 5 | 45 | 18/18 | 分布描述→统计推断 / 暴发调查→传播模型 | ✅ |
| 16 | [科研实训与实验设计](16-jichu-keyan-shixun/) | Research Training & Experimental Design | Build | 9 | 108 | 6/6 | 假设→对照设计 / 原始记录→可复算数据 / 统计→效应量 | ✅ |
| 17 | [基础医学毕业设计与知识移交](17-jichu-biye-sheji/) | Biomedical Capstone & Handover | Build | 10 | 72 | 6/6 | 机制假设→可检验实验 / 记录→原始数据 / 结论→可重复协议 | ✅ |

## 类型分布

| 类型 | 数量 | 交付侧重 |
|------|------|---------|
| Core | 15 | 理论与方法主干，[textbooks] 教材优先 |
| Build | 2 | 从零构建，[tcmP] 视频 + 可运行代码优先 |

## 学科创建

```bash
node scripts/scaffold_subject.js --all
node scripts/scaffold_chapter.js 09-jichu/<subject-slug> 01-<chapter-slug> "章节标题"
```

← [返回九院系总览](../README.md)
