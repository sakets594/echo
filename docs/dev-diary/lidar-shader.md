# Lidar Shader Implementation

The core visual mechanic of ECHO is the Lidar pulse, which reveals the geometry of the world. This is implemented using a custom shader in Three.js.

## The Concept
Instead of standard lighting, we use a custom `ShaderMaterial` that calculates the distance from a "pulse origin" to every pixel on the screen (or rather, every fragment on the object).

## Shader Logic
The fragment shader receives:
-   `uPulseOrigin`: The world position where the pulse started.
-   `uPulseTime`: The time when the pulse started.
-   `uCurrentTime`: The current game time.
-   `uWaveSpeed`: How fast the pulse travels.

It calculates the distance from the fragment to the pulse origin:
```glsl
float dist = distance(vPosition, uPulseOrigin);
float timeElapsed = uCurrentTime - uPulseTime;
float waveDist = timeElapsed * uWaveSpeed;
```

If the `dist` is close to `waveDist`, we color the fragment. We also apply a fade effect based on distance to simulate signal decay.

## Code Snippet
```javascript
// LidarMaterial.js
export const LidarMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uPulseOrigin: { value: new THREE.Vector3() },
        uPulseTime: { value: 0 },
        // ...
    },
    vertexShader: \`
        varying vec3 vPosition;
        void main() {
            vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    \`,
    fragmentShader: \`
        // ... (pulse logic)
    \`
});
```
