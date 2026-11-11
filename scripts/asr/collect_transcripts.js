// 把逐讲转写汇总进仓库：asr/lec-NN.json → asr-transcripts.json + meta-asr.json + 指纹
// 用法: node collect_asr.js [只处理某一讲]；无参数则汇总全部
const fs = require('fs');
const path = require('path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const MAT = path.join(ROOT, 'standards', 'materials', 'chenruchun-lectures');
const SRC = path.join(MAT, 'sources');
const ASR = path.join(SRC, 'asr');
const only = process.argv[2] ? String(process.argv[2]).padStart(2, '0') : null;
const sha256 = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;

const eps = JSON.parse(fs.readFileSync(path.join(SRC, 'episodes.json'), 'utf8')).episodes;
const files = fs.existsSync(ASR) ? fs.readdirSync(ASR).filter((f) => /^lec-\d+\.json$/.test(f)).sort() : [];
const lectures = [];
const allSegments = [];
for (const f of files) {
  const no = Number(/lec-(\d+)\.json/.exec(f)[1]);
  const doc = JSON.parse(fs.readFileSync(path.join(ASR, f), 'utf8'));
  const ep = eps.find((e) => e.no === no) || {};
  const text = doc.segments.map((s) => s.text).join('');
  lectures.push({
    no, bvid: ep.bvid || '', title: ep.title || '', durSource: ep.dur || 0,
    model: doc.model, carry: doc.carry, speed: doc.speed, wallSec: doc.wallSec,
    audioSec: Math.round(doc.audioSec), segments: doc.segments.length,
    chars: text.length, file: `sources/asr/${f}`,
    coverageRatio: ep.dur ? +(doc.audioSec / ep.dur).toFixed(4) : null,
  });
  if (!only || f === `lec-${only}.json`) {
    doc.segments.forEach((s, i) => allSegments.push({
      lecture: no, idx: `${no}-${String(i + 1).padStart(3, '0')}`,
      start: s.start, end: s.end, mmss: mmss(s.start), text: s.text,
    }));
  }
}
// 只处理某一讲时，把其它讲已汇总的段保留下来
let segments = allSegments;
if (only) {
  const prevPath = path.join(SRC, 'asr-transcripts.json');
  if (fs.existsSync(prevPath)) {
    const prev = JSON.parse(fs.readFileSync(prevPath, 'utf8')).segments.filter((s) => s.lecture !== Number(only));
    segments = [...prev, ...allSegments].sort((a, b) => a.lecture - b.lecture || a.start - b.start);
  }
}
const totalChars = lectures.reduce((a, l) => a + l.chars, 0);
const totalAudio = lectures.reduce((a, l) => a + l.audioSec, 0);
const totalWall = lectures.reduce((a, l) => a + (l.wallSec || 0), 0);
fs.writeFileSync(path.join(SRC, 'asr-transcripts.json'), `${JSON.stringify({
  $generated: 'node scripts/import_chenruchun_lectures.js --collect-asr（或 Temp/collect_asr.js）',
  method: 'faster-whisper（CTranslate2 int8，CPU 8 线程）对 16kHz 单声道 WAV 转写；'
    + '音频由 360p 视频轨抽出（ffmpeg -vn -ac 1 -ar 16000 -c:a pcm_s16le）。'
    + 'VAD（silero，静音≥500ms）切分；beam_size=5；condition_on_previous_text=False（避免长录音里的错误自传播）；'
    + 'initial_prompt 带《伤寒论》术语与方名表。',
  modelDir: lectures[0] ? lectures[0].model : null,
  lectures: lectures.length,
  totals: { audioSec: totalAudio, wallSec: Math.round(totalWall), chars: totalChars, segments: segments.length,
    speed: totalWall ? +(totalAudio / totalWall).toFixed(2) : null },
  lectures,
  segments,
}, null, 1)}\n`, 'utf8');

fs.writeFileSync(path.join(SRC, 'meta-asr.json'), `${JSON.stringify({
  $generated: 'Temp/collect_asr.js',
  audioSource: '各讲 360p 视频的音频轨（视频本体不入库；bvid/cid 可重新取链）',
  lectures: lectures.map((l) => ({ no: l.no, model: l.model, speed: l.speed, audioSec: l.audioSec, segments: l.segments, chars: l.chars, coverageRatio: l.coverageRatio })),
  totals: { lectures: lectures.length, audioSec: totalAudio, chars: totalChars, segments: segments.length },
}, null, 1)}\n`, 'utf8');

const fp = {};
['asr-transcripts.json', 'meta-asr.json'].forEach((f) => {
  const p = path.join(SRC, f);
  fp[f] = { bytes: fs.statSync(p).size, sha256: sha256(p) };
});
files.forEach((f) => { fp[`asr/${f}`] = { bytes: fs.statSync(path.join(ASR, f)).size, sha256: sha256(path.join(ASR, f)) }; });
const fpPath = path.join(SRC, 'fingerprints-asr.json');
fs.writeFileSync(fpPath, `${JSON.stringify({ $generated: 'sha256 逐文件实测', files: fp }, null, 2)}\n`, 'utf8');

console.log(`转写汇总：${lectures.length} 讲 · 音频 ${(totalAudio / 3600).toFixed(2)} 小时 · 正文 ${totalChars} 字 · 段 ${segments.length}`
  + (totalWall ? ` · 均速 ${(totalAudio / totalWall).toFixed(2)}×` : ''));
console.log('已完成讲次:', lectures.map((l) => l.no).join(',') || '（无）');
const missing = eps.map((e) => e.no).filter((n) => n !== 8 && !lectures.some((l) => l.no === n));
console.log('未完成讲次:', missing.join(',') || '（全部完成）');
