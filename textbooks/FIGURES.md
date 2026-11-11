# 教材插图 · 约定与工具链

本目录的正文是散文，图是**正文的另一种写法**，不是配图装饰。因此图跟正文受同一套约束：
有据、可复核、可重画。

## 一、两类图，按「要不要算」分

| 图源 | 渲染器 | 管什么 | 典型内容 |
|---|---|---|---|
| `*.mmd` | mermaid（内置 vendor） | 结构 / 流程 / 关系 | 层次划分、辨证流程、脏腑关系、经络流注次序 |
| `*.py` | matplotlib + `tcm_figure.py` 主题 | 数据 / 函数 / 统计 | 时序曲线、分布、构成比、阈值示意 |

选择只看一件事：**这张图要不要算**。要算（有坐标轴、有量纲、有数据）→ `.py`；
只表达类别与箭头 → `.mmd`。手写 SVG 不在此列：那种图只有一张位图可改，
改一个错别字要重新打开绘图软件，与「正文可修订」的契约冲突。

## 二、放哪、叫什么

```
textbooks/<dept>/<subject>/
    ├── 01-第1章-绪论.md
    └── figures/
        ├── fig-01-组成层次与九大系统.mmd     ← 图源
        └── fig-01-组成层次与九大系统.svg     ← 产物（由脚本生成，勿手改）
```

- 图源与产物**同根名**，一源一产物，缺一不可。
- 命名 `fig-<章号两位>-<内容>.{mmd,py}`，与所在章节对应，便于排序与检索。
- 产物 `*.svg` 会被 `build_book.js` 内联进单文件书 HTML（见下文），因此**不进正文的相对路径**。

## 三、正文怎么引用

独占一行，`alt` 即图注：

```markdown
![图 1-1 人体组成的层次与九大系统](figures/fig-01-组成层次与九大系统.svg)
```

渲染结果：

```html
<figure class="fig"><img src="figures/..."><figcaption>图 1-1 人体组成的层次与九大系统</figcaption></figure>
```

规则与边界（`site/md.js` 的 `safeImageSrc`）：

- 只接受**相对路径** + `svg / png / webp / jpg / jpeg` 白名单扩展名；
- `http(s):`、`data:`、`javascript:`、以 `/` 开头的绝对路径、含 `..` 的上跳路径**一律不放行**，
  正文处显示红色「［缺图］」占位。教材产物是离线单文件，外链图在离线场景必定打不开，
  悄悄留着比当场标出来更糟；
- `alt` 为空时回退为文件名，不产出无题图。

## 四、渲染

```bash
node scripts/figures/render.js                  # 渲染全部图源（跳过比源新的产物）
node scripts/figures/render.js --force          # 强制重渲
node scripts/figures/render.js --only 人体解剖学  # 只渲一门
node scripts/figures/render.js --check          # 只对账：产物缺失 / 比源旧 → 退出码 1
```

`npm run figures` / `npm run figures:check` 是同两条命令。

**产物过期判定**：图源 mtime 比产物新即视为过期。这条规则让「改了源忘了重渲染」
在 `npm run check` 里立刻暴露，而不是等有人翻书时才发现图还是上一版。

## 五、工具链

| 组件 | 本机状态 | 安装 / 来源 |
|---|---|---|
| matplotlib | ✅ 3.11.2（Python 3.12） | `python -m pip install matplotlib -i https://mirrors.aliyun.com/pypi/simple/` |
| mermaid 引擎 | ✅ `scripts/figures/vendor/mermaid.min.js` 10.9.1，3.2 MB | `curl -sSL -o scripts/figures/vendor/mermaid.min.js https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js` |
| 无头浏览器 | ✅ Edge（`C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`） | 随 Windows 预装 |

`vendor/mermaid.min.js` 的 sha256：

```
61b335a46df05a7ce1c98378f60e5f3e77a7fb608a1056997e8a649304a936d6
```

### 为什么不用 @mermaid-js/mermaid-cli

试过，放弃了。它会连带 puppeteer + Chromium 拉几百 MB，且 postinstall 要从源码跑
`tsc && vite build`，在本机实测直接失败（`npm error command failed: tsc && vite build`），
重装重试仍在依赖解析阶段空转五分钟以上。

现在的方案是 vendor 一份 mermaid 的 UMD 构建 + 系统已装的 Edge 无头渲染：零外部依赖、
可离线重现、不需要下载浏览器。`platform/pipeline/find_tools.js` 负责找浏览器
（`findBrowser`）与探测 matplotlib（`probeMatplotlib`）。

### 三个必须记住的坑

1. **`htmlLabels: false`** — mermaid 默认把节点文字塞进 `<foreignObject>` 里的 HTML。
   那样的产物作为独立 `.svg`（走 XML 解析）会报 `Unexpected closing tag`，
   **只渲染出第一个节点**，其余全丢。纯 `<text>` 才是合法 XML。
