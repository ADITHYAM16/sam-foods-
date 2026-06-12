/**
 * playBeep — generates a short notification beep via the Web Audio API.
 * No external network requests, no autoplay policy issues when triggered
 * by a user-gesture-primed AudioContext.
 *
 * @param type  "new-order" (high-pitched double beep) |
 *              "delivery"  (rising two-tone alert)
 */
export function playBeep(type: "new-order" | "delivery" = "new-order") {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    const schedule = (freq: number, startAt: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startAt);

      // Smooth ramp up → sustain → ramp down
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(0.35, startAt + 0.01);
      gain.gain.setValueAtTime(0.35, startAt + duration - 0.05);
      gain.gain.linearRampToValueAtTime(0, startAt + duration);

      osc.start(startAt);
      osc.stop(startAt + duration);
    };

    const now = ctx.currentTime;

    if (type === "new-order") {
      // Double high-pitch beep — admin "new order placed"
      schedule(880, now, 0.12);
      schedule(880, now + 0.18, 0.12);
      schedule(1100, now + 0.36, 0.15);
    } else {
      // Rising two-tone — delivery agent "delivery request"
      schedule(660, now, 0.15);
      schedule(880, now + 0.2, 0.15);
      schedule(1100, now + 0.4, 0.2);
    }

    // Close context after all tones finish to free resources
    setTimeout(() => ctx.close(), 1200);
  } catch {
    // Silently ignore — AudioContext may be blocked in some environments
  }
}
