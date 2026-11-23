# 成片交付与 APP 播放方案（release / CDN 策略）

> 面向「自适应 APP 网络播放」。解决的是一句话问题：
> **4.24 GB 成片只躺在本地磁盘、`video/` 又被 gitignore，APP 拿不到、也播不动。**

---

## 一、为什么不能直接把 mp4 塞进 release

| 现状 | 问题 |
|---|---|
| 每章一个 `lesson.mp4`（33–45 MB） | 要「边下边播」只能靠 HTTP Range 硬扛；网差时首屏要等整段缓冲 |
| 1080p 单一档位 | 弱网没有可降的档，只能卡住 |
| 音频 106 kbps 占 47% 字节 | 旁白是单声道人声，按 128k 立体声编码，纯属浪费 |
| GitHub Release 单 asset ≤ 2 GB | 三科 4.24 GB 至少要 3 个包，且下载后才能播 |

所以要先**打包成流**，再谈「放哪儿」。

---

## 二、打包产物（`build_hls.js`）

每章产出一个目录：

```text
<HLS_ROOT>/<dept>/<subject>/<slug>/
├── master.m3u8            多档清单（APP 入口）
├── 1080p/{index.m3u8, init.mp4, seg_00001.m4s …}
├── 540p /{index.m3u8, init.mp4, seg_00001.m4s …}
├── audio.m3u8             「只听」档（不带画面）
├── audio/{index.m3u8 未使用, a_00001.m4s …}
├── subs/zh.vtt            字幕（同时在 master 里挂成 SUBTITLES 组）
├── poster.jpg             列表页封面（3 秒处一帧，640 宽）
└── publish.json           本章清单（时长/档位/实际码率/分片数/源 sha256）
```

课程级与全局各一份清单：

```text
<HLS_ROOT>/<dept>/<subject>/publish.json    一门课的章目录 + 汇总
<HLS_ROOT>/index.json                       全部课程（APP 只读这一份起步）
```

### 档位为什么是这两档（实测，不是拍脑袋）

源片实测：**视频 113 kbps / 音频 106 kbps**（1920×1080，静态幻灯片）。

| 档位 | 视频 | 音频 | 实测平均带宽 | 说明 |
|---|---|--:|--:|---|
| `1080p` | **原片直接 copy** | 64k 单声道 | **182 kbps** | 零重编码、零画质损失；字节主要省在音频 |
| `540p` | 100k 重编码 | 48k 单声道 | **113 kbps** | 弱网兜底；正文可读，页眉/页脚小字会软 |
| 仅音频 | — | 48k 单声道 | **48 kbps** | 通勤/后台听，约 6.5 MB/小时 |

**为什么不把 1080p 重编码得更小**：源片本来就是本仓产出的、已审过的画质，
再编一次只会掉质量；而它已经只有 113 kbps，没有"再压一刀"的空间。

**为什么 540p 而不是 720p 做低档**：720p@150k 实测比 1080p copy 还费流量（198k vs 182k），
ABR 会变成"往下切反而更卡"；720p@90k 文字糊得不比 540p@100k 好。所以低档就是 540p。

**为什么纯音频不放进 master**：播放器不会在"有画面/无画面"之间自动切换，
所以它在清单里是独立字段 `audioOnly`，由 APP 决定要不要提供"只听"模式。

---

## 三、放哪儿：三条路径，按成本排序

### A. 对象存储 + CDN（推荐，唯一真正支持边下边播的）

| 项 | 值 |
|---|---|
| 存储 | 阿里云 OSS / 腾讯云 COS / Cloudflare R2（R2 出网免费） |
| 体积 | **实测 7.30 GB**（5 门课 150 章，均 49 MB/章） |
| 月费（粗估） | 存储 0.12 元/GB ≈ **0.75 元/月**；CDN 流量 0.2 元/GB |
| 单章观看成本 | 45 分钟 @182 kbps ≈ **62 MB ≈ 0.012 元**（1000 次观看 ≈ 12 元） |
| 必备配置 | CORS（`Access-Control-Allow-Origin`）、Range、`Cache-Control: public, max-age=31536000`（分片不可变） |

上传（任选其一，均支持增量）：

```bash
# rclone（S3 兼容 / R2 / OSS 都行）
rclone sync D:/tcm-media remote:tcm-media/v1 --checksum
# 阿里云 ossutil
ossutil64 sync D:/tcm-media oss://tcm-media/v1/ --update
```

### B. GitHub Releases（零成本离线包；已按章分卷）

工具：`npm run media:pack` → `D:/tcm-release/<course>/…tar` + `parts.json`，
仓库侧只留清单 `platform/release-bundle.json`。

