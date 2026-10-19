# 本项目已接入 OpenViking（上下文数据库）

> 2026-10-19 接入并验证。这一页是"链接在哪、包含什么、怎么重同步、怎么验"的记录，不是宣传。

## 链接位置

| 项 | 值 |
|---|---|
| 服务 | `http://127.0.0.1:1933`（`E:\openviking\venv\Scripts\openviking-server.exe`，v0.5.0，`auth_mode=dev`） |
| 库内路径 | `viking://resources/projects/tcmai/tcmai-engineering-from-scatch` |
| 导入任务 | `4d7c606d-ce26-4fe9-85dc-b519fa24baf6`（`add_resource`，completed） |
| 规模 | 279 个 `.md` 入库（`stat.count=533` 含目录节点） |
| 处理模式 | `vectors_only`（只用本地向量，不逐文件跑 VLM 摘要） |
| 向量模型 | `BAAI/bge-small-zh-v1.5` · 512 维 · 本地服务 `127.0.0.1:8765` |
| 监控 | `--watch-interval 0`（不自动跟进；改了文档要手动重同步，见下） |

Hermes 侧已打开 `memory.openviking.recall_resources`（`hermes memory status` 可见 `recall_resources: True`），
所以自动 recall 会把这个 resource 一并检索；不打开时它只能被显式 `viking_search(scope=...)` 查到。

## 收录范围

```text
include   : *.md
ignore    : node_modules, .git, site, data, .cache, standards/materials
```

**故意没收 `standards/materials/`**：那是原始材料语料（67 个 md、20MB 级），先把"项目自己的文档与口径"
接进去；材料语料要收是另一条命令（见下），不要混在一次导入里，否则重同步会变成十几分钟。

收进去的是：根目录 7 份（ARCHITECTURE / FORKING / PORTING / CHANGELOG / README / ROADMAP / CONTRIBUTING）、
`standards/semtensor/descriptions/`（EVIDENCE-STANDARD、UNQUALIFIED、descriptions 等）、
`standards/shanghan/`、`standards/icd11/`、`endpoints/`、`departments/`、`learning-paths/`、`outputs/`、`textbooks/`、`templates/`。

## 怎么用

```bash
# 语义检索（限定在本项目子树，避免混进别的资源）
ov find "证候外部证据分级：整串级与构件级不能合并" -u viking://resources/projects/tcmai -n 3

# 浏览落在哪
ov tree viking://resources/projects/tcmai -L 2

# 任务状态
ov task list
```

Agent 侧：`viking_search(query, scope="viking://resources/projects/tcmai")`，
再 `viking_read(uri, level="overview")` 读摘要、`full` 读全文。

## 验证（不是"导完就算"）

`ov find "证候外部证据分级：整串级与构件级不能合并" -u viking://resources/projects/tcmai -n 3` 返回：

| 排名 | 命中 | 分数 |
|---|---|---|
| 1 | `standards/semtensor/descriptions/UNQUALIFIED.md` | 0.829 |
| 2 | `standards/semtensor/descriptions/EVIDENCE-STANDARD.md` | 0.820 |
| 3 | `standards/semtensor/descriptions/descriptions.md`（97 证名 / 104 DSU） | 0.820 |

前三名正是这个问题的标准答案所在，说明切分与向量都落对了。

## 重同步

```bash
# 文档改了以后（同路径重导一次；OpenViking 按 add_resource 新建任务，不覆盖旧任务记录）
E:/openviking/venv/Scripts/ov.exe add-resource "E:/tcmai-engineering-from-scatch" \
  --parent-auto-create "viking://resources/projects/tcmai" \
  --include "*.md" \
  --ignore-dirs "node_modules,.git,site,data,.cache,standards/materials" \
  --processing-mode vectors_only --watch-interval 0
```

要把 `standards/materials/` 也收进来，去掉那条 ignore 并单独导一次：

```bash
... --include "*.md" --ignore-dirs "node_modules,.git,site,data,.cache" \
    --to "viking://resources/projects/tcmai/materials"
```

## 踩过的坑

- `ov` 默认读 `~/.openviking/ovcli.conf`，而服务端配置在 `E:\openviking\ovcli.conf` —— 复制一份到
  `~/.openviking/ovcli.conf` 才能在任意目录跑 `ov`（或设 `OPENVIKING_CLI_CONFIG_FILE`）。
- 顶层 scope 只认 `agent / queue / resources / session / temp / upload / user`；
  文档示例里的 `viking://projects/...` 在本版会报 `INVALID_URI`，要写 `viking://resources/projects/...`。
- 用 `curl` 直接 POST 中文 JSON 会 500：Windows 控制台按 GBK 发字节，服务端按 UTF-8 解码。
  用 Node `fetch` / Python `requests` 发（自动 UTF-8）就没问题 —— **不是服务坏了**。
