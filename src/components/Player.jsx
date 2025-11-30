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
                    // Clap/Scanner pulse
                    if (rigidBodyRef.current && gameStateRef.current === 'playing') {
                        const pos = rigidBodyRef.current.translation();
                        const type = event.shiftKey ? 1 : 0;

                        const success = emitPulseRef.current([pos.x, pos.y, pos.z], type);
                        if (success) {
                            addNoiseRef.current(CLAP_NOISE);
                            // Play clap sound at player position
                            playSound('clap', {
                                position: [pos.x, pos.y, pos.z],
                                listenerPosition: [pos.x, pos.y, pos.z],
                                intensity: 1.0
                            });
                            console.log(`Clap! Pulse emitted at ${pos.x}, ${pos.y}, ${pos.z} with type ${type}`);
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

    useFrame(() => {
        if (!rigidBodyRef.current) return;

        // Stop movement if game is not playing
        if (gameState !== 'playing') {
            rigidBodyRef.current.setLinvel({ x: 0, y: rigidBodyRef.current.linvel().y, z: 0 });
            return;
        }

        // Movement logic
        const forward = moveForward.current;
        const backward = moveBackward.current;
        const left = moveLeft.current;
        const right = moveRight.current;
        const sprint = isSprinting;
        const crouch = isCrouching;
        const jump = false; // Space is used for Clap, so no jump for now

        // Determine current speed and noise
        let currentSpeed = WALK_SPEED;
        let noiseRate = WALK_NOISE;

        if (crouch) {
            currentSpeed = CROUCH_SPEED;
            noiseRate = CROUCH_NOISE;
        } else if (sprint) {
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

        // Footstep sounds
        const currentTime = Date.now() / 1000;

        // Adjust intervals for the new audio file
        let footstepInterval = 0.6; // Default walk
        let footstepIntensity = 0.5; // Default walk

        if (sprint) {
            footstepInterval = 0.35;
            footstepIntensity = 0.8;
        } else if (crouch) {
            footstepInterval = 0.8; // Slower for crouch
            footstepIntensity = 0.2; // Very quiet
        }

        if (isMoving && currentTime - lastFootstepTime.current > footstepInterval) {
            playSound('playerWalk', {
                position: [pos.x, pos.y, pos.z],
                listenerPosition: [pos.x, pos.y, pos.z],
                intensity: footstepIntensity
            });
            lastFootstepTime.current = currentTime;

            // Generate noise based on movement
            const noiseAmount = sprint ? 20 : (crouch ? 2 : 5);
            addNoise(noiseAmount);
        }

        // Update debug UI
        const debugEl = document.getElementById('debug-ui');
        if (debugEl) {
            const state = crouch ? '(Crouch)' : sprint ? '(Sprint)' : '';
            debugEl.innerText = `Pos: ${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)} ${state}`;
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
            />
        </>
    );
};

export default Player;
