import React, { useMemo, useRef, useCallback } from 'react';
import { Box } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import { useGame } from '../contexts/GameContext';
import { useScanner } from '../contexts/ScannerContext';
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

const LevelBuilder = ({ levelData, playerRef, enemyRef, lidarParams }) => {
  const { layout, legend } = levelData;
  const { collectKey, hasKey, winGame } = useGame();
  const { getMaterial } = useLidarMaterials(lidarParams);

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

    items.push(
      <Box
        key="ceiling"
        args={[levelWidth, 0.2, levelDepth]}
        position={[levelWidth / 2 - CELL_SIZE / 2, WALL_HEIGHT + 0.1, levelDepth / 2 - CELL_SIZE / 2]}
        material={getMaterial("#111111")}
      />
    );

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
              <Box args={[CELL_SIZE, 5, CELL_SIZE]} material={getMaterial("#222222")} receiveShadow />
            </RigidBody>
          );
        }

        if (type === 'Wall') {
          items.push(
            <RigidBody key={`wall-${x}-${z}`} type="fixed" colliders="cuboid">
              <Box
                position={[position[0], WALL_HEIGHT / 2, position[2]]}
                args={[CELL_SIZE, WALL_HEIGHT, CELL_SIZE]}
                material={getMaterial("#888888")}
                castShadow
                receiveShadow
              />
            </RigidBody>
          );
        } else if (type === 'Pillar') {
          items.push(
            <RigidBody key={`pillar-${x}-${z}`} type="fixed" colliders="cuboid">
              <Box
                position={[position[0], WALL_HEIGHT / 2, position[2]]}
                args={[CELL_SIZE * 0.5, WALL_HEIGHT, CELL_SIZE * 0.5]}
                material={getMaterial("#555555")}
                castShadow
                receiveShadow
              />
            </RigidBody>
          );
        } else if (type === 'Debris') {
          items.push(
            <RigidBody key={`debris-${x}-${z}`} type="fixed" colliders="cuboid">
              <Box
                position={[position[0], 0.2, position[2]]}
                args={[CELL_SIZE, 0.4, CELL_SIZE]}
                material={getMaterial("#654321")}
                castShadow
                receiveShadow
              />
            </RigidBody>
          );
        } else if (type === 'Key') {
          items.push(
            <RigidBody
              key={`key-${x}-${z}`}
              type="fixed"
              sensor
              onIntersectionEnter={() => collectKey()}
            >
              <Box
                position={[position[0], 1, position[2]]}
                args={[0.5, 0.5, 0.5]}
              >
                <meshBasicMaterial color="#FFD700" />
              </Box>
            </RigidBody>
          );
        } else if (type === 'Locked Door') {
          // Only show locked door if player doesn't have key
          if (!hasKey) {
            items.push(
              <RigidBody key={`door-${x}-${z}`} type="fixed" colliders="cuboid">
                <Box
                  position={[position[0], WALL_HEIGHT / 2, position[2]]}
                  args={[CELL_SIZE, WALL_HEIGHT, CELL_SIZE]}
                >
                  <meshBasicMaterial color="#8B0000" />
                </Box>
              </RigidBody>
            );
          }
        } else if (type === 'Exit') {
          items.push(
            <RigidBody
              key={`exit-${x}-${z}`}
              type="fixed"
              sensor
              onIntersectionEnter={() => winGame()}
            >
              <Box
                position={[position[0], 1, position[2]]}
                args={[CELL_SIZE, 2, CELL_SIZE]}
              >
                <meshBasicMaterial color="#00FF00" />
              </Box>
            </RigidBody>
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
  }, [layout, legend, collectKey, hasKey, winGame]);

  return (
    <group>
      {components}
      {entitySpawnPos && <Enemy spawnPosition={entitySpawnPos} playerRef={playerRef} enemyRef={enemyRef} />}
    </group>
  );
};

export default LevelBuilder;
