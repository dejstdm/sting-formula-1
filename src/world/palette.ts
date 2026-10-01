import * as THREE from 'three/webgpu';
import { uniform } from 'three/tsl';

export const STING_RED = new THREE.Color('#e3002b');
export const STING_GOLD = new THREE.Color('#ffb21a');
export const RIVAL_BLUE = new THREE.Color('#47b8ff');
export const NIGHT = new THREE.Color('#0a0912');

/** Shared world uniforms that the race drives every frame. */
export const worldU = {
  /** 0..1, how charged the player is. Drives LED strips and accent lights. */
  energy: uniform(1),
  /** Short pulse 0..1 on every Boost. */
  pulse: uniform(0),
  /** Race-relative clock, so shaders can slow down with the game. */
  gameTime: uniform(0),
};
