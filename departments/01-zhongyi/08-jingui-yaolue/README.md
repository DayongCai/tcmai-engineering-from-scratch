# 金匮要略

> 杂病→规则库 / 方证对应→检索增强

| 项目 | 内容 |
|------|------|
| 院系 | ☯️ 中医系 `01-zhongyi` |
| 类型 | Core |
| 学期 | 第 5 学期（🌿 长·积累 / 大三） |
| 学时 | 72 |
| 章节目标 | 24 |
| 学科编号 | 008 / 135 |
| 英文名 | Synopsis of the Golden Chamber |

## 一、学科定位

金匮要略（Synopsis of the Golden Chamber）是中医系的核心学科，聚焦「理法方药的内核：基础理论、经典、临床各科」中的一个完整知识域。

## 二、中医 → AI 桥梁

```text
杂病→规则库 / 方证对应→检索增强
```

金匮要略 里的每一个传统概念，都被翻译成一个可计算、可验证的工程对象：
中医概念给出**语义与约束**，AI/工程方法给出**表示与算法**。两者必须能互相回指，
否则这个章节就还没有写完。

## 三、章节地图（24 章 ↔ 25 篇全覆盖）

**结构：前十章按主题深读，第 11-24 章按篇精读。** 前十章沿「成书 → 传变 → 各病类 → 妇人 → 配伍统计」组织，
一章可跨两篇（如第 5 章合讲疟病与中风历节），也可只取一篇的一条线（如第 7 章只讲痰饮）；
另有 14 篇没有主题章，按「一篇一章」补成篇目精读，于是 **24 章恰好覆盖《金匮要略》25 篇**（篇 1 由第 1、2 章共讲）。

两类章的写法不同，不要混着读：

- **主题章**（1-10）：以一个问题为主线（「27 条为什么切成 13/11/3」「三篇妇人病是一条病程轴」），
  篇内条文按问题重排。适合先建立判断框架。
- **篇目精读**（11-24）：一篇一章，先给本篇的规模与结构（条数／方数／方条比／出方条／字面命中分类），
  再把全篇条文逐字录在章末「附：本篇原文全录」。适合回到原文、按篇通读。

| 章 | 章名 | 覆盖篇 | 章型 |
|--:|---|---|---|
| 1 | [金匮的成书与杂病分类](chapters/01-chengshu-zabing/) | 第1篇（成书、篇目分类、治未病总纲） | 主题章 |
| 2 | [脏腑经络先后病：传变与预防](chapters/02-zangfu-chuanbian/) | 第1篇 | 主题章 |
| 3 | [痉湿暍病：外感杂病的辨识](chapters/03-jing-shi-ye/) | 第2篇 | 主题章 |
| 4 | [百合狐惑阴阳毒：少见病的鉴别](chapters/04-baihe-huhuo/) | 第3篇 | 主题章 |
| 5 | [疟病与中风历节：节律与痹阻](chapters/05-nueb-zhongfeng/) | 第4、5篇 | 主题章 |
| 6 | [血痹虚劳：虚损的分层](chapters/06-pibai-xulao/) | 第6篇 | 主题章 |
| 7 | [痰饮咳嗽：水液代谢的失效](chapters/07-tanyin-kesou/) | 第12篇 | 主题章 |
| 8 | [消渴与淋病：津液与排泄](chapters/08-xiaoke-linbing/) | 第13篇 | 主题章 |
| 9 | [妇人病三篇：经带胎产的辨证](chapters/09-furen-sanpian/) | 第20、21、22篇 | 主题章 |
| 10 | [杂病方剂的配伍规律与统计](chapters/10-zabing-peiwu/) | 跨篇（第2、4、12、22篇抽样统计） | 主题章 |
| 11 | [肺痿肺痈咳嗽上气](chapters/11-pian7-feiwei-feiyong/) | 第7篇 | 篇目精读 |
| 12 | [奔豚气](chapters/12-pian8-bentun/) | 第8篇 | 篇目精读 |
| 13 | [胸痹心痛短气](chapters/13-pian9-xiongbi/) | 第9篇 | 篇目精读 |
| 14 | [腹满寒疝宿食](chapters/14-pian10-fuman-shanjia/) | 第10篇 | 篇目精读 |
| 15 | [五脏风寒积聚](chapters/15-pian11-zangfu-jiju/) | 第11篇 | 篇目精读 |
| 16 | [水气](chapters/16-pian14-shuiqi/) | 第14篇 | 篇目精读 |
| 17 | [黄疸](chapters/17-pian15-huangdan/) | 第15篇 | 篇目精读 |
| 18 | [惊悸吐衄下血胸满瘀血](chapters/18-pian16-jingji-tunv/) | 第16篇 | 篇目精读 |
| 19 | [呕吐哕下利](chapters/19-pian17-outu-yueli/) | 第17篇 | 篇目精读 |
| 20 | [疮痈肠痈浸淫](chapters/20-pian18-chuangyong/) | 第18篇 | 篇目精读 |
| 21 | [趺蹶手指臂肿转筋阴狐疝蚘虫](chapters/21-pian19-fujue-shanchong/) | 第19篇 | 篇目精读 |
| 22 | [杂疗方](chapters/22-pian23-zaliaofang/) | 第23篇 | 篇目精读 |
| 23 | [禽兽鱼虫禁忌](chapters/23-pian24-qinshou-jinji/) | 第24篇 | 篇目精读 |
| 24 | [果实菜谷禁忌](chapters/24-pian25-guoshi-jinji/) | 第25篇 | 篇目精读 |

