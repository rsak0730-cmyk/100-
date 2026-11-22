// AETHER Particle Lab — shockwave ring fragment shader
// Radial energy ring: bright leading edge, fading tail.
precision highp float;
uniform float uProgress;  // 0..1 expansion progress
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  // uv is 0..1 across the quad; center at 0.5
  vec2 p = vUv - 0.5;
  float d = length(p) * 2.0; // 0 center .. ~1.414 corner
  float radius = uProgress;
  float width = 0.16 + uProgress * 0.10;
  float ring = smoothstep(width, 0.0, abs(d - radius));
  float fade = (1.0 - uProgress);
  float alpha = ring * fade * fade;
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(uColor * (1.4 + fade), alpha);
}
