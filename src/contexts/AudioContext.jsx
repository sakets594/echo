import React, { createContext, useContext, useRef, useCallback, useEffect } from 'react';

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
    const soundBuffersRef = useRef({});

    // Initialize Web Audio API context
    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioContextRef.current;
    }, []);

    // Load external sounds
    useEffect(() => {
        const loadSounds = async () => {
            try {
                const ctx = getAudioContext();
                const sounds = {
                    'monsterBreathing': '/sounds/monster_breathing.mp3',
                    'playerWalk': '/sounds/player_walk.mp3',
                    'gameOver': '/sounds/game_over.mp3'
                };

                for (const [key, url] of Object.entries(sounds)) {
                    const response = await fetch(url);
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                    soundBuffersRef.current[key] = audioBuffer;
                }

                // Map aliases
                soundBuffersRef.current['hunt'] = soundBuffersRef.current['monsterBreathing'];

                console.log("All audio assets loaded");
            } catch (error) {
                console.error("Failed to load audio assets:", error);
            }
        };
        loadSounds();
    }, [getAudioContext]);

    // Generate procedural sound buffers (only for remaining procedural sounds)
    const generateSoundBuffer = useCallback((type) => {
        // If we have a loaded buffer for this type, return it
        if (soundBuffersRef.current[type]) {
            return soundBuffersRef.current[type];
        }

        const ctx = getAudioContext();
        const sampleRate = ctx.sampleRate;
        let buffer;

        switch (type) {
            case 'clap': {
                // Soothing wave sound (gentle sine wave with reverb-like effect)
                const duration = 0.4; // 400ms for more soothing feel
                buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
                const data = buffer.getChannelData(0);
                const baseFreq = 440; // A4 note
                for (let i = 0; i < data.length; i++) {
                    const t = i / sampleRate;
                    const decay = Math.exp(-t * 5); // Slower decay for soothing effect
                    // Multiple harmonics for richer sound
                    const wave1 = Math.sin(2 * Math.PI * baseFreq * t);
                    const wave2 = Math.sin(2 * Math.PI * baseFreq * 2 * t) * 0.3;
                    const wave3 = Math.sin(2 * Math.PI * baseFreq * 3 * t) * 0.15;
                    data[i] = (wave1 + wave2 + wave3) * decay * 0.3;
                }
                break;
            }

            case 'footstep': {
                // Enemy footstep - deep crunch with noise texture
                const duration = 0.2; // 200ms
                buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < data.length; i++) {
                    const t = i / sampleRate;
                    const decay = Math.exp(-t * 8);
                    // Heavy crunch: low frequency thump + noise
                    const thump = Math.sin(2 * Math.PI * 60 * t) * 0.4;
                    const crunch = (Math.random() * 2 - 1) * 0.6;
                    // Add some mid-frequency for scuff sound
                    const scuff = Math.sin(2 * Math.PI * 200 * t) * 0.2;
                    data[i] = (thump + crunch + scuff) * decay * 0.5;
                }
                break;
            }

            case 'debris': {
                // Collision/debris sound (short noise burst with low frequency component)
                const duration = 0.2; // 200ms
                buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < data.length; i++) {
                    const t = i / sampleRate;
                    const decay = Math.exp(-t * 12);
                    // Mix of noise and low frequency for impact sound
                    const noise = (Math.random() * 2 - 1) * 0.5;
                    const impact = Math.sin(2 * Math.PI * 60 * t) * 0.3;
                    data[i] = (noise + impact) * decay * 0.25;
                }
                break;
            }

            default:
                return null;
        }

        soundBuffersRef.current[type] = buffer;
        return buffer;
    }, [getAudioContext]);

    // Calculate wall occlusion (simple distance-based approximation)
    const calculateOcclusion = useCallback((distance) => {
        // If distance is large, assume walls might be in between
        // This is a simplified approach - a proper implementation would use raycasting
        if (distance > 15) {
            return 0.5; // Muffled
        }
        return 1.0; // Clear
    }, []);

    // Track active sound sources for stopping them later
    const activeSourcesRef = useRef({});

    // Stop a specific sound type
    const stopSound = useCallback((type) => {
        if (activeSourcesRef.current[type]) {
            try {
                activeSourcesRef.current[type].stop();
                activeSourcesRef.current[type] = null;
            } catch (e) {
                // Ignore errors if already stopped
            }
        }
    }, []);

    // Play spatial sound
    const playSound = useCallback((type, options = {}) => {
        const {
            position = [0, 0, 0],
            intensity = 1.0,
            listenerPosition = [0, 0, 0],
            loop = false, // Add loop option
        } = options;

        const ctx = getAudioContext();

        // Resume context if suspended (browser autoplay policy)
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        // Get or generate sound buffer
        let buffer = soundBuffersRef.current[type];
        if (!buffer) {
            buffer = generateSoundBuffer(type);
        }
        if (!buffer) return;

        // Create audio nodes
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = loop; // Set loop property

        // Store source for stopping later if needed
        if (type === 'monsterBreathing' || type === 'hunt') {
            activeSourcesRef.current[type] = source;
        }

        const gainNode = ctx.createGain();
        const panner = ctx.createPanner();

        // Configure panner for spatial audio
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'linear';
        panner.refDistance = 1;

        // Different max distances for different sound types
        // Monster sounds (footstep, hunt) have shorter range for more localized fear
        const maxDistance = (type === 'footstep' || type === 'hunt' || type === 'monsterBreathing') ? 15 : 30;
        panner.maxDistance = maxDistance;
        panner.rolloffFactor = 1;

        // Set positions
        panner.setPosition(position[0], position[1], position[2]);
        ctx.listener.setPosition(listenerPosition[0], listenerPosition[1], listenerPosition[2]);

        // Calculate distance-based volume
        const distance = Math.sqrt(
            (position[0] - listenerPosition[0]) ** 2 +
            (position[1] - listenerPosition[1]) ** 2 +
            (position[2] - listenerPosition[2]) ** 2
        );

        const distanceAttenuation = Math.max(0, 1 - distance / maxDistance);
        const occlusionFactor = calculateOcclusion(distance);
        const finalVolume = distanceAttenuation * occlusionFactor * intensity;

        gainNode.gain.value = finalVolume;

        // Connect nodes: source -> panner -> gain -> destination
        source.connect(panner);
        panner.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Play sound
        source.start(0);

        // Cleanup
        source.onended = () => {
            source.disconnect();
            panner.disconnect();
            gainNode.disconnect();
            if (activeSourcesRef.current[type] === source) {
                activeSourcesRef.current[type] = null;
            }
        };

        return source;
    }, [getAudioContext, generateSoundBuffer, calculateOcclusion]);

    const value = {
        playSound,
        stopSound,
    };

    return (
        <AudioContext.Provider value={value}>
            {children}
        </AudioContext.Provider>
    );
};
