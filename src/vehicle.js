// Signed speed keeps reverse driving independent of rendering and race progress.
export const REVERSE_LIMIT = 1800;
export function approach(value, target, amount) {
  return value < target ? Math.min(value + amount, target) : Math.max(value - amount, target);
}
export function updateSpeed(speed, dt, input, forwardLimit) {
  if (input.accelerate && input.brake) return approach(speed, 0, 4800 * dt);
  if (input.brake) {
    return speed > 0 ? approach(speed, 0, 4800 * dt) : approach(speed, -REVERSE_LIMIT, 1800 * dt);
  }
  if (input.accelerate) {
    return speed < 0 ? approach(speed, 0, 4800 * dt) : approach(speed, forwardLimit, 2400 * dt);
  }
  return approach(speed, 0, 1100 * dt);
}
