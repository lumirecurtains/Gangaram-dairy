/**
 * Version 3 - Module C1: Centralized Audio Chime Manager
 * Manages Web Audio API synthesis for new incoming kitchen order alerts.
 * Gracefully handles browser autoplay restrictions with audio unlock tracking.
 */

class AudioChimeManager {
  private audioContext: AudioContext | null = null;
  private isUnlocked: boolean = false;

  /**
   * Unlocks the Web Audio API context on user interaction (touch/click).
   */
  public unlockAudio(): boolean {
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
        }
      }

      if (this.audioContext && this.audioContext.state === "suspended") {
        this.audioContext.resume();
      }

      this.isUnlocked = this.audioContext?.state === "running";
      return this.isUnlocked;
    } catch {
      return false;
    }
  }

  /**
   * Returns true if audio context is unlocked and ready to play.
   */
  public getIsUnlocked(): boolean {
    if (!this.audioContext) return false;
    return this.audioContext.state === "running";
  }

  /**
   * Plays a 3-beep alert chime sequence for new incoming orders.
   */
  public playIncomingOrderChime(repeats: number = 3): void {
    try {
      if (!this.audioContext) {
        this.unlockAudio();
      }

      if (!this.audioContext || this.audioContext.state !== "running") {
        return;
      }

      const ctx = this.audioContext;
      const now = ctx.currentTime;

      for (let i = 0; i < repeats; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        // 880Hz (A5) clear chime tone
        osc.frequency.value = 880;
        osc.type = "sine";

        const startTime = now + i * 0.18;
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.14);

        osc.start(startTime);
        osc.stop(startTime + 0.14);
      }
    } catch {
      // Audio fallback — degrade silently
    }
  }
}

export const chimeManager = new AudioChimeManager();
