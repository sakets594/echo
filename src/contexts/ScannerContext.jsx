import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ScannerContext = createContext();

export const useScanner = () => {
    const context = useContext(ScannerContext);
    if (!context) {
        throw new Error('useScanner must be used within ScannerProvider');
    }
    return context;
};

export const ScannerProvider = ({ children }) => {
    const [lastPulseTime, setLastPulseTime] = useState(-1000);
    const [lastPulseOrigin, setLastPulseOrigin] = useState([0, 0, 0]);
    const [lastPulseType, setLastPulseType] = useState(0); // 0 = Brightness+Pulse, 1 = Pulse Only
    const [cooldownRemaining, setCooldownRemaining] = useState(0);

    const COOLDOWN = 1.5; // seconds

    const emitPulse = useCallback((origin, type = 0) => {
        const now = performance.now() / 1000; // Convert to seconds
        const timeSinceLastPulse = now - lastPulseTime;

        if (timeSinceLastPulse >= COOLDOWN) {
            setLastPulseTime(now);
            setLastPulseOrigin(origin);
            setLastPulseType(type);
            setCooldownRemaining(COOLDOWN);
            return true; // Pulse emitted successfully
        }
        return false; // Still on cooldown
    }, [lastPulseTime, COOLDOWN]);

    // Update cooldown remaining
    React.useEffect(() => {
        if (cooldownRemaining <= 0) return;

        const interval = setInterval(() => {
            const now = performance.now() / 1000;
            const remaining = Math.max(0, COOLDOWN - (now - lastPulseTime));
            setCooldownRemaining(remaining);
        }, 100);

        return () => clearInterval(interval);
    }, [cooldownRemaining, lastPulseTime, COOLDOWN]);

    const value = {
        lastPulseTime,
        lastPulseOrigin,
        lastPulseType,
        cooldownRemaining,
        cooldownDuration: COOLDOWN,
        emitPulse,
    };

    return <ScannerContext.Provider value={value}>{children}</ScannerContext.Provider>;
};
