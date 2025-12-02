import React, { useRef, useEffect, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { Vector3 } from 'three';
import { useNoise } from '../contexts/NoiseContext';
import { useGame } from '../contexts/GameContext';
import { useScanner } from '../contexts/ScannerContext';
import { useAudio } from '../contexts/AudioContext';

const WALK_SPEED = 5;
const CROUCH_SPEED = 2.5;
const SPRINT_SPEED = 10;

// Noise rates per second
const CROUCH_NOISE = 0;
const WALK_NOISE = 5;
const SPRINT_NOISE = 15;
const CLAP_NOISE = 30; // Instant noise from clapping
const PLAYER_HEIGHT = 1.5;
const JUMP_FORCE = 5;

const Player = ({ startPosition = [0, 1.5, 0], playerRef }) => {
    const { camera } = useThree();
    const rigidBodyRef = useRef();
    const { setMovementNoise, addNoise } = useNoise();
    const { gameState, toggleDebugLights } = useGame();
    const { emitPulse } = useScanner();
    const { playSound } = useAudio();

    // Stamina System
    const [stamina, setStamina] = useState(100);
    const [isPanting, setIsPanting] = useState(false);
    const pantingTimer = useRef(0);

    // Expose rigidBodyRef to parent
    React.useEffect(() => {
        console.log(`[Player] Initializing with startPosition:`, startPosition);
        if (playerRef) {
            playerRef.current = rigidBodyRef.current;
        }
        if (rigidBodyRef.current) {
            const pos = rigidBodyRef.current.translation();
            console.log(`[Player] RigidBody Initial Pos:`, pos);
        }
    }, [playerRef, startPosition]);

    // Movement state
    const moveForward = useRef(false);
    const moveBackward = useRef(false);
    const moveLeft = useRef(false);
    const moveRight = useRef(false);
    const [isCrouching, setIsCrouching] = useState(false);
    const [isSprinting, setIsSprinting] = useState(false);

    // Temporary vectors
    const direction = useRef(new Vector3());
    const frontVector = useRef(new Vector3());
    const sideVector = useRef(new Vector3());

    // Refs for latest state/functions to avoid stale closures in event listeners
    const gameStateRef = useRef(gameState);
    const toggleDebugLightsRef = useRef(toggleDebugLights);
    const emitPulseRef = useRef(emitPulse);
    const addNoiseRef = useRef(addNoise);
    const lastFootstepTime = useRef(0);

    useEffect(() => {
        gameStateRef.current = gameState;
        toggleDebugLightsRef.current = toggleDebugLights;
        emitPulseRef.current = emitPulse;
        addNoiseRef.current = addNoise;
    }, [gameState, toggleDebugLights, emitPulse, addNoise]);

    useEffect(() => {
        const onKeyDown = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW': moveForward.current = true; break;
                case 'ArrowLeft':
                case 'KeyA': moveLeft.current = true; break;
                case 'ArrowDown':
                case 'KeyS': moveBackward.current = true; break;
                case 'ArrowRight':
                case 'KeyD': moveRight.current = true; break;
                case 'ShiftLeft':
                case 'ShiftRight': setIsCrouching(true); break;
                case 'ControlLeft':
                case 'ControlRight': setIsSprinting(true); break;
                case 'KeyL':
                    console.log('[Player] KeyL pressed, calling toggleDebugLights');
                    if (toggleDebugLightsRef.current) toggleDebugLightsRef.current();
                    break;
                case 'Space':
                    // Sonar/Scanner pulse
                    if (rigidBodyRef.current && gameStateRef.current === 'playing') {
                        const pos = rigidBodyRef.current.translation();
                        const type = event.shiftKey ? 1 : 0;

                        const success = emitPulseRef.current([pos.x, pos.y, pos.z], type);
                        if (success) {
                            addNoiseRef.current(CLAP_NOISE);
                            // Play sonar sound at player position
                            playSound('clap', {
                                position: [pos.x, pos.y, pos.z],
                                listenerPosition: [pos.x, pos.y, pos.z],
                                intensity: 1.0
                            });
                            console.log(`Sonar! Pulse emitted at ${pos.x}, ${pos.y}, ${pos.z} with type ${type}`);
                        }
                    }
                    break;
            }
        };

        const onKeyUp = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW': moveForward.current = false; break;
                case 'ArrowLeft':
                case 'KeyA': moveLeft.current = false; break;
                case 'ArrowDown':
                case 'KeyS': moveBackward.current = false; break;
                case 'ArrowRight':
                case 'KeyD': moveRight.current = false; break;
                case 'ShiftLeft':
                case 'ShiftRight': setIsCrouching(false); break;
                case 'ControlLeft':
                case 'ControlRight': setIsSprinting(false); break;
            }
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup', onKeyUp);
        };
    }, []);

    useFrame((state, delta) => {
        if (!rigidBodyRef.current) return;

        // Stop movement if game is not playing
        if (gameState !== 'playing') {
            if (rigidBodyRef.current) {
                rigidBodyRef.current.setLinvel({ x: 0, y: rigidBodyRef.current.linvel().y, z: 0 });
            }
            return;
        }

        // Movement logic
        const forward = moveForward.current;
        const backward = moveBackward.current;
        const left = moveLeft.current;
        const right = moveRight.current;

        // Stamina Logic
        let canSprint = stamina > 0;
        // If exhausted (hit 0), require 20 stamina to sprint again
        if (stamina <= 0) {
            // We handle this by checking if we are currently panting
            // If panting, we can't sprint until panting stops
        }

        // Actual sprint state depends on input AND stamina
        const attemptingSprint = isSprinting;
        const actualSprint = attemptingSprint && canSprint && !isPanting;

        const crouch = isCrouching;
        const jump = false;

        // Update Stamina
        if (actualSprint) {
            setStamina(prev => Math.max(0, prev - (20 * delta))); // Drain 20/sec
            if (stamina <= 0) {
                setIsPanting(true);
                pantingTimer.current = 3.0; // Pant for 3 seconds
            }
        } else {
            // Recover
            setStamina(prev => Math.min(100, prev + (10 * delta))); // Recover 10/sec

            // Handle Panting Timer
            if (isPanting) {
                pantingTimer.current -= delta;
                if (pantingTimer.current <= 0 && stamina > 20) {
                    setIsPanting(false);
                }
            }
        }

        // Expose Panting State to Enemy via userData
        if (rigidBodyRef.current) {
            rigidBodyRef.current.userData = {
                ...rigidBodyRef.current.userData,
                isPanting: isPanting,
                isCrouching: isCrouching
            };
        }

        // Determine current speed and noise
        let currentSpeed = WALK_SPEED;
        let noiseRate = WALK_NOISE;

        if (crouch) {
            currentSpeed = CROUCH_SPEED;
            noiseRate = CROUCH_NOISE;
        } else if (actualSprint) {
            currentSpeed = SPRINT_SPEED;
            noiseRate = SPRINT_NOISE;
        }

        // Calculate movement direction relative to camera
        const direction = new Vector3();
        const frontVector = new Vector3(0, 0, Number(backward) - Number(forward));
        const sideVector = new Vector3(Number(left) - Number(right), 0, 0);

        direction.subVectors(frontVector, sideVector).normalize().multiplyScalar(currentSpeed).applyEuler(camera.rotation);

        rigidBodyRef.current.setLinvel({ x: direction.x, y: rigidBodyRef.current.linvel().y, z: direction.z });

        // Jump
        if (jump && Math.abs(rigidBodyRef.current.linvel().y) < 0.1) {
            rigidBodyRef.current.setLinvel({ x: rigidBodyRef.current.linvel().x, y: JUMP_FORCE, z: rigidBodyRef.current.linvel().z });
        }

        // Update noise system
        const isMoving = forward || backward || left || right;
        setMovementNoise(noiseRate, isMoving);

        // Update camera position to follow player
        const pos = rigidBodyRef.current.translation();
        const cameraHeight = crouch ? 0.75 : PLAYER_HEIGHT;
        camera.position.set(pos.x, pos.y + cameraHeight, pos.z);

        // Footstep sounds - different for each movement type
        const currentTime = performance.now() / 1000;
        let footstepInterval;
        let footstepVolume;

        if (crouch) {
            footstepInterval = 0.8;  // Slower for crouch
            footstepVolume = 0.15;   // Quieter for crouch
        } else if (actualSprint) {
            footstepInterval = 0.3;  // Faster for sprint
            footstepVolume = 0.4;    // Louder for sprint
        } else {
            footstepInterval = 0.5;  // Normal walk
            footstepVolume = 0.25;   // Normal volume
        }

        if (isMoving && currentTime - lastFootstepTime.current > footstepInterval) {
            playSound('playerWalk', {
                position: [pos.x, pos.y, pos.z],
                listenerPosition: [pos.x, pos.y, pos.z],
                intensity: footstepVolume
            });
            lastFootstepTime.current = currentTime;
        }

        // Noise generation based on movement
        if (isMoving) {
            let noiseRate = 0;

            if (crouch) {
                // Crouching is SILENT - no noise generation
                noiseRate = 0;
            } else if (actualSprint) {
                // Sprinting is VERY LOUD
                noiseRate = 15; // per second
            } else {
                // Normal walking
                noiseRate = 2; // per second
            }

            setMovementNoise(noiseRate, isMoving);
        } else {
            setMovementNoise(0, false);
        }

        // Update debug UI
        const debugEl = document.getElementById('debug-ui');
        if (debugEl) {
            const state = crouch ? '(Crouch)' : actualSprint ? '(Sprint)' : isPanting ? '(Panting)' : '';
            debugEl.innerText = `Pos: ${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)} ${state} Stamina: ${Math.floor(stamina)}%`;
        }
    });

    return (
        <>
            <RigidBody
                ref={rigidBodyRef}
                position={startPosition}
                colliders={false}
                enabledRotations={[false, false, false]}
                type="dynamic"
                lockRotations
                canSleep={false}
                gravityScale={1}
            >
                <CapsuleCollider args={[0.75, 0.5]} />
            </RigidBody>
            <PointerLockControls
                maxPolarAngle={Math.PI / 2}  // Lock camera at horizon (no looking up)
                minPolarAngle={Math.PI / 2}  // Lock camera at horizon (no looking down)
                selector="#root" // Ensure it re-locks correctly
            />
        </>
    );
};

export default Player;