实测（2026-11-01，4 门 119 章）：

| 课程 | 卷 | 每卷章数 | 体积 |
|---|--:|---|--:|
| 01-zhongyi-jichu-lilun | 1 | 10 | 0.09 GB |
| 08-jingui-yaolue | 1 | 24 | 0.73 GB |
| 10-zhongyi-neike-xue | 1 | 14 | 0.65 GB |
| 11-bingli-shengli-xue | 3 | 26 + 25 + 2 | 3.24 GB |
| 12-yaoli-xue | 2 | 30 + 19 | 2.59 GB |
| 合计 | **8 卷** | 150 | **7.30 GB** |

- **按章切卷，不拆章**：拆了章就不是「完整一集」；每卷 ≤1.6 GB，留出余量给 GitHub 的 2 GB 上限。
- **不压缩**：HLS 分片本身已是 h264/aac 码流，gzip 只省 1–2% 却慢一倍；
  且本机 Node 调 `tar` 命中的是 msys GNU tar，`D:/x` 会被当成「远程主机 D」，必须 `--force-local`。
- 每卷 sha256 记在 `parts.json` 里，解压前先核：`sha256sum -c`。

```bash
# 上传（gh CLI）
gh release create media-v1 --title "课程视频 v1" --notes "119 章 / 45.5 小时"
gh release upload media-v1 D:/tcm-release/*/*.tar D:/tcm-release/bundle-index.json
# 或对象存储的离线前缀
rclone copy D:/tcm-release remote:tcm-media/v1/offline
```

解压（Windows 10+ 自带 tar）：

```bash
tar -xf 12-yaoli-xue-v1-part-01.tar -C D:/media/v1
# 解出 09-jichu/12-yaoli-xue/<slug>/…，路径与 index.json 里的相对路径一致
```

适合**离线包**（APP 内置课程包 / 学员下载回家看），不适合流播。
版本语义：release tag = `media-v1`；重打包不覆盖旧 tag。

### B·2 用脚本发（只走 API，不需要 github.com）

本机 **github.com 被连接重置**（超时 / `Connection reset`），所以 `gh auth login` 的 device flow
（走 `github.com/login/device/code`）根本发不出去；而 `api.github.com` 与 `uploads.github.com` 是通的。
因此发布链路做成**纯 API**：

```bash
export GITHUB_TOKEN=<fine-grained：Releases + Contents 读写>
python scripts/publish_release_github.py --repo DayongCai/tcm-course-media --create-repo --tag media-v1
python scripts/publish_release_github.py --repo DayongCai/tcm-course-media --dry-run   # 只看计划
```

它做的事与失败语义：

| 步 | 行为 | 失败时 |
|---|---|---|
| 1 | 仓库存在性检查，缺失时 `--create-repo` 建**私有**仓 | 无令牌 → 退出 2（不发任何请求） |
| 1.5 | 仓库空的时候写一份 README（Contents API） | 写失败只告警，不影响附件 |
| 2 | 找 tag 对应的 Release，没有就建 | 建失败 → 退出 7 |
| 3 | 逐个上传 13 个附件；**同名且大小一致就跳过**（幂等，可断点重跑） | 上传失败 → 退出 8 |
| 4 | 回读 Release，确认附件都在 | 缺件 → 退出 9 |

附件清单（13 个 / 6.56 GB）：7 个分卷 `.tar` + `bundle-index.json` + 全局 `index.json`
+ 4 门课的 `publish.json`——APP 只读清单就能列课程，不必先解压离线包。

**为什么不在走 gh 的网页登录**：gh 需要 `github.com`；这台机器只有 `api.github.com` 通。
`gh release upload` 也走 uploads API，但登录那步过不去，所以直接用令牌打 API 更直接。

### C. 自建 nginx（校内/局域网，零费用；已配好并实测）

不要手抄配置——`platform/deploy/` 里三件套直接能用：

```bash
./platform/deploy/deploy.sh --host user@10.0.0.12 --host-web 10.0.0.12
```

一条命令：**同步媒体 → 装 `nginx-media.conf` → `nginx -t` → reload → 验 7 项**。
详见 `platform/deploy/README.md`（含 SELinux、防火墙、权限、HTTPS 的注意点）。

实测（本机 Windows + nginx 1.27.3 + 同一份 6.7 GB 媒体）：

| 检查 | 结果 |
|---|---|
| `nginx -t` | syntax is ok |
| `master.m3u8` | 200 · `application/vnd.apple.mpegurl` · CORS `*` |
| 分片 + `Range: bytes=0-99` | 206 · `video/iso.segment` · `immutable` |
| `ffprobe master.m3u8`（HTTP） | 1284.933985 s |
| 抽帧 HTTP vs 本地 | 208,434 B，逐字节相同 |

