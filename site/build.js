#!/usr/bin/env node
/**
 * site/build.js — [tcmP] 站点数据管线
 *
 * 输入:
 *   curriculum.json   学科/章节的结构事实
 *   catalog.json      由 scripts/build_catalog.js 生成的课程表 + 进度
 *   departments/<院系>/<学科>/chapters/<章节>/ 下的 docs/zh.md · quiz.json · code/ · outputs/
 *
 * 输出:
 *   site/data.js      课程结构（window.TCMAI_DATA）
 *   site/content.js   已建章节的正文 HTML + 代码 + 小测 + 学习路径 + 术语表
 *
 * 与 ai-engineering-from-scratch 的 site/build.js 同构：CI 在 main 上重建并提交产物。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const md = require('./md');
const math = require('./math');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, 'site');

const catalogPath = path.join(ROOT, 'catalog.json');
if (!fs.existsSync(catalogPath)) {
  console.error('✗ catalog.json 不存在，先运行: node scripts/build_catalog.js');
  process.exit(1);
}
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

// ── 1. data.js ──
const dataJs =
  '/* 生成物: site/build.js — 请勿手工编辑 */\n' +
  'window.TCMAI_DATA = ' +
  JSON.stringify(
    {
      domain: catalog.domain,
      stages: catalog.stages,
      tracks: catalog.tracks,
      counts: catalog.counts,
      semesterPlan: catalog.semesterPlan,
      departments: catalog.departments,
    },
    null,
    2
  ) +
  ';\n';
fs.writeFileSync(path.join(SITE, 'data.js'), dataJs, 'utf8');

// ── 2. 学习路径 ──
const lpDir = path.join(ROOT, 'learning-paths');
const learningPaths = fs
  .readdirSync(lpDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(lpDir, f), 'utf8')));

// ── 3. 术语表（把 markdown 直接渲染成 HTML）──
const glossary = {};
for (const name of ['tcm-terms', 'ai-terms', 'bridge-map']) {
  const p = path.join(ROOT, 'glossary', `${name}.md`);
  if (fs.existsSync(p)) glossary[name] = md.render(fs.readFileSync(p, 'utf8'));
}

// ── 4. content.js：遍历已建章节 ──
const content = {};
let built = 0;

