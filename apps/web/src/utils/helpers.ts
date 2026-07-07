import ringtoneUrl from '../assets/ring.mp3';

let ringtoneAudio: HTMLAudioElement | null = null;
let audioUnlocked = false;

export function primeAudioPlayback() {
  if (audioUnlocked) return;

  const unlock = () => {
    audioUnlocked = true;
    document.removeEventListener('pointerdown', unlock, true);
    document.removeEventListener('keydown', unlock, true);

    try {
      const audio = new Audio(ringtoneUrl);
      audio.volume = 0.05;
      void audio.play()
        .then(() => { audio.pause(); audio.currentTime = 0; })
        .catch((err) => console.warn('Audio unlock playback was blocked.', err));
    } catch (err) {
      console.warn('Audio unlock failed.', err);
    }
  };

  document.addEventListener('pointerdown', unlock, { once: true, capture: true });
  document.addEventListener('keydown', unlock, { once: true, capture: true });
}

export function playRingtone() {
  stopRingtone();
  try {
    ringtoneAudio = new Audio(ringtoneUrl);
    ringtoneAudio.loop = true;
    void ringtoneAudio.play().catch((err) => console.warn('Ringtone playback was blocked.', err));
  } catch (err) {
    console.warn('Ringtone playback failed.', err);
  }
}

export function stopRingtone() {
  if (!ringtoneAudio) return;
  ringtoneAudio.pause();
  ringtoneAudio.currentTime = 0;
  ringtoneAudio = null;
}

export function playNotificationChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const now = ctx.currentTime;
    
    // High note (E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    // Lower note chime (C5) slightly delayed
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(523.25, now + 0.15);
    gain2.gain.setValueAtTime(0.25, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc1.start(now);
    osc1.stop(now + 0.35);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.6);
  } catch (err) {
    console.warn('AudioContext playback was blocked or is unsupported.', err);
  }
}

export const getInitials = (name?: string): string => {
  if (!name) return 'VC';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export function generateRoomName(): string {
  const segment = (len: number) => {
    let text = "";
    const possible = "abcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < len; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  };
  return `call-${segment(8)}`;
}