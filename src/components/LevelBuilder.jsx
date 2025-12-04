import React, { useMemo, useRef, useCallback } from 'react';
import { Box, Text, Billboard, useGLTF } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { useGame } from '../contexts/GameContext';
import { useScanner } from '../contexts/ScannerContext';
import { useAudio } from '../contexts/AudioContext';
import { useFrame } from '@react-three/fiber';
import Enemy from './Enemy';
import { LidarMaterial } from '../materials/LidarMaterial';
import * as THREE from 'three';

import { GAME_CONFIG } from '../constants/GameConstants';

const { CELL_SIZE, WALL_HEIGHT } = GAME_CONFIG;

// Shared material manager
const useLidarMaterials = (lidarParams) => {
  const materialsRef = useRef({});
  const { lastPulseTime, lastPulseOrigin, lastPulseType } = useScanner();
  const { debugLights } = useGame();

  const getMaterial = useCallback((baseColor) => {
    if (!materialsRef.current[baseColor]) {
      materialsRef.current[baseColor] = new LidarMaterial({
        color: baseColor,
        roughness: 0.8,
        metalness: 0.2,
      });
    }
    return materialsRef.current[baseColor];
  }, []);

  useFrame(() => {
    const currentTime = performance.now() / 1000;
    Object.values(materialsRef.current).forEach((material) => {
      if (material.uniforms) {
        material.uniforms.uCurrentTime.value = currentTime;
        material.uniforms.uPulseTime.value = lastPulseTime;
        material.uniforms.uPulseOrigin.value.set(...lastPulseOrigin);
        material.uniforms.uPulseType.value = lastPulseType;
        material.uniforms.uDebugLights.value = debugLights;

        // Debug Pulse Updates
        if (lastPulseTime > 0 && currentTime - lastPulseTime < 0.1) {
          console.log(`[LevelBuilder] Pulse Active! Time: ${currentTime.toFixed(2)}, PulseTime: ${lastPulseTime.toFixed(2)}, Origin: ${lastPulseOrigin}`);
        }

        // Debug Lights Check
        // if (Math.random() < 0.01) console.log('[LevelBuilder] debugLights:', debugLights);

        // Update tweakable params
        if (lidarParams) {
          if (material.uniforms.uWaveSpeed) material.uniforms.uWaveSpeed.value = lidarParams.waveSpeed;
          if (material.uniforms.uFadeDuration) material.uniforms.uFadeDuration.value = lidarParams.fadeDuration;
          if (material.uniforms.uMaxDistance) material.uniforms.uMaxDistance.value = lidarParams.maxDistance;
          if (material.uniforms.uOcclusion) material.uniforms.uOcclusion.value = lidarParams.occlusion;
        }
      }
    });
  });

  return { getMaterial };
};

