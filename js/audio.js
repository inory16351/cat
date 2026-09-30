'use strict';
// WebAudio 로 즉석 합성하는 효과음 (외부 사운드 파일 없음)
const Sfx = (() => {
  let ac = null, master = null, noiseBuf = null;
  let muted = false;
  const recent = {}; // 같은 효과음 과다 중첩 방지

  function init() {
    if (ac) return;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain();
      master.gain.value = 0.45;
      const comp = ac.createDynamicsCompressor();
      master.connect(comp);
      comp.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; }
  }

  function gate(name, ms, max) {
    const now = performance.now();
    const arr = (recent[name] = (recent[name] || []).filter(t => now - t < ms));
    if (arr.length >= max) return false;
    arr.push(now);
    return true;
  }

  function tone({ type = 'sine', f = 440, f2 = null, dur = 0.15, vol = 0.3, delay = 0, attack = 0.005 }) {
    if (!ac || muted) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noise({ dur = 0.2, vol = 0.3, freq = 1000, f2 = null, q = 1, type = 'bandpass', delay = 0 }) {
    if (!ac || muted) return;
    const t = ac.currentTime + delay;
    const s = ac.createBufferSource();
    s.buffer = noiseBuf;
    const flt = ac.createBiquadFilter();
    flt.type = type; flt.Q.value = q;
    flt.frequency.setValueAtTime(freq, t);
    if (f2) flt.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(flt); flt.connect(g); g.connect(master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  const r = (a, b) => a + Math.random() * (b - a);

  return {
    // 음 하나 (피아노 연주 흉내 등): f 주파수, dur 길이, vol 크기, delay 지연(초)
    note(f, dur = 0.25, vol = 0.12, delay = 0, type = 'triangle') { tone({ type, f, dur, vol, delay }); },
    resume() { init(); if (ac && ac.state === 'suspended') ac.resume(); },
    toggle() { muted = !muted; return muted; },
    get muted() { return muted; },

    swipe() { noise({ dur: 0.13, vol: 0.28, freq: 3000, f2: 500, q: 0.9 }); },
    knock() {
      if (!gate('knock', 60, 3)) return;
      tone({ type: 'triangle', f: r(500, 700), f2: 200, dur: 0.07, vol: 0.18 });
    },
    smash(k = 1, fragile = true) {
      if (!gate('smash', 90, 5)) return;
      tone({ type: 'sine', f: 140, f2: 40, dur: 0.18, vol: 0.35 * k });
      if (fragile) {
        noise({ dur: 0.3, vol: 0.3 * k, freq: 4000, type: 'highpass', q: 0.5 });
        for (let i = 0; i < 4; i++) tone({ type: 'triangle', f: r(2200, 5200), dur: 0.09, vol: 0.07, delay: i * 0.025 + r(0, 0.02) });
      } else {
        noise({ dur: 0.15, vol: 0.25 * k, freq: 400, q: 1.2 });
      }
    },
    pop() { if (!gate('pop', 50, 2)) return; tone({ type: 'sine', f: r(380, 460), f2: 950, dur: 0.09, vol: 0.2 }); },
    jump() { tone({ type: 'square', f: 260, f2: 520, dur: 0.1, vol: 0.06 }); },
    airJump() { tone({ type: 'triangle', f: 500, f2: 1100, dur: 0.14, vol: 0.14 }); },
    land() { if (!gate('land', 100, 1)) return; noise({ dur: 0.07, vol: 0.12, freq: 300, q: 1 }); },
    meow(pitch = 1) {
      if (!ac || muted) return;
      const t = ac.currentTime;
      const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
      o.type = 'sawtooth'; f.type = 'bandpass'; f.Q.value = 3;
      o.frequency.setValueAtTime(520 * pitch, t);
      o.frequency.linearRampToValueAtTime(820 * pitch, t + 0.12);
      o.frequency.linearRampToValueAtTime(480 * pitch, t + 0.38);
      f.frequency.setValueAtTime(900, t);
      f.frequency.linearRampToValueAtTime(2200, t + 0.12);
      f.frequency.linearRampToValueAtTime(700, t + 0.38);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      o.connect(f); f.connect(g); g.connect(master);
      o.start(t); o.stop(t + 0.45);
    },
    combo(n) {
      if (!gate('combo', 50, 2)) return;
      const semis = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
      const f = 523 * Math.pow(2, semis[Math.min(n - 2, semis.length - 1)] / 12 + Math.floor(Math.max(0, n - 12) / 11) * 0.25);
      tone({ type: 'square', f, dur: 0.1, vol: 0.06 });
      tone({ type: 'sine', f: f * 2, dur: 0.14, vol: 0.06, delay: 0.02 });
    },
    comboWord() {
      [0, 4, 7, 12].forEach((s, i) => tone({ type: 'square', f: 659 * Math.pow(2, s / 12), dur: 0.12, vol: 0.07, delay: i * 0.05 }));
    },
    crit() {
      tone({ type: 'sawtooth', f: 90, f2: 30, dur: 0.4, vol: 0.35 });
      noise({ dur: 0.45, vol: 0.4, freq: 1800, f2: 200, q: 0.6 });
      tone({ type: 'square', f: 1400, f2: 700, dur: 0.25, vol: 0.08 });
    },
    boom(k = 1) {
      if (!gate('boom', 80, 3)) return;
      tone({ type: 'sine', f: 110, f2: 28, dur: 0.45, vol: 0.45 * k });
      noise({ dur: 0.5, vol: 0.35 * k, freq: 900, f2: 120, q: 0.7, type: 'lowpass' });
    },
    laser() {
      tone({ type: 'sawtooth', f: 1800, f2: 200, dur: 0.4, vol: 0.12 });
      tone({ type: 'square', f: 900, f2: 1200, dur: 0.35, vol: 0.06 });
    },
    dash() { noise({ dur: 0.22, vol: 0.3, freq: 800, f2: 3500, q: 1.2 }); },
    throw() { tone({ type: 'triangle', f: 300, f2: 700, dur: 0.15, vol: 0.12 }); },
    footstep(k = 1) { tone({ type: 'sine', f: 90, f2: 50, dur: 0.12, vol: 0.4 * k }); noise({ dur: 0.06, vol: 0.12 * k, freq: 250 }); },
    door() { noise({ dur: 0.35, vol: 0.2, freq: 300, q: 2 }); tone({ type: 'triangle', f: 180, f2: 120, dur: 0.3, vol: 0.12 }); },
    buy() {
      [0, 7, 12].forEach((s, i) => tone({ type: 'triangle', f: 784 * Math.pow(2, s / 12), dur: 0.12, vol: 0.14, delay: i * 0.05 }));
      noise({ dur: 0.1, vol: 0.08, freq: 6000, type: 'highpass', delay: 0.12 });
    },
    deny() { tone({ type: 'square', f: 200, f2: 150, dur: 0.15, vol: 0.08 }); },
    click() { tone({ type: 'sine', f: 700, f2: 900, dur: 0.05, vol: 0.1 }); },
    clear() {
      [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => tone({ type: 'square', f: 523 * Math.pow(2, s / 12), dur: 0.18, vol: 0.07, delay: i * 0.07 }));
    },
    fail() {
      [0, -3, -6, -10].forEach((s, i) => tone({ type: 'triangle', f: 440 * Math.pow(2, s / 12), dur: 0.3, vol: 0.14, delay: i * 0.16 }));
    },
    thump(k = 1) {
      if (!gate('thump', 45, 3)) return;
      tone({ type: 'sine', f: 160 * (k > 1.2 ? 0.6 : 1), f2: 45, dur: 0.12 + k * 0.05, vol: 0.28 * Math.min(k, 1.6) });
      noise({ dur: 0.08, vol: 0.12 * k, freq: 600, q: 0.8 });
    },
    clink() {
      if (!gate('clink', 60, 3)) return;
      tone({ type: 'triangle', f: r(1800, 2600), dur: 0.12, vol: 0.12 });
      tone({ type: 'triangle', f: r(2800, 3600), dur: 0.08, vol: 0.07, delay: 0.02 });
    },
    ready() { [0, 7].forEach((s, i) => tone({ type: 'sine', f: 1046 * Math.pow(2, s / 12), dur: 0.15, vol: 0.12, delay: i * 0.07 })); },
    count() { if (!gate('count', 40, 1)) return; tone({ type: 'square', f: 1200, dur: 0.03, vol: 0.04 }); },
  };
})();
