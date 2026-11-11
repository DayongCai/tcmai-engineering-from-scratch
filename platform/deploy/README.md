# 校内/局域网 nginx 部署（两条命令）

前提：服务器装了 nginx、你有 sudo、`/etc/nginx/conf.d/` 存在；客户端能 `ssh` 到那台机器。

## 两条命令

```bash
# ① 拷过去（6.7 GB，首次慢；之后增量）
./platform/deploy/deploy.sh --host user@10.0.0.12 --host-web 10.0.0.12

# ② 验证（脚本自动做；也可以手工跑一次）
ssh user@10.0.0.12 'bash /tmp/tcm-verify.sh 8080 09-jichu/12-yaoli-xue 01-introduction 1080p/index.m3u8'
```

`deploy.sh` 一条命令干完四步：**同步媒体 → 装 nginx 配置 → `nginx -t` → `reload` → 当场验 7 项**。
任何一步失败立即退出，不会留半套配置。

常用参数：

| 参数 | 默认 | 说明 |
|---|---|---|
| `--host user@ip` | 必填 | ssh 目标 |
| `--remote-root` | `/srv/tcm-media` | 服务器上的媒体根目录 |
| `--port` | `8080` | 监听端口 |
| `--conf-path` | `/etc/nginx/conf.d/tcm-media.conf` | 配置落点 |
| `--host-web` | 从 `--host` 去掉用户名 | 只用于最后打印可播 URL |
| `--skip-sync` / `--skip-conf` | — | 只做其中一步（改配置不动媒体，或反之） |
| `--delete-extra` | 关 | rsync 加 `--delete`（服务器上多余文件会被删，慎用） |
| `--dry-run` | 关 | 只打印将执行的命令，不碰服务器 |

## 文件

| 文件 | 作用 |
|---|---|
| `nginx-media.conf` | 站点片段（server 块）。`deploy.sh` 会把 `root` / `listen` / `server_name` 换成你的值再发 |
| `deploy.sh` | 同步 + 装配置 + reload + 验证，四条命令串成一条 |
| `verify.sh` | 部署后验 7 项（也可本地跑）；远程执行，不依赖服务器上有 node |

## 配置里三个「看起来多余、其实要命」的点

**① `keepalive_timeout 0;` —— 关长连接。**
实测：ffmpeg（以及它的 HLS 解复用器）在复用连接取变体清单时会判定 `Invalid data found`，
master 里所有档位解析失败、`ffprobe` 返回 `N/A`；关掉长连接后同一份文件立刻返回 1284.93 s。
代价是每个分片一次握手——局域网可忽略。这条不是「优化」，是**能不能播**。

**② 清单（m3u8/json/vtt）关掉 Range（`max_ranges 0;`）。**
ffmpeg 取变体清单时会带 `Range: bytes=0-`，服务器若回 206，它把清单当分片，报 `Empty segment`。

**③ 每个 `location` 都要重写 CORS 头。**
nginx 的 `add_header` 在子块里是**覆盖**父块而不是追加——只在 server 级写一次，
命中 `location ~ \.m4s$` 的请求就没有 CORS 头了。另外 `add_header` 不允许放在 `if` 里
（会报 `directive is not allowed here`）。

## 实测结果（本机 Windows + nginx 1.27.3，同一份 6.7 GB 媒体）

| 检查 | 结果 |
|---|---|
| `nginx -t` | syntax is ok |
| `GET /healthz` | 200 |
| `GET /`（课程总清单） | 200 · `application/json` |
| `master.m3u8` | 200 · `application/vnd.apple.mpegurl` · CORS `*` |
| `seg_00001.m4s` + `Range: bytes=0-99` | **206** · `video/iso.segment` · `immutable` 缓存 |
| `ffprobe master.m3u8`（HTTP） | **1284.933985 s**（与本地文件一致） |
| `ffmpeg -ss 900` 抽帧（HTTP vs 本地） | 208,434 B，**逐字节相同** |

`verify.sh` 本机实跑 7/7 通过。

## 服务器侧注意事项

- **firewalld / ufw 放行端口**：`sudo firewall-cmd --add-port=8080/tcp --permanent && sudo firewall-cmd --reload`
- **SELinux（CentOS/RHEL）**：`sudo setsebool -P httpd_can_network_connect 1`，
  并确认媒体目录有 `httpd_sys_content_t` 上下文：`sudo chcon -R -t httpd_sys_content_t /srv/tcm-media`
- **权限**：nginx 以 `nginx`（或 `www-data`）用户运行，媒体目录要可读：
  `sudo chmod -R a+rX /srv/tcm-media`
- **不想每次 sudo**：把 `--conf-path` 指到你有写权限的路径，或用 `sudoers` 放行 `nginx -t` / `systemctl reload nginx`
- **HTTPS**：APP 若走 https，媒体也必须 https（混合内容会被拦）。加 `listen 443 ssl` 与证书即可，
  其余配置不变。

## 不想装 nginx 的两个替代

| 场景 | 做法 |
|---|---|
| 临时给同事看 | `npm run media:serve`（本机 Node 服务器，Range/CORS/MIME 都带；只监听 127.0.0.1，要改 `--host 0.0.0.0`） |
| 对象存储 + CDN | 见 `platform/MEDIA-DELIVERY.md` §3.A；`rclone sync D:/tcm-media remote:tcm-media/v1` |
