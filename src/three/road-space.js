import { SEGMENT } from '../tracks.js';

export const WORLD_SCALE = 6;
export const ROAD_HALF = 8;
export function roadPose(track, distance, lane = 0) {
  const n = track.segments.length;
  const offset = ((distance % track.length) + track.length) % track.length / SEGMENT;
  const index = Math.floor(offset), f = offset - index;
  const a = track.segments[index], b = track.segments[(index + 1) % n];
  const before = track.segments[(index + n - 1) % n], after = track.segments[(index + 2) % n];
  let tx = (b.point[0] - before.point[0]) * (1-f) + (after.point[0] - a.point[0]) * f;
  let tz = (b.point[1] - before.point[1]) * (1-f) + (after.point[1] - a.point[1]) * f;
  const length = Math.hypot(tx, tz); tx /= length; tz /= length;
  const nx = -tz, nz = tx;
  return {
    x: ((a.point[0] + (b.point[0]-a.point[0])*f) - 50) * WORLD_SCALE + nx*lane*ROAD_HALF,
    y: 12 + (a.hill + (b.hill-a.hill)*f)*.009,
    z: ((a.point[1] + (b.point[1]-a.point[1])*f) - 50) * WORLD_SCALE + nz*lane*ROAD_HALF,
    tx,tz,nx,nz,yaw:Math.atan2(-tx,-tz),
    pitch:Math.atan2((b.hill-a.hill)*.009,Math.hypot(b.point[0]-a.point[0],b.point[1]-a.point[1])*WORLD_SCALE),
  };
}
