import React, { useState, useRef, useEffect } from 'react';
import { useInput } from '../contexts/InputContext';

const Joystick = ({ onMove, size = 100 }) => {
    const wrapperRef = useRef(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [active, setActive] = useState(false);
    const touchId = useRef(null);

    const radius = size / 2;
    const knobSize = size / 3;

    const handleStart = (e) => {
        // Prevent default to stop scrolling/zooming
        // e.preventDefault(); // React synthetic events might be too late, but we'll try.
        // Actually, best to attach non-passive listener if possible, but for now:

        const touch = e.changedTouches[0];
        touchId.current = touch.identifier;
        setActive(true);
        updatePosition(touch.clientX, touch.clientY);
    };

    const handleMove = (e) => {
        if (!active) return;
        const touch = Array.from(e.changedTouches).find(t => t.identifier === touchId.current);
        if (touch) {
            updatePosition(touch.clientX, touch.clientY);
        }
    };

    const handleEnd = (e) => {
        const touch = Array.from(e.changedTouches).find(t => t.identifier === touchId.current);
        if (touch) {
            setActive(false);
            setPosition({ x: 0, y: 0 });
            onMove(0, 0);
            touchId.current = null;
        }
    };

    const updatePosition = (clientX, clientY) => {
        if (!wrapperRef.current) return;
        const rect = wrapperRef.current.getBoundingClientRect();
        const centerX = rect.left + radius;
        const centerY = rect.top + radius;

        let dx = clientX - centerX;
        let dy = clientY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > radius) {
            const angle = Math.atan2(dy, dx);
            dx = Math.cos(angle) * radius;
            dy = Math.sin(angle) * radius;
        }

        setPosition({ x: dx, y: dy });

        // Normalize to -1..1
        const normX = dx / radius;
        const normY = dy / radius;
        onMove(normX, normY);
    };

    return (
        <div
            ref={wrapperRef}
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                position: 'relative',
                touchAction: 'none'
            }}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
            onTouchCancel={handleEnd}
        >
            <div
                style={{
                    width: knobSize,
                    height: knobSize,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.8)',
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`,
                    pointerEvents: 'none'
                }}
            />
        </div>
    );
};

const ActionButton = ({ label, onPress, onRelease, color = 'rgba(255, 255, 255, 0.2)' }) => {
    const [pressed, setPressed] = useState(false);

    const handleStart = (e) => {
        e.preventDefault();
        setPressed(true);
        onPress();
    };

    const handleEnd = (e) => {
        e.preventDefault();
        setPressed(false);
        onRelease();
    };

    return (
        <button
            onTouchStart={handleStart}
            onTouchEnd={handleEnd}
            onMouseDown={handleStart} // For mouse testing
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: pressed ? 'rgba(255, 255, 255, 0.5)' : color,
                border: '2px solid rgba(255, 255, 255, 0.4)',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
                touchAction: 'none',
                cursor: 'pointer'
            }}
        >
            {label}
        </button>
    );
};

const TouchPad = ({ onMove }) => {
    const lastPos = useRef(null);
    const touchId = useRef(null);

    const handleStart = (e) => {
        const touch = e.changedTouches[0];
        touchId.current = touch.identifier;
        lastPos.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleMove = (e) => {
        if (lastPos.current === null) return;
        const touch = Array.from(e.changedTouches).find(t => t.identifier === touchId.current);
        if (touch) {
            const dx = touch.clientX - lastPos.current.x;
            const dy = touch.clientY - lastPos.current.y;
            onMove(dx, dy);
            lastPos.current = { x: touch.clientX, y: touch.clientY };
        }
    };

    const handleEnd = (e) => {
        const touch = Array.from(e.changedTouches).find(t => t.identifier === touchId.current);
        if (touch) {
            lastPos.current = null;
            touchId.current = null;
        }
    };

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                touchAction: 'none'
            }}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
            onTouchCancel={handleEnd}
        />
    );
};

const MobileControls = () => {
    const { updateInput, inputState } = useInput();

    const handleLook = (dx, dy) => {
        // Accumulate look vector? Or just set it?
        // Player consumes it, so we can just add to it if multiple events fire per frame?
        // Or just set it. Since Player resets it every frame, setting it is fine.
        // But if we have multiple move events between frames, we should accumulate.
        if (inputState.current) {
            inputState.current.lookVector.x += dx;
            inputState.current.lookVector.y += dy;
        }
    };

    return (
        <>
            {/* Look Area - Right half of screen */}
            <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '50%',
                height: '100%',
                zIndex: 9999, // Below buttons
            }}>
                <TouchPad onMove={handleLook} />
            </div>

            <div style={{
                position: 'absolute',
                bottom: 30,
                left: 30,
                right: 30,
                height: 120,
                pointerEvents: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                zIndex: 10000
            }}>
                <div style={{ pointerEvents: 'auto' }}>
                    <Joystick size={120} onMove={(x, y) => updateInput('moveVector', { x, y })} />
                </div>

                <div style={{ pointerEvents: 'auto', position: 'relative', width: '140px', height: '140px', marginBottom: '20px' }}>
                    {/* Top Center - SONAR */}
                    <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)' }}>
                        <ActionButton
                            label="SONAR"
                            color="rgba(0, 255, 255, 0.3)"
                            onPress={() => {
                                updateInput('sonar', true);
                                updateInput('sonarType', 0);
                            }}
                            onRelease={() => updateInput('sonar', false)}
                        />
                    </div>

                    {/* Bottom Left - CROUCH */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0 }}>
                        <ActionButton
                            label="CROUCH"
                            onPress={() => updateInput('crouch', true)}
                            onRelease={() => updateInput('crouch', false)}
                        />
                    </div>

                    {/* Bottom Right - SPRINT */}
                    <div style={{ position: 'absolute', bottom: 0, right: 0 }}>
                        <ActionButton
                            label="SPRINT"
                            onPress={() => updateInput('sprint', true)}
                            onRelease={() => updateInput('sprint', false)}
                        />
                    </div>
                </div>
            </div>
        </>
    );
};

export default MobileControls;
