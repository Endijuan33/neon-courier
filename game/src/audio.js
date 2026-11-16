export function createAudio() {
  let context = null, master = null, muted = false, active = false;
  let nextBeat = 0, beat = 0, notesPlayed = 0;
  try { muted = localStorage.getItem('neon-courier-muted') === 'true'; } catch {}

  function unlock() {
    try {
      if (!context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        context = new AudioContext();
        master = context.createGain();
        master.gain.value = muted ? 0 : 0.4;
        master.connect(context.destination);
      }
      if (context.state === 'suspended') context.resume().catch(() => {});
    } catch { context = null; master = null; }
  }

  function tone(frequency, duration, type = 'sine', volume = 0.15, delay = 0, endFrequency = frequency) {
    if (!context || !master || muted || context.state !== 'running') return;
    const time = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), time + duration);
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(volume, time + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + duration);
    oscillator.connect(envelope); envelope.connect(master);
    oscillator.start(time); oscillator.stop(time + duration + 0.03);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    notesPlayed++;
  }

  function play(name) {
    if (name === 'pickup') { tone(620, 0.09, 'sine', 0.22, 0, 940); tone(1240, 0.13, 'sine', 0.12, 0.06); }
    if (name === 'delivery') [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', 0.18, i * 0.075));
    if (name === 'hit') { tone(135, 0.27, 'sawtooth', 0.18, 0, 35); tone(65, 0.3, 'sine', 0.22); }
    if (name === 'dash') tone(170, 0.15, 'triangle', 0.1, 0, 680);
    if (name === 'power') [440, 660, 880].forEach((f, i) => tone(f, 0.15, 'sine', 0.16, i * 0.05));
    if (name === 'shield') { tone(1000, 0.3, 'triangle', 0.16, 0, 250); }
    if (name === 'shift') [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.4, 'triangle', 0.18, i * 0.12));
    if (name === 'over') [392, 330, 262, 131].forEach((f, i) => tone(f, 0.35, 'triangle', 0.18, i * 0.15));
    if (name === 'start') { tone(262, 0.13, 'triangle'); tone(523, 0.22, 'triangle', 0.15, 0.1); }
  }

  return {
    unlock, play,
    get muted() { return muted; },
    setActive(value) { active = value; if (!value) nextBeat = 0; },
    toggle() {
      unlock(); muted = !muted; nextBeat = 0;
      if (master) master.gain.setTargetAtTime(muted ? 0 : 0.4, context.currentTime, 0.025);
      try { localStorage.setItem('neon-courier-muted', String(muted)); } catch {}
      return muted;
    },
    tick() {
      if (!active || muted || !context || context.state !== 'running') return;
      if (!nextBeat || nextBeat < context.currentTime - 0.5) nextBeat = context.currentTime;
      while (nextBeat < context.currentTime + 0.08) {
        const note = [65.41, 65.41, 98, 65.41, 58.27, 58.27, 87.31, 58.27][beat++ % 8];
        tone(note, 0.23, 'sine', 0.12, Math.max(0, nextBeat - context.currentTime));
        if (beat % 4 === 0) tone(note * 4, 0.16, 'triangle', 0.025, Math.max(0, nextBeat - context.currentTime));
        nextBeat += 0.375;
      }
    },
    inspect() { return { state: context?.state || 'locked', muted, active, notesPlayed }; },
  };
}
