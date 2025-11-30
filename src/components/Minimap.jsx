import React, { useMemo, useRef, useState } from 'react';
import { useFrame, createPortal, useThree } from '@react-three/fiber';
import { useFBO, OrthographicCamera, Hud } from '@react-three/drei';
import * as THREE from 'three';
import { useScanner } from '../contexts/ScannerContext';

const CELL_SIZE = 3;
const MINIMAP_SIZE = 200; // Size in pixels

const Minimap = ({ levelData, playerRef, enemyRef }) => {
    const { layout, legend } = levelData;
    const { lastPulseTime, lastPulseOrigin } = useScanner();

    // 1. Setup off-screen scene and camera
    const minimapScene = useMemo(() => {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color('black');
        return scene;
    }, []);

    const minimapCameraRef = useRef();
    const target = useFBO(MINIMAP_SIZE, MINIMAP_SIZE);
    const wallsRef = useRef({}); // Store references to wall meshes
    const visitedWalls = useRef(new Set()); // Track revealed walls
    const lastEnemyRevealTime = useRef(-100);
    const revealedEnemyPos = useRef(new THREE.Vector3());

    // 2. Create simplified level geometry for the minimap
    useMemo(() => {
        // Clear previous children
        while (minimapScene.children.length > 0) {
            minimapScene.remove(minimapScene.children[0]);
        }
        wallsRef.current = {}; // Reset refs

        const material = new THREE.MeshBasicMaterial({ color: '#444444' });
        const geometry = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE);

        layout.forEach((row, z) => {
            row.split('').forEach((char, x) => {
                const type = legend[char];
                if (type === 'Wall' || type === 'Pillar') {
                    const mesh = new THREE.Mesh(geometry, material.clone()); // Clone material for individual control
                    mesh.position.set(x * CELL_SIZE, 0, z * CELL_SIZE);
                    mesh.visible = false; // Hidden by default (Fog of War)
                    minimapScene.add(mesh);
                    wallsRef.current[`${x},${z}`] = mesh;
                }
            });
        });

        // Add Player Arrow
        const playerGeo = new THREE.ConeGeometry(1, 2, 3);
        const playerMat = new THREE.MeshBasicMaterial({ color: '#00ff00' });
        const playerMesh = new THREE.Mesh(playerGeo, playerMat);
        playerMesh.rotation.x = -Math.PI / 2; // Point up (relative to map)
        playerMesh.name = 'playerArrow';
        minimapScene.add(playerMesh);

        // Add Monster Blip (Red Dot)
        const blipGeo = new THREE.SphereGeometry(1.5, 16, 16);
        const blipMat = new THREE.MeshBasicMaterial({ color: '#ff0000', transparent: true, opacity: 0 });
        const blipMesh = new THREE.Mesh(blipGeo, blipMat);
        blipMesh.name = 'monsterBlip';
        blipMesh.visible = false;
        minimapScene.add(blipMesh);

        // Add Pulse Ring (Visual only)
        const ringGeo = new THREE.RingGeometry(0.5, 1, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: '#00ffff', transparent: true, opacity: 0 });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.name = 'pulseRing';
        minimapScene.add(ringMesh);

    }, [layout, legend, minimapScene]);

    // 3. Render loop
    useFrame(({ gl, camera }) => {
        if (!playerRef.current || !minimapCameraRef.current) return;

        const playerPos = playerRef.current.translation();
        const currentTime = performance.now() / 1000;

        // Update Fog of War based on Pulse
        const timeSincePulse = currentTime - lastPulseTime;
        if (timeSincePulse < 2.0) { // Pulse is active
            const pulseRadius = timeSincePulse * 20; // Speed of sound/pulse
            const pulseOriginVec = new THREE.Vector3(lastPulseOrigin[0], 0, lastPulseOrigin[2]);

            // Check unvisited walls
            Object.entries(wallsRef.current).forEach(([key, mesh]) => {
                if (!visitedWalls.current.has(key)) {
                    const dist = mesh.position.distanceTo(pulseOriginVec);
                    if (dist < pulseRadius && dist > pulseRadius - 5) { // Within the expanding wavefront
                        mesh.visible = true;
                        visitedWalls.current.add(key);
                    }
                }
            });

            // Check for Monster Reveal
            if (enemyRef && enemyRef.current) {
                const enemyPos = enemyRef.current.translation();
                const enemyVec = new THREE.Vector3(enemyPos.x, 0, enemyPos.z);
                const distToEnemy = enemyVec.distanceTo(pulseOriginVec);

                if (distToEnemy < pulseRadius && distToEnemy > pulseRadius - 5) {
                    // Monster Hit!
                    lastEnemyRevealTime.current = currentTime;
                    revealedEnemyPos.current.copy(enemyVec);
                }
            }
        }

        // Update Monster Blip Visibility
        const blip = minimapScene.getObjectByName('monsterBlip');
        if (blip) {
            const timeSinceReveal = currentTime - lastEnemyRevealTime.current;
            if (timeSinceReveal < 3.0) {
                blip.visible = true;
                blip.position.copy(revealedEnemyPos.current);
                blip.material.opacity = 1.0 - (timeSinceReveal / 3.0);
            } else {
                blip.visible = false;
            }
        }

        // Update Player Arrow Position in Minimap Scene
        const arrow = minimapScene.getObjectByName('playerArrow');
        if (arrow) {
            arrow.position.set(playerPos.x, 0, playerPos.z);
            // rotation needs to match player rotation (y-axis)
            // We can get rotation from camera or rigid body quaternion
            const rotation = camera.rotation.y;
            arrow.rotation.z = -rotation; // Rotate arrow to match facing
        }

        // Update Pulse Ring
        const ring = minimapScene.getObjectByName('pulseRing');
        if (ring) {
            const timeSincePulse = (performance.now() / 1000) - lastPulseTime;
            if (timeSincePulse < 2.0) {
                ring.position.set(lastPulseOrigin[0], 0, lastPulseOrigin[2]);
                const scale = timeSincePulse * 10; // Expand
                ring.scale.set(scale, scale, 1);
                ring.material.opacity = 1.0 - (timeSincePulse / 2.0);
            } else {
                ring.material.opacity = 0;
            }
        }

        // Sync Minimap Camera
        minimapCameraRef.current.position.set(playerPos.x, 50, playerPos.z);
        minimapCameraRef.current.lookAt(playerPos.x, 0, playerPos.z);
        minimapCameraRef.current.updateProjectionMatrix();

        // Render to FBO
        gl.setRenderTarget(target);
        gl.clear();
        gl.render(minimapScene, minimapCameraRef.current);
        gl.setRenderTarget(null);
    });

    const { size } = useThree();

    return (
        <>
            {/* Off-screen Camera */}
            <OrthographicCamera
                ref={minimapCameraRef}
                position={[0, 50, 0]}
                zoom={1}
                left={-25}
                right={25}
                top={25}
                bottom={-25}
                near={0.1}
                far={100}
            />

            {/* HUD Overlay */}
            <Hud renderPriority={1}>
                <OrthographicCamera
                    makeDefault
                    position={[0, 0, 10]}
                    left={-size.width / 2}
                    right={size.width / 2}
                    top={size.height / 2}
                    bottom={-size.height / 2}
                />
                <mesh position={[size.width / 2 - MINIMAP_SIZE / 2 - 20, -size.height / 2 + MINIMAP_SIZE / 2 + 20, 0]}>
                    <planeGeometry args={[MINIMAP_SIZE, MINIMAP_SIZE]} />
                    <meshBasicMaterial map={target.texture} />
                    {/* Border */}
                    <lineSegments>
                        <edgesGeometry args={[new THREE.PlaneGeometry(MINIMAP_SIZE, MINIMAP_SIZE)]} />
                        <lineBasicMaterial color="white" />
                    </lineSegments>
                </mesh>
            </Hud>
        </>
    );
};

export default Minimap;
