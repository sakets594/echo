import * as THREE from 'three';
import { LIDAR_DEFAULTS } from '../constants/LidarConstants';

export const LidarMaterial = class extends THREE.MeshStandardMaterial {
    constructor(parameters) {
        super(parameters);

        this.uniforms = {
            uPulseOrigin: { value: new THREE.Vector3() },
            uPulseTime: { value: -1000 },
            uCurrentTime: { value: 0 },
            uBaseColor: { value: new THREE.Color(parameters.color || '#ffffff') },
            uPulseType: { value: 0 },
            uDebugLights: { value: false },
            uWaveSpeed: { value: LIDAR_DEFAULTS.WAVE_SPEED },
            uFadeDuration: { value: LIDAR_DEFAULTS.FADE_DURATION },
            uMaxDistance: { value: LIDAR_DEFAULTS.MAX_DISTANCE },
            uOcclusion: { value: LIDAR_DEFAULTS.OCCLUSION_ENABLED },
        };

        this.onBeforeCompile = (shader) => {
            // Pass uniforms to shader
            shader.uniforms.uPulseOrigin = this.uniforms.uPulseOrigin;
            shader.uniforms.uPulseTime = this.uniforms.uPulseTime;
            shader.uniforms.uCurrentTime = this.uniforms.uCurrentTime;
            shader.uniforms.uBaseColor = this.uniforms.uBaseColor;
            shader.uniforms.uPulseType = this.uniforms.uPulseType;
            shader.uniforms.uDebugLights = this.uniforms.uDebugLights;
            shader.uniforms.uWaveSpeed = this.uniforms.uWaveSpeed;
            shader.uniforms.uFadeDuration = this.uniforms.uFadeDuration;
            shader.uniforms.uMaxDistance = this.uniforms.uMaxDistance;
            shader.uniforms.uOcclusion = this.uniforms.uOcclusion;

            // Inject Uniforms and Varyings (Only if not already present)
            if (!shader.fragmentShader.includes('// --- LIDAR LOGIC START ---')) {
                shader.fragmentShader = `
        uniform vec3 uPulseOrigin;
        uniform float uPulseTime;
        uniform float uCurrentTime;
        uniform vec3 uBaseColor;
        uniform int uPulseType;
        uniform bool uDebugLights;
        uniform float uWaveSpeed;
        uniform float uFadeDuration;
        uniform float uMaxDistance;
        uniform bool uOcclusion;
        
        varying vec3 vWorldPosition;
        
        const vec3 GLOW_COLOR = vec3(0.0, 1.0, 1.0);
        const float MIN_VISIBILITY = 0.0; // Pitch black when not scanned
      ` + shader.fragmentShader;

                // Let's try to modify the final color assignment.
                shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <dithering_fragment>',
                    `
        #include <dithering_fragment>
        
        // --- LIDAR LOGIC START ---
        
        // --- LIDAR LOGIC START ---
        
        vec3 baseColor = gl_FragColor.rgb;
        vec3 lidarColor = baseColor;
        
        if (uPulseTime >= 0.0) {
            float dist = distance(vWorldPosition, uPulseOrigin);
            float timeSincePulse = uCurrentTime - uPulseTime;
            
            // 1. Attenuation (Distance Fade)
            float attenuation = 1.0 - clamp(dist / uMaxDistance, 0.0, 1.0);
            
            // 2. Wave (Moving Ring)
            float waveDist = timeSincePulse * uWaveSpeed;
            float waveDelta = abs(dist - waveDist);
            float waveGlow = 1.0 - smoothstep(0.0, 2.0, waveDelta);
            waveGlow = max(0.0, waveGlow);
            
            // 3. Trail (Fading behind wave)
            float timeHit = timeSincePulse - (dist / uWaveSpeed);
            float trail = 0.0;
            if (timeHit > 0.0) {
                trail = 1.0 - clamp(timeHit / uFadeDuration, 0.0, 1.0);
            }
            
            // Combine
            float totalBrightness = max(trail, waveGlow) * attenuation;
            
            // 4. Shadow Masking (Occlusion)
            if (uOcclusion) {
                // Sample the standard lighting (shadows)
                // In Game Mode, baseColor is black, so shadowLight is black.
                // This breaks occlusion logic if we rely on baseColor!
                // BUT, we only need occlusion for the LIDAR effect.
                // If baseColor is black, we can't detect shadows on it?
                // Wait. Shadows are multiplied into gl_FragColor.
                // If material.color is black, gl_FragColor is black regardless of light.
                // So we can't use gl_FragColor for shadow detection in Game Mode.
                
                // However, the Lidar effect itself should be visible even on black walls.
                // But we want it BLOCKED by shadows (which are cast by walls).
                // If everything is black, we can't tell what is shadow and what is just black wall.
                
                // CRITICAL: We need the shadow map info INDEPENDENT of material color.
                // But we don't have access to shadow map directly here easily.
                
                // Alternative:
                // If we use uDebugLights to switch logic?
                // No, we want to simplify.
                
                // Let's assume for now that if we are in Game Mode (Black Walls),
                // we might lose shadow occlusion on the Lidar pulse itself?
                // Or maybe we don't need shadow occlusion for the pulse if the pulse IS the light?
                // Real Lidar doesn't cast shadows, it IS the source.
                // But walls should block it.
                // My "Shadow Masking" logic was a hack to use the scene's point light shadows to simulate occlusion.
                // If I turn the walls black, I lose that hack.
                
                // Solution:
                // Keep the walls GREY in the shader, but multiply by 0.0 at the end if !uDebugLights?
                // No, LevelBuilder sets material.color to black.
                
                // If I want occlusion, I need the walls to receive light so I can check for shadows.
                // So material.color MUST be non-black.
                
                // So my LevelBuilder fix is problematic for the occlusion hack.
                
                // REVERT LevelBuilder fix?
                // User said "lets change the value of wall color to black".
                // If I do that, I lose occlusion.
                
                // BETTER APPROACH:
                // Don't change material.color in LevelBuilder.
                // Instead, in Shader:
                // 1. Calculate lighting normally (with Grey walls).
                // 2. Use this for Occlusion check.
                // 3. If !uDebugLights, force the *final* base color to Black, but keep the Lidar effect (masked by the calculated lighting).
                
                // So:
                // vec3 litColor = gl_FragColor.rgb;
                // float shadowFactor = brightness(litColor);
                // vec3 finalColor = litColor;
                // if (!uDebugLights) finalColor = vec3(0.0);
                // lidarColor = mix(finalColor, GLOW, brightness * shadowFactor);
                
                // This works!
                // So I should REVERT the LevelBuilder change and implement this logic.
                // But I already applied LevelBuilder change.
                // I will revert it in the next step.
                // For now, let's write the shader logic assuming LevelBuilder is reverted.
                
                vec3 shadowLight = gl_FragColor.rgb;
                float lightIntensity = max(shadowLight.r, max(shadowLight.g, shadowLight.b));
                float shadowMask = smoothstep(0.0, 0.01, lightIntensity); 
                totalBrightness *= shadowMask;
            }
            
            // Final Mix
            // If uDebugLights is FALSE, we want base to be BLACK.
            // If uDebugLights is TRUE, we want base to be baseColor.
            // Final Mix
            vec3 targetBase = baseColor;
            if (uDebugLights) {
                targetBase = uBaseColor; // Unlit grey for visibility
            } else {
                targetBase = vec3(0.0); // Pitch black for game
            }
            
            lidarColor = mix(targetBase, GLOW_COLOR, totalBrightness);
        } else {
            // No pulse active.
            if (uDebugLights) {
                lidarColor = uBaseColor;
            } else {
                lidarColor = vec3(0.0);
            }
        }
        
        gl_FragColor = vec4(lidarColor, 1.0);
        `
                );

                // Ensure vWorldPosition is passed
                shader.vertexShader = `
        varying vec3 vWorldPosition;
        ` + shader.vertexShader.replace(
                    '#include <worldpos_vertex>',
                    `
        #include <worldpos_vertex>
            vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
        `
                );
            }

            if (!shader.vertexShader.includes('vWorldPosition =')) {
                console.error('[LidarMaterial] Vertex Shader replacement FAILED!');
                console.log(shader.vertexShader);
            } else {
                console.log('[LidarMaterial] Vertex Shader replacement SUCCESS');
            }
        };
    }
};
