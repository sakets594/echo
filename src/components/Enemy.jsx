import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import { Vector3 } from 'three';
import { useNoise } from '../contexts/NoiseContext';
import { useGame } from '../contexts/GameContext';
import { useAudio } from '../contexts/AudioContext';

const ENEMY_HEIGHT = 2.5;
const ENEMY_SIZE = 1;

const Enemy = ({ spawnPosition, playerRef }) => {
    const rigidBodyRef = useRef();
    const { noiseLevel } = useNoise();
    const { loseGame, gameState } = useGame();
    const { playSound } = useAudio();
    const [state, setState] = useState('patrol'); // 'patrol', 'stalk', 'hunt'
    const [targetPosition, setTargetPosition] = useState(new Vector3(...spawnPosition));
    const [lastNoisePosition, setLastNoisePosition] = useState(new Vector3(...spawnPosition));
    const lastNoiseLevel = useRef(0);
    const lastFootstepTime = useRef(0);
    const previousState = useRef('patrol');

    // Patrol waypoints (simple back and forth for now)
    const patrolWaypoints = useRef([
        new Vector3(spawnPosition[0] + 6, spawnPosition[1], spawnPosition[2]),
        new Vector3(spawnPosition[0] - 6, spawnPosition[1], spawnPosition[2]),
        new Vector3(spawnPosition[0], spawnPosition[1], spawnPosition[2] + 6),
        new Vector3(spawnPosition[0], spawnPosition[1], spawnPosition[2] - 6),
    ]);
    const currentWaypointIndex = useRef(0);

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

    useFrame(() => {
        if (!rigidBodyRef.current || !playerRef.current || gameState !== 'playing') return;

        const enemyPos = rigidBodyRef.current.translation();
        const playerPos = playerRef.current.translation();

        let targetPos;
        let speed;

        switch (state) {
            case 'hunt':
                // Chase player directly
                targetPos = new Vector3(playerPos.x, enemyPos.y, playerPos.z);
                speed = 4; // Fast
                break;

            case 'stalk':
                // Move to last known noise location
                targetPos = new Vector3(lastNoisePosition.x, enemyPos.y, lastNoisePosition.z);
                speed = 2.5; // Medium
                break;

            case 'patrol':
            default:
                // Patrol waypoints
                const waypoint = patrolWaypoints.current[currentWaypointIndex.current];
                targetPos = new Vector3(waypoint.x, enemyPos.y, waypoint.z);
                speed = 1.5; // Slow

                // Check if reached waypoint
                const distToWaypoint = Math.sqrt(
                    Math.pow(enemyPos.x - waypoint.x, 2) +
                    Math.pow(enemyPos.z - waypoint.z, 2)
                );
                if (distToWaypoint < 2) {
                    currentWaypointIndex.current =
                        (currentWaypointIndex.current + 1) % patrolWaypoints.current.length;
                }
                break;
        }

        // Calculate direction to target
        const direction = new Vector3(
            targetPos.x - enemyPos.x,
            0,
            targetPos.z - enemyPos.z
        );

        const distance = direction.length();
        if (distance > 0.5) {
            direction.normalize().multiplyScalar(speed);
            rigidBodyRef.current.setLinvel({ x: direction.x, y: 0, z: direction.z });
        } else {
            rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 });
        }

        // Check collision with player (death condition)
        const distToPlayer = Math.sqrt(
            Math.pow(enemyPos.x - playerPos.x, 2) +
            Math.pow(enemyPos.z - playerPos.z, 2)
        );

        if (distToPlayer < 1.5) {
            loseGame();
        }

        // Play footstep sounds based on movement and state
        const currentTime = Date.now() / 1000; // Convert to seconds
        let footstepInterval;
        let footstepIntensity;

        switch (state) {
            case 'hunt':
                footstepInterval = 0.3; // Fast footsteps
                footstepIntensity = 1.0; // Loud
                break;
            case 'stalk':
                footstepInterval = 0.5; // Medium footsteps
                footstepIntensity = 0.6; // Medium volume
                break;
            case 'patrol':
            default:
                footstepInterval = 0.7; // Slow footsteps
                footstepIntensity = 0.3; // Quiet
                break;
        }

        // Play footstep if enough time has passed and enemy is moving
        if (distance > 0.5 && currentTime - lastFootstepTime.current > footstepInterval) {
            playSound('footstep', {
                position: [enemyPos.x, enemyPos.y, enemyPos.z],
                listenerPosition: [playerPos.x, playerPos.y, playerPos.z],
                intensity: footstepIntensity
            });
            lastFootstepTime.current = currentTime;
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
            <mesh position={[0, ENEMY_HEIGHT / 2, 0]}>
                <boxGeometry args={[ENEMY_SIZE, ENEMY_HEIGHT, ENEMY_SIZE]} />
                <meshStandardMaterial color={getColor()} emissive={getColor()} emissiveIntensity={0.5} />
            </mesh>
        </RigidBody>
    );
};

export default Enemy;