**三个「看起来多余其实要命」的配置**（都是实测出来的，不是猜的）：

1. `keepalive_timeout 0;` —— ffmpeg 复用连接取变体清单会判定 `Invalid data`，
   master 全部档位解析失败、`ffprobe` 返回 `N/A`；关长连接后立刻正常。
2. 清单关 Range（`max_ranges 0;`）—— 带 `Range` 取清单会收到 206，被当成「分片」。
3. 每个 `location` 重写 CORS —— nginx 的 `add_header` 在子块是**覆盖**不是追加；
   而且 `add_header` 不能放在 `if` 里（报 `directive is not allowed here`）。

### D. 不依赖任何令牌的发布：本地 release 目录（推荐先做这一步）

发布 ≠ 传到 GitHub。**版本化目录 + 清单 + 校验和 + 下载页**四样齐了，就是一个可分发的 release；
传到哪儿只是换个地址。所以先在本机装好这一份，之后有令牌（或拷到网盘/U 盘/校内服务器）都直接复用。

```bash
npm run media:stage            # → D:/tcm-release/media-v1/
npm run media:release:serve    # → http://127.0.0.1:7792/（下载页）
```

产物（`D:/tcm-release/media-v1/`，7.4 GB）：

| 文件 | 作用 |
|---|---|
| `index.html` | 下载页：15 个附件的名称/大小/章数/sha256，点即下 |
| `RELEASE-NOTES.md` | 这一版发了什么、怎么校验、怎么解压、播放要求 |
| `SHA256SUMS` | 17 行逐文件校验（8 分卷 + 7 清单 + 说明 + 下载页） |
| `index.json` / `*-publish.json` / `bundle-index.json` | APP 读的清单 |
| `*.tar` × 8 | 按章切分的离线包 |

实测：

```bash
cd D:/tcm-release/media-v1 && sha256sum -c SHA256SUMS   # 17 行全部 OK
curl -o /dev/null -w '%{http_code}' -H 'Range: bytes=0-1023'   http://127.0.0.1:7792/12-yaoli-xue-v1-part-01.tar      # 206（大文件可断点续传）
```

三条去向，都不需要令牌：

1. **校内 nginx**：把 `media-v1/` 拷到服务器，见 §3.C（`platform/deploy/`）。
2. **U 盘 / 网盘 / 微信群**：整目录拷走，收件人 `sha256sum -c` 自检后解压。
3. **GitHub Release（有人工浏览器时）**：在网页上把 8 个 `.tar` 拖进 release 的附件区即可，
   正文直接粘 `RELEASE-NOTES.md`。这一步走的是浏览器会话，不需要 API 令牌。

有令牌时 `npm run media:publish` 上传的就是**同一批文件**，不必重新打包。

## 四、版本与不可变

**发布门：整门打齐才进 `index.json`。** 打包器扫描磁盘时会比对「源侧有 `video/lesson.mp4` 的章数」，
数量不等的课不进清单，只打印：

```text
⏳ 未打齐、暂不进 index.json：09-jichu/12-yaoli-xue（33/49）
```

理由：清单一旦说「这门课有」，APP 列表就显示 49 章；用户点进第 40 章拿到 404——
**半门课比没有这门课更糟**。所以宁可晚发，也不发半个包。

```text
/<version>/<dept>/<subject>/<slug>/master.m3u8     例：/v1/09-jichu/12-yaoli-xue/01-introduction/master.m3u8
```

- **播放清单（m3u8/json）永不原地改写**：内容变化就发 `v2/`，旧版本保留至少 30 天。
- 每份 `publish.json` 里带 `source.mp4Sha256`——发布前核对，防止"发了旧片"。
- 清单里所有 URL 都是**相对路径**；换域名只改环境变量：

```bash
HLS_BASE=https://cdn.example.com/tcm-media/v1/ node platform/pipeline/build_hls.js --index
```

---

## 四·五、本地联调服务器（`serve_media.js`）

上线前先在本机验一遍，不然「文件在磁盘上能读」会被误当成「APP 能播」。

```bash
npm run media:serve              # http://127.0.0.1:7788，默认根 D:/tcm-media
node platform/serve_media.js --port 8080 --root D:/tcm-media
```

它做的就是生产环境必须做的那三件事：**Range（206）、CORS、正确 MIME**。

| 头 | 值 | 缺了会怎样 |
|---|---|---|
| `Content-Type` | m3u8 → `application/vnd.apple.mpegurl`；m4s → `video/iso.segment`；vtt → `text/vtt` | 播放器报「清单解析失败」，但文件明明下载成功 |
| `Accept-Ranges` / `Content-Range` | `bytes` / `bytes a-b/size` | 拖动失效；Safari 直接拒绝播放 |
| `Access-Control-Allow-Origin` | `*`（或你的 APP 域名） | 浏览器里 HLS 被 CORS 拦掉 |