**章 ↔ 篇**（篇号按 25 篇本；笈成本 22 篇正文 + 3 附篇，编号 1-22 与之一致）：

| 项 | 值 |
|---|---|
| 篇总数 | 25（卷上 9 / 卷中 9 / 卷下 7） |
| 主题章覆盖 | 11 篇（1、2、3、4、5、6、12、13、20、21、22） |
| 篇目精读覆盖 | 14 篇（7、8、9、10、11、14、15、16、17、18、19、23、24、25） |
| 逐字入 docs 的条文 | **402 条全部**：前十章 191 条（序 1 + 篇 1-6、12、13、20-22 共 190）+ 篇目精读 14 章 208 条 + 附篇 3 篇（笈成各 1 条、按段引用）——`node tests/test_jingui_quanwen.js` 校验「每条出现恰好一次且与底本逐字相等」 |
| 原文双见证 | `standards/jingui/底本.json`（笈成）＋ `standards/jingui/gushiwen/`（古诗文网） |

开新章的脚手架：

```bash
node scripts/scaffold_chapter.js 01-zhongyi/08-jingui-yaolue 25-<chapter-slug>
```

第 11-24 章由生成器维护（`python scripts/build_jingui_pian_chapters.py`），
手改会被 `--check` 判红；要改内容请改 `scripts/jingui_pian_content.py` 后重生成。

## 四、章节契约（每章必须满足）

```text
chapters/NN-<slug>/
├── docs/zh.md      # MOTTO / PROBLEM / 环境逼迫 / 知识积累 / CONCEPT / BUILD IT / USE IT / SHIP IT
├── code/           # 可运行、自终止、退出码 0（Node.js 或 Python，见 AGENTS.md 依赖白名单）
├── quiz.json       # 恰好 6 题 = 1 pre + 3 check + 2 post
└── outputs/        # 可复用产出物（prompt / skill / agent / mcp / 临床工具）
```

## 五、教材交付 [textbooks]

```text
输出: textbooks/01-zhongyi/08-jingui-yaolue/
├── 00-前言.md                       # 体例 / 口径 / 注家层 / 还缺什么
├── 01-第1章-<标题>.md   … 24 章      # N.1 原文逐条 + 释义 + 词解 + 方解 + 四家注 → N.2-N.5 论述 + 数据表 + 小结/思考题
└── figures/                         # 预留（本章暂无图）
```

| 项 | 值 |
|---|--:|
| 章 | **24 / 24**（与课程线同章号、同章名、同覆盖篇） |
| 正文 | **703,867 字**（生成器口径） |
| 其中：原文 | 402 条逐字（序 1 + 正文 398 + 附篇 3 篇按段） |
| 其中：注家引文（四家） | 注文汉字 301,331 落在 402 条上（另有 29,401 属篇首/附篇无条注） |
| 其中：【释义】（自撰） | **398 条**（398/398）；12,165 字符，中位 29 字 |
| 其中：【词解】（自撰） | **426 个词条**，覆盖 402/402 条；35248 字符 |
| 其中：【方解】（自撰） | **168 首**（174 方去重），覆盖 174/174 方；14921 字符 |
| 其中：本项目自撰 | 论证层约 8.8 万 + 释义 12,165 + 词解 35,248 + 方解 14,921 |
| 注家命中 | **392 / 398 条**（金鑑 383 / 心典 339 / 淺註 345 / 輯義 402 块；留档 2,221,898 字节） |
| 生成 | `build_jingui_textbook.py`（教材）· `fetch_jingui_zhujia.py` / `build_jingui_zhujia_align.py`（注家）· `jingui_fangzu.py` / `build_jingui_fangzu.js`（方族） |
| 方族 | **23 族 / 168 方**（`standards/jingui/fangzu.{json,md,svg}`；一族一归属，标志药门槛族内≥50%、族外<10%） |
| 类方鉴别 | **30 对**（同族相邻两方；加减味／易味／同药异量三类，差异由底本现算） |

