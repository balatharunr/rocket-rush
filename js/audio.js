/* Rocket Rush — Audio
 * Tiny Web Audio synth: punchy SFX with envelopes + simple chiptune music loop.
 * Stays light: oscillators are short and pruned automatically.
 */
(function (root) {
  "use strict";
  const RR = (root.RR = root.RR || {});

  let ctx = null;
  let masterGain = null;
  let musicGain = null;
  let sfxGain = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;

  // Bass+lead pattern (semitones from A2). Cycles every 16 steps.
  const BASS = [0, 0, 7, 0, 5, 5, 7, 0, -2, -2, 5, -2, 3, 3, 5, -2];
  const LEAD = [12, 16, 19, 16, 12, 17, 19, 17, 14, 17, 21, 17, 12, 16, 19, 16];

  function ensure() {
    if (ctx) return true;
    if (muted) return false;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) { muted = true; return false; }
      ctx = new Ctor();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.55;
      masterGain.connect(ctx.destination);
      sfxGain = ctx.createGain();
      sfxGain.gain.value = 1;
      sfxGain.connect(masterGain);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.32;
      musicGain.connect(masterGain);
      return true;
    } catch (_) { muted = true; return false; }
  }

  // freq: Hz, dur: seconds, type: 'square'|'triangle'|'sawtooth'|'sine'
  // vol: peak gain. attack/decay in seconds. dest: optional gain node (sfx/music).
  function tone(freq, dur, type = "square", vol = 0.04, attack = 0.005, dest) {
    if (muted || !ensure()) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(dest || sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // Sweep tone from f1 to f2.
  function sweep(f1, f2, dur, type = "sawtooth", vol = 0.05) {
    if (muted || !ensure()) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f1, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // Short noise burst via buffer source (for explosions).
  function noise(dur, vol = 0.07, lp = 1500) {
    if (muted || !ensure()) return;
    const t = ctx.currentTime;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = lp;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt); filt.connect(g); g.connect(sfxGain);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  // Curated SFX — call by name to keep gameplay code clean.
  const SFX = {
    start:    () => { tone(220, 0.06, "square", 0.05); setTimeout(() => tone(440, 0.07, "square", 0.05), 70); setTimeout(() => tone(660, 0.10, "square", 0.05), 150); },
    levelUp:  () => { tone(520, 0.07, "square", 0.05); setTimeout(() => tone(700, 0.07, "square", 0.05), 60); setTimeout(() => tone(980, 0.10, "square", 0.05), 130); },
    pickup:   () => { tone(880, 0.05, "square", 0.04); setTimeout(() => tone(1320, 0.05, "square", 0.03), 35); },
    gem:      (combo = 1) => tone(720 + combo * 30, 0.05, "square", 0.038),
    star:     () => tone(1100, 0.035, "square", 0.025),
    shield:   () => { tone(540, 0.07, "triangle", 0.05); setTimeout(() => tone(720, 0.08, "triangle", 0.04), 50); },
    slow:     () => sweep(800, 240, 0.35, "sine", 0.05),
    bomb:     () => { sweep(120, 60, 0.55, "sawtooth", 0.10); noise(0.45, 0.10, 800); },
    phase:    () => { sweep(440, 880, 0.30, "triangle", 0.05); setTimeout(() => sweep(880, 440, 0.25, "triangle", 0.04), 280); },
    magnet:   () => { tone(380, 0.06, "sine", 0.04); setTimeout(() => tone(540, 0.06, "sine", 0.04), 60); },
    shoot:    () => tone(900, 0.04, "square", 0.024),
    blast:    () => { tone(320, 0.05, "square", 0.04); noise(0.12, 0.045, 1800); },
    hit:      () => { tone(180, 0.10, "triangle", 0.06); noise(0.18, 0.05, 1200); },
    hullBreach: () => { sweep(220, 80, 0.45, "sawtooth", 0.08); noise(0.35, 0.09, 900); },
    death:    () => { sweep(280, 50, 0.9, "sawtooth", 0.10); noise(0.7, 0.10, 700); },
    bossWarn: () => { sweep(120, 600, 0.45, "sawtooth", 0.07); setTimeout(() => sweep(120, 600, 0.45, "sawtooth", 0.07), 240); },
    bossHit:  () => { tone(240, 0.06, "square", 0.05); noise(0.10, 0.05, 1400); },
    bossDown: () => { sweep(440, 60, 1.4, "sawtooth", 0.10); noise(1.2, 0.10, 600); },
    victory:  () => { tone(660, 0.10, "square", 0.06); setTimeout(() => tone(880, 0.10, "square", 0.06), 110); setTimeout(() => tone(1320, 0.20, "square", 0.07), 230); },
    turboLoop:() => tone(50 + Math.random() * 30, 0.020, "sawtooth", 0.012),
    pause:    () => tone(440, 0.06, "triangle", 0.04),
    overheat: () => sweep(400, 200, 0.20, "square", 0.04),
  };

  // Music: simple two-voice pattern at 120 BPM (1/8 notes ~= 250ms apart).
  function startMusic() {
    if (muted) return;
    if (musicTimer) return;
    if (!ensure()) return;
    const stepMs = 250;
    musicStep = 0;
    musicTimer = setInterval(() => {
      if (!ctx || muted) return;
      const i = musicStep % 16;
      const aBase = 110;            // A2
      const fBass = aBase * Math.pow(2, BASS[i] / 12);
      const fLead = aBase * Math.pow(2, LEAD[i] / 12);
      tone(fBass, 0.18, "triangle", 0.10, 0.005, musicGain);
      if (musicStep % 2 === 0) tone(fLead, 0.12, "square", 0.04, 0.004, musicGain);
      // tiny percussive blip on backbeat
      if (i % 4 === 2) noise(0.05, 0.03, 2400);
      musicStep++;
    }, stepMs);
  }

  function stopMusic() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }

  function setMuted(v) {
    muted = !!v;
    if (muted) {
      stopMusic();
      if (masterGain) masterGain.gain.value = 0;
    } else {
      ensure();
      if (masterGain) masterGain.gain.value = 0.55;
    }
  }
  function isMuted() { return muted; }

  RR.audio = {
    ensure, tone, sweep, noise,
    sfx: SFX,
    startMusic, stopMusic,
    setMuted, isMuted,
  };
})(typeof window !== "undefined" ? window : this);
