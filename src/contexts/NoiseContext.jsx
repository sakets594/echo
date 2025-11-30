import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const NoiseContext = createContext();

export const useNoise = () => {
    const context = useContext(NoiseContext);
    if (!context) {
        throw new Error('useNoise must be used within NoiseProvider');
    }
    return context;
};

export const NoiseProvider = ({ children }) => {
    const [noiseLevel, setNoiseLevel] = useState(0);
    const [isMoving, setIsMoving] = useState(false);
    const [currentNoiseRate, setCurrentNoiseRate] = useState(0);

    // Decay noise over time (-10 per second when not moving)
    useEffect(() => {
        const interval = setInterval(() => {
            setNoiseLevel((prev) => {
                if (isMoving) {
                    // Add noise based on current movement
                    const newNoise = Math.min(100, prev + currentNoiseRate / 10); // Update 10 times per second
                    return newNoise;
                } else {
                    // Decay when stationary
                    const newNoise = Math.max(0, prev - 1); // -10 per second (called 10 times/sec)
                    return newNoise;
                }
            });
        }, 100); // 10 times per second

        return () => clearInterval(interval);
    }, [isMoving, currentNoiseRate]);

    const addNoise = useCallback((amount) => {
        setNoiseLevel((prev) => Math.min(100, prev + amount));
    }, []);

    const setMovementNoise = useCallback((rate, moving) => {
        setCurrentNoiseRate(rate);
        setIsMoving(moving);
    }, []);

    const value = {
        noiseLevel,
        addNoise,
        setMovementNoise,
    };

    return <NoiseContext.Provider value={value}>{children}</NoiseContext.Provider>;
};
