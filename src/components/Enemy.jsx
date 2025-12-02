import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Vector3, Raycaster } from 'three';
import { useNoise } from '../contexts/NoiseContext';
import { useGame } from '../contexts/GameContext';
import { useAudio } from '../contexts/AudioContext';
import { useScanner } from '../contexts/ScannerContext';
import { findPath, getRandomWalkableTile } from '../utils/pathfinding';
import { GAME_CONFIG, DEFAULT_AI_CONFIG } from '../constants/GameConstants';
import { useControls } from 'leva';
import { SeededRandom } from '../utils/SeededRandom';

const ENEMY_HEIGHT = 2.5;
const ENEMY_SIZE = 1;
const { CELL_SIZE } = GAME_CONFIG;

const Enemy = ({ spawnPosition, playerRef, enemyRef, levelData, aiConfig = {}, seed }) => {
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
    });

    // AI State
    const [state, setState] = useState('patrol'); // 'patrol', 'investigate', 'chase', 'search'
    const [targetPosition, setTargetPosition] = useState(null); // Start with null to force initial selection
    const [lastKnownPosition, setLastKnownPosition] = useState(null);

    // Timers & Counters
    const stateTimer = useRef(0); // Generic timer for current state
    const frustrationTimer = useRef(0); // How long we've been investigating
    const inertiaTimer = useRef(0); // Min chase duration
    const searchTimer = useRef(0); // How long we've been searching

    // Pathfinding state
    const [path, setPath] = useState([]);
    const [currentPathIndex, setCurrentPathIndex] = useState(0);
    const lastPathCalculationTime = useRef(0);
    const lastTargetPosForPath = useRef(new Vector3());

    // Stuck detection
    const lastPosition = useRef(new Vector3(...spawnPosition));
    const lastPositionCheckTime = useRef(0);

    // --- SENSORY LOGIC ---
    const checkSenses = (enemyPos, playerPos, dt) => {
        if (!playerRef.current) return null;

        const distToPlayer = enemyPos.distanceTo(playerPos);
        const playerVel = playerRef.current.linvel ? playerRef.current.linvel() : { x: 0, y: 0, z: 0 };
        const playerSpeed = Math.sqrt(playerVel.x ** 2 + playerVel.z ** 2);
        const currentTime = performance.now() / 1000;

        // Check Player State (from userData)
        const isPanting = playerRef.current.userData?.isPanting || false;
        const isCrouching = playerRef.current.userData?.isCrouching || false;
        const isSprinting = playerSpeed > 6.0; // Threshold for sprint
        const isWalking = playerSpeed > 0.1 && !isSprinting && !isCrouching; // Walking = moving but NOT sprinting and NOT crouching

        // 1. Lidar Pulse (Pain)
        // Check if a pulse happened recently and we are in range
        const timeSincePulse = currentTime - lastPulseTime;
        if (timeSincePulse < cooldownDuration) {
            const pulseOrigin = new Vector3(...lastPulseOrigin);
            const distToPulse = enemyPos.distanceTo(pulseOrigin);

            console.log(`[Enemy] Lidar check: timeSince=${timeSincePulse.toFixed(2)}s, dist=${distToPulse.toFixed(2)}m, range=${aiParams.lidarRange}m`);

            // Check if we're in range AND have line of sight to pulse origin
            if (distToPulse < aiParams.lidarRange) {
                // Raycast to check for occlusion
                const direction = pulseOrigin.clone().sub(enemyPos).normalize();
                raycaster.set(enemyPos, direction);
                const intersects = raycaster.intersectObjects(scene.children, true);

                console.log(`[Enemy] Lidar in range! Checking ${intersects.length} intersections`);

                // Filter out non-wall intersections
                const wallHit = intersects.find(hit => {
                    const hitDist = hit.distance;
                    const isWall = hit.object.userData?.type === 'wall';
                    const isCloser = hitDist < distToPulse;

                    if (isWall && isCloser) {
                        console.log(`[Enemy] Wall blocks lidar: ${hit.object.name}, dist=${hitDist.toFixed(2)}`);
                    }

                    return hitDist < distToPulse && isWall;
                });

                if (!wallHit) {
                    // Clear line of sight - enemy detects the pulse
                    console.log('[Enemy] Lidar pulse detected! Entering CHASE. Distance:', distToPulse.toFixed(2));
                    setState('chase');
                    setTargetPosition(pulseOrigin.clone());
                    setPath([]);
                } else {
                    console.log('[Enemy] Lidar pulse blocked by wall');
                }
            } else {
                console.log(`[Enemy] Lidar out of range: ${distToPulse.toFixed(2)}m > ${aiParams.lidarRange}m`);
            }
        } // 2. Global Noise (Clap / Loud Sprint)
        // If noise level is high, we hear it regardless of distance (within reason)
        if (noiseLevel > 50) {
            // If very loud (Clap is 30, Sprint is 15, so > 50 implies accumulation or loud event)
            // Actually, Clap adds 30 instantly. If base is 0, it becomes 30. 
            // If sprinting (15/sec), it goes up.
            // Let's check if noiseLevel is significant.
            // If noise > 20 (Sprinting or Clapping), we should investigate.
            // If noise > 80 (Very loud), we chase.

            // However, noiseLevel is global. We need position.
            // We assume noise comes from player.
            const dist = enemyPos.distanceTo(playerPos);
            if (dist < aiParams.clapSoundRadius) { // 20m default
                if (noiseLevel > 80) return { type: 'TREMOR_LOUD', pos: playerPos };
                return { type: 'TREMOR_FAINT', pos: playerPos };
            }
        }

        // 3. Tremors (Sprinting)
        if (isSprinting) {
            // Earthquakes are felt everywhere (or very far)
            return { type: 'TREMOR_LOUD', pos: playerPos };
        }

        // 4. Tremors (Walking)
        if (isWalking && distToPlayer < aiParams.tremorRadiusWalk) {
            return { type: 'TREMOR_FAINT', pos: playerPos };
        }

        // 5. Breath / Proximity
        let effectiveBreathRadius = aiParams.breathRadius;
        if (isPanting) effectiveBreathRadius *= 3.0; // Panting expands radius

        if (distToPlayer < effectiveBreathRadius) {
            // Check Occlusion (Raycast)
            const dirToPlayer = new Vector3().subVectors(playerPos, enemyPos).normalize();
            raycaster.set(enemyPos, dirToPlayer);
            const hits = raycaster.intersectObjects(scene.children, true);

            // Filter hits to ignore Enemy itself and triggers
            // Simple check: if first hit is close and NOT player, it's a wall
            // Note: In Rapier/Three integration, raycasting against visual meshes might hit walls.
            // We assume walls have meshes.

            // For now, simpler check: if dist is VERY close (<1m), ignore occlusion (bumped into)
            if (distToPlayer < 1.0) return { type: 'BREATH', pos: playerPos };

            // Otherwise, we assume if we are this close and nothing blocking, we detect
            // TODO: Implement proper wall layer check if needed. 
            // For now, let's assume Breath passes through thin obstacles or just use distance
            // to keep it simple and deadly.
            return { type: 'BREATH', pos: playerPos };
        }

        return null;
    };

    // --- STATE MACHINE ---
    useFrame((stateCtx, delta) => {
        if (!rigidBodyRef.current || !playerRef.current || gameState !== 'playing') return;

        const enemyPos = rigidBodyRef.current.translation();
        const enemyVec = new Vector3(enemyPos.x, enemyPos.y, enemyPos.z);
        const playerPos = playerRef.current.translation();
        const playerVec = new Vector3(playerPos.x, playerPos.y, playerPos.z);

        // 1. Update Senses
        const stimulus = checkSenses(enemyVec, playerVec, delta);

        // 2. State Transitions
        let nextState = state;
        let nextTarget = targetPosition;

        // Global Triggers
        if (stimulus) {
            if (stimulus.type === 'LIDAR' || stimulus.type === 'TREMOR_LOUD' || stimulus.type === 'BREATH') {
                // Instant Chase
                nextState = 'chase';
                setLastKnownPosition(stimulus.pos);
                inertiaTimer.current = aiParams.inertiaTime; // Reset inertia
            } else if (stimulus.type === 'TREMOR_FAINT') {
                // Investigate if not already chasing
                if (state !== 'chase') {
                    nextState = 'investigate';
                    setLastKnownPosition(stimulus.pos);
                } else {
                    // If chasing, update LKP
                    setLastKnownPosition(stimulus.pos);
                }
            }
        }

        // State Logic
        switch (state) {
            case 'patrol':
                // Random walking. 
                // Transition handled by Global Triggers above.
                break;

            case 'investigate':
                frustrationTimer.current += delta;
                if (frustrationTimer.current > aiParams.frustrationTime) {
                    // Frustrated -> Chase
                    console.log('[Enemy] Frustrated! Switching to Chase.');
                    nextState = 'chase';
                    inertiaTimer.current = aiParams.inertiaTime;
                }
                // If we reached LKP and found nothing -> Search
                if (lastKnownPosition && enemyVec.distanceTo(lastKnownPosition) < 1.5) {
                    nextState = 'search';
                    searchTimer.current = config.timers.search;
                }
                break;

            case 'chase':
                inertiaTimer.current -= delta;
                // If we reached LKP
                if (lastKnownPosition && enemyVec.distanceTo(lastKnownPosition) < 1.5) {
                    // If we still see/feel player (stimulus), keep chasing (LKP updates)
                    // If NO stimulus and Inertia expired -> Search
                    if (!stimulus && inertiaTimer.current <= 0) {
                        nextState = 'search';
                        searchTimer.current = config.timers.search;
                    }
                }
                break;

            case 'search':
                searchTimer.current -= delta;
                if (searchTimer.current <= 0) {
                    // Give up -> Patrol
                    nextState = 'patrol';
                    setLastKnownPosition(null);
                }
                break;
        }

        // Apply State Change
        if (nextState !== state) {
            console.log(`[Enemy] State: ${state} -> ${nextState}`);
            setState(nextState);
            setPath([]); // Clear path to force immediate recalculation
            stateTimer.current = 0;
            frustrationTimer.current = 0;

            // Play sounds on transition
            if (nextState === 'chase') {
                playSound('hunt', { position: [enemyPos.x, enemyPos.y, enemyPos.z], intensity: 1.0 });
            }
        }

        // 3. Target Selection
        let speed = aiParams.patrolSpeed;

        if (state === 'chase') {
            speed = aiParams.huntSpeed;
            if (lastKnownPosition) nextTarget = lastKnownPosition;
        } else if (state === 'investigate') {
            speed = aiParams.investigateSpeed;
            if (lastKnownPosition) nextTarget = lastKnownPosition;
        } else if (state === 'search') {
            speed = aiParams.investigateSpeed;
            // Pick random point near LKP every few seconds
            stateTimer.current += delta;
            if (stateTimer.current > 2.0) {
                const randomTile = getRandomWalkableTile(levelData.layout, levelData.legend, CELL_SIZE);
                if (randomTile) {
                    // Bias towards LKP? For now just random is fine for "confused search"
                    setTargetPosition(randomTile);
                    stateTimer.current = 0;
                }
            }
            // Use current targetPosition
            nextTarget = targetPosition;
        } else { // Patrol
            speed = aiParams.patrolSpeed;

            // If no target set yet (initial spawn), force selection
            if (!targetPosition) {
                console.log('[Enemy] No target on spawn, selecting initial patrol target');
                const initialTarget = getRandomWalkableTile(levelData.layout, levelData.legend, CELL_SIZE, rng);
                if (initialTarget) {
                    setTargetPosition(initialTarget);
                    nextTarget = initialTarget;
                } else {
                    console.error('[Enemy] Failed to find initial patrol target!');
                    // Use spawn position as fallback
                    nextTarget = new Vector3(...spawnPosition);
                }
            } else {
                const dist = enemyVec.distanceTo(targetPosition);

                // Debug Patrol Logic
                // console.log(`[Enemy] Patrol: Dist=${dist.toFixed(2)} PathLen=${path.length}`);

                if (dist < 1.0 || path.length === 0) {
                    // Try to find a random walkable tile that's reasonably far away
                    let attempts = 0;
                    let randomTile = null;

                    while (attempts < 10) {
                        const tile = getRandomWalkableTile(levelData.layout, levelData.legend, CELL_SIZE, rng);
                        if (tile) {
                            const distToTile = enemyVec.distanceTo(tile);
                            // Require minimum distance of 6m to avoid picking adjacent tiles
                            if (distToTile > 6.0) {
                                randomTile = tile;
                                break;
                            }
                        }
                        attempts++;
                    }

                    if (randomTile) {
                        console.log(`[Enemy] Patrol: New Random Target Selected: ${randomTile.x.toFixed(1)}, ${randomTile.z.toFixed(1)}`);
                        setTargetPosition(randomTile);
                    } else {
                        console.warn('[Enemy] Patrol: Failed to find random walkable tile far enough away!');
                        // Fallback: just pick any walkable tile
                        const fallback = getRandomWalkableTile(levelData.layout, levelData.legend, CELL_SIZE, rng);
                        if (fallback) setTargetPosition(fallback);
                    }
                }
                nextTarget = targetPosition;
            }
        }

        // 4. Pathfinding & Movement (Simplified from previous)
        const distToLastTarget = nextTarget.distanceTo(lastTargetPosForPath.current);
        const timeSinceLastCalc = (Date.now() / 1000) - lastPathCalculationTime.current;

        if (path.length === 0 || (distToLastTarget > 2.0 && timeSinceLastCalc > 0.5)) {
            if (!levelData || !levelData.layout) {
                console.warn('[Enemy] Missing levelData or layout!', levelData);
            } else {
                const newPath = findPath(enemyVec, nextTarget, levelData.layout, levelData.legend, CELL_SIZE);
                if (newPath.length > 0) {
                    console.log(`[Enemy] Path found! Length: ${newPath.length} State: ${state}`);
                    setPath(newPath);
                    setCurrentPathIndex(0);
                    lastTargetPosForPath.current.copy(nextTarget);
                    lastPathCalculationTime.current = Date.now() / 1000;
                } else {
                    console.warn(`[Enemy] No path found from ${enemyVec.toArray()} to ${nextTarget.toArray()}`);
                }
            }
        }
        // Execute Move
        if (path.length > 0 && currentPathIndex < path.length) {
            const nextWaypoint = path[currentPathIndex];
            const dir = new Vector3(nextWaypoint.x - enemyPos.x, 0, nextWaypoint.z - enemyPos.z);
            const distToWaypoint = dir.length();

            // Use enemy's size as threshold - if center is within ENEMY_SIZE distance,
            // the enemy's body is overlapping the waypoint, so advance
            const reachThreshold = ENEMY_SIZE; // 1m for ENEMY_SIZE=1

            if (distToWaypoint < reachThreshold) {
                console.log(`[Enemy] Reached waypoint ${currentPathIndex}/${path.length} (dist=${distToWaypoint.toFixed(2)} < ${reachThreshold}), advancing`);
                const nextIndex = currentPathIndex + 1;

                // If this was the last waypoint, clear the path and stop
                if (nextIndex >= path.length) {
                    console.log(`[Enemy] Reached final waypoint, stopping`);
                    setPath([]);
                    setCurrentPathIndex(0);
                    rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
                } else {
                    setCurrentPathIndex(nextIndex);
                }
            } else {
                const velocity = dir.normalize().multiplyScalar(speed);
                console.log(`[Enemy] Moving to waypoint ${currentPathIndex}: vel=[${velocity.x.toFixed(1)}, ${velocity.z.toFixed(1)}] dist=${distToWaypoint.toFixed(2)}`);
                rigidBodyRef.current.setLinvel({ x: velocity.x, y: 0, z: velocity.z }, true);

                // Rotation (Look at)
                // TODO: Smooth rotation
            }
        } else {
            // console.log('[Enemy] No path to follow, stopping.');
            rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        }

        // 5. Kill Condition
        const killDist = enemyVec.distanceTo(playerVec);
        if (killDist < 5.0) {
            // console.log(`[Enemy] Distance to player: ${killDist.toFixed(2)}`);
        }

        // Increased from 1.5 to account for collider sizes
        if (killDist < 2.5) {
            console.log('[Enemy] Player killed!');
            stopSound('monsterBreathing');
            stopSound('hunt');
            playSound('gameOver', { position: [playerPos.x, playerPos.y, playerPos.z], intensity: 1.0 });
            loseGame();
        }

        // 6. Breathing Sound
        if ((Date.now() / 1000) - (rigidBodyRef.current.lastBreathingTime || 0) > 4.0) {
            let breathIntensity = 0.5;
            if (state === 'investigate') breathIntensity = 0.7;
            if (state === 'chase') breathIntensity = 1.0;
            playSound('monsterBreathing', { position: [enemyPos.x, enemyPos.y, enemyPos.z], intensity: breathIntensity });
            rigidBodyRef.current.lastBreathingTime = Date.now() / 1000;
        }

        // Debug UI
        const debugEl = document.getElementById('enemy-debug-ui');
        if (debugEl) {
            const targetStr = targetPosition ? `${targetPosition.x.toFixed(1)},${targetPosition.z.toFixed(1)}` : 'NONE';
            const enemyStr = `${enemyPos.x.toFixed(1)},${enemyPos.z.toFixed(1)}`;
            const distStr = killDist.toFixed(1);

            // Get current velocity
            const vel = rigidBodyRef.current.linvel();
            const velStr = `${vel.x.toFixed(1)},${vel.z.toFixed(1)}`;
            const velMag = Math.sqrt(vel.x ** 2 + vel.z ** 2).toFixed(1);

            // Get distance to next waypoint if path exists
            let waypointInfo = '';
            if (path.length > 0 && currentPathIndex < path.length) {
                const nextWaypoint = path[currentPathIndex];
                const distToWaypoint = Math.sqrt(
                    (nextWaypoint.x - enemyPos.x) ** 2 +
                    (nextWaypoint.z - enemyPos.z) ** 2
                );
                waypointInfo = ` WP_Dist: ${distToWaypoint.toFixed(1)}m`;
            }

            debugEl.innerText = `Enemy: ${state.toUpperCase()} [${enemyStr}] -> Tgt: [${targetStr}] Dist: ${distStr}m\nPath: ${currentPathIndex}/${path.length}${waypointInfo} | Vel: [${velStr}] (${velMag} m/s)`;
        }
    });

    // Color based on state
    const getColor = () => {
        switch (state) {
            case 'chase': return '#ff0000';
            case 'investigate': return '#ff8800';
            case 'search': return '#ff00ff'; // Purple for search
            default: return '#ffff00';
        }
    };

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
            <mesh position={[0, ENEMY_HEIGHT / 2, 0]}>
                <boxGeometry args={[ENEMY_SIZE, ENEMY_HEIGHT, ENEMY_SIZE]} />
                <meshStandardMaterial color={getColor()} emissive={getColor()} emissiveIntensity={0.5} />
            </mesh>
        </RigidBody>
    );
};

export default Enemy;
