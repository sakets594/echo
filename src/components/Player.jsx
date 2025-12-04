import React, { useRef, useEffect, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { Vector3 } from 'three';
import { useNoise } from '../contexts/NoiseContext';
import { useGame } from '../contexts/GameContext';
import { useScanner } from '../contexts/ScannerContext';
import { useAudio } from '../contexts/AudioContext';
import { useInput } from '../contexts/InputContext';

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
    const { inputState, consumeAction } = useInput();

    // Stamina System
    const [stamina, setStamina] = useState(100);
    const [isPanting, setIsPanting] = useState(false);
    const pantingTimer = useRef(0);
    const lastFootstepTime = useRef(0);

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

    // Input handling is now managed by InputContext
    // We keep KeyL for debug locally for now, or we could move it to InputContext if needed
    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.code === 'KeyL') {
                console.log('[Player] KeyL pressed, calling toggleDebugLights');
                toggleDebugLights();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [toggleDebugLights]);

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
        // Movement logic
        const { forward, backward, left, right, crouch, sprint, sonar, sonarType, moveVector } = inputState.current;

        // Stamina Logic
        let canSprint = stamina > 0;
        // If exhausted (hit 0), require 20 stamina to sprint again
        if (stamina <= 0) {
            // We handle this by checking if we are currently panting
            // If panting, we can't sprint until panting stops
        }

        // Actual sprint state depends on input AND stamina
        // Actual sprint state depends on input AND stamina
        const attemptingSprint = sprint;
        const actualSprint = attemptingSprint && canSprint && !isPanting;

        const isCrouching = crouch;

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

        let fwdValue = Number(backward) - Number(forward);
        let sideValue = Number(left) - Number(right);

        // If joystick is active, override keys
        if (moveVector && (Math.abs(moveVector.x) > 0.05 || Math.abs(moveVector.y) > 0.05)) {
            fwdValue = moveVector.y;
            sideValue = -moveVector.x;
        }

        const frontVector = new Vector3(0, 0, fwdValue);
        const sideVector = new Vector3(sideValue, 0, 0);

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

        // Handle Look (Mobile)
        const { lookVector } = inputState.current;
        if (lookVector.x !== 0 || lookVector.y !== 0) {
            const SENSITIVITY = 0.005;
            camera.rotation.y -= lookVector.x * SENSITIVITY;
            // Lock vertical look (pitch) to 0 (horizontal)
            // camera.rotation.x -= lookVector.y * SENSITIVITY;
            // camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
            camera.rotation.x = 0;

            // Reset look vector
            inputState.current.lookVector = { x: 0, y: 0 };
        }

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
            console.log('[Player] Playing walk sound, volume:', footstepVolume);
            playSound('playerWalk', {
                intensity: footstepVolume * 2, // Increase volume
                spatial: false // Make it non-spatial so it always plays
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

        // Handle Sonar Pulse
        if (sonar && rigidBodyRef.current) {
            // We need to consume the action so it doesn't fire every frame
            if (consumeAction('sonar')) {
                const pos = rigidBodyRef.current.translation();
                const type = sonarType; // 0 or 1

                const success = emitPulse([pos.x, pos.y, pos.z], type);
                if (success) {
                    addNoise(CLAP_NOISE);
                    playSound('clap', {
                        position: [pos.x, pos.y, pos.z],
                        listenerPosition: [pos.x, pos.y, pos.z],
                        intensity: 1.0
                    });
                }
            }
        }
    });

    // Check if mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 900;

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
            {!isMobile && (
                <PointerLockControls
                    maxPolarAngle={Math.PI / 2}  // Lock camera at horizon (no looking up)
                    minPolarAngle={Math.PI / 2}  // Lock camera at horizon (no looking down)
                    selector="#root" // Ensure it re-locks correctly
                />
            )}
        </>
    );
};

export default Player;
