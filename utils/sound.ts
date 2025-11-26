
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicManager: MusicManager | null = null;

// Initialize Audio Context and Master Gain
const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.5; // Default volume
    masterGain.connect(audioCtx.destination);
  }
  return { ctx: audioCtx, master: masterGain! };
};

// Global Controls
export const setGlobalVolume = (val: number) => {
  const { ctx, master } = initAudio();
  const safeVal = Math.max(0, Math.min(1, val));
  master.gain.setTargetAtTime(safeVal, ctx.currentTime, 0.1);
};

export const setGlobalMute = (isMuted: boolean) => {
  const { ctx, master } = initAudio();
  if (isMuted) {
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
  } else {
     // Managed by updateGlobalAudio or volume slider logic
  }
};

export const updateGlobalAudio = (volume: number, isMuted: boolean) => {
    const { ctx, master } = initAudio();
    const target = isMuted ? 0 : Math.max(0, Math.min(1, volume));
    master.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
};


// --- Sound Effects ---

export const playCollectSound = () => {
  try {
    const { ctx, master } = initAudio();
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    // A nice major third interval chime
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
    
    // SFX Mix Level
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(master); // Connect to Master
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
};

export const playTapeSound = () => {
  try {
    const { ctx, master } = initAudio();
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Low, sticky square wave
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master); // Connect to Master
    
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {}
};

export const playPaperPuffSound = () => {
  try {
    const { ctx, master } = initAudio();
    if (ctx.state === 'suspended') ctx.resume();
    
    // Noise buffer for "puff" / "crumple"
    const bufferSize = ctx.sampleRate * 0.2; // 200ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const gain = ctx.createGain();
    
    // Lowpass filter sweeping down to simulate dust/paper settling
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2500, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(master); 
    
    noise.start();
  } catch (e) {}
};

export const playDestroySound = () => {
  // Deprecated in favor of playPaperPuffSound for specific interactions, 
  // but kept for compatibility or other generic impacts
  playPaperPuffSound(); 
};

export const playCrashSound = () => {
  try {
    const { ctx, master } = initAudio();
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.5);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(master); // Connect to Master
    
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {}
};

// --- Procedural Background Music ---

class MusicManager {
  private ctx: AudioContext;
  private isPlaying: boolean = false;
  private musicGain: GainNode;
  private nextNoteTime: number = 0;
  private schedulerTimer: number | null = null;
  private noteIndex: number = 0;
  
  // Lo-fi Notebook Progression
  // Cmaj7 - Am7 - Fmaj7 - G7
  private sequence = [
    // C Maj 7
    [261.63, 329.63, 392.00, 493.88], 
    // A Min 7
    [220.00, 261.63, 329.63, 392.00],
    // F Maj 7
    [174.61, 220.00, 261.63, 329.63],
    // G Dom 7
    [196.00, 246.94, 293.66, 349.23],
  ];

  constructor(ctx: AudioContext, master: GainNode) {
    this.ctx = ctx;
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0.5; // Mix level relative to Master
    this.musicGain.connect(master);
  }

  public play() {
    if (this.isPlaying) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    
    this.isPlaying = true;
    // Don't reset noteIndex here so it resumes where it left off
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.schedule();
  }

  public pause() {
    this.isPlaying = false;
    if (this.schedulerTimer) {
      window.clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  private schedule() {
    if (!this.isPlaying) return;

    // Lookahead: schedule notes for the next 0.1s
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
      this.playBeat(this.nextNoteTime);
      // 100 BPM approx -> 0.6s per beat. 8th notes = 0.3s
      this.nextNoteTime += 0.3; 
    }

    this.schedulerTimer = window.setTimeout(() => this.schedule(), 25);
  }

  private playBeat(time: number) {
    // 4 chords, 8 notes per chord (up and down arpeggio)
    const chordIdx = Math.floor(this.noteIndex / 8) % this.sequence.length;
    const notePattern = [0, 1, 2, 3, 3, 2, 1, 0];
    const noteInChord = notePattern[this.noteIndex % 8];
    
    const freq = this.sequence[chordIdx][noteInChord];
    
    this.playTone(freq, time);
    
    // Bass note on the first beat of the chord
    if (this.noteIndex % 8 === 0) {
      this.playTone(freq / 2, time, 0.5, 'triangle');
    }

    this.noteIndex++;
  }

  private playTone(freq: number, time: number, duration: number = 0.25, type: OscillatorType = 'sine') {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    // Soft Envelope
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(type === 'sine' ? 0.1 : 0.05, time + 0.05); // Attack
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration); // Release

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + duration + 0.1);
  }
}

export const getMusicManager = () => {
  const { ctx, master } = initAudio();
  if (!musicManager) {
    musicManager = new MusicManager(ctx, master);
  }
  return musicManager;
};
