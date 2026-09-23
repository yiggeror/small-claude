// The web player: renders the film live on a canvas, locked to the soundtrack's clock.
import { renderFrame, DURATION, SHOTS } from './film.js';
import { T } from './acts/times.js';

export const CHAPTERS = [
  { t: 0, zh: '深夜', en: 'Late night' },
  { t: T.screen2, zh: '晚安', en: 'Good night' },
  { t: T.silence, zh: '熄灯之后', en: 'Lights out' },
  { t: T.crackShot, zh: '缝隙里的眼睛', en: 'Eyes in the gap' },
  { t: T.kb, zh: '键盘跳房子', en: 'Keyboard hopscotch' },
  { t: T.penRoll - 0.3, zh: '失控的笔', en: 'The runaway pen' },
  { t: 124.9, zh: '一张便签', en: 'A sticky note' },
  { t: T.cookie, zh: '最后一块饼干', en: 'The last cookie' },
  { t: T.steps, zh: '脚步声！', en: 'Footsteps!' },
  { t: T.doorOpen2, zh: '一切如常', en: 'Nothing happened' },
  { t: T.end, zh: '片尾', en: 'Credits' },
];

const fmt = (s) => { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export function mountPlayer(root, opts = {}) {
  const $ = (sel) => root.querySelector(sel);
  const stage = $('.stage'), canvas = $('canvas'), ctx = canvas.getContext('2d', { alpha: false });
  const btnPlay = $('.play-big'), btnToggle = $('#btn-toggle'), btnFull = $('#btn-full'), btnMute = $('#btn-mute');
  const scrub = $('#scrub'), timeEl = $('#time'), chapEl = $('#chapter-now'), chapList = $('.chapters');
  const audioUrls = opts.audio || ['audio/soundtrack.m4a', 'audio/soundtrack.ogg'];

  // ---------------------------------------------------------------- audio (HTMLAudio first, WebAudio fallback)
  let audio = null, audioOk = false, webAudio = null;
  let clockBase = 0, clockStart = 0, playing = false, muted = false;
  function makeAudio() {
    audio = new Audio();
    audio.preload = 'auto';
    for (const u of audioUrls) { const canM4a = u.endsWith('.m4a') && audio.canPlayType('audio/mp4') !== ''; const canOgg = u.endsWith('.ogg') && audio.canPlayType('audio/ogg') !== ''; if (canM4a || canOgg) { audio.src = u; break; } }
    audio.addEventListener('canplay', () => { audioOk = true; }, { once: true });
    audio.addEventListener('error', () => { audioOk = false; setupWebAudio(); }, { once: true });
    audio.addEventListener('ended', () => { playing = false; sync(); });
  }
  async function setupWebAudio() {
    if (webAudio) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ac = new AC();
      const res = await fetch(audioUrls[0]);
      const buf = await ac.decodeAudioData(await res.arrayBuffer());
      const gain = ac.createGain(); gain.connect(ac.destination);
      webAudio = { ac, buf, gain, src: null };
      if (playing) startWebAudio(now());
    } catch (e) { webAudio = null; }
  }
  function startWebAudio(at) {
    if (!webAudio) return;
    stopWebAudio();
    const { ac, buf, gain } = webAudio;
    const src = ac.createBufferSource(); src.buffer = buf; src.connect(gain);
    src.start(0, Math.min(at, buf.duration - 0.01));
    webAudio.src = src; webAudio.t0 = ac.currentTime - at;
  }
  function stopWebAudio() { if (webAudio?.src) { try { webAudio.src.stop(); } catch (e) {} webAudio.src = null; } }

  // ---------------------------------------------------------------- clock
  function now() {
    if (playing && webAudio?.src) return webAudio.ac.currentTime - webAudio.t0;
    if (playing && audioOk && audio && !audio.paused) return audio.currentTime;
    if (playing) return clockBase + (performance.now() - clockStart) / 1000;
    return clockBase;
  }
  function seek(t) {
    t = Math.max(0, Math.min(DURATION - 0.05, t));
    clockBase = t; clockStart = performance.now();
    if (audio) { try { audio.currentTime = t; } catch (e) {} }
    if (webAudio && playing) startWebAudio(t);
    draw(true);
  }
  async function play() {
    if (!audio) makeAudio();
    if (now() >= DURATION - 0.1) seek(0);
    playing = true; clockBase = now(); clockStart = performance.now();
    root.classList.add('is-playing'); root.classList.remove('is-paused', 'at-start');
    if (webAudio) { if (webAudio.ac.state === 'suspended') await webAudio.ac.resume(); startWebAudio(clockBase); }
    else {
      try { audio.currentTime = clockBase; await audio.play(); audioOk = true; }
      catch (e) { if (e && e.name !== 'AbortError') setupWebAudio(); }
    }
    sync();
  }
  function pause() {
    clockBase = now(); playing = false;
    if (audio) audio.pause();
    stopWebAudio();
    root.classList.remove('is-playing'); root.classList.add('is-paused');
    sync();
  }
  function toggle() { if (!playing && root.classList.contains('at-start')) seek(0); playing ? pause() : play(); }
  function setMuted(m) {
    muted = m;
    if (audio) audio.muted = m;
    if (webAudio) webAudio.gain.gain.value = m ? 0 : 1;
    btnMute.setAttribute('aria-pressed', String(m));
    btnMute.querySelector('.label').textContent = m ? '声音 关' : '声音 开';
  }

  // ---------------------------------------------------------------- rendering (adaptive resolution)
  let scale = 1, slow = 0, lastT = -1;
  function resize() {
    const r = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(320, Math.round(Math.min(1920, r.width * dpr) * scale));
    const h = Math.round(w * 9 / 16);
    if (canvas.width !== w) { canvas.width = w; canvas.height = h; lastT = -1; }
  }
  function draw(force) {
    const t = now();
    if (!force && Math.abs(t - lastT) < 1e-4) return;
    lastT = t;
    const k = canvas.width / 1920;
    const t0 = performance.now();
    renderFrame(ctx, t, [k, 0, 0, k, 0, 0]);
    const dt = performance.now() - t0;
    // keep it smooth on slower machines: drop internal resolution if frames take too long
    if (playing) {
      slow = dt > 34 ? slow + 1 : Math.max(0, slow - 1);
      if (slow > 20 && scale > 0.5) { scale = Math.max(0.5, scale - 0.15); slow = 0; resize(); }
    }
  }
  function sync() {
    const t = now();
    timeEl.textContent = `${fmt(t)} / ${fmt(DURATION)}`;
    scrub.value = String(t);
    scrub.style.setProperty('--p', `${(t / DURATION) * 100}%`);
    let ci = 0;
    CHAPTERS.forEach((c, i) => { if (t >= c.t - 0.01) ci = i; });
    chapEl.textContent = `${CHAPTERS[ci].zh} · ${CHAPTERS[ci].en}`;
    chapList.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-current', i === ci ? 'true' : 'false'));
    btnToggle.querySelector('.label').textContent = playing ? '暂停' : '播放';
    btnToggle.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }
  function loop() {
    if (playing && now() >= DURATION) { pause(); seek(DURATION - 0.05); root.classList.add('at-end'); }
    draw(false);
    if (playing) sync();
    requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------- UI wiring
  scrub.max = String(DURATION);
  scrub.step = '0.01';
  scrub.addEventListener('input', () => { seek(parseFloat(scrub.value)); sync(); });
  CHAPTERS.forEach((c, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `<span class="n">${String(i + 1).padStart(2, '0')}</span><span class="zh">${c.zh}</span><span class="en">${c.en}</span><span class="tc">${fmt(c.t)}</span>`;
    b.addEventListener('click', () => { seek(c.t + 0.001); sync(); if (!playing) play(); stage.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    chapList.appendChild(b);
    const m = document.createElement('i'); m.style.left = `${(c.t / DURATION) * 100}%`; $('.ticks').appendChild(m);
  });
  btnPlay.addEventListener('click', () => { if (root.classList.contains('at-start') || root.classList.contains('at-end')) seek(0); root.classList.remove('at-end'); play(); });
  btnToggle.addEventListener('click', toggle);
  canvas.addEventListener('click', toggle);
  btnMute.addEventListener('click', () => setMuted(!muted));
  btnFull.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stage.requestFullscreen();
    } catch (e) { root.classList.toggle('pseudo-full'); }
  });
  document.addEventListener('fullscreenchange', () => { resize(); draw(true); });
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' && e.target.type !== 'range')) return;
    if (e.code === 'Space' || e.key === 'k') { e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowRight') { seek(now() + 5); sync(); }
    else if (e.key === 'ArrowLeft') { seek(now() - 5); sync(); }
    else if (e.key === 'f') btnFull.click();
    else if (e.key === 'm') btnMute.click();
  });
  new ResizeObserver(() => { resize(); draw(true); }).observe(stage);
  resize();
  seek(opts.poster ?? 5.2);
  sync();
  root.classList.add('at-start', 'is-paused');
  requestAnimationFrame(loop);
  return { play, pause, seek };
}
