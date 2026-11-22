// AETHER Particle Lab — particle vertex shader
// Transforms per-particle attributes into clip space and sizes point sprites
// with perspective attenuation.

attribute vec3 aColor;
attribute float aSize;
attribute float aAlpha;
attribute float aSeed;

uniform float uPixelRatio;
uniform float uSizeScale;   // global particle size multiplier
uniform float uScale;       // perspective scale factor (viewport height / 2)
uniform float uTime;

varying vec3 vColor;
varying float vAlpha;
varying float vSeed;
varying float vSize;

void main() {
  vColor = aColor;
  vAlpha = aAlpha;
  vSeed = aSeed;
  vSize = aSize;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  // Perspective attenuated point size, clamped to a sane range.
  float attenuation = uScale / max(0.1, -mvPosition.z);
  float size = aSize * uSizeScale * uPixelRatio * attenuation;
  gl_PointSize = clamp(size, 1.0, 220.0);

  gl_Position = projectionMatrix * mvPosition;
}