for (const dept of catalog.departments) {
  for (const subject of dept.subjects) {
    const chaptersDir = path.join(ROOT, subject.path, 'chapters');
    if (!fs.existsSync(chaptersDir)) continue;

    for (const name of fs.readdirSync(chaptersDir).sort()) {
      const cdir = path.join(chaptersDir, name);
      if (!fs.statSync(cdir).isDirectory()) continue;
      const docPath = path.join(cdir, 'docs', 'zh.md');
      const quizPath = path.join(cdir, 'quiz.json');
      if (!fs.existsSync(docPath) || !fs.existsSync(quizPath)) continue;

      const markdown = fs.readFileSync(docPath, 'utf8');
      const head = md.extractHeader(markdown);
      const key = `${dept.slug}/${subject.slug}/${name}`;

      const readIf = (rel) => {
        const p = path.join(cdir, rel);
        return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
      };

      const codeDir = path.join(cdir, 'code');
      const code = {};
      if (fs.existsSync(codeDir)) {
        for (const f of fs.readdirSync(codeDir)) {
          const ext = path.extname(f);
          if (!['.js', '.py', '.mjs', '.cjs', '.rs', '.jl', '.ts'].includes(ext)) continue;
          code[f] = fs.readFileSync(path.join(codeDir, f), 'utf8');
        }
      }

      const outputs = [];
      const outDir = path.join(cdir, 'outputs');
      if (fs.existsSync(outDir)) {
        for (const f of fs.readdirSync(outDir).sort()) {
          if (!f.endsWith('.md')) continue;
          const body = fs.readFileSync(path.join(outDir, f), 'utf8');
          // 在构建期解出类型与说明：页面（浏览器端）不该重复实现 frontmatter 解析。
          // 同一份解析逻辑散到两处，迟早会漂移 —— 而漂移时只有一边会错。
          const m = /^(prompt|skill|agent|mcp)-(.+)\.md$/.exec(f);
          const fm = {};
          const fmMatch = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(body);
          if (fmMatch) {
            for (const line of fmMatch[1].split('\n')) {
              const mm = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
              if (mm) fm[mm[1]] = mm[2].trim().replace(/^["']|["']$/g, '');
            }
          }
          const h1 = /^#\s+(.+)$/m.exec(body);
          outputs.push({
            name: f,
            kind: m ? m[1] : 'other',
            // 仓库根相对路径：站点本地预览由 serve.js 回落到仓库根，
            // 静态部署从仓库根发布时同样可用（见 site/serve.js）。
            file: `departments/${dept.slug}/${subject.slug}/chapters/${name}/outputs/${f}`,
            title: (h1 ? h1[1] : fm.name || f).trim(),
            description: fm.description || null,
            chars: body.replace(/\s/g, '').length,
            body,
          });
        }
      }

      content[key] = {
        key,
        deptSlug: dept.slug,
        deptTitle: dept.title,
        subjectSlug: subject.slug,
        subjectTitle: subject.title,
        chapterSlug: name,
        n: Number(name.slice(0, 2)) || null,
        title: head.title || name,
        motto: head.motto,
        problem: head.problem,
        roots: head.roots,
        html: md.render(markdown),
        markdown,
        code,
        quiz: JSON.parse(fs.readFileSync(quizPath, 'utf8')),
        exercises: readIf('exercises.md'),
        outputs,
        // 视频路径：必须探测到**文件**本身，而不是它所在的目录 ——
        // 目录存在但 mp4 没生成（例如 ffmpeg 缺失、编码失败）时，
        // 只判目录会让站点挂上一个指向 404 的播放器。
        video: (() => {
          const rel = `platform/courses/${dept.slug}/${subject.slug}/${name}/video/lesson.mp4`;
          return fs.existsSync(path.join(ROOT, rel)) ? rel : null;
        })(),
        // 封面：直接复用第 1 帧。没有它 <video preload="metadata"> 只会显示黑框，
        // 页面看起来像播放器坏了（其实文件与时长都正常，就是没解码任何一帧）。
        videoPoster: (() => {
          const rel = `platform/courses/${dept.slug}/${subject.slug}/${name}/frames/001.png`;
          return fs.existsSync(path.join(ROOT, rel)) ? rel : null;
        })(),
      };
      built += 1;
    }
  }
}

const contentJs =
  '/* 生成物: site/build.js — 请勿手工编辑 */\n' +
  'window.TCMAI_CONTENT = ' +
  JSON.stringify(content, null, 2) +
  ';\n' +
  'window.TCMAI_PATHS = ' +
  JSON.stringify(learningPaths, null, 2) +
  ';\n' +
  'window.TCMAI_GLOSSARY = ' +
  JSON.stringify(glossary, null, 2) +
  ';\n';

const contentStr = contentJs;

fs.writeFileSync(path.join(SITE, 'content.js'), contentStr, 'utf8');

// ── 5. 语义张量：规范常量 + 数据集（生成 window.TCMAI_SEMTENSOR_SPEC / _DATA）──
// 常量只有一份（standards/semtensor/axis-colors.json），构建期注入浏览器；
// 页面与图注不得复制常量 —— 复制出来的第二份一定会漂移。
const semtensorSpec = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'semtensor', 'axis-colors.json'), 'utf8'));
const semtensorData = {
  reference: JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'semtensor', 'datasets', 'reference-units.json'), 'utf8')),
  neijing: JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'semtensor', 'datasets', 'neijing-domains.json'), 'utf8')),
  shanghan: JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'semtensor', 'datasets', 'shanghan-domains.json'), 'utf8')),
};
// 图注实例：与 standards 下的 .txt 同源，构建期注入，file:// 下也能用（此时 fetch 不可用）
const annoDir = path.join(ROOT, 'standards', 'semtensor', 'annotations');
const annotations = {};
if (fs.existsSync(annoDir)) {
  for (const f of fs.readdirSync(annoDir).filter((x) => x.endsWith('.txt')).sort()) {
    annotations[f] = fs.readFileSync(path.join(annoDir, f), 'utf8');
  }
}
const specJs =
  '/* 生成物: site/build.js — 请勿手工编辑 */\n' +
  'window.TCMAI_SEMTENSOR_SPEC = ' + JSON.stringify(semtensorSpec, null, 2) + ';\n' +
  'window.TCMAI_SEMTENSOR_DATA = ' + JSON.stringify(semtensorData, null, 2) + ';\n' +
  'window.TCMAI_SEMTENSOR_ANNOTATIONS = ' + JSON.stringify(annotations, null, 2) + ';\n';
fs.writeFileSync(path.join(SITE, 'semtensor-spec.js'), specJs, 'utf8');

// ── 6. 站点清单（供测试与部署使用）──
const unknownCmd = math.takeUnknown();
const manifest = {
  generatedBy: 'site/build.js',
  chapters: built,
  paths: learningPaths.length,
  glossaryDocs: Object.keys(glossary).length,
  dataHash: crypto.createHash('sha256').update(dataJs).digest('hex').slice(0, 12),
  contentHash: crypto.createHash('sha256').update(contentStr).digest('hex').slice(0, 12),
};
fs.writeFileSync(path.join(SITE, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log('═══ [tcmP] 站点构建 ═══');
console.log(`  领域      : ${catalog.domain.title}`);
console.log(`  院系 / 学科: ${catalog.counts.departments} / ${catalog.counts.subjects}`);
console.log(`  章节目标  : ${catalog.counts.chapters}`);
console.log(`  已建章节  : ${built}`);
console.log(`  学习路径  : ${learningPaths.length}`);
console.log(`  术语文档  : ${Object.keys(glossary).length}`);
console.log(`  → site/data.js     (${(dataJs.length / 1024).toFixed(1)} KB, ${manifest.dataHash})`);
console.log(`  → site/content.js  (${(contentStr.length / 1024).toFixed(1)} KB, ${manifest.contentHash})`);
console.log(`  → site/manifest.json`);

if (unknownCmd.length) {
  console.log('');
  console.log(`  ⚠ 公式渲染器遇到 ${unknownCmd.length} 个未知 LaTeX 命令: ${unknownCmd.join(', ')}`);
  console.log('    → site/math.js 的 SYMBOLS / WRAPPERS / FUNCTION_NAMES 里补上它们，');
  console.log('      否则这些公式会在页面与幻灯片里显示为去掉反斜杠的裸命令。');
} else if (built) {
  console.log('  ✅ 公式渲染器无未知命令');
}
