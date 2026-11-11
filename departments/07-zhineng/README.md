# 🤖 智能系

> **Intelligent TCM** · 中医 x 人工智能：架构、数据、模型、设备与治理（本项目的工程引擎）

| 指标 | 数值 |
|------|------|
| 学科数 | 19（必修 18 + 选修 1） |
| 总学时 | 1260 |
| 章节目标 | 166 |
| 已建章节 | 166 |
| 涉及学期 | 第3, 第4, 第5, 第6, 第7, 第8, 第9, 第10 |

## 学科清单

| # | 学科 | 英文名 | 类型 | 学期 | 学时 | 章节 | 中医 → AI 桥梁 | 进度 |
|---|------|--------|------|------|------|------|--------------|------|
| 01 | [医学人工智能导论](01-yixue-rengong-zhineng-daolun/) | Introduction to Medical AI | Core | 3 | 54 | 8/8 | 感知机→从零实现 / 梯度下降→手写训练循环 / 交叉验证→泛化评估 | ✅ |
| 02 | [中医软件架构学](02-zhongyi-ruanjian-jiagou-xue/) | TCM Software Architecture | Build | 4 | 72 | 10/10 | 分层架构→领域驱动设计 / API→契约优先 | ✅ |
| 03 | [中医智能设备与可穿戴设备](03-zhongyi-zhineng-shebei/) | TCM Smart Devices & Wearables | Build | 4 | 72 | 6/6 | 脉象/舌象采集→传感器融合 / 边缘推理→模型量化 | ✅ |
| 04 | [中医自然语言处理](04-zhongyi-ziran-yuyan-chuli/) | TCM Natural Language Processing | Build | 5 | 72 | 10/10 | 医案分词→BPE 从零 / 实体识别→序列标注 | ✅ |
| 05 | [中医知识树](05-zhongyi-zhishi-tupu/) | TCM Knowledge Tree | Build | 5 | 72 | 6/6 | 五级骨架→树结构 / 病证单元→叶节点与图谱经脉 | ✅ |
| 06 | [中医智能辨证系统](06-zhongyi-zhineng-bianzheng/) | Intelligent TCM Syndrome Differentiation | Build | 6 | 72 | 10/10 | 四诊合参→多模态融合 / 证型输出→可解释性 | ✅ |
| 07 | [医学图像处理与舌诊客观化](07-yixue-tuxiang-shezhen/) | Medical Imaging & Tongue Diagnosis | Build | 6 | 72 | 10/10 | 舌象分割→CNN / 颜色校正→色彩空间变换 | ✅ |
| 08 | [脉诊客观化与信号处理](08-maizhen-keguanhua/) | Pulse Diagnosis Signal Processing | Build | 6 | 72 | 10/10 | 脉搏波→小波变换 / 特征提取→时频分析 | ✅ |
| 09 | [中医大数据分析](09-zhongyi-dashuju-fenxi/) | TCM Big Data Analytics | Build | 6 | 54 | 8/8 | 医案仓库→ETL / 证型聚类→无监督学习 | ✅ |
| 10 | [大语言模型与中医智能体](10-llm-yu-zhongyi-zhinengti/) | LLMs & TCM Agents | Build | 7 | 90 | 12/12 | 君臣佐使→注意力从零实现 / 方证对应→RAG / 辨证论治→ReAct 智能体 / 经典检索→MCP 服务 | ✅ |
| 11 | [中医机器人学](11-zhongyi-jiqiren-xue/) | TCM Robotics | Build | 7 | 54 | 8/8 | 机械臂推拿→运动学正逆解 / 力控→阻抗控制 | ✅ |
| 12 | [数字人体与虚拟仿真](12-shuzi-renti-xuni-fangzhen/) | Digital Human & Simulation | Build | 7 | 54 | 8/8 | 经络三维建模→网格几何 / 虚拟针刺→碰撞检测 | ✅ |
| 13 | [中医多模态数据融合](13-zhongyi-duomotai-ronghe/) | TCM Multimodal Fusion | Build | 7 | 72 | 10/10 | 望闻问切→跨模态对齐 / 融合层→注意力机制 | ✅ |
| 14 | [医学数据安全与隐私保护](14-yixue-shuju-anquan-yinsi/) | Medical Data Security & Privacy | Build | 8 | 54 | 8/8 | 脱敏→k-匿名 / 联邦学习→差分隐私 | ✅ |
| 15 | [中医AI伦理与治理](15-zhongyi-ai-lunli-zhili/) | TCM AI Ethics & Governance | Build | 8 | 54 | 8/8 | 可解释性→SHAP 从零 / 模型卡→治理文档 | ✅ |
| 16 | [机器学习](16-jiqi-xuexi/) | Machine Learning | Build | 4 | 54 | 16/16 | 模型选择→交叉验证 / 特征→表示学习 | ✅ |
| 17 | [中医信息学](17-zhongyi-xinxi-xue/) | TCM Informatics | Reference（选修） | 6 | 36 | 6/6 | 信息三元结构→本体 / 三轴编码→向量空间 | ✅ |
| 18 | [工程实践与系统交付](18-zhineng-gongcheng-shijian/) | Engineering Practice & Delivery | Build | 9 | 108 | 6/6 | 需求→用例与验收标准 / 模型→评测流水线 / 上线→监控指标 | ✅ |
| 19 | [智能系毕业设计与知识移交](19-zhineng-biye-sheji/) | AI Capstone & Handover | Build | 10 | 72 | 6/6 | 中医问题→可复现实验 / 标注→规范 / 误差→可解释归因 | ✅ |

## 类型分布

| 类型 | 数量 | 交付侧重 |
|------|------|---------|
| Core | 1 | 理论与方法主干，[textbooks] 教材优先 |
| Build | 17 | 从零构建，[tcmP] 视频 + 可运行代码优先 |
| Reference | 1 | 术语与脉络，[textbooks] 工具书优先 |

## 学科创建

```bash
node scripts/scaffold_subject.js --all
node scripts/scaffold_chapter.js 07-zhineng/<subject-slug> 01-<chapter-slug> "章节标题"
```

← [返回九院系总览](../README.md)
