import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

const InputContext = createContext();

export const useInput = () => useContext(InputContext);

export const InputProvider = ({ children }) => {
    // We use refs for real-time access in the game loop (useFrame)
    // to avoid re-renders and closure staleness
    const inputState = useRef({
        forward: false,
        backward: false,
        left: false,
        right: false,
        crouch: false,
        sprint: false,
        jump: false,
        sonar: false,
        sonarType: 0, // 0 = normal, 1 = loud/focused
        moveVector: { x: 0, y: 0 }, // For analog input (Joystick)
        lookVector: { x: 0, y: 0 } // For camera look
    });

    // We also expose a way to subscribe to one-off events like "sonar"
    // or we can just let the Player check the flag and reset it?
    // Resetting flags in the loop is a common pattern.

    // Helper to update state safely
    const setInput = (key, value) => {
        inputState.current[key] = value;
    };

    useEffect(() => {
        const onKeyDown = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW': setInput('forward', true); break;
                case 'ArrowLeft':
                case 'KeyA': setInput('left', true); break;
                case 'ArrowDown':
                case 'KeyS': setInput('backward', true); break;
                case 'ArrowRight':
                case 'KeyD': setInput('right', true); break;
                case 'ShiftLeft':
                case 'ShiftRight': setInput('crouch', true); break;
                case 'ControlLeft':
                case 'ControlRight': setInput('sprint', true); break;
                case 'Space':
                    setInput('sonar', true);
                    setInput('sonarType', event.shiftKey ? 1 : 0);
                    break;
            }
        };

        const onKeyUp = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW': setInput('forward', false); break;
                case 'ArrowLeft':
                case 'KeyA': setInput('left', false); break;
                case 'ArrowDown':
                case 'KeyS': setInput('backward', false); break;
                case 'ArrowRight':
                case 'KeyD': setInput('right', false); break;
                case 'ShiftLeft':
                case 'ShiftRight': setInput('crouch', false); break;
                case 'ControlLeft':
                case 'ControlRight': setInput('sprint', false); break;
                case 'Space':
                    setInput('sonar', false);
                    break;
            }
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup', onKeyUp);
        };
    }, []);

    // Function for Mobile Controls to update state
    const updateInput = (key, value) => {
        setInput(key, value);
    };

    // Function to consume one-off actions (like sonar)
    // Returns true if action was active, and resets it
    const consumeAction = (action) => {
        if (inputState.current[action]) {
            inputState.current[action] = false;
            return true;
        }
        return false;
    };

    const value = {
        inputState,
        updateInput,
        consumeAction
    };

    return (
        <InputContext.Provider value={value}>
            {children}
        </InputContext.Provider>
    );
};