**实测踩到的两个坑**（都写进代码注释了）：

1. **清单文件不能按 Range 切。** 一开始我对所有文件都支持 Range，结果 ffmpeg 取变体清单时带 `Range: bytes=0-`，
   拿到 206 后判定「不是合法播放列表」，master 里两档全部解析失败——而同一 URL 直接打开又正常。
   现在 `.m3u8/.vtt/.json` 一律 200 整份返回。
2. **keep-alive 会打断 ffmpeg 的嵌套取流。** 关掉长连接（`Connection: close`）后与 `python -m http.server`
   行为一致，master 立刻可播（`ffprobe` 给出 1284.93 s，抽帧与原片逐字节相同）。
   真实 CDN/nginx 不存在这个问题，但本地验证时会被它骗。

验证（门第 10 项会真起服务器跑这几条）：

```bash
curl -sI http://127.0.0.1:7788/09-jichu/12-yaoli-xue/01-introduction/master.m3u8
curl -s -o /dev/null -w '%{http_code}
' -H 'Range: bytes=0-99'   http://127.0.0.1:7788/09-jichu/12-yaoli-xue/01-introduction/1080p/seg_00001.m4s   # 要 206
```

## 五、APP 侧契约（照这个顺序读）

1. `GET /v1/index.json` → 课程列表（`id / title / chapterCount / totalDurationSec / publishJson`）。
2. `GET /v1/<course>/publish.json` → 章列表；每章给：
   `hls`（master.m3u8）、`poster`、`subtitles`、`audioOnly`、`durationSec`、`renditions[]`。
3. 播放 `hls`：交给 ExoPlayer（HLS + fMP4）或 AVPlayer；**不要自己拼分片 URL**。
4. 字幕：master 里已有 `EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",URI="subs/zh.vtt"`；
   也提供同目录 `subs/zh.vtt` 供非 HLS 场景。
5. 断网/超时：先降档（`540p`），仍失败则退 `audioOnly` 并提示"仅音频"。
6. 进度条拖动：直接用 `EXT-X-PLAYLIST-TYPE:VOD` 的 seek，不需要额外索引。

**清单里没有的字段不要猜**：`renditions[].avgBandwidth` 是从实际分片字节算出来的，
不是名义码率；`segments` 是该档分片数，可用于预热或完整性校验。

---

## 六、生成与验收

```bash
# 生成（写仓库外，默认 D:/tcm-media；可用 HLS_ROOT 覆盖）
npm run media:hls -- 09-jichu/12-yaoli-xue
node platform/pipeline/build_hls.js 01-zhongyi/10-zhongyi-neike-xue --only 01-xulun   # 单章试跑
node platform/pipeline/build_hls.js --index                                          # 只重写根清单

# 验收（门）
node tests/test_media_delivery.js
```

门的判据（`tests/test_media_delivery.js`）：

1. 每章 `master.m3u8` 存在、以 `#EXTM3U` 开头、含两档 `#EXT-X-STREAM-INF`；
2. 每档 `index.m3u8` 的分片数 ≥ 1，且 `#EXTINF` 之和与 `durationSec` 差 ≤ 分段粒度（±8 s）；
3. `BANDWIDTH` / `AVERAGE-BANDWIDTH` 为正，且 `AVERAGE ≤ BANDWIDTH`；
4. 有字幕时 master 必须有 `EXT-X-MEDIA:TYPE=SUBTITLES` 且 URI 指向存在的 vtt；
5. `publish.json` 的章数 = 磁盘章数，字段齐（`hls/poster/renditions/bytes/source.mp4Sha256`）；
6. `index.json` 汇总的 `totalDurationSec` / `totalBytes` 与各课 `publish.json` 一致；
7. 分片总字节与 `bytes` 字段差 ≤1%（防止清单写的是旧数）。

---

## 七、已知缺口（不粉饰）

- **无 DRM**：分片是明文，拿到 URL 就能下载。要防扩散只能用签名 URL / Referer 白名单 / 短期 token。
- **540p 档文字偏软**：正文可读，页眉与页脚小字在手机上吃力；这是像素限制，不是码率问题。
- **只打包了成片**：PDF 讲义、幻灯片单页导出（供 APP 做"看文字稿"）还没进交付包。
- **未做断点续传客户端**：清单给的是 HLS，离线下载要 APP 自己按分片拉取并落盘。
- **中文单轨**：`subs/zh.vtt` 只有中文，没有双语。
