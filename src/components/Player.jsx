import React, { useRef, useEffect, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { Vector3 } from 'three';
import { useNoise } from '../contexts/NoiseContext';
import { useGame } from '../contexts/GameContext';
import { useScanner } from '../contexts/ScannerContext';

const WALK_SPEED = 5;
const CROUCH_SPEED = 2.5;
const SPRINT_SPEED = 10;

// Noise rates per second
const CROUCH_NOISE = 0;
const WALK_NOISE = 5;
const SPRINT_NOISE = 15;
const CLAP_NOISE = 30; // Instant noise from clapping

const Player = ({ startPosition = [0, 1.5, 0], playerRef }) => {
    const { camera } = useThree();
    const rigidBodyRef = useRef();
    const { setMovementNoise, addNoise } = useNoise();
    const { gameState, toggleDebugLights } = useGame();
    const { emitPulse } = useScanner();

    // Expose rigidBodyRef to parent
    React.useEffect(() => {
        if (playerRef) {
            playerRef.current = rigidBodyRef.current;
        }
    }, [playerRef]);

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

    useFrame((state) => {
        if (!rigidBodyRef.current) return;

        // Stop movement if game is not playing
        if (gameState !== 'playing') {
            rigidBodyRef.current.setLinvel({ x: 0, y: rigidBodyRef.current.linvel().y, z: 0 });
            return;
        }

        // Determine current speed based on state
        let currentSpeed = WALK_SPEED;
        let noiseRate = WALK_NOISE;

        if (isCrouching) {
            currentSpeed = CROUCH_SPEED;
            noiseRate = CROUCH_NOISE;
        } else if (isSprinting) {
            currentSpeed = SPRINT_SPEED;
            noiseRate = SPRINT_NOISE;
        }

        // Get camera forward vector projected on XZ plane
        const camForward = new Vector3();
        camera.getWorldDirection(camForward);
        camForward.y = 0;
        camForward.normalize();

        const camRight = new Vector3();
        camRight.crossVectors(camForward, new Vector3(0, 1, 0));

        // Combine movement vectors
        const moveVec = new Vector3();
        moveVec.addScaledVector(camForward, Number(moveForward.current) - Number(moveBackward.current));
        moveVec.addScaledVector(camRight, Number(moveRight.current) - Number(moveLeft.current));

        const isMoving = moveVec.length() > 0;
        if (isMoving) {
            moveVec.normalize().multiplyScalar(currentSpeed);
        }

        // Update noise system
        setMovementNoise(noiseRate, isMoving);

        // Apply velocity
        const currentVel = rigidBodyRef.current.linvel();
        rigidBodyRef.current.setLinvel({ x: moveVec.x, y: currentVel.y, z: moveVec.z });

        // Sync camera to rigid body
        const pos = rigidBodyRef.current.translation();
        const cameraHeight = isCrouching ? 0.75 : 1.5;
        camera.position.set(pos.x, pos.y + cameraHeight, pos.z);

        // Update debug UI
        const debugEl = document.getElementById('debug-pos');
        if (debugEl) {
            const state = isCrouching ? '(Crouch)' : isSprinting ? '(Sprint)' : '';
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
            <PointerLockControls />
        </>
    );
};

export default Player;
