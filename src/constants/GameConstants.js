export const GAME_CONFIG = {
    CELL_SIZE: 3,
    WALL_HEIGHT: 5,
    PLAYER_HEIGHT: 1.5,
    TRANSITION_DELAY: 3000,
};

export const UI_TEXT = {
    TITLE: "ECHO",
    SUBTITLE: "A Lidar Horror Game",
    OBJECTIVES: [
        "Find the Access Token",
        "Locate the Escape Route",
        "Avoid the Entities"
    ],
    CONTROLS: [
        { key: "WASD / Arrows", action: "Move" },
        { key: "Mouse", action: "Look" },
        { key: "Shift", action: "Crouch (Quiet)" },
        { key: "Ctrl", action: "Sprint (Loud)" },
        { key: "Space", action: "Sonar Ping" },
        { key: "Esc", action: "Pause Game" }
    ],
    LEGEND: [
        { color: "#FFD700", label: "Access Token" },
        { color: "#00FF00", label: "Escape Route" },
        { color: "#8B0000", label: "Locked Door" }
    ]
};

export const COLORS = {
    TOKEN: "#FFD700",
    ESCAPE: "#00FF00",
    LOCKED: "#8B0000",
    WALL: "#888888",
    FLOOR: "#222222",
    PILLAR: "#555555",
    DEBRIS: "#654321",
    CEILING: "#111111"
};
