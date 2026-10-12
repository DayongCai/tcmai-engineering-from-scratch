# 贡献手册

> 贡献者与 AI agent 的操作手册。动这个仓库之前先读它。
> （本文件即本仓库的 agent 操作规范；仓库内不另设 AGENTS.md。）

这个仓库是**课程**，不是 SaaS。学科与章节本身就是产品。下面每一条规则，都是为了让
**120 门学科、1086 个章节**在多年协作之后仍然保持一致。

---

## 哲学

**从零起步，生长壮老已，终成医圣。**

每一门学科，都从经典原文出发，一路推到可运行的系统。先用手写代码把中医概念的数学形式
实现一遍，再调用成熟库跑同一件事，让框架不再是黑箱。**BUILD IT / USE IT** 双段是脊柱。
每一章都留下一个可复用产出物：Prompt、Skill、Agent、MCP 服务，或一个临床工具。

两条交付轨道：

| 轨道 | 代号 | 目录 | 产物 |
|------|------|------|------|
| 网络视频教育平台 | **[tcmP]** | `site/` + `platform/` | 静态课程站、章节视频、交互式实验台 |
| 学科编写教材 | **[textbooks]** | `textbooks/` | 每章 ≈6000 字教材稿，汇成 PDF/EPUB 分卷 |

---

## 仓库布局

```text
curriculum.json            # 单一事实来源：1领域 / 8院系 / 120学科
catalog.json               # 生成物：全量课程表 + 进度（勿手工编辑）
ROADMAP.md                 # 生成物：三层状态追踪（勿手工编辑）
CONTRIBUTING.md            # 本文件
departments/
  NN-dept-slug/
    README.md              # 生成物：院系索引
    MM-subject-slug/
      README.md            # 生成物：学科大纲
      meta.json            # 生成物：机器可读元数据
      chapters.json        # 脚手架维护：章节索引
      chapters/
        NN-chapter-slug/
          docs/zh.md       # 章节讲解（正本）
          code/            # 实现 + 测试
          quiz.json        # 恰好 6 题
          exercises.md     # 练习
          outputs/         # 可复用产出物
learning-paths/*.json      # 学分路径
glossary/                  # 中医术语 + AI 术语 + 对照
templates/                 # 学科模板 / 章节模板 / quiz schema
scripts/                   # Node 工具链
site/                      # [tcmP] 静态站点
platform/                  # [tcmP] 课程与视频生产
textbooks/                 # [textbooks] 教材与出版流水线
tests/                     # CI 门控 + 人机闭环审核
.github/workflows/curriculum.yml
```

---

## 硬规则

1. **一次提交只动一个章节目录。** 一个 10 章的 PR 就是 10 个 commit。
2. **Conventional commit 主题行 ≤72 字符**：`feat(dept-NN/subject-MM): <slug>`。正文解释"为什么"，不解释"是什么"。
3. **图只用 Mermaid 或 SVG。** 禁止 ASCII / Unicode 制表符画框图。
4. **每个围栏代码块必须有语言标签。** 用 `text`、`json`、`javascript`、`python`、`bash`、`console`、`mermaid`、`yaml`。
5. **中医概念必须可回指。** 任何形式化定义都要能指回经典原文、国家标准或权威教材的明确出处。禁止凭印象编造条文。
6. **临床边界必须显式声明。** 任何涉及诊疗的内容，都要写出「本内容不构成临床建议」以及失效场景。
7. **依赖白名单**（见下）。标准库优先。
8. **不提交生成物**：`catalog.json`、`ROADMAP.md`、`departments/**/README.md`、`departments/**/meta.json`、`site/data.js` 由 CI 在 main 上重建。

---

## 依赖白名单

| 语言 | 允许 |
|------|------|
| JavaScript / Node 20+ | 仅标准库（`node:*`）；生成物脚本不加第三方依赖 |
| Python 3.10+ | `numpy`, `scikit-learn`, `matplotlib`, `networkx`, `pytest`，其余标准库 |
| 深度学习（可选） | `torch` —— 仅在 USE IT 段落出现，且必须有纯 numpy / 纯 JS 回退 |

如果某个方案需要白名单之外的东西，跳过它，理由写「为教学清晰起见，保持标准库优先」。

---

## 章节契约

### `docs/zh.md` 必需段落

