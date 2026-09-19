export const GAME_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD',
  'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'KeyE', 'Escape', 'Space',
]);
export function drivingInput(keys) {
  return {
    accelerate: keys.has('ArrowUp') || keys.has('KeyW'),
    brake: keys.has('ArrowDown') || keys.has('KeyS'),
    left: keys.has('ArrowLeft') || keys.has('KeyA'),
    right: keys.has('ArrowRight') || keys.has('KeyD'),
    drift: keys.has('ShiftLeft') || keys.has('ShiftRight'),
  };
}
export function actionForKey(code) {
  if (code === 'ControlLeft' || code === 'ControlRight') return 'boost';
  if (code === 'KeyE') return 'shift';
  if (code === 'Escape') return 'pause';
  return null;
}
