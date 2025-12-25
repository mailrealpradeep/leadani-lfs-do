let audioContext: AudioContext | null = null;
let isMuted = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn("Web Audio API not supported");
      return null;
    }
  }
  return audioContext;
}

export function setMuted(muted: boolean) {
  isMuted = muted;
  localStorage.setItem("celebration_sounds_muted", muted ? "true" : "false");
}

export function getMuted(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem("celebration_sounds_muted");
  isMuted = stored === "true";
  return isMuted;
}

function playTone(
  frequency: number, 
  duration: number, 
  type: OscillatorType = "sine",
  volume: number = 0.3
) {
  if (isMuted) return;
  
  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume context if suspended (required by browsers)
  if (ctx.state === "suspended") {
    ctx.resume();
  }

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  // Envelope: quick attack, gentle decay
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

export function playCoinSound() {
  if (isMuted) return;
  
  // Pleasant coin/ding sound - two quick ascending notes
  playTone(880, 0.15, "sine", 0.25); // A5
  setTimeout(() => playTone(1318.5, 0.2, "sine", 0.2), 80); // E6
}

export function playFanfareSound() {
  if (isMuted) return;
  
  // Triumphant fanfare - ascending chord progression
  playTone(523.25, 0.15, "triangle", 0.2); // C5
  setTimeout(() => playTone(659.25, 0.15, "triangle", 0.2), 100); // E5
  setTimeout(() => playTone(783.99, 0.15, "triangle", 0.2), 200); // G5
  setTimeout(() => playTone(1046.5, 0.3, "triangle", 0.25), 300); // C6 (sustained)
  setTimeout(() => playTone(1318.5, 0.4, "sine", 0.15), 350); // E6 (sparkle)
}

export function playSuccessSound() {
  if (isMuted) return;
  
  // Simple success chime
  playTone(659.25, 0.1, "sine", 0.2); // E5
  setTimeout(() => playTone(880, 0.25, "sine", 0.25), 100); // A5
}
