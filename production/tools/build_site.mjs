// Build the self-contained static site into site/: bundled JS, subset fonts inlined, soundtrack encoded.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import * as esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, 'site');
const tmp = path.join(root, 'production/build/site_tmp');
fs.mkdirSync(path.join(out, 'audio'), { recursive: true });
fs.mkdirSync(tmp, { recursive: true });

// 1) bundle
await esbuild.build({ entryPoints: [path.join(root, 'site_src/main.js')], bundle: true, minify: true, format: 'iife', target: ['es2020'], outfile: path.join(out, 'app.js'), legalComments: 'none' });

// 2) fonts: collect every character the film and page use, subset, inline as woff2 data URIs
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
let chars = new Set();
for (const f of [...walk(path.join(root, 'js')), path.join(root, 'site_src/index.html')]) for (const ch of fs.readFileSync(f, 'utf8')) chars.add(ch);
for (let c = 0x20; c < 0x7f; c++) chars.add(String.fromCharCode(c));
const txt = path.join(tmp, 'chars.txt');
fs.writeFileSync(txt, [...chars].join(''));
const subset = (src, dst, extra = []) => execFileSync('pyftsubset', [src, `--text-file=${txt}`, '--flavor=woff2', `--output-file=${dst}`, '--layout-features=*', ...extra]);
subset(path.join(root, 'fonts/ZCOOLKuaiLe-Regular.ttf'), path.join(tmp, 'zcool.woff2'));
subset(path.join(root, 'fonts/PatrickHand-Regular.ttf'), path.join(tmp, 'patrick.woff2'));
const b64 = (f) => fs.readFileSync(f).toString('base64');
const fontCss = `@font-face{font-family:"Patrick Hand";src:url(data:font/woff2;base64,${b64(path.join(tmp, 'patrick.woff2'))}) format("woff2");font-display:block}
@font-face{font-family:"ZCOOL KuaiLe";src:url(data:font/woff2;base64,${b64(path.join(tmp, 'zcool.woff2'))}) format("woff2");font-display:block}`;
const html = fs.readFileSync(path.join(root, 'site_src/index.html'), 'utf8').replace('/*__FONTS__*/', fontCss);
// site_src/index.html is page content only; the standalone site gets a full document around it
// (the body-only version is also kept for hosts that supply their own skeleton, e.g. Claude artifacts)
fs.writeFileSync(path.join(tmp, 'page.html'), html);
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${html.replace(/(<\/style>)/, '$1\n</head>\n<body>')}
</body>
</html>
`);

// 3) soundtrack
const wav = path.join(root, 'production/build/soundtrack.wav');
if (fs.existsSync(wav) && !process.argv.includes('--no-audio')) {
  const ff = process.env.FFMPEG || 'ffmpeg';
  execFileSync(ff, ['-y', '-v', 'error', '-i', wav, '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', path.join(out, 'audio/soundtrack.mp4')]);
  execFileSync(ff, ['-y', '-v', 'error', '-i', wav, '-c:a', 'libvorbis', '-q:a', '5', path.join(out, 'audio/soundtrack.ogg')]);
}
for (const f of ['index.html', 'app.js', 'audio/soundtrack.mp4', 'audio/soundtrack.ogg']) {
  const p = path.join(out, f);
  if (fs.existsSync(p)) console.log(f.padEnd(24), (fs.statSync(p).size / 1024).toFixed(0), 'KB');
}