```markdown
# 第 N 章 · <标题>

> **MOTTO:** <一句经典原文或核心箴言>
>
> **PROBLEM:** <一句话点明学习者的痛点>
>
> **双根因定位:** 环境逼迫("<具体场景压力>") + 知识积累(<知识点A> × <知识点B> = <涌现能力>)

## 课程信息        ← 表格：学科/院系/章序号/阶段/产出类型/预估时长
## 课程结构        ← MOTTO → PROBLEM → CONCEPT → BUILD IT → USE IT → SHIP IT
## 学习目标        ← 4–6 条，动词开头
## 核心概念        ← 中医 / AI / 对应关系表 / mermaid 图
## BUILD IT        ← 从零实现（白名单依赖，中文注释）
## USE IT          ← 成熟库验证同一结论
## SHIP IT         ← 产出物链接
## 验证            ← 可复制的命令 + 预期输出
## 练习            ← 指向 exercises.md
## 进阶思考        ← 3 条迁移性问题
```

审计脚本硬性检查 `MOTTO`、`PROBLEM`、`环境逼迫`、`知识积累` 四个关键词存在。

### `quiz.json` schema

```json
{
  "lesson": "<章节目录名>",
  "title": "<章节标题>",
  "subject": "<学科目录名>",
  "questions": [
    {"stage": "pre",   "question": "...", "options": ["a","b","c","d"], "correct": 0, "explanation": ""},
    {"stage": "check", "question": "...", "options": ["a","b","c","d"], "correct": 1, "explanation": ""},
    {"stage": "check", "question": "...", "options": ["a","b","c","d"], "correct": 2, "explanation": ""},
    {"stage": "check", "question": "...", "options": ["a","b","c","d"], "correct": 3, "explanation": ""},
    {"stage": "post",  "question": "...", "options": ["a","b","c","d"], "correct": 0, "explanation": ""},
    {"stage": "post",  "question": "...", "options": ["a","b","c","d"], "correct": 1, "explanation": ""}
  ]
}
```

**恰好 6 题：1 pre + 3 check + 2 post。** `correct` 从 0 开始计数，必须是 0..3 的整数。
`options` 必须恰好 4 项。站点渲染器只认这个形状，旧的 `q/choices/answer` 写法会静默崩溃。

### `code/`

- 在语言的规范命令下端到端跑通，退出码 0。
- **自终止 demo**。不许无限读 stdin，不许在缺少 API key 时挂住。
- 头部 4–6 行注释，引用本章 `docs/zh.md` 路径、以及用到的经典出处或规范编号。
- `code/main.test.js` 或 `code/tests/` 至少 5 个确定性测试。
- 输出必须包含本章的核心结论，让学习者能肉眼确认。

### `outputs/`

**必须恰好两个文件**（`scripts/audit_curriculum.js` 的 L2 层强制校验，不是「目录存在」就算过）：

| 文件 | 要求 |
|---|---|
| `prompt-<base>.md` | 有 H1、有 `## 用途` 段、正文 ≥ 300 字 |
| `skill-<base>.md` | YAML frontmatter 含 `name` / `description` / `version`；`name` 必须等于 `<base>` |

其中 `<base>` = 章目录名去掉 `NN-` 前缀（章 `01-yin-yang-er-fenlei` → `prompt-yin-yang-er-fenlei.md`）。

产出物是**能被直接拿去用**的东西，不是本章代码的抄本。
这两件产物正是「工程化」与「讲课」的分界 —— 一个空的 `outputs/` 目录会让
「每章都产出提示词与技能」这句话变成假话，所以它必须是硬门。

（`agent-<base>.md` / `mcp-<base>.md` 是允许的额外产物，但不替代上面两件。）

---

## 元组字段说明（`curriculum.json`）

`subjectTuple` 定义了紧凑数组的字段顺序，改动它必须同步 `scripts/lib.js` 的 `expand()`：

| 字段 | 含义 | 取值 |
|------|------|------|
| `slug` | 学科目录名 | `NN-english-name`，全小写连字符 |
| `title` | 中文名 | 与院校培养方案一致 |
| `en` | 英文名 | |
| `type` | 类型 | `Core` / `Build` / `Reference` / `Clinic` |
| `semester` | 建议学期 | `1..10` |
| `hours` | 学时 | 正整数 |
| `chapters` | 章节目标数 | 正整数 |
| `bridge` | 中医 → AI 桥梁 | 「中医概念→方法 / …」 |

---

## 每个 PR 的本地校验

