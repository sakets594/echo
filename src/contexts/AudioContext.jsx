import React, { createContext, useContext, useRef, useCallback } from 'react';

const AudioContext = createContext();

export const useAudio = () => {
    const context = useContext(AudioContext);
    if (!context) {
        throw new Error('useAudio must be used within AudioProvider');
    }
    return context;
};

export const AudioProvider = ({ children }) => {
    const audioContextRef = useRef(null);
    const soundsRef = useRef({});

    // Initialize audio context on first interaction
    const initAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioContextRef.current;
    }, []);

    // Create a simple beep/click sound synthetically
    const createClapSound = useCallback(() => {
        const ctx = initAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Sharp click/clap sound
        oscillator.frequency.value = 800;
        oscillator.type = 'square';

        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
    }, [initAudioContext]);

    // Create footstep sound
    const createFootstepSound = useCallback(() => {
        const ctx = initAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Low thud sound
        oscillator.frequency.value = 100;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.15);
    }, [initAudioContext]);

    // Create hunt/aggressive sound
    const createHuntSound = useCallback(() => {
        const ctx = initAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Growl-like sound
        oscillator.frequency.value = 60;
        oscillator.type = 'sawtooth';

        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
    }, [initAudioContext]);

    const playSound = useCallback((soundName, options = {}) => {
        try {
            switch (soundName) {
                case 'clap':
                    createClapSound();
                    break;
                case 'footstep':
                    createFootstepSound();
                    break;
                case 'hunt':
                    createHuntSound();
                    break;
                default:
                    console.warn(`Unknown sound: ${soundName}`);
            }
        } catch (error) {
            console.error('Error playing sound:', error);
        }
    }, [createClapSound, createFootstepSound, createHuntSound]);

    const value = {
        playSound,
    };

    return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
};
