// Charge survives between separate drifts. A full gauge grants one item immediately.
export function chargeBoost(state, amount) {
  if (amount <= 0) return false;
  state.drift = Math.min(1, state.drift + amount);
  if (state.drift < 1 - 1e-9) return false;
  state.drift = 0;
  state.boosts += 1;
  return true;
}