const LevelBuilder = ({ levelData, playerRef, enemyRef, lidarParams, hideCeiling = false, highContrast = false, spawnEnemies = true }) => {
  const { layout, legend } = levelData;
  const { collectKey, hasKey, winGame } = useGame();
  const { playSound } = useAudio();
  const { getMaterial } = useLidarMaterials(lidarParams);

  // Helper for colors
  const getColor = (defaultColor, contrastColor) => highContrast ? contrastColor : defaultColor;

  // Find entity spawn position
  const entitySpawnPos = useMemo(() => {
    let spawnPos = null;
    layout.forEach((row, z) => {
      row.split('').forEach((char, x) => {
        if (legend[char] === 'Entity') {
          spawnPos = [x * CELL_SIZE, 1, z * CELL_SIZE];
        }
      });
    });
    return spawnPos;
  }, [layout, legend]);

  const components = useMemo(() => {
    const items = [];

    // Ceiling (single large plane is fine for ceiling as it's just visual/blocking)
    const maxWidth = Math.max(...layout.map(row => row.length));
    const levelWidth = maxWidth * CELL_SIZE;
    const levelDepth = layout.length * CELL_SIZE;

    if (!hideCeiling) {
      items.push(
        <Box
          key="ceiling"
          args={[levelWidth, 0.2, levelDepth]}
          position={[levelWidth / 2 - CELL_SIZE / 2, WALL_HEIGHT + 0.1, levelDepth / 2 - CELL_SIZE / 2]}
          material={getMaterial(getColor("#111111", "#444444"))}
        />
      );
    }

    layout.forEach((row, z) => {
      row.split('').forEach((char, x) => {
        const type = legend[char];
        const position = [x * CELL_SIZE, 0, z * CELL_SIZE];

        // Always add a floor tile for every defined cell
        if (type) {
          // Debug log for specific tiles (e.g., near start) or first few
          if (x < 5 && z < 5) {
            // console.log(`[LevelBuilder] Creating floor at ${x},${z} -> World: ${position[0]}, -2.5, ${position[2]}`);
          }
          items.push(
            <RigidBody key={`floor-${x}-${z}`} type="fixed" colliders="cuboid" position={[position[0], -2.5, position[2]]}>
              <Box args={[CELL_SIZE, 5, CELL_SIZE]} material={getMaterial(getColor("#222222", "#2a2a40"))} receiveShadow />
            </RigidBody>
          );
        }

        if (type === 'Wall') {
          items.push(
            <RigidBody key={`wall-${x}-${z}`} type="fixed" colliders="cuboid">
              <mesh
                position={[position[0], WALL_HEIGHT / 2, position[2]]}
                castShadow
                receiveShadow
                userData={{ type: 'wall' }}
                material={getMaterial(getColor("#888888", "#DDDDDD"))}
              >
                <boxGeometry args={[CELL_SIZE, WALL_HEIGHT, CELL_SIZE]} />
              </mesh>
            </RigidBody>
          );
        } else if (type === 'Pillar') {
          items.push(
            <RigidBody key={`pillar-${x}-${z}`} type="fixed" colliders="cuboid">
              <mesh
                position={[position[0], WALL_HEIGHT / 2, position[2]]}
                castShadow
                receiveShadow
                userData={{ type: 'wall' }}
                material={getMaterial(getColor("#555555", "#AAAAAA"))}
              >
                <boxGeometry args={[CELL_SIZE * 0.5, WALL_HEIGHT, CELL_SIZE * 0.5]} />
              </mesh>
            </RigidBody>
          );
        } else if (type === 'Debris') {
          items.push(
            <RigidBody key={`debris-${x}-${z}`} type="fixed" colliders="cuboid">
              <Box
                position={[position[0], 0.2, position[2]]}
                args={[CELL_SIZE, 0.4, CELL_SIZE]}
                material={getMaterial(getColor("#654321", "#D2691E"))}
                castShadow
                receiveShadow
              />
            </RigidBody>
          );
        } else if (type === 'Key' && !hasKey) {
          items.push(
            <React.Fragment key={`key-group-${x}-${z}`}>
              <RigidBody
                key={`key-${x}-${z}`}
                type="fixed"
                sensor
                onIntersectionEnter={() => {
                  collectKey();
                  playSound('keyPickup', { intensity: 0.8, spatial: false });
                  // Door unlocks when key is collected
                  setTimeout(() => {
                    playSound('doorUnlock', { intensity: 0.7, spatial: false });
                  }, 300); // Small delay for better audio feedback
                }}
                position={[position[0], 1, position[2]]}
              >
                <CuboidCollider args={[0.25, 0.25, 0.25]} sensor />
                {/* Visual Key Model */}
                <KeyModel position={[0, 0, 0]} />
              </RigidBody>
              <Billboard key={`key-label-${x}-${z}`} position={[position[0], 2, position[2]]}>
                <Text
                  fontSize={0.3}
                  color="gold"
                  anchorX="center"
                  anchorY="middle"
                >
                  KEY
                </Text>
              </Billboard>
            </React.Fragment>
          );
        } else if (type === 'Locked Door') {
          // Only show locked door if player doesn't have key
          if (!hasKey) {
            items.push(
              <React.Fragment key={`door-group-${x}-${z}`}>
                <RigidBody key={`door-${x}-${z}`} type="fixed" colliders="cuboid">
                  <Box
                    position={[position[0], WALL_HEIGHT / 2, position[2]]}
                    args={[CELL_SIZE, WALL_HEIGHT, CELL_SIZE]}
                  >
                    <meshBasicMaterial color="#8B0000" />
                  </Box>
                </RigidBody>
                <Billboard key={`door-label-${x}-${z}`} position={[position[0], WALL_HEIGHT + 0.5, position[2]]}>
                  <Text
                    fontSize={0.4}
                    color="darkred"
                    anchorX="center"
                    anchorY="middle"
                  >
                    DOOR
                  </Text>
                </Billboard>
              </React.Fragment>
            );
          }
        } else if (type === 'Exit') {
          items.push(
            <React.Fragment key={`exit-group-${x}-${z}`}>
              <RigidBody
                key={`exit-${x}-${z}`}
                type="fixed"
                sensor
                onIntersectionEnter={() => {
                  playSound('exitReached', { intensity: 1.0, spatial: false });
                  winGame();
                }}
                position={[position[0], 1, position[2]]}
              >
                {/* Collision box - proper sensor collider */}
                <CuboidCollider args={[CELL_SIZE / 2, 1, CELL_SIZE / 2]} sensor />

                {/* Visual Portal Model - adjusted */}
                <PortalModel position={[0, -1, 0]} />
              </RigidBody>
              <Billboard key={`exit-label-${x}-${z}`} position={[position[0], 3.5, position[2]]}>
                <Text
                  fontSize={0.5}
                  color="lime"
                  anchorX="center"
                  anchorY="middle"
                >
                  EXIT
                </Text>
              </Billboard>
            </React.Fragment>
          );
        } else if (type === 'Start') {
          // Visual marker for start position (can be removed later)
          items.push(
            <Box
              key={`start-${x}-${z}`}
              position={[position[0], 0.1, position[2]]}
              args={[1, 0.2, 1]}
            >
              <meshBasicMaterial color="#00FF00" transparent opacity={0.3} />
            </Box>
          );
        }
      });
    });
    return items;
  }, [layout, legend, collectKey, hasKey, winGame, hideCeiling, highContrast, getMaterial]);

  return (
    <>
      {components}
      {spawnEnemies && entitySpawnPos && <Enemy key={levelData.level_id} spawnPosition={entitySpawnPos} playerRef={playerRef} enemyRef={enemyRef} levelData={levelData} />}
    </>
  );
};

// Key Model Component
function KeyModel({ position }) {
  const modelRef = useRef();
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/key.glb`);

  // Rotate around Y axis
  useFrame((state, delta) => {
    if (modelRef.current) {
      modelRef.current.rotation.y += delta * 2; // 2 radians per second
    }
  });

  return (
    <primitive
      ref={modelRef}
      object={scene.clone()}
      position={position}
      scale={[0.3, 0.3, 0.3]}
    />
  );
}

// Portal Model Component for Exit
function PortalModel({ position }) {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/exit_portal.glb`);
  return (
    <primitive
      object={scene.clone()}
      position={position}
      scale={[1, 1, 1]} // Adjusted to fit CELL_SIZE
    />
  );
}

// Preload models for better performance
useGLTF.preload(`${import.meta.env.BASE_URL}models/exit_portal.glb`);
useGLTF.preload(`${import.meta.env.BASE_URL}models/key.glb`);

export default LevelBuilder;
