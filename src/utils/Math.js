/**
 * Math utilities for the engine
 */

import { Vector3 } from "babylonjs";

/**
 * Convert array [x, y, z] to Babylon Vector3
 */
export function toVector3(arr) {
  if (!arr || arr.length < 3) return Vector3.Zero();
  return new Vector3(arr[0], arr[1], arr[2]);
}

/**
 * Convert degrees to radians
 */
export function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
export function toDegrees(radians) {
  return radians * (180 / Math.PI);
}

/**
 * Clamp value between min and max
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Smooth step interpolation
 */
export function smoothstep(a, b, t) {
  t = clamp((t - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Random float between min and max
 */
export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Random integer between min and max (inclusive)
 */
export function randomInt(min, max) {
  return Math.floor(randomRange(min, max + 1));
}

/**
 * Distance between two points (Vector3 or arrays)
 */
export function distance(a, b) {
  const v1 = Array.isArray(a) ? toVector3(a) : a;
  const v2 = Array.isArray(b) ? toVector3(b) : b;
  return Vector3.Distance(v1, v2);
}

/**
 * Check if point is inside AABB
 */
export function pointInAABB(point, min, max) {
  return point.x >= min.x && point.x <= max.x &&
         point.y >= min.y && point.y <= max.y &&
         point.z >= min.z && point.z <= max.z;
}

/**
 * Check if two AABBs intersect
 */
export function aabbIntersects(minA, maxA, minB, maxB) {
  return minA.x <= maxB.x && maxA.x >= minB.x &&
         minA.y <= maxB.y && maxA.y >= minB.y &&
         minA.z <= maxB.z && maxA.z >= minB.z;
}