2. **`useMaxWidth: false`** — 否则 mermaid 按容器宽度算 `max-width`，无头环境下会算出
   `91px` 这种荒谬尺寸，整张图被压成一条线。
3. **`--virtual-time-budget`** — `mermaid.render` 是异步的，Edge 的 `--dump-dom`
   在 load 事件后立刻抓 DOM 会抓到「渲染中」。给 10000ms 虚拟时间才稳。

此外产物尺寸不信任 mermaid 自报的宽高：渲染完成后用 `getBBox()` 重算 `viewBox`。

## 六、写 `.py` 图源

```python
# -*- coding: utf-8 -*-
from tcm_figure import canvas, save, WUXING, ACCENT, MUTED

fig, ax = canvas(7, 4)          # 主题（宋体栈 + 教材纸色）已应用
ax.plot(x, y, color=ACCENT, label='木（春）')
ax.set_xlabel('月份')
ax.legend()
save(fig)                        # 输出路径由 render.js 通过 argv[1] 传入
```

`tcm_figure.py` 提供：

- `canvas(w, h)` / `canvas_grid(r, c, w, h)` — 已套好主题的 figure
- `save(fig)` — 存 SVG，路径取 `sys.argv[1]`
- 常量 `PAPER / INK / MUTED / LINE / ACCENT / WUXING(五行五色)`，取值与
  `textbooks/build_book.js` 的 CSS 变量同源

字体找不到时**直接退出并报错**，不生成缺中文字形的图。

### 分段流程链：`flowchain.py`

线性步骤序列（经脉循行、病机传变、治则次第）**不要用 mermaid 画**。mermaid 的 dagre
布局不接受子图方向约束（`subgraph` 内写 `direction` 会被外层 `graph` 方向覆盖），
实测同一条 13 步的链只能排成两种尺寸：

| 排法 | 实测 viewBox | 在 46rem 书页里的样子 |
|---|---|---|
| `graph TD` | 468 × 1360 | 占两屏半，读者要滚两页才看完一条经 |
| `graph LR` | 2245 × 280 | 缩放后字约 6px，等于不可读 |

`scripts/figures/flowchain.py` 自己控制排版：按「每行 N 个、蛇形折返」排方框，
总宽锁在给定英寸内，行数随节点数增长。同一份数据换个 `per_row` 就从横条变方块。

```python
from flowchain import chain

chain(
    title="手太阴肺经 · 循行路线与属络（自胸走手）",
    steps=[("起于中焦（胃脘部）", "inner"), ("下络大肠", "inner"), ...],
    per_row=4, width=8.4, box_h=0.62,
    legend={"inner": "体内联系", "outer": "体表路线", "branch": "支脉", "joint": "交接"},
)
```

- `tag` 决定描边色：`inner`（赭石）/ `outer`（浅褐）/ `branch`（青绿）/ `joint`（赤）。
- 文字里写了 `\n` 就按作者的断行排，不再自动折行 —— 时间轴的「朝代／书名／年代」
  三行结构必须由人定，自动折行会把语义断到错误的位置。
- 蛇形图的第 2、4… 行是**从右往左**读的，箭头方向标明次序。放图时在图注里点一句
  「按箭头方向阅读」，比让读者自己试错好。


### 多列要点面板：`panels.py`

「三部分并列、每部分若干要点」的结构（养生·康复·体质辨识、预防·治则·治法、病因三类…）
同样不要用 mermaid。`graph TD` 下 dagre 会把所有叶子压到同一层横排 —— 3 个分支各 3-4 个
要点就是 10 个方框并排，实测宽到 **1929pt**，而书页只有 552pt，缩放后字高不到 4pt。

`scripts/figures/panels.py` 按列排版：每列一个标题 + 要点竖排，列内纵向、列间横向，
总宽锁死、高度随最长列增长。

```python
from panels import panels
panels(
    title="养生与康复：三块并列，各有其法",
    columns=[
        ("养生", ["原则：形神共养", "精神：恬淡虚无", ...]),
        ("康复", ["原则：形神兼养、动静结合", ...]),
        ("体质辨识", ["五形人 × 五音 = 二十五种人", ...]),
    ],
    width=10.0,
    footnote="一句话收束，可省",
)
```

三个组件怎么选：

| 结构 | 用什么 | 判据 |
|---|---|---|
| 线性步骤（有先后） | `flowchain.chain` | 前一步做完了才有下一步 |
| 并列要点（无先后，只是分块） | `panels.panels` | 各块之间可以任意顺序读 |
| 分类树 / 关系网（有层级或多种关系） | mermaid | 节点 ≤ 12 且分支 ≤ 3 时版面才控得住 |

分支超过 3 个的 mermaid 图一定要先看 `viewBox` 宽度：超过 1100 就该换 `panels`。

