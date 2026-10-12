# 📊 管理系

> **Management** · 中医药治理、政策、教育与卫生经济、卫生信息化

| 指标 | 数值 |
|------|------|
| 学科数 | 15 |
| 总学时 | 792 |
| 章节目标 | 118 |
| 已建章节 | 0 |
| 涉及学期 | 第4, 第5, 第6, 第7, 第8 |

## 学科清单

| # | 学科 | 英文名 | 类型 | 学期 | 学时 | 章节 | 中医 → AI 桥梁 | 进度 |
|---|------|--------|------|------|------|------|--------------|------|
| 01 | [医学统计学](01-yixue-tongjixue/) | Medical Statistics | Core | 4 | 72 | 0/10 | 假设检验→从零实现 / 回归→最小二乘 | ⬚ |
| 02 | [中医药政策与法规](02-zhongyiyao-zhengce-fagui/) | TCM Policy & Regulation | Core | 4 | 54 | 0/8 | 法规条文→检索问答 / 合规判断→规则树 | ⬚ |
| 03 | [中医管理学](03-zhongyi-guanli-xue/) | TCM Management | Core | 5 | 54 | 0/8 | 科室绩效→多指标评价 / 资源配置→线性规划 | ⬚ |
| 04 | [卫生事业管理](04-weisheng-shiye-guanli/) | Health Service Management | Core | 5 | 54 | 0/8 | 卫生指标体系→看板建模 / 区域配置→供需模型 | ⬚ |
| 05 | [中医文化传播学](05-zhongyi-wenhua-chuanbo/) | TCM Cultural Communication | Reference | 5 | 36 | 0/6 | 传播内容→主题建模 / 受众画像→用户分群 | ⬚ |
| 06 | [医院管理学](06-yiyuan-guanli-xue/) | Hospital Management | Clinic | 6 | 72 | 0/10 | 门诊流程→排队论仿真 / 床位调度→离散事件仿真 | ⬚ |
| 07 | [中医教育学](07-zhongyi-jiaoyu-xue/) | TCM Education | Build | 6 | 54 | 0/8 | 教学评价→学习分析 / 课程图谱→先修关系图 | ⬚ |
| 08 | [健康服务与管理](08-jiankang-fuwu-guanli/) | Health Services & Management | Build | 6 | 54 | 0/8 | 健康档案→数据治理 / 干预方案→推荐系统 | ⬚ |
| 09 | [医疗保险与卫生经济](09-yiliao-baoxian-jingji/) | Health Insurance & Economics | Reference | 6 | 54 | 0/8 | 医保支付→成本效果分析 / 费用预测→时间序列 | ⬚ |
| 10 | [医学信息管理](10-yixue-xinxi-guanli/) | Health Information Management | Build | 7 | 54 | 0/8 | 电子病历→HL7/FHIR 建模 / 数据质量→校验规则 | ⬚ |
| 11 | [医院信息化与病案管理](11-yiyuan-xinxihua-bingan/) | Hospital IT & Medical Records | Build | 7 | 54 | 0/8 | 病案首页→编码 NLP / HIS 集成→接口编排 | ⬚ |
| 12 | [中医药标准化](12-zhongyiyao-biaozhunhua/) | TCM Standardization | Build | 7 | 54 | 0/8 | 证候术语→本体与编码 / 标准符合性→自动核查 | ⬚ |
| 13 | [临床科研方法学](13-linchuang-keyan-fangfa/) | Clinical Research Methodology | Build | 7 | 54 | 0/8 | 试验设计→随机化算法 / 真实世界研究→因果推断 | ⬚ |
| 14 | [中医药知识产权与成果转化](14-zhishichanquan-zhuanhua/) | TCM IP & Commercialization | Reference | 8 | 36 | 0/6 | 专利检索→文本相似 / 转化路径→决策支持 | ⬚ |
| 15 | [中医国际教育与传播](15-zhongyi-guojijiaoyu/) | International TCM Education | Reference | 8 | 36 | 0/6 | 多语种教材→i18n 流水线 / 术语对齐→跨语言嵌入 | ⬚ |

## 类型分布

| 类型 | 数量 | 交付侧重 |
|------|------|---------|
| Core | 4 | 理论与方法主干，[textbooks] 教材优先 |
| Reference | 4 | 术语与脉络，[textbooks] 工具书优先 |
| Clinic | 1 | 临床能力，[tcmP] 案例视频 + [textbooks] 案例集优先 |
| Build | 6 | 从零构建，[tcmP] 视频 + 可运行代码优先 |

## 学科创建

```bash
node scripts/scaffold_subject.js --all
node scripts/scaffold_chapter.js 06-guanli/<subject-slug> 01-<chapter-slug> "章节标题"
```

← [返回八院系总览](../README.md)