**字数要分清口径**：正文 66.8 万字，其中 **注家引文占大头（301,331 汉字落在 402 条上）**，
本项目自撰为：论证层约 8.8 万 + 【释义】12,165 字符（398 条全覆盖）+ 【词解】35,248 字符（426 词条，402/402 条）+ 【方解】14,921 字符（168 首，174/174 方）。
这与本仓其它教材「源教材正文层」的做法一致，**不等于本项目写了 66 万字**。

**注家留档与校勘**（`standards/jingui/zhujia/`）：四家注按字节留档 + sha256 + `校勘登记.md`，
对齐按文本相似度（≥0.60）而非条号；缺注的 6 条如实标注，不补写。
《醫宗金鑑·訂正仲景全書金匱要略註》走独立抓取工程（`scripts/fetch_jingui_yizong.py`，笈成條列版＋原版双见证）；
金鑑方段 218 段 ↔ 底本 174 方，同名/近似对上 147，未对上的 27 方逐条列在 `校勘登记.md` §五。

## 六、平台交付 [tcmP]

```text
输出: platform/courses/01-zhongyi/08-jingui-yaolue/
├── course.yaml             # 课程元数据 + 章节 → 视频映射（scripts/build_jingui_course_yaml.py 渲染）
├── <slug>/slides/          # 幻灯片 HTML（由 docs/zh.md 派生）
├── <slug>/narration/       # 讲稿 lesson.json + 逐段 mp3 + subtitles.vtt
└── <slug>/video/           # 成片 lesson.mp4（H.264 1080p + mov_text 字幕轨，不入库）
```

| 项 | 值 |
|---|--:|
| 成片 | **24 / 24 讲** |
| 实测总时长 | **5 小时 44 分**（344:20，ffprobe 逐讲实测；统稿后重出第 1/6/10 讲，由 343:10 略增） |
| 幻灯片 | 478 张 |
| 配音段 | 每讲 9-13 段，逐段 edge-tts（zh-CN） |
| 成片体积 | 488 MB |
| 字幕 | 每讲一条 mov_text 轨，时间码取 TTS 实测 |
| 发布包 | HLS（1080p 138–163k / 540p 102–109k）→ `D:/tcm-media/01-zhongyi/08-jingui-yaolue/` · **750.7 MB** · 24 章 · 344.3 分钟 · 已登记 `platform/media-release.json` |
| 台账 | [video/教案.md](video/教案.md)（由 `node scripts/build_video_lessons.js` 生成：逐讲时长 / 成片状态） |

复算一条龙：

```bash
node platform/pipeline/extract_narration.js  01-zhongyi/08-jingui-yaolue
node platform/pipeline/build_slides.js       01-zhongyi/08-jingui-yaolue
node platform/pipeline/render_frames.js      01-zhongyi/08-jingui-yaolue
node platform/pipeline/synthesize_narration.js 01-zhongyi/08-jingui-yaolue
node platform/pipeline/build_subtitles.js    01-zhongyi/08-jingui-yaolue
node platform/pipeline/build_video.js        01-zhongyi/08-jingui-yaolue
python scripts/build_jingui_lessons.py       # 台账 + meta.json
python scripts/build_jingui_course_yaml.py   # course.yaml
```

`meta.json` 里两个字段含义不同：`videosRendered` = 已渲染成片数（24），
`videosPublished` = 已进 `platform/media-release.json` 的讲数（打完 HLS 之后为 24）。
只渲了没打包时前者会大于后者，别把两个数当同一个。

播放：APP 只读 `platform/media-release.json` + `D:/tcm-media/index.json`（HLS 流转产物不入库）。

## 七、进度

| 指标 | 当前 | 目标 |
|------|------|------|
| 章节 | **24** | 24 |
| 视频 | **24**（5.74 小时） | 24 |
| 文档字数 | 163,341（含 402 条原文全录） | — |
| 教材字数 | 0 | 尚未启动 |

> 状态字形：🌱 未开始 ⬚ · 🚧 进行中 · ✅ 完成
