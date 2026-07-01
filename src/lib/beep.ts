/**
 * Shared AudioContext singleton — created once on first user gesture,
 * reused for every beep. Avoids the "AudioContext not allowed" error
 * that fires when you create a new context outside a user-gesture handler.
 */

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    if (!_ctx) _ctx = new AC();
    // Resume if suspended (Chrome requires resume() after a user gesture)
    if (_ctx.state === "suspended") _ctx.resume();
    return _ctx;
  } catch {
    return null;
  }
}

// Call this once from any click / keydown handler to unlock the context.
// We also wire it up automatically below on first call to playBeep().
function unlockAudio() {
  getCtx();
}

// Auto-wire unlock on first user interaction so pages don't have to do it manually.
if (typeof window !== "undefined") {
  const once = () => {
    unlockAudio();
    window.removeEventListener("pointerdown", once);
    window.removeEventListener("keydown", once);
  };
  window.addEventListener("pointerdown", once);
  window.addEventListener("keydown", once);
}

function tone(ctx: AudioContext, freq: number, start: number, duration: number, vol = 0.4) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(vol, start + 0.01);
  gain.gain.linearRampToValueAtTime(0, start + duration);
  osc.start(start);
  osc.stop(start + duration + 0.01);
}

/**
 * playBeep — plays a notification sound.
 * @param type "new-order" = admin alert | "delivery" = delivery agent alert
 */
export function playBeep(type: "new-order" | "delivery" = "new-order") {
  // Attempt to unlock on every call — safe to call multiple times
  const ctx = getCtx();
  if (!ctx) return;

  // If still suspended after getCtx(), wait for resume then play
  if (ctx.state === "suspended") {
    ctx.resume().then(() => _play(ctx, type)).catch(() => {});
    return;
  }
  _play(ctx, type);
}

function _play(ctx: AudioContext, type: "new-order" | "delivery") {
  try {
    const now = ctx.currentTime;
    if (type === "new-order") {
      // Double high-pitch ding — admin new order
      tone(ctx, 880,  now,        0.12);
      tone(ctx, 880,  now + 0.18, 0.12);
      tone(ctx, 1100, now + 0.36, 0.15);
    } else {
      // Rising three-tone alert — delivery request
      tone(ctx, 660,  now,        0.14);
      tone(ctx, 880,  now + 0.20, 0.14);
      tone(ctx, 1100, now + 0.40, 0.18);
    }
  } catch {
    // If context was closed externally, reset and retry once
    _ctx = null;
    try {
      const fresh = getCtx();
      if (fresh) _play(fresh, type);
    } catch {}
  }
}
