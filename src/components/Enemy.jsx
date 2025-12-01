import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Vector3 } from 'three';
import { useNoise } from '../contexts/NoiseContext';
import { useGame } from '../contexts/GameContext';
import { useAudio } from '../contexts/AudioContext';
import { findPath, getRandomWalkableTile } from '../utils/pathfinding';
import { GAME_CONFIG } from '../constants/GameConstants';

const ENEMY_HEIGHT = 2.5;
const ENEMY_SIZE = 1;
const { CELL_SIZE } = GAME_CONFIG;

const Enemy = ({ spawnPosition, playerRef, enemyRef, levelData }) => {
    const rigidBodyRef = useRef();

    // Sync enemyRef
    useEffect(() => {
        if (enemyRef) enemyRef.current = rigidBodyRef.current;
    }, [enemyRef]);

    const { noiseLevel } = useNoise();
    const { loseGame, gameState } = useGame();
    const { playSound, stopSound } = useAudio();
    const [state, setState] = useState('patrol'); // 'patrol', 'stalk', 'hunt'
    const [targetPosition, setTargetPosition] = useState(new Vector3(...spawnPosition));
    const [lastNoisePosition, setLastNoisePosition] = useState(new Vector3(...spawnPosition));
    const lastNoiseLevel = useRef(0);
    const previousState = useRef('patrol');

    // Pathfinding state
    const [path, setPath] = useState([]);
    const [currentPathIndex, setCurrentPathIndex] = useState(0);
    const lastPathCalculationTime = useRef(0);
    const lastTargetPosForPath = useRef(new Vector3());

    // Stuck detection state
    const lastPosition = useRef(new Vector3(...spawnPosition));
    const lastPositionCheckTime = useRef(0);

    // Update AI state based on noise
    useEffect(() => {
        if (gameState !== 'playing') return;

        // Detect noise increase
        if (noiseLevel > lastNoiseLevel.current && playerRef.current) {
            const playerPos = playerRef.current.translation();
            setLastNoisePosition(new Vector3(playerPos.x, playerPos.y, playerPos.z));
        }
        lastNoiseLevel.current = noiseLevel;

        // State transitions
        if (noiseLevel > 80) {
            // Play hunt sound when entering hunt mode
            if (previousState.current !== 'hunt' && playerRef.current && rigidBodyRef.current) {
                const enemyPos = rigidBodyRef.current.translation();
                const playerPos = playerRef.current.translation();
                playSound('hunt', {
                    position: [enemyPos.x, enemyPos.y, enemyPos.z],
                    listenerPosition: [playerPos.x, playerPos.y, playerPos.z],
                    intensity: 1.0
                });
            }
            setState('hunt');
            previousState.current = 'hunt';
        } else if (noiseLevel > 50) {
            setState('stalk');
            previousState.current = 'stalk';
        } else {
            setState('patrol');
            previousState.current = 'patrol';
        }
    }, [noiseLevel, gameState, playerRef]);

    // Pathfinding & Movement Logic
    useFrame(() => {
        if (!rigidBodyRef.current || !playerRef.current || gameState !== 'playing') return;

        const enemyPos = rigidBodyRef.current.translation();
        const playerPos = playerRef.current.translation();
        const currentTime = Date.now() / 1000;

        // --- Stuck Detection ---
        if (currentTime - lastPositionCheckTime.current > 1.0) {
            const distMoved = Math.sqrt(
                Math.pow(enemyPos.x - lastPosition.current.x, 2) +
                Math.pow(enemyPos.z - lastPosition.current.z, 2)
            );

            if (distMoved < 0.1) {
                // Increment stuck timer
                if (!rigidBodyRef.current.stuckStartTime) {
                    rigidBodyRef.current.stuckStartTime = currentTime;
                }

                const stuckDuration = currentTime - rigidBodyRef.current.stuckStartTime;

                if (stuckDuration > 5.0) {
                    console.warn('[Enemy] Stuck detected for > 5s! Generating report and repathing...');

                    // Generate Report
                    const report = {
                        timestamp: new Date().toISOString(),
                        enemyPos: { x: enemyPos.x, y: enemyPos.y, z: enemyPos.z },
                        targetPos: { x: targetPosition.x, y: targetPosition.y, z: targetPosition.z },
                        state: state,
                        pathLength: path.length,
                        currentPathIndex: currentPathIndex,
                        levelId: levelData?.level_id,
                        stuckDuration: stuckDuration
                    };

                    // Create and download file
                    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `enemy_stuck_report_${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);

                    // Force Repath: Pick a random nearby tile to unstick
                    const randomTile = getRandomWalkableTile(levelData.layout, levelData.legend, CELL_SIZE);
                    if (randomTile) {
                        setTargetPosition(randomTile);
                        setPath([]); // Clear path to force recalc
                        rigidBodyRef.current.stuckStartTime = null; // Reset timer
                    }
                }
            } else {
                // Reset stuck timer if moved
                rigidBodyRef.current.stuckStartTime = null;
            }

            lastPosition.current.copy(new Vector3(enemyPos.x, enemyPos.y, enemyPos.z));
            lastPositionCheckTime.current = currentTime;
        }


        // --- Target Selection ---
        let finalTarget = targetPosition;
        let speed = 1.5;

        if (state === 'hunt') {
            finalTarget = new Vector3(playerPos.x, enemyPos.y, playerPos.z);
            speed = 4;
        } else if (state === 'stalk') {
            finalTarget = new Vector3(lastNoisePosition.x, enemyPos.y, lastNoisePosition.z);
            speed = 2.5;
        } else if (state === 'patrol') {
            // If reached target or no target, pick new random one
            const distToTarget = Math.sqrt(
                Math.pow(enemyPos.x - targetPosition.x, 2) +
                Math.pow(enemyPos.z - targetPosition.z, 2)
            );

            if (distToTarget < 1.0 || path.length === 0) {
                const randomTile = getRandomWalkableTile(levelData.layout, levelData.legend, CELL_SIZE);
                if (randomTile) {
                    setTargetPosition(randomTile);
                    finalTarget = randomTile;
                }
            }
        }

        // --- Path Calculation ---
        // Recalculate if:
        // 1. Path is empty
        // 2. Target has moved significantly (in hunt/stalk)
        // 3. Enough time has passed (to avoid spamming A*)
        const distToLastTarget = finalTarget.distanceTo(lastTargetPosForPath.current);
        const timeSinceLastCalc = currentTime - lastPathCalculationTime.current;

        if (path.length === 0 || (distToLastTarget > 2.0 && timeSinceLastCalc > 0.5)) {
            const newPath = findPath(
                new Vector3(enemyPos.x, enemyPos.y, enemyPos.z),
                finalTarget,
                levelData.layout,
                levelData.legend,
                CELL_SIZE
            );

            if (newPath.length > 0) {
                setPath(newPath);
                setCurrentPathIndex(0);
                lastTargetPosForPath.current.copy(finalTarget);
                lastPathCalculationTime.current = currentTime;
            }
        }

        // --- Movement Execution ---
        if (path.length > 0 && currentPathIndex < path.length) {
            const nextWaypoint = path[currentPathIndex];

            // Move towards waypoint
            const direction = new Vector3(
                nextWaypoint.x - enemyPos.x,
                0,
                nextWaypoint.z - enemyPos.z
            );

            const distToWaypoint = direction.length();

            if (distToWaypoint < 0.5) {
                // Reached waypoint, move to next
                setCurrentPathIndex(prev => Math.min(prev + 1, path.length - 1));
            } else {
                direction.normalize().multiplyScalar(speed);
                rigidBodyRef.current.setLinvel({ x: direction.x, y: 0, z: direction.z });
            }
        } else {
            // No path or reached end
            rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 });
        }


        // Check collision with player (death condition)
        const distToPlayer = Math.sqrt(
            Math.pow(enemyPos.x - playerPos.x, 2) +
            Math.pow(enemyPos.z - playerPos.z, 2)
        );

        if (distToPlayer < 1.5) {
            // Stop breathing sound
            if (rigidBodyRef.current.breathingSource) {
                try {
                    rigidBodyRef.current.breathingSource.stop();
                } catch (e) { }
            }
            // Also use context stopSound to be sure
            stopSound('monsterBreathing');
            stopSound('hunt');

            // Play game over sound
            playSound('gameOver', {
                position: [playerPos.x, playerPos.y, playerPos.z],
                listenerPosition: [playerPos.x, playerPos.y, playerPos.z],
                intensity: 1.0
            });

            loseGame();
        }

        // Play breathing sound periodically in ALL modes (Patrol, Stalk, Hunt)
        if (currentTime - (rigidBodyRef.current.lastBreathingTime || 0) > 4.0) {
            // Intensity varies by state
            let breathIntensity = 0.5; // Default/Patrol
            if (state === 'stalk') breathIntensity = 0.7;
            if (state === 'hunt') breathIntensity = 1.0;

            const source = playSound('monsterBreathing', {
                position: [enemyPos.x, enemyPos.y, enemyPos.z],
                listenerPosition: [playerPos.x, playerPos.y, playerPos.z],
                intensity: breathIntensity
            });

            // Store source to stop it later
            if (source) {
                rigidBodyRef.current.breathingSource = source;
            }

            rigidBodyRef.current.lastBreathingTime = currentTime;
        }
    });

    // Color based on state
    const getColor = () => {
        switch (state) {
            case 'hunt': return '#ff0000'; // Red - hunting
            case 'stalk': return '#ff8800'; // Orange - investigating
            case 'patrol': return '#ffff00'; // Yellow - patrolling
            default: return '#888888';
        }
    };

    return (
        <RigidBody
            ref={rigidBodyRef}
            position={spawnPosition}
            colliders={false}
            enabledRotations={[false, false, false]}
            type="dynamic"
            lockRotations
        >
            <CuboidCollider args={[ENEMY_SIZE / 2, ENEMY_HEIGHT / 2, ENEMY_SIZE / 2]} position={[0, ENEMY_HEIGHT / 2, 0]} />
            <mesh position={[0, ENEMY_HEIGHT / 2, 0]}>
                <boxGeometry args={[ENEMY_SIZE, ENEMY_HEIGHT, ENEMY_SIZE]} />
                <meshStandardMaterial color={getColor()} emissive={getColor()} emissiveIntensity={0.5} />
            </mesh>
        </RigidBody>
    );
};

export default Enemy;
