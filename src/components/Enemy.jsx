import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Line, Text, Billboard } from '@react-three/drei';
import { useGLTF } from '@react-three/drei';
import { Vector3, Raycaster } from 'three';
import { useNoise } from '../contexts/NoiseContext';
import { useGame } from '../contexts/GameContext';
import { useAudio } from '../contexts/AudioContext';
import { useScanner } from '../contexts/ScannerContext';
import { GAME_CONFIG, DEFAULT_AI_CONFIG } from '../constants/GameConstants';
import { useControls } from 'leva';
import { SeededRandom } from '../utils/SeededRandom';
import { EnemyAI } from '../ai/EnemyAI';
import { EnemyMovement } from '../ai/EnemyMovement';

const ENEMY_HEIGHT = 2.5;
const ENEMY_SIZE = 1;
const { CELL_SIZE } = GAME_CONFIG;

const Enemy = ({ spawnPosition, playerRef, enemyRef, levelData, aiConfig = {}, seed, targetOverride, stimulusQueue, onAIEvent, onUpdateTarget }) => {
    const rigidBodyRef = useRef();

    // Initialize seeded RNG for deterministic patrol behavior
    const rng = useMemo(() => {
        const levelSeed = seed || levelData?.level_id || 12345;
        console.log(`[Enemy] Initialized with seed: ${levelSeed}`);
        return new SeededRandom(levelSeed);
    }, [seed, levelData]);
    const { scene } = useThree();
    const raycaster = useMemo(() => new Raycaster(), []);

    // Sync enemyRef
    useEffect(() => {
        if (enemyRef) enemyRef.current = rigidBodyRef.current;
    }, [enemyRef]);

    const { noiseLevel } = useNoise();
    const { loseGame, gameState } = useGame();
    const { playSound, stopSound } = useAudio();
    const { lastPulseTime, lastPulseOrigin, cooldownDuration } = useScanner();

    // Merge config with defaults
    const config = useMemo(() => ({
        ...DEFAULT_AI_CONFIG,
        ...aiConfig
    }), [aiConfig]);

    // Leva Controls for Runtime Tweaking
    const aiParams = useControls('Enemy AI', {
        huntSpeed: { value: config.huntSpeed, min: 1, max: 15 },
        investigateSpeed: { value: config.investigateSpeed, min: 1, max: 10 },
        patrolSpeed: { value: config.patrolSpeed, min: 1, max: 5 },
        tremorRadiusWalk: { value: config.tremorRadiusWalk, min: 1, max: 50 },
        tremorRadiusSprint: { value: config.tremorRadiusSprint, min: 10, max: 100 },
        breathRadius: { value: config.breathRadius, min: 0.5, max: 10 },
        lidarRange: { value: config.lidarRange, min: 10, max: 50 },
        frustrationTime: { value: config.frustrationTime, min: 1, max: 20 },
        inertiaTime: { value: config.inertiaTime, min: 0, max: 10 },
        searchDuration: { value: 10, min: 5, max: 30 }, // Added searchDuration control
        showDebug: false,
    });

    // Instantiate AI and Movement classes
    const ai = useMemo(() => new EnemyAI(aiParams, rng), [aiParams, rng]);
    const movement = useMemo(() => new EnemyMovement(levelData, CELL_SIZE), [levelData]);

    // Keep track of current state for rendering/debug
    const [currentState, setCurrentState] = useState('patrol');
    const [debugInfo, setDebugInfo] = useState({});

    // --- SENSORY LOGIC ---
    // Helper for AI to check line of sight
    const sightCheck = (start, end) => {
        const dir = new Vector3().subVectors(end, start).normalize();
        const dist = start.distanceTo(end);
        raycaster.set(start, dir);
        const hits = raycaster.intersectObjects(scene.children, true);

        // Debug: Log first few hits
        // if (hits.length > 0) {
        //    console.log('[SightCheck] Hits:', hits.map(h => ({ type: h.object.userData?.type, dist: h.distance, name: h.object.name })));
        // }

        // Return TRUE if NO wall is hit before the target distance
        const blocked = hits.some(hit => {
            const isWall = hit.object.userData?.type === 'wall';
            const isCloser = hit.distance < dist;
            if (isWall && isCloser) {
                // console.log('[SightCheck] Blocked by wall at', hit.distance);
                return true;
            }
            return false;
        });
        return !blocked;
    };

    // --- MAIN LOOP ---
    useFrame((stateCtx, delta) => {
        if (!rigidBodyRef.current || gameState !== 'playing') return;

        const enemyPos = rigidBodyRef.current.translation();
        const enemyVec = new Vector3(enemyPos.x, enemyPos.y, enemyPos.z);

        let playerPos = null;
        let playerVec = null;
        let playerState = { isWalking: false, isSprinting: false, isPanting: false, effectiveBreathRadius: aiParams.breathRadius };

        if (playerRef && playerRef.current) {
            playerPos = playerRef.current.translation();
            playerVec = new Vector3(playerPos.x, playerPos.y, playerPos.z);

            // Calculate player state
            const playerSpeed = new Vector3(playerRef.current.linvel().x, 0, playerRef.current.linvel().z).length();
            const isPanting = playerRef.current.userData?.isPanting || false;
            const isCrouching = playerRef.current.userData?.isCrouching || false;
            const isSprinting = playerSpeed > 6.0;
            const isWalking = playerSpeed > 0.1 && !isSprinting && !isCrouching;

            let effectiveBreathRadius = aiParams.breathRadius;
            if (isPanting) effectiveBreathRadius *= 3.0;

            playerState = { isWalking, isSprinting, isPanting, effectiveBreathRadius };
        }

        // Check Lidar Stimulus
        let stimulus = null;
        const currentTime = performance.now() / 1000;
        const timeSincePulse = currentTime - lastPulseTime;

        // Flag to disable lidar triggering enemy (for now)
        const LIDAR_TRIGGERS_ENEMY = false;

        if (LIDAR_TRIGGERS_ENEMY && timeSincePulse < cooldownDuration) {
            const pulseOrigin = new Vector3(...lastPulseOrigin);
            const distToPulse = enemyVec.distanceTo(pulseOrigin);

            if (distToPulse < aiParams.lidarRange) {
                if (sightCheck(enemyVec, pulseOrigin)) {
                    stimulus = { type: 'LIDAR', pos: pulseOrigin };
                }
            }
        }

        // Check Tremor Stimulus
        if (playerVec) {
            const distToPlayer = enemyVec.distanceTo(playerVec);
            if (playerState.isWalking && distToPlayer < aiParams.tremorRadiusWalk) {
                stimulus = { type: 'TREMOR_FAINT', pos: playerVec };
            }
            if (playerState.isSprinting && distToPlayer < aiParams.tremorRadiusSprint) {
                stimulus = { type: 'TREMOR_LOUD', pos: playerVec };
            }
        }

        // Inject external stimulus (Test Mode)
        if (stimulusQueue && stimulusQueue.length > 0) {
            // Consume one stimulus
            const externalStimulus = stimulusQueue.shift();
            if (externalStimulus) {
                let isValid = false;
                const stimPos = new Vector3(externalStimulus.pos.x, externalStimulus.pos.y, externalStimulus.pos.z);
                const dist = enemyVec.distanceTo(stimPos);

                if (externalStimulus.type === 'LIDAR') {
                    // Check Lidar Range and Occlusion
                    if (dist < aiParams.lidarRange) {
                        if (sightCheck(enemyVec, stimPos)) {
                            isValid = true;
                        } else {
                            console.log('[Enemy] External Lidar blocked by wall.');
                        }
                    } else {
                        console.log('[Enemy] External Lidar out of range.');
                    }
                } else if (externalStimulus.type === 'TREMOR_LOUD' || externalStimulus.type === 'TREMOR_FAINT') {
                    // Check Sound Range (using tremor radius as proxy for now)
                    // TREMOR_LOUD = Sprint (larger radius), TREMOR_FAINT = Walk
                    const range = externalStimulus.type === 'TREMOR_LOUD' ? aiParams.tremorRadiusSprint : aiParams.tremorRadiusWalk;
                    if (dist < range) {
                        isValid = true;
                    } else {
                        console.log('[Enemy] External Sound out of range.');
                    }
                }

                if (isValid) {
                    stimulus = externalStimulus;
                    console.log('[Enemy] External Stimulus Accepted:', stimulus);
                }
            }
        }

        // Update AI State
        const aiResult = ai.update(delta, {
            enemyPos: enemyVec,
            playerPos: playerVec,
            playerState,
            stimulus,
            sightCheck,
            targetOverride
        });

        // Notify parent of target change (Test Mode)
        if (onUpdateTarget && aiResult.targetPosition) {
            onUpdateTarget(aiResult.targetPosition);
        } else if (onUpdateTarget && !aiResult.targetPosition) {
            onUpdateTarget(null);
        }

        // Handle Events
        if (aiResult.events && aiResult.events.length > 0) {
            aiResult.events.forEach(event => {
                if (event === 'playSound:hunt') {
                    playSound('hunt', { position: [enemyPos.x, enemyPos.y, enemyPos.z], intensity: 1.0 });
                }
                // Propagate events to callback (Test Mode)
                if (onAIEvent) {
                    onAIEvent(event);
                }
            });
        }

        // Update local state for rendering
        if (aiResult.state !== currentState) {
            setCurrentState(aiResult.state);
        }

        // Update Movement
        // If no target, try to pick a random patrol/search/investigate point
        if (!aiResult.targetPosition && (aiResult.state === 'patrol' || aiResult.state === 'search' || aiResult.state === 'investigate')) {
            let center = null;
            let radius = Infinity;

            if (aiResult.state === 'search' || aiResult.state === 'investigate') {
                center = enemyPos;
                radius = 15.0; // Search within 15m radius
            }

            const randomTarget = movement.getRandomPatrolPoint(rng, center, radius);
            if (randomTarget) {
                ai.targetPosition = randomTarget; // Hack: Inject back into AI
            }
        }

        const moveResult = movement.update(
            delta,
            enemyVec,
            aiResult.targetPosition,
            aiResult.speed,
            aiResult.shouldMoveDirectly
        );

        // Handle Unreachable/Reached Target (Patrol, Search, Investigate)
        if ((moveResult.pathStatus === 'unreachable' || moveResult.pathStatus === 'complete' || moveResult.pathStatus === 'stuck' || moveResult.reachedTarget)) {

            // Log for debugging
            if (moveResult.pathStatus === 'stuck' || moveResult.pathStatus === 'unreachable') {
                console.log(`[Enemy] Path Status: ${moveResult.pathStatus}. Clearing target.`);
            }

            if (currentState === 'patrol' || currentState === 'search' || currentState === 'investigate' || currentState === 'chase') {
                // Force AI to pick a new target
                ai.targetPosition = null;
            }

            // Notify Test Arena of path completion or failure
            if (onAIEvent) {
                if (moveResult.pathStatus === 'complete') {
                    onAIEvent('PathComplete');
                } else if (moveResult.pathStatus === 'stuck') {
                    onAIEvent('PathStuck');
                } else if (moveResult.pathStatus === 'unreachable') {
                    onAIEvent('PathUnreachable');
                }
            }
        }

        // Apply Velocity
        rigidBodyRef.current.setLinvel({ x: moveResult.velocity.x, y: 0, z: moveResult.velocity.z }, true);

        // Kill Check
        if (playerVec) {
            const killDist = enemyVec.distanceTo(playerVec);
            if (killDist < 2.5) {
                console.log('[Enemy] KILL! Distance:', killDist.toFixed(2));
                playSound('monsterAttack', { position: [enemyPos.x, enemyPos.y, enemyPos.z], intensity: 1.0 });
                setTimeout(() => loseGame(), 100);
                stopSound('hunt');
                playSound('gameOver', { position: [playerPos.x, playerPos.y, playerPos.z], intensity: 1.0 });
                loseGame();
            }
        }

        // Breathing Sound
        if ((Date.now() / 1000) - (rigidBodyRef.current.lastBreathingTime || 0) > 4.0) {
            let breathIntensity = 0.5;
            if (currentState === 'investigate') breathIntensity = 0.7;
            if (currentState === 'chase') breathIntensity = 1.0;
            playSound('monsterBreathing', { position: [enemyPos.x, enemyPos.y, enemyPos.z], intensity: breathIntensity });
            rigidBodyRef.current.lastBreathingTime = Date.now() / 1000;
        }

        // Debug UI
        const debugEl = document.getElementById('enemy-debug-ui');
        if (debugEl) {
            const targetStr = aiResult.targetPosition ? `${aiResult.targetPosition.x.toFixed(1)},${aiResult.targetPosition.z.toFixed(1)}` : 'NONE';
            const enemyStr = `${enemyPos.x.toFixed(1)},${enemyPos.z.toFixed(1)}`;

            let distToTarget = 0;
            if (aiResult.targetPosition) {
                distToTarget = enemyVec.distanceTo(new Vector3(aiResult.targetPosition.x, 0, aiResult.targetPosition.z));
            }
            const distStr = distToTarget.toFixed(1);
            const vel = rigidBodyRef.current.linvel();
            const velStr = `${vel.x.toFixed(1)},${vel.z.toFixed(1)}`;
            const velMag = Math.sqrt(vel.x ** 2 + vel.z ** 2).toFixed(1);

            let waypointInfo = '';
            if (moveResult.path.length > 0) {
                waypointInfo = ` WP: ${moveResult.currentPathIndex}/${moveResult.path.length}`;
            }

            debugEl.innerText = `Enemy: ${currentState.toUpperCase()} [${enemyStr}] -> Tgt: [${targetStr}] Dist: ${distStr}m\nPath: ${waypointInfo} | Vel: [${velStr}] (${velMag} m/s)`;
        }

        // Update Visualizers (Test Mode)
        if (pathLineRef.current) {
            const points = moveResult.path.map(p => new Vector3(p.x, 1, p.z));
            // Add current pos as start
            points.unshift(new Vector3(enemyPos.x, 1, enemyPos.z));
            pathLineRef.current.setPoints(points);
        }
    });

    // Color based on state
    const getColor = () => {
        switch (currentState) {
            case 'chase': return '#ff0000';
            case 'investigate': return '#ff8800';
            case 'search': return '#ff00ff'; // Purple for search
            default: return '#ffff00';
        }
    };

    // Debug Visuals Refs
    const pathLineRef = useRef();

    // Calculate if enemy should be visible (when lidar is active or in chase mode)
    const [isVisible, setIsVisible] = useState(false);
    const { debugLights } = useGame();
    const lastVisibleTime = useRef(0);
    const LIDAR_VISIBILITY_DURATION = 2.0; // Visible for 2 seconds after lidar hit

    useFrame(() => {
        const currentTime = performance.now() / 1000;
        const timeSincePulse = currentTime - lastPulseTime;

        // Check if lidar just hit
        if (timeSincePulse < 0.1) {
            lastVisibleTime.current = currentTime;
        }

        const timeSinceVisible = currentTime - lastVisibleTime.current;
        const isLidarVisible = timeSinceVisible < LIDAR_VISIBILITY_DURATION;

        // Visible if: debug lights ON, in chase mode, or recently hit by lidar
        setIsVisible(debugLights || currentState === 'chase' || isLidarVisible);
    });

    return (
        <RigidBody
            ref={rigidBodyRef}
            position={spawnPosition}
            colliders={false}
            enabledRotations={[false, false, false]}
            type="kinematicVelocity"
            lockRotations
        >
            <CuboidCollider args={[ENEMY_SIZE / 2, ENEMY_HEIGHT / 2, ENEMY_SIZE / 2]} position={[0, ENEMY_HEIGHT / 2, 0]} />

            {isVisible && (
                <>
                    {/* Enemy Label - Always faces camera */}
                    <Billboard position={[0, ENEMY_HEIGHT + 1, 0]}>
                        <Text
                            fontSize={0.5}
                            color="red"
                            anchorX="center"
                            anchorY="middle"
                        >
                            ENEMY
                        </Text>
                    </Billboard>

                    {/* 3D Model Visual Overlay */}
                    <EnemyModel position={[0, 0, 0]} />

                    {/* Debug Visuals */}
                    {aiParams.showDebug && (
                        <>
                            {/* Path Line */}
                            <Line ref={pathLineRef} color="red" lineWidth={2} />

                            {/* Sensory Spheres */}
                            <mesh position={[0, ENEMY_HEIGHT / 2, 0]}>
                                <sphereGeometry args={[aiParams.tremorRadiusWalk, 16, 16]} />
                                <meshBasicMaterial color="yellow" wireframe transparent opacity={0.2} />
                            </mesh>
                            <mesh position={[0, ENEMY_HEIGHT / 2, 0]}>
                                <sphereGeometry args={[aiParams.tremorRadiusSprint, 16, 16]} />
                                <meshBasicMaterial color="orange" wireframe transparent opacity={0.2} />
                            </mesh>
                            <mesh position={[0, ENEMY_HEIGHT / 2, 0]}>
                                <sphereGeometry args={[aiParams.lidarRange, 16, 16]} />
                                <meshBasicMaterial color="cyan" wireframe transparent opacity={0.1} />
                            </mesh>
                        </>
                    )}
                </>
            )}
        </RigidBody>
    );
};

// Enemy 3D Model Component
function EnemyModel({ position }) {
    const { scene } = useGLTF('/models/enemy.glb');
    return (
        <primitive
            object={scene.clone()}
            position={position}
            scale={[0.5, 0.5, 0.5]}
        />
    );
}

// Preload the model
useGLTF.preload('/models/enemy.glb');

export default Enemy;
