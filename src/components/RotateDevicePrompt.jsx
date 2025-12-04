import React, { useEffect, useState } from 'react';

const RotateDevicePrompt = () => {
    const [isPortrait, setIsPortrait] = useState(false);

    useEffect(() => {
        const checkOrientation = () => {
            // Check if height > width (portrait)
            // And also check if it's likely a mobile device (touch capable or small screen)
            const isMobile = window.matchMedia("(max-width: 900px)").matches ||
                ('ontouchstart' in window) ||
                (navigator.maxTouchPoints > 0);

            if (isMobile && window.innerHeight > window.innerWidth) {
                setIsPortrait(true);
            } else {
                setIsPortrait(false);
            }
        };

        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        return () => window.removeEventListener('resize', checkOrientation);
    }, []);

    if (!isPortrait) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontFamily: 'monospace',
            textAlign: 'center',
            padding: '20px'
        }}>
            <div style={{
                fontSize: '4rem',
                marginBottom: '20px',
                animation: 'rotate 2s infinite ease-in-out'
            }}>
                ↻
            </div>
            <h2 style={{ marginBottom: '10px' }}>PLEASE ROTATE DEVICE</h2>
            <p style={{ color: '#aaa' }}>This game is designed for landscape mode.</p>

            <style>{`
                @keyframes rotate {
                    0% { transform: rotate(0deg); }
                    25% { transform: rotate(90deg); }
                    100% { transform: rotate(90deg); }
                }
            `}</style>
        </div>
    );
};

export default RotateDevicePrompt;