## 七、图必须过三关

1. **有据** — 图的内容必须能追溯到本章正文或所引原典。图注不写来源就是缺陷。
   示例：`fig-01-组成层次与九大系统.mmd` 的文件头注明了依据的章节与正文原话。
   **这一关现在是机械执行的**：`scripts/figures/check_provenance.js` 要求每个图源文件头
   必须有 `内容依据：<md 路径>[ §小节号]`，并逐格比对 `.py` 里的文字。
   - 硬检查：图格里出现的**书名**（《…》）与**三位以上数字**必须在正文精确出现。
     这两类最容易被「顺手写对」—— 年代写 1026 还是 1027、书名是《千金要方》还是
     《备急千金要方》，错一个整张图就不可信。
   - 软检查：整格与正文的连续重合度低于 40% 只提示不判失败 —— 图本来就是正文的压缩
     写法，硬要求逐字重合会把合格图判成不合格。
   - `.mmd` 只验出处行：结构图的节点多是压缩转述（「离入出合·六合」在原文里是散在的
     几句话），逐字比对只会制造假阳性。
   - 正文比对时**保留括注**：年代常写在括注里（「魏甘露年间（公元256～260年）」
     「次年（1027年）设计制成两具铜人模型」），删掉括注就会把写着的东西报成找不到。
2. **不越界** — 该章正文口径写「不写数值与单位」，图里就不能出现数值坐标。
   解剖学第 1 章属于这种情形，所以那张图只有类别与箭头。
3. **可重画** — 源文件在仓里、能一条命令重生成、`--check` 能查出过期。

## 八、对账入口有两个，别只跑一个

| 命令 | 查什么 |
|---|---|
| `node scripts/figures/render.js --check` | 图源 ↔ 产物：产物是否缺失、是否比源旧 |
| `node scripts/figures/check_provenance.js` | 图源 ↔ 正文：出处行是否齐备、书名与年代是否真在正文里、图格能否溯源 |
| `node textbooks/build_book.js --check` | 正文引用 ↔ 磁盘文件：引用缺图、孤儿图（有文件无人引用） |

三个都进 `npm run check`。

## 九、单文件书里的图

`textbooks/build_book.js` 生成的 HTML 承诺「单文件、离线可读」，所以它会**把图内联成
data URI**（`inlineFigures`）。原因：产物在 `textbooks/build/`，若保留相对路径就得指回
`textbooks/<dept>/<subject>/figures/`，一旦单独传阅或挪动目录立刻断图。

用 base64 而不是把 SVG 源码直接嵌进 HTML：同一卷里会有多张图，内联 SVG 的 `id` 与
`<style>` 会互相污染（渐变、marker、类名撞车），而 `<img src="data:...">` 天然隔离。

代价是 HTML 变大（一张 18 KB 的 SVG 约变 24 KB）。与之换来的是「一本书就是一个文件」。

## 十、已配图的学科

| 学科 | 图 | 说明 |
|---|--:|---|
| `09-jichu/01-renti-jiepou-xue` 人体解剖学 | 1 | 绪论章配「组成层次与九大系统」。该章正文口径不写数值，故图为纯结构 |
| `03-zhenjiu/01-jingluo-xue` 经络腧穴学 | 20 | 除附篇歌赋（第 20 章）外每章有图；另加知识图谱构建流程 |
| `01-zhongyi/01-zhongyi-jichu-lilun` 中医基础理论 | 14 | 每章一张 + 第 4 章两张（结构图与配属图） |
| `01-zhongyi/05-zhongyi-zhen-duan-xue` 中医诊断学 | 1 | 四诊合参与辨证的关系 |
| `02-zhongyao/03-fangjixue` 方剂学 | 1 | 君臣佐使：四类药的地位与职责 |

**图要插在相应正文处，不是章末。** 这一条踩过一次坑：13 张图里有 7 张最初被追加到文件末尾，
而多数章的末尾是「AI 应用」小节与免责声明 —— 图讲的是理论部分，却被摆在 AI 节和声明之后。
正确做法是按图所覆盖的节群定位：覆盖 8.1–8.3 的图插在 8.4 之前，覆盖全章的图插在最后一节
讲完之后、免责声明之前。`build_book.js` 只查「有没有引用」，查不出位置错，这一关靠人看。

经络腧穴学 19 张的构成：结构总图 1 · 流注环 1 · 学术发展 1 · 十二经循行 12 ·
奇经八脉 2 · 纵横关系 1 · 实质假说 1。其中 12 张循行图用 `flowchain` 排布，
每格是《灵枢·经脉》原文的一个分句，顺序未改、未增删。

**未逐章配图的章与理由**（不是漏做）：第 20 章是十四经穴分寸歌、四总穴歌、特定穴歌诀，
正文本身是可诵记的歌赋，画成图只会把韵文拆散。

