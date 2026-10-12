# 🌾 中药系

> **Chinese Materia Medica** · 本草、方剂与中药全产业链：资源—鉴定—化学—药理—制剂

| 指标 | 数值 |
|------|------|
| 学科数 | 15 |
| 总学时 | 1026 |
| 章节目标 | 144 |
| 已建章节 | 0 |
| 涉及学期 | 第2, 第3, 第4, 第5, 第6, 第7, 第8 |

## 学科清单

| # | 学科 | 英文名 | 类型 | 学期 | 学时 | 章节 | 中医 → AI 桥梁 | 进度 |
|---|------|--------|------|------|------|------|--------------|------|
| 01 | [中药学](01-zhongyaoxue/) | Chinese Materia Medica | Core | 2 | 90 | 0/12 | 四气五味归经→词嵌入 / 功效相似度→余弦距离 | ⬚ |
| 02 | [药用植物学](02-yaoyong-zhiwu-xue/) | Medicinal Botany | Core | 2 | 54 | 0/8 | 植物分类→层级分类 / 叶片形态→CNN 特征 | ⬚ |
| 03 | [方剂学](03-fangjixue/) | TCM Formulary | Core | 3 | 90 | 0/12 | 君臣佐使→缩放点积注意力 / 类方鉴别→对比学习 | ⬚ |
| 04 | [中药资源学](04-zhongyao-ziyuan-xue/) | TCM Resource Science | Reference | 3 | 54 | 0/8 | 产区分布→空间聚类 / 资源评价→多指标模型 | ⬚ |
| 05 | [中药鉴定学](05-zhongyao-jianding-xue/) | Identification of Chinese Materia Medica | Build | 4 | 72 | 0/10 | 性状鉴别→图像分类 / 显微鉴别→纹理特征 | ⬚ |
| 06 | [中药化学](06-zhongyao-huaxue/) | Phytochemistry of TCM | Core | 4 | 90 | 0/12 | 成分结构→分子指纹 / 活性预测→QSAR 回归 | ⬚ |
| 07 | [中药药理学](07-zhongyao-yaoli-xue/) | TCM Pharmacology | Core | 5 | 72 | 0/10 | 药效实验→剂量-反应拟合 / 网络药理→图算法 | ⬚ |
| 08 | [中药炮制学](08-zhongyao-paozhi-xue/) | TCM Processing | Build | 5 | 54 | 0/8 | 炮制火候→过程曲线 / 工艺参数→回归优化 | ⬚ |
| 09 | [中药药剂学](09-zhongyao-yaoji-xue/) | TCM Pharmaceutics | Core | 5 | 72 | 0/10 | 剂型设计→多目标优化 / 释放曲线→动力学拟合 | ⬚ |
| 10 | [中药分析学](10-zhongyao-fenxi-xue/) | TCM Analysis | Build | 6 | 72 | 0/10 | 指纹图谱→降维与相似度 / 光谱数据→PLS 回归 | ⬚ |
| 11 | [中药药代动力学](11-zhongyao-yaodai-donglixue/) | TCM Pharmacokinetics | Build | 6 | 54 | 0/8 | 血药浓度→房室模型 / 参数估计→非线性拟合 | ⬚ |
| 12 | [道地药材与产地加工](12-daodi-yaocai/) | Genuine Regional Herbs & Post-harvest | Reference | 6 | 54 | 0/8 | 产地指纹→地理加权 / 品质溯源→区块链账本 | ⬚ |
| 13 | [中成药与临床用药](13-zhongchengyao-linchuang/) | Patent Medicines in Clinical Use | Clinic | 7 | 72 | 0/10 | 联合用药→推荐系统 / 不良反应→异常检测 | ⬚ |
| 14 | [中药配伍与禁忌](14-peiwu-yu-jinji/) | TCM Herb Compatibility & Contraindications | Build | 7 | 54 | 0/8 | 十八反十九畏→规则图谱 / 配伍风险→图推理 | ⬚ |
| 15 | [中药新药研发](15-zhongyao-xinyao-yanfa/) | New TCM Drug Development | Build | 8 | 72 | 0/10 | 研发管线→项目管理 / 临床试验→A/B 试验设计 | ⬚ |

## 类型分布

| 类型 | 数量 | 交付侧重 |
|------|------|---------|
| Core | 6 | 理论与方法主干，[textbooks] 教材优先 |
| Reference | 2 | 术语与脉络，[textbooks] 工具书优先 |
| Build | 6 | 从零构建，[tcmP] 视频 + 可运行代码优先 |
| Clinic | 1 | 临床能力，[tcmP] 案例视频 + [textbooks] 案例集优先 |

## 学科创建

```bash
node scripts/scaffold_subject.js --all
node scripts/scaffold_chapter.js 02-zhongyao/<subject-slug> 01-<chapter-slug> "章节标题"
```

← [返回八院系总览](../README.md)
