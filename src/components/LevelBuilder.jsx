import React, { useMemo, useRef, useCallback } from 'react';
import { Box } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import { useGame } from '../contexts/GameContext';
import { useScanner } from '../contexts/ScannerContext';
import { useFrame } from '@react-three/fiber';
import Enemy from './Enemy';
import { lidarVertexShader, lidarFragmentShader } from '../shaders/LidarShader';
import * as THREE from 'three';

const CELL_SIZE = 3;
const WALL_HEIGHT = 3;

// Shared material manager - creates materials once and updates them uniformly
const useLidarMaterials = () => {
  const materialsRef = useRef({});
  const { lastPulseTime, lastPulseOrigin, lastPulseType } = useScanner();
  const { debugLights } = useGame();

  // Create materials for different colors if they don't exist
  // IMPORTANT: Memoized with useCallback to prevent recreation on every render
  const getMaterial = useCallback((baseColor) => {
    if (!materialsRef.current[baseColor]) {
      console.log('[useLidarMaterials] Creating new material for color:', baseColor);
      materialsRef.current[baseColor] = new THREE.ShaderMaterial({
        vertexShader: lidarVertexShader,
        fragmentShader: lidarFragmentShader,
        uniforms: {
          uPulseOrigin: { value: new THREE.Vector3() },
          uPulseTime: { value: -1000 },
          uCurrentTime: { value: 0 },
          uBaseColor: { value: new THREE.Color(baseColor) },
          uPulseType: { value: 0 },
          uDebugLights: { value: false },
        },
      });
    }
    return materialsRef.current[baseColor];
  }, []); // Empty deps - function is stable

  // Update ALL materials every frame - ensures uniform updates
  useFrame(() => {
    const currentTime = performance.now() / 1000;
    Object.values(materialsRef.current).forEach((material) => {
      material.uniforms.uCurrentTime.value = currentTime;
      material.uniforms.uPulseTime.value = lastPulseTime;
      material.uniforms.uPulseOrigin.value.set(...lastPulseOrigin);
      material.uniforms.uPulseType.value = lastPulseType;
      material.uniforms.uDebugLights.value = debugLights;
    });

    // Debug log occasionally
    if (Math.random() < 0.01) {
      console.log('[useLidarMaterials] Updated all materials. debugLights:', debugLights, 'materials count:', Object.keys(materialsRef.current).length);
    }
  });

  return { getMaterial };
};

const LevelBuilder = ({ levelData, playerRef }) => {
  const { layout, legend } = levelData;
  const { collectKey, hasKey, winGame } = useGame();
  const { getMaterial } = useLidarMaterials(); // Use shared materials

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

    // Create a single ground plane for the entire level
    const levelWidth = layout[0].length * CELL_SIZE;
    const levelDepth = layout.length * CELL_SIZE;
    items.push(
      <RigidBody key="ground" type="fixed" colliders="cuboid" position={[levelWidth / 2 - CELL_SIZE / 2, -0.5, levelDepth / 2 - CELL_SIZE / 2]}>
        <Box args={[levelWidth, 1, levelDepth]} material={getMaterial("#222222")} />
      </RigidBody>
    );

    layout.forEach((row, z) => {
      row.split('').forEach((char, x) => {
        const type = legend[char];
        const position = [x * CELL_SIZE, 0, z * CELL_SIZE];

        if (type === 'Wall') {
          items.push(
            <RigidBody key={`wall-${x}-${z}`} type="fixed" colliders="cuboid">
              <Box
                position={[position[0], WALL_HEIGHT / 2, position[2]]}
                args={[CELL_SIZE, WALL_HEIGHT, CELL_SIZE]}
                material={getMaterial("#888888")}
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
      {entitySpawnPos && <Enemy spawnPosition={entitySpawnPos} playerRef={playerRef} />}
    </group>
  );
};

export default LevelBuilder;
