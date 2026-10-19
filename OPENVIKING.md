# 本项目已接入 OpenViking（上下文数据库）

> 2026-10-19 接入并验证。这一页是"链接在哪、包含什么、怎么重同步、怎么验"的记录，不是宣传。

## 链接位置

| 项 | 值 |
|---|---|
| 服务 | `http://127.0.0.1:1933`（`E:\openviking\venv\Scripts\openviking-server.exe`，v0.5.0，`auth_mode=dev`） |
| 库内路径 | `viking://resources/projects/tcmai` —— **项目根就是这一层**，不再多套一层仓库名 |
| 导入任务 | `25fa90a7-8f2a-4229-9246-f444b71d81b3`（`add_resource`，completed；2026-10-19 23:30 改根后重导） |
| 规模 | 279 个 `.md` 入库（`stat.count=534` 含目录节点） |
| 处理模式 | `vectors_only`（只用本地向量，不逐文件跑 VLM 摘要） |
| 向量模型 | `BAAI/bge-small-zh-v1.5` · 512 维 · 本地服务 `127.0.0.1:8765` |
| 监控 | `--watch-interval 0`（不自动跟进；改文档后的重同步见下） |

Hermes 侧已打开 `memory.openviking.recall_resources`（`hermes memory status` 可见 `recall_resources: True`），
所以自动 recall 会把这个 resource 一并检索；不打开时它只能被显式 `viking_search(scope=...)` 查到。

## 收录范围

```text
include   : *.md
ignore    : node_modules, .git, site, data, .cache, standards/materials
```

**故意没收 `standards/materials/`**：那是原始材料语料（67 个 md、20MB 级），先把"项目自己的文档与口径"
接进去；材料语料要收是另一条命令（见下），不要混在同一次导入里，否则重同步会变成十几分钟。

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

换成另一个主题同样命中：
`ov find "真心痛 阳衰血瘀 与心肌梗死的对应"` → `descriptions/逐条/真心痛阳衰血瘀证_95193711.md`（0.903）。

## 重同步

项目根是 `--to` 精确指定的那一层，**不能原地覆盖重导**（`--to` 要求目标不存在）。两条路选一条：

**A. 手动全量重建**（文档改动多时）

```bash
OV=E:/openviking/venv/Scripts/ov.exe
"$OV" rm viking://resources/projects/tcmai --recursive --wait
"$OV" add-resource "E:/tcmai-engineering-from-scatch" \
  --to "viking://resources/projects/tcmai" \
  --include "*.md" \
  --ignore-dirs "node_modules,.git,site,data,.cache,standards/materials" \
  --processing-mode vectors_only --watch-interval 0
```

**B. 打开 watch**（改动少、想省事）：把 `--watch-interval 0` 换成 `--watch-interval 60`（分钟），
OpenViking 会监视本地目录按间隔刷新。代价是每次扫描都有开销，删文件后的清理不如全量重建干净。

要把 `standards/materials/` 也收进来，换一个目标根单独导一次：

```bash
"$OV" add-resource "E:/tcmai-engineering-from-scatch" \
  --to "viking://resources/projects/tcmai-materials" \
  --include "*.md" --ignore-dirs "node_modules,.git,site,data,.cache" \
  --processing-mode vectors_only --watch-interval 0
```

## 变更记录

- 2026-10-19 22:35 首次接入：导到 `viking://resources/projects/tcmai/tcmai-engineering-from-scatch`
  （279 文件，任务 `4d7c606d…`）——多套了一层仓库名。
- 2026-10-19 23:30 **改根**：删掉那棵 533 节点的子树，用 `--to viking://resources/projects/tcmai` 重导，
  项目根即这一层（任务 `25fa90a7…`，`stat.count=534`）。检索复验仍是 0.829 / 0.820。
- 改根期间 OpenViking 服务与本地 embedding 服务**都停过一次**（进程被中断），用
  `C:\Users\user\bin\openviking-server.exe` 拉回——这个 shim 会自动带 `ov.conf` 并拉起 8765 的 embed 服务；
  存储落盘在 `E:\openviking\data`，重启不丢已入库内容（533 节点在重启后仍可 `ls`）。

## 踩过的坑

- `ov` 默认读 `~/.openviking/ovcli.conf`，而服务端配置在 `E:\openviking\ovcli.conf` —— 复制一份到
  `~/.openviking/ovcli.conf` 才能在任意目录跑 `ov`（或设 `OPENVIKING_CLI_CONFIG_FILE`）。
- 顶层 scope 只认 `agent / queue / resources / session / temp / upload / user`；
  文档示例里的 `viking://projects/...` 在本版会报 `INVALID_URI`，要写 `viking://resources/projects/...`。
- `--to` 要求目标尚不存在：想改根就必须先 `rm --recursive` 再导，不能直接覆盖。
- 用 `curl` 直接 POST 中文 JSON 会 500：Windows 控制台按 GBK 发字节，服务端按 UTF-8 解码。
  用 Node `fetch` / Python `requests` 发（自动 UTF-8）就没问题 —— **不是服务坏了**。
