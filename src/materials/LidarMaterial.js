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

            // Inject Uniforms and Varyings
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
        const float MIN_VISIBILITY = 0.05;
      ` + shader.fragmentShader;

            // Let's try to modify the final color assignment.
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <dithering_fragment>',
                `
        #include <dithering_fragment>
        
        // --- LIDAR LOGIC START ---
        
        // Calculate world position (vWorldPosition is available in MeshStandardMaterial)
        
        // Calculate Lidar Effect
        float timeSincePulse = uCurrentTime - uPulseTime;
        vec3 lidarColor = vec3(0.0);
        
        if (uDebugLights) {
            lidarColor = uBaseColor;
        } else if (uPulseTime >= 0.0) {
            float dist = distance(vWorldPosition, uPulseOrigin);
            
            // Attenuation
            float attenuation = 1.0 - clamp(dist / uMaxDistance, 0.0, 1.0);
            // attenuation = pow(attenuation, 2.0); // Too dark
            
            // Wave
            float waveDist = timeSincePulse * uWaveSpeed;
            float waveDelta = abs(dist - waveDist);
            float waveGlow = 1.0 - smoothstep(0.0, 5.0, waveDelta); // Wider glow (5.0)
            waveGlow *= step(0.0, timeSincePulse);
            
            // Trail
            float timeHit = timeSincePulse - (dist / uWaveSpeed);
            float trail = 1.0 - clamp(timeHit / uFadeDuration, 0.0, 1.0);
            trail *= step(dist, waveDist);
            
            float totalBrightness = max(trail, waveGlow) * attenuation;
            
            // SHADOW MASKING
            // Use PointLight with high intensity and large range to get the shadow map.
            // Then in shader, use the presence of light (shadowLight) as a mask.
            
            if (uOcclusion) {
                vec3 shadowLight = gl_FragColor.rgb;
                float lightIntensity = max(shadowLight.r, max(shadowLight.g, shadowLight.b));
                
                // Soften edges with smoothstep
                float shadowMask = smoothstep(0.0, 0.001, lightIntensity); 
                
                lidarColor *= shadowMask;
            }
            
            // Apply Lidar Math
            lidarColor = mix(uBaseColor * MIN_VISIBILITY, GLOW_COLOR, totalBrightness);
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

            if (!shader.vertexShader.includes('vWorldPosition =')) {
                console.error('[LidarMaterial] Vertex Shader replacement FAILED!');
                console.log(shader.vertexShader);
            } else {
                console.log('[LidarMaterial] Vertex Shader replacement SUCCESS');
            }
        };
    }
};
