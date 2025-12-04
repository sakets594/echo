import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useAudio } from '../contexts/AudioContext';
import { useGame } from '../contexts/GameContext';

const HeartbeatSystem = ({ playerRef, enemyRef }) => {
    const { playSound } = useAudio();
    const { gameState } = useGame();
    const lastBeatTime = useRef(0);
    const vignetteRef = useRef(null);

    // Constants
    const SAFE_DISTANCE = 25;
    const CAUTION_DISTANCE = 10;
    const MIN_BPM = 20; // Reduced from 50
    const MAX_BPM = 80; // Reduced from 140

    useEffect(() => {
        // Get reference to the vignette DOM element
        vignetteRef.current = document.getElementById('heartbeat-vignette');

        // Cleanup on unmount
        return () => {
            if (vignetteRef.current) {
                vignetteRef.current.style.opacity = '0';
            }
        };
    }, []);

    useFrame((state) => {
        if (gameState !== 'playing' || !playerRef?.current || !enemyRef?.current || !vignetteRef.current) {
            if (vignetteRef.current) vignetteRef.current.style.opacity = '0';
            return;
        }

        const playerPos = playerRef.current.translation();
        const enemyPos = enemyRef.current.translation();

        // Calculate distance
        const distance = Math.sqrt(
            Math.pow(playerPos.x - enemyPos.x, 2) +
            Math.pow(playerPos.y - enemyPos.y, 2) +
            Math.pow(playerPos.z - enemyPos.z, 2)
        );

        // Determine Zone and Intensity (0 to 1)
        let intensity = 0;
        let isDanger = false;

        if (distance > SAFE_DISTANCE) {
            // Safe Zone
            intensity = 0;
        } else if (distance > CAUTION_DISTANCE) {
            // Caution Zone (Blue)
            // Map distance (25 -> 10) to intensity (0 -> 0.5)
            intensity = 0.5 * (1 - (distance - CAUTION_DISTANCE) / (SAFE_DISTANCE - CAUTION_DISTANCE));
            isDanger = false;
        } else {
            // Danger Zone (Red)
            // Map distance (10 -> 0) to intensity (0.5 -> 1.0)
            intensity = 0.5 + 0.5 * (1 - distance / CAUTION_DISTANCE);
            isDanger = true;
        }

        // Update Visual Vignette
        if (intensity > 0) {
            vignetteRef.current.style.opacity = Math.min(intensity * 1.5, 0.8).toString(); // Cap opacity

            if (isDanger) {
                // Red vignette
                vignetteRef.current.style.background = `radial-gradient(circle, transparent 50%, rgba(139, 0, 0, ${intensity}) 90%)`;
            } else {
                // Blue vignette
                vignetteRef.current.style.background = `radial-gradient(circle, transparent 50%, rgba(0, 0, 139, ${intensity}) 90%)`;
            }
        } else {
            vignetteRef.current.style.opacity = '0';
        }

        // Audio Heartbeat Logic
        if (intensity > 0) {
            // Calculate BPM based on intensity
            const bpm = MIN_BPM + (MAX_BPM - MIN_BPM) * intensity;
            const beatInterval = 60 / bpm;
            const currentTime = state.clock.getElapsedTime();

            if (currentTime - lastBeatTime.current > beatInterval) {
                // Play heartbeat sound (thump-thump)
                // We play two sounds slightly offset to simulate a heartbeat
                playSound('heartbeat', { intensity: intensity * 0.1, spatial: false }); // 10% volume

                setTimeout(() => {
                    playSound('heartbeat', { intensity: intensity * 0.15, spatial: false }); // 15% volume
                }, 100); // 100ms delay for second beat

                lastBeatTime.current = currentTime;

                // Visual Pulse (optional, subtle scale or opacity bump)
                if (vignetteRef.current) {
                    const currentOpacity = parseFloat(vignetteRef.current.style.opacity || 0);
                    vignetteRef.current.style.opacity = (currentOpacity + 0.1).toString();
                    setTimeout(() => {
                        if (vignetteRef.current) vignetteRef.current.style.opacity = currentOpacity.toString();
                    }, 100);
                }
            }
        }
    });

    return null; // Logic only component
};

export default HeartbeatSystem;
