import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
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
        searchDuration: { value: 10, min: 5, max: 30 }, // Added searchDuration control
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

        // Return TRUE if NO wall is hit before the target distance
        return !hits.some(hit => hit.distance < dist && hit.object.userData?.type === 'wall');
    };

    // --- MAIN LOOP ---
    useFrame((stateCtx, delta) => {
        if (!rigidBodyRef.current || !playerRef.current || gameState !== 'playing') return;

        const enemyPos = rigidBodyRef.current.translation();
        const enemyVec = new Vector3(enemyPos.x, enemyPos.y, enemyPos.z);
        const playerPos = playerRef.current.translation();
        const playerVec = new Vector3(playerPos.x, playerPos.y, playerPos.z);

        // Calculate player state
        const playerSpeed = new Vector3(playerRef.current.linvel().x, 0, playerRef.current.linvel().z).length();
        const isPanting = playerRef.current.userData?.isPanting || false;
        const isCrouching = playerRef.current.userData?.isCrouching || false;
        const isSprinting = playerSpeed > 6.0;
        const isWalking = playerSpeed > 0.1 && !isSprinting && !isCrouching;

        let effectiveBreathRadius = aiParams.breathRadius;
        if (isPanting) effectiveBreathRadius *= 3.0;

        const playerState = { isWalking, isSprinting, isPanting, effectiveBreathRadius };

        // Check Lidar Stimulus
        let stimulus = null;
        const currentTime = performance.now() / 1000;
        const timeSincePulse = currentTime - lastPulseTime;

        if (timeSincePulse < cooldownDuration) {
            const pulseOrigin = new Vector3(...lastPulseOrigin);
            const distToPulse = enemyVec.distanceTo(pulseOrigin);

            if (distToPulse < aiParams.lidarRange) {
                if (sightCheck(enemyVec, pulseOrigin)) {
                    stimulus = { type: 'LIDAR', pos: pulseOrigin };
                }
            }
        }

        // Check Tremor Stimulus
        const distToPlayer = enemyVec.distanceTo(playerVec);
        if (isWalking && distToPlayer < aiParams.tremorRadiusWalk) {
            stimulus = { type: 'TREMOR_FAINT', pos: playerVec };
        }
        if (isSprinting && distToPlayer < aiParams.tremorRadiusSprint) {
            stimulus = { type: 'TREMOR_LOUD', pos: playerVec };
        }

        // Update AI State
        const aiResult = ai.update(delta, {
            enemyPos: enemyVec,
            playerPos: playerVec,
            playerState,
            stimulus,
            sightCheck
        });

        // Handle Events
        if (aiResult.events && aiResult.events.length > 0) {
            aiResult.events.forEach(event => {
                if (event === 'playSound:hunt') {
                    playSound('hunt', { position: [enemyPos.x, enemyPos.y, enemyPos.z], intensity: 1.0 });
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
        if ((moveResult.pathStatus === 'unreachable' || moveResult.pathStatus === 'complete' || moveResult.reachedTarget)) {
            if (currentState === 'patrol' || currentState === 'search' || currentState === 'investigate') {
                console.log(`[Enemy] Target ${moveResult.pathStatus} in ${currentState}, picking new target.`);
                ai.targetPosition = null;

                // For Search/Investigate, we might want to explicitly trigger a new random point immediately
                // The AI loop (EnemyAI.js) doesn't automatically pick a new point for Search unless we tell it to?
                // Actually, in Enemy.jsx line 152, we only check `if (!aiResult.targetPosition && aiResult.state === 'patrol')`.
                // We need to add 'search' and 'investigate' there too if we want random movement.
            }
        }

        // Apply Velocity
        rigidBodyRef.current.setLinvel({ x: moveResult.velocity.x, y: 0, z: moveResult.velocity.z }, true);

        // Kill Check
        const killDist = enemyVec.distanceTo(playerVec);
        if (killDist < 2.5) {
            console.log('[Enemy] KILL! Distance:', killDist.toFixed(2));
            playSound('monsterAttack', { position: [enemyPos.x, enemyPos.y, enemyPos.z], intensity: 1.0 });
            setTimeout(() => loseGame(), 100);
            stopSound('hunt');
            playSound('gameOver', { position: [playerPos.x, playerPos.y, playerPos.z], intensity: 1.0 });
            loseGame();
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
