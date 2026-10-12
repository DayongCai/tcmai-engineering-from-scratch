# 模板

| 文件 | 用途 |
|------|------|
| [subject-template.md](subject-template.md) | 学科大纲模板（`departments/NN-dept/MM-subject/README.md`） |
| [chapter-template.md](chapter-template.md) | 章节讲解模板（`chapters/NN-slug/docs/zh.md`） |
| [quiz-template.json](quiz-template.json) | 章节小测模板（恰好 6 题） |
| [meta-template.json](meta-template.json) | 学科元数据模板 |

## 不要手抄模板

学科与学科大纲由脚手架生成，保证与 `curriculum.json` 一致：

```bash
node scripts/scaffold_subject.js --all                 # 全部 120 学科
node scripts/scaffold_subject.js 01-zhongyi/16-new     # 单个
node scripts/scaffold_chapter.js 01-zhongyi/01-zhongyi-jichu-lilun 04-jing-qi-xue-ye "精气血津液 → 状态向量"
```

模板文件是**契约的文档形态**，供人阅读、对照与评审时使用。
若模板与脚手架生成的内容不一致，以 `scripts/scaffold_*.js` 为准，并回来修模板。

契约的完整规则见 [CONTRIBUTING.md 的「章节契约」](../CONTRIBUTING.md#章节契约)。
