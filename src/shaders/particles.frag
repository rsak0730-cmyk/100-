// AETHER Particle Lab — particle fragment shader
// Procedural soft-glow point sprite: hot core, gaussian halo, subtle shimmer.
// Designed for additive blending on a near-black stage.

precision highp float;

uniform float uGlow;      // glow intensity multiplier (0..2+)
uniform float uOpacity;   // global opacity (0..1)
uniform float uTime;

varying vec3 vColor;
varying float vAlpha;
varying float vSeed;
varying float vSize;

void main() {
  // Distance from sprite center in [0, 1]
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv) * 2.0;
  if (d >= 1.0) discard;

  // Soft outer halo (smoothstep falloff)
  float halo = smoothstep(1.0, 0.0, d);
  halo = pow(halo, 2.6);

  // Hot inner core (tight gaussian-ish falloff)
  float core = smoothstep(0.42, 0.0, d);
  core = pow(core, 2.0);

  // Subtle animated shimmer so static fields still feel alive
  float shimmer = 0.85 + 0.30 * sin(uTime * 2.4 + vSeed * 41.0);

  float glow = (core * (1.15 + uGlow * 1.6) + halo * (0.35 + uGlow * 0.9)) * shimmer;

  float alpha = clamp(vAlpha * (halo * (0.55 + uGlow * 0.35) + core), 0.0, 1.0) * uOpacity;
  if (alpha < 0.004) discard;

  gl_FragColor = vec4(vColor * glow, alpha);
}
