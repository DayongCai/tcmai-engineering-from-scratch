#!/usr/bin/env node
/**
 * platform/pipeline/find_tools.js — 外部工具探测（三个流水线脚本共用一份）
 *
 * 为什么需要这一层:
 *   1. PATH 上没有的东西不代表没装。Chromium 系浏览器从不进 PATH；
 *      ffmpeg 装在用户目录但没 export 也很常见。只查 PATH 会误报「缺失」，
 *      然后人就去重装一个已经装好的东西。
 *   2. 同一段探测逻辑散在 check_tools / render_frames / build_video 三个脚本里会漂移，
 *      而漂移的结果是「探测说没装、成片却说装了」这种自相矛盾的输出。
 *
 * 探测顺序：先 PATH，再常见安装位置。全部返回绝对路径或 null。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

/** PATH 查找 */
function onPath(name) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], {
    encoding: 'utf8', shell: false,
  });
  if (r.status !== 0) return null;
  const first = String(r.stdout || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)[0];
  return first || null;
}

/** 在若干候选目录里找一个可执行文件 */
function inDirs(fileName, dirs) {
  for (const d of dirs) {
    if (!d) continue;
    const p = path.join(d, fileName);
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
    } catch { /* 权限/损坏的软链，跳过 */ }
  }
  return null;
}

/**
 * ffmpeg 的常见落地位置。
 * 这些目录来自实际安装方式：本项目的镜像安装脚本、winget、scoop、choco、包管理器。
 */
function ffmpegDirs() {
  const home = os.homedir();
  const local = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
  const roaming = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
  const dirs = [
    // 本仓库 platform/README.md 的镜像安装脚本落点
    path.join(local, 'ffmpeg'),
  ];
  // 镜像安装会解出 ffmpeg-<ver>-<build>/bin 这种带版本号的目录，展开一层
  for (const base of [...dirs]) {
    try {
      for (const e of fs.readdirSync(base, { withFileTypes: true })) {
        if (e.isDirectory()) dirs.push(path.join(base, e.name, 'bin'));
      }
    } catch { /* 目录不存在 */ }
  }
  dirs.push(
    path.join(local, 'Microsoft', 'WinGet', 'Links'),
    path.join(local, 'Microsoft', 'WinGet', 'Packages'),
    path.join(home, 'scoop', 'shims'),
    path.join(roaming, 'scoop', 'shims'),
    'C:/ProgramData/chocolatey/bin',
    'C:/ffmpeg/bin',
    'C:/Program Files/ffmpeg/bin',
    '/usr/local/bin',
    '/opt/homebrew/bin',
    '/usr/bin'
  );
  return dirs.filter(Boolean);
}

function findFfmpeg() {
  return onPath('ffmpeg') || inDirs(process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg', ffmpegDirs());
}

function findFfprobe() {
  return onPath('ffprobe') || inDirs(process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe', ffmpegDirs());
}

/** Chromium 系浏览器：从不进 PATH，只能按安装位置找 */
const BROWSER_PATHS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
];

function findBrowser() {
  for (const p of BROWSER_PATHS) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
    } catch { /* 跳过不可访问的候选 */ }
  }
  return null;
}

function findTts() {
  return onPath('edge-tts') || onPath('espeak-ng') || onPath('espeak') || null;
}

/**
 * 作图工具链（textbooks 插图用）。
 *
 * python 自身进 PATH 不代表能作图 —— matplotlib 是独立的一层依赖，
 * 所以这里探测的是「python + matplotlib 能不能 import」，而不是「有没有 python」。
 * mermaid-cli 由 npm 全局安装，bin 落在 npm prefix 下，常常不在 PATH 上
 * （本项目就把 node 装在 Hermes 自带的 versions/<ver>/node 里），所以要按落点再找一遍。
 */
function findPython() {
  return onPath('python') || onPath('python3');
}

function probeMatplotlib() {
  const py = findPython();
  if (!py) return null;
  const r = spawnSync(py, ['-c', 'import matplotlib,sys;sys.stdout.write(matplotlib.__version__)'], {
    encoding: 'utf8',
  });
  if (r.status !== 0) return null;
  return { path: py, version: String(r.stdout || '').trim() };
}