```bash
node scripts/build_catalog.js
node scripts/build_roadmap.js
node scripts/build_doc_indexes.js
node scripts/audit_curriculum.js          # 阻断
node scripts/check_readme_counts.js       # 咨询性；main 上自愈
node tests/run_all.js

# 对你动过的每一个章节：
node departments/NN-<dept>/MM-<subject>/chapters/NN-<slug>/code/main.js
node --test departments/NN-<dept>/MM-<subject>/chapters/NN-<slug>/code/
```

CI 门（`.github/workflows/curriculum.yml`）：

| Job | 触发 | 行为 |
|-----|------|------|
| `audit` | push + PR | 跑 `audit_curriculum.js`。**阻断**。 |
| `counts-sync`（仅 main） | push to main | 重建 catalog / ROADMAP / 院系 README，自改 README 计数块并提交 |
| `site-rebuild`（仅 main） | push to main | 重跑 `node site/build.js`，提交 `site/data.js` |
| `counts-drift` | PR | 仅提示；main 合并时自愈 |

---

## 自动化边界

**CI 自动处理 —— 你的 PR 不要碰：**

| 表面 | 触发时机 |
|------|---------|
| `catalog.json` | 每次 CI job |
| `ROADMAP.md` | push 到 main |
| `departments/**/README.md` | push 到 main |
| `departments/**/meta.json` | push 到 main |
| `site/data.js` | push 到 main |

**共享工具（不要在仓库里另写副本）：**

| 文件 | 来源 | 说明 |
|------|------|------|
| `scripts/dom-shim.js` | skill `curriculum-repo-engineering` | 客户端渲染页面的测试夹具。两份副本必然漂移，漂移的夹具会给出虚假信心 |

改动 `scripts/dom-shim.js` 时，必须在真实构建上重跑一次渲染测试并记录结果 ——
这份 shim 本身没有自动测试，改坏了没人会发现。

**你来处理：**

| 表面 | 时机 |
|------|------|
| `curriculum.json` | 新增 / 调整学科时 |
| 章节目录内容 | 写每一章时 |
| `glossary/*.md` | 引入被两章以上共用的术语时 |
| `learning-paths/*.json` | 新增学分路径时 |

---

## 新增一个章节

```bash
# 1. 脚手架（保证契约形状正确）
node scripts/scaffold_chapter.js 01-zhongyi/01-zhongyi-jichu-lilun 04-jing-qi-xue-ye "精气血津液 → 状态向量"

# 2. 填 docs/zh.md：MOTTO / PROBLEM / 双根因 / CONCEPT / BUILD IT / USE IT / SHIP IT
# 3. 写 code/main.js 与 code/main.test.js（≥5 个测试）
# 4. 写 quiz.json（1 pre + 3 check + 2 post）
# 5. 写 outputs/ 产出物
# 6. 校验
node scripts/audit_curriculum.js

# 7. 原子提交
git add departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/04-jing-qi-xue-ye
git commit -m "feat(dept-01/subject-01): add 04-jing-qi-xue-ye"
```

## 新增一个学科

`curriculum.json` 是唯一入口。先在里面加一行元组，再：

```bash
node scripts/scaffold_subject.js 01-zhongyi/16-<new-slug>
node scripts/build_catalog.js && node scripts/build_doc_indexes.js
node scripts/audit_curriculum.js
```

**注意计数不变量**：`domain.scale.departments` 与 `departments.length` 必须相等；
`domain.scale.subjects` 与展开后的学科总数必须相等。加学科就必须同步改这两个数字，
否则 L0 审计直接失败。

---

## 与 AI agent 协作

- agent 可以脚手架、填模板、跑审计、生成站点的数据层。
- agent **不可以**编造经典条文、编造临床结论、或伪造跑通的测试输出。
- 任何"我跑通了"的声明，必须附上真实命令与真实输出。
- 涉及中医语义的判断（证候归属、方剂配伍、经典出处），必须由具备中医药背景的人复核。

---

## 与上游的差异记录

| 上游 | 本仓库继承 | 本仓库改造 |
|------|-----------|-----------|
| `ai-engineering-from-scratch` | phase→lesson 结构、章节契约、静态站点 + CI 重建、learning-paths、glossary、Build It / Use It | 领域从 AI → 中医药；进度轴从 20 个线性 phase → 8 院系 × 10 学期；新增教材轨道 |
| `医圣成长/tcm-textbooks` | 双根因共振模型、七段章节骨架、生长壮老已五阶段、中医↔AI 桥梁表 | 22 课 → 120 学科 × 1086 章节；新增视频平台与教材出版两条交付线 |

---

最后审阅：2026-10-12。
