export const lidarVertexShader = `
varying vec3 vWorldPos;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPosition.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const lidarFragmentShader = `
uniform vec3 uPulseOrigin;
uniform float uPulseTime;
uniform float uCurrentTime;
uniform vec3 uBaseColor;
uniform int uPulseType; // 0 = Brightness+Pulse, 1 = Pulse Only
uniform bool uDebugLights; // True = Full Visibility

varying vec3 vWorldPos;

const float WAVE_SPEED = 10.0; // meters per second
const float FADE_DURATION = 5.0; // Increased from 3.0s to 5.0s
const vec3 GLOW_COLOR = vec3(0.0, 1.0, 1.0); // Cyan #00FFFF
const float MIN_VISIBILITY = 0.05; // 5% base visibility

void main() {
  // If debug lights are on, render full base color
  if (uDebugLights) {
    gl_FragColor = vec4(uBaseColor, 1.0);
    return;
  }

  // Calculate time since pulse
  float timeSincePulse = uCurrentTime - uPulseTime;
  
  // Calculate dynamic ambient brightness based on pulse
  // Immediate boost on clap, fading out over FADE_DURATION
  // Only apply boost if uPulseType == 0
  float ambientBoost = 0.0;
  if (uPulseType == 0) {
    ambientBoost = 1.0 - clamp(timeSincePulse / FADE_DURATION, 0.0, 1.0);
    ambientBoost = ambientBoost * step(0.0, timeSincePulse); // Only if pulse emitted
  }
  
  // Base visibility is MIN_VISIBILITY + a portion of the boost
  // Boost up to 0.25 total visibility (0.05 + 0.2)
  float currentBaseVisibility = MIN_VISIBILITY + (0.2 * ambientBoost);
  
  vec3 baseVisibleColor = uBaseColor * currentBaseVisibility;

  // If no pulse has been emitted yet, just show base visibility
  if (uPulseTime < 0.0) {
    gl_FragColor = vec4(uBaseColor * MIN_VISIBILITY, 1.0);
    return;
  }
  
  // Calculate distance from pulse origin
  float distanceFromOrigin = distance(vWorldPos, uPulseOrigin);
  
  // Calculate where the wavefront should be at this time
  float wavefrontDistance = timeSincePulse * WAVE_SPEED;
  
  // Calculate how close this pixel is to the wavefront
  float distanceToWavefront = abs(distanceFromOrigin - wavefrontDistance);
  
  // Wavefront thickness
  float wavefrontThickness = 2.0;
  
  // Calculate if this pixel has been hit by the wave
  float wasHit = step(distanceFromOrigin, wavefrontDistance);
  
  // Calculate brightness based on time since being hit
  float timeHit = timeSincePulse - (distanceFromOrigin / WAVE_SPEED);
  float brightness = 1.0 - clamp(timeHit / FADE_DURATION, 0.0, 1.0);
  brightness = brightness * wasHit;
  
  // Add extra brightness at the wavefront edge
  float wavefrontGlow = 1.0 - smoothstep(0.0, wavefrontThickness, distanceToWavefront);
  wavefrontGlow *= step(0.0, timeSincePulse); // Only show if pulse has been emitted
  
  // Combine effects
  float totalBrightness = max(brightness, wavefrontGlow);
  
  // Mix between base visible color and glow color
  vec3 finalColor = mix(baseVisibleColor, GLOW_COLOR, totalBrightness);
  
  // Ensure we don't lose the base visibility in the mix
  finalColor = max(finalColor, baseVisibleColor);
  
  gl_FragColor = vec4(finalColor, 1.0);
}
`;