function findMmdc() {
  const direct = onPath('mmdc');
  if (direct) return direct;
  const home = os.homedir();
  const roaming = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
  return inDirs(process.platform === 'win32' ? 'mmdc.cmd' : 'mmdc', [
    path.join(home, 'bin'),
    path.join(roaming, 'npm'),
    path.join(home, '.npm-global', 'bin'),
    '/usr/local/bin',
  ]);
}

/**
 * pandoc 的常见落地位置。
 * 本仓库不把 pandoc 塞进版本库：它只是排版工具，产物（*.epub / *.pdf）才入库外的成品。
 * 探测顺序与 ffmpeg 一致：先在 PATH，再看镜像安装落点（platform/README.md 的说明用的是
 * %LOCALAPPDATA%\pandoc），最后看 winget / Program Files。
 */
function findPandoc() {
  const onIt = onPath('pandoc');
  if (onIt) return onIt;
  const home = os.homedir();
  const local = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
  const dirs = [path.join(local, 'pandoc')];
  // 镜像安装会解出 pandoc-<ver>/pandoc.exe 这种带版本号的目录，展开一层
  for (const base of [...dirs]) {
    try {
      for (const e of fs.readdirSync(base, { withFileTypes: true })) {
        if (e.isDirectory()) dirs.push(path.join(base, e.name));
      }
    } catch { /* 目录不存在 */ }
  }
  dirs.push(
    path.join(local, 'Microsoft', 'WinGet', 'Links'),
    'C:/Program Files/Pandoc',
    'C:/Program Files (x86)/Pandoc',
    '/usr/local/bin',
    '/opt/homebrew/bin',
    '/usr/bin'
  );
  return inDirs(process.platform === 'win32' ? 'pandoc.exe' : 'pandoc', dirs.filter(Boolean));
}

/** 可选 TTS 后端：edge-tts（音质最好）或 Windows SAPI（离线可用） */
function findTtsBackend() {
  const edge = findTts();
  if (edge) return { kind: 'edge', label: `edge-tts (${edge})`, path: edge };
  if (process.platform === 'win32') {
    const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command',
      'Add-Type -AssemblyName System.Speech; ' +
      '$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; ' +
      '$s.GetInstalledVoices() | Where-Object { $_.Enabled } | ForEach-Object { ' +
      '$i = $_.VoiceInfo; if ($i.Culture.Name -like "zh*") { Write-Output $i.Name } }'], { encoding: 'utf8' });
    const v = r.status === 0 ? String(r.stdout).split(/\r?\n/).map((l) => l.trim()).filter(Boolean)[0] : null;
    // 只有中文语音才算可用：拿英文语音念中文教材等于没配音
    if (v) return { kind: 'sapi', label: `Windows SAPI · ${v}`, path: v };
  }
  return { kind: null, label: '不可用（既无 edge-tts，也无中文离线语音）', path: null };
}

/**
 * xelatex（PDF 引擎）：MiKTeX / TeX Live 的常见落点。
 * 单独探测的理由与 pandoc 相同 —— 装好了但不在 PATH 上是常态（MiKTeX 默认装进用户目录）。
 * 找不到就返回 null，由调用方明确报「PDF 不可用」，绝不降级成一份坏 PDF。
 */
function findXelatex() {
  const onIt = onPath('xelatex');
  if (onIt) return onIt;
  const home = os.homedir();
  const local = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
  const dirs = [
    path.join(local, 'Programs', 'MiKTeX', 'miktex', 'bin', 'x64'),
    path.join(local, 'Programs', 'MiKTeX', 'miktex', 'bin'),
    path.join(local, 'Programs', 'MiKTeX', 'miktex', 'bin', 'internal'),
    'C:/Program Files/MiKTeX/miktex/bin/x64',
    'C:/Program Files/MiKTeX/miktex/bin',
    'C:/texlive/2024/bin/windows',
    'C:/texlive/2023/bin/windows',
    '/usr/local/texlive/2024/bin/x86_64-linux',
    '/Library/TeX/texbin',
    '/usr/bin',
  ];
  return inDirs(process.platform === 'win32' ? 'xelatex.exe' : 'xelatex', dirs.filter(Boolean));
}

module.exports = {
  onPath,
  inDirs,
  ffmpegDirs,
  findFfmpeg,
  findFfprobe,
  findBrowser,
  findTts,
  findTtsBackend,
  findPandoc,
  findXelatex,
  findPython,
  probeMatplotlib,
  findMmdc,
  BROWSER_PATHS,
};
