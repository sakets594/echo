import fs from 'fs';
import path from 'path';
import LevelValidator from './validate_levels.js';

const LEVELS = [
    { id: 1, name: "The Awakening", width: 15, height: 10, enemies: 1, debris: 0, pillars: 2 },
    { id: 2, name: "First Steps", width: 15, height: 12, enemies: 1, debris: 2, pillars: 3 },
    { id: 3, name: "The Corridor", width: 20, height: 12, enemies: 1, debris: 5, pillars: 4 },
    { id: 4, name: "Shadows", width: 20, height: 15, enemies: 2, debris: 5, pillars: 5 },
    { id: 5, name: "Debris Field", width: 20, height: 15, enemies: 2, debris: 15, pillars: 3 },
    { id: 6, name: "The Maze", width: 25, height: 20, enemies: 2, debris: 10, pillars: 8 },
    { id: 7, name: "Surrounded", width: 25, height: 20, enemies: 3, debris: 10, pillars: 10 },
    { id: 8, name: "Claustrophobia", width: 20, height: 20, enemies: 3, debris: 5, pillars: 15 },
    { id: 9, name: "The Gauntlet", width: 30, height: 25, enemies: 4, debris: 20, pillars: 10 },
    { id: 10, name: "Echo Chamber", width: 30, height: 30, enemies: 5, debris: 25, pillars: 15 }
];

const validator = new LevelValidator();

function generateLevel(config) {
    const { width, height } = config;
    let grid = Array(height).fill().map(() => Array(width).fill('#'));

    // Helper to set cell
    const set = (x, y, char) => {
        if (x >= 1 && x < width - 1 && y >= 1 && y < height - 1) {
            grid[y][x] = char;
        }
    };

    // 1. Carve Rooms & Corridors (Random Walk / Drunkard's Walk)
    let floorCount = 0;
    const targetFloor = Math.floor(width * height * 0.4); // 40% floor
    let x = Math.floor(width / 2);
    let y = Math.floor(height / 2);

    while (floorCount < targetFloor) {
        if (grid[y][x] === '#') {
            grid[y][x] = '.';
            floorCount++;
        }
        const dir = Math.floor(Math.random() * 4);
        const dx = [0, 0, 1, -1][dir];
        const dy = [1, -1, 0, 0][dir];

        let nx = x + dx;
        let ny = y + dy;

        if (nx >= 1 && nx < width - 1 && ny >= 1 && ny < height - 1) {
            x = nx;
            y = ny;
        }
    }

    // Ensure connectivity (Flood fill and connect islands? Random walk usually makes one island)
    // But just in case, let's find all floor tiles
    const floors = [];
    for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
            if (grid[r][c] === '.') floors.push({ x: c, y: r });
        }
    }

    // 2. Place Start (S)
    const start = floors[Math.floor(Math.random() * floors.length)];
    grid[start.y][start.x] = 'S';

    // 3. Place Locked Door (L) and Exit (X)
    // X should be behind L. So place X at a dead end or edge, and L adjacent to it?
    // Or L blocks a room.
    // Simple approach: Place X far from S. Place L next to X.
    let exit, distS_X = 0;
    for (let i = 0; i < 50; i++) {
        const p = floors[Math.floor(Math.random() * floors.length)];
        const d = Math.abs(p.x - start.x) + Math.abs(p.y - start.y);
        if (d > distS_X && grid[p.y][p.x] === '.') {
            exit = p;
            distS_X = d;
        }
    }
    grid[exit.y][exit.x] = 'X';

    // Place L adjacent to X (and ensure L is reachable from S without passing X)
    // Actually, L should block the path to X.
    // If X is at end of a corridor, L should be the step before X.
    // Let's find neighbors of X.
    const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]].map(([dx, dy]) => ({ x: exit.x + dx, y: exit.y + dy }));
    const validNeighbors = neighbors.filter(n => n.x > 0 && n.x < width - 1 && n.y > 0 && n.y < height - 1 && grid[n.y][n.x] === '.');

    if (validNeighbors.length === 0) return null; // Retry
    const door = validNeighbors[0];
    grid[door.y][door.x] = 'L';

    // 4. Place Key (K)
    // Far from L (dist > 5)
    let key;
    for (let i = 0; i < 100; i++) {
        const p = floors[Math.floor(Math.random() * floors.length)];
        if (grid[p.y][p.x] !== '.') continue;
        const dL = Math.abs(p.x - door.x) + Math.abs(p.y - door.y);
        const dS = Math.abs(p.x - start.x) + Math.abs(p.y - start.y);
        if (dL > 5 && dS > 5) {
            key = p;
            break;
        }
    }
    if (!key) return null;
    grid[key.y][key.x] = 'K';

    // 5. Place Enemies (E)
    // Must be on path S -> K (Risk for Reward)
    // Find path S -> K
    // We need a pathfinder here.
    // Let's rely on random placement first, but bias towards the middle?
    // Or better: Use the validator's pathfinder logic if we could, but we can't easily access it here without instantiating.
    // We have `validator` instance.

    // Let's just place enemies randomly on floor tiles, but try to place them "between" S and K.
    // Midpoint?
    let enemiesPlaced = 0;
    let attempts = 0;
    while (enemiesPlaced < config.enemies && attempts < 100) {
        attempts++;
        const p = floors[Math.floor(Math.random() * floors.length)];
        if (grid[p.y][p.x] !== '.') continue;

        // Check distance to S (Safe Start Area)
        const distS = Math.abs(p.x - start.x) + Math.abs(p.y - start.y);
        if (distS <= 8) continue; // Constraint: Safe Start Area (dist > 8)

        grid[p.y][p.x] = 'E';
        enemiesPlaced++;
    }

    // 6. Place Debris (D) and Pillars (O)
    let debrisPlaced = 0;
    while (debrisPlaced < config.debris) {
        const p = floors[Math.floor(Math.random() * floors.length)];
        if (grid[p.y][p.x] === '.') {
            grid[p.y][p.x] = 'D';
            debrisPlaced++;
        }
    }

    let pillarsPlaced = 0;
    while (pillarsPlaced < config.pillars) {
        const p = floors[Math.floor(Math.random() * floors.length)];
        if (grid[p.y][p.x] === '.') {
            grid[p.y][p.x] = 'O';
            pillarsPlaced++;
        }
    }

    return {
        level_id: `level_${config.id}_${config.name.toLowerCase().replace(/ /g, '_')}`,
        width,
        height,
        legend: {
            "#": "Wall",
            ".": "Floor",
            "S": "Start",
            "E": "Entity",
            "K": "Key",
            "D": "Debris",
            "O": "Pillar",
            "L": "Locked Door",
            "X": "Exit"
        },
        layout: grid.map(row => row.join(''))
    };
}

async function main() {
    const outputDir = path.join(process.cwd(), 'src', 'levels');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    for (const config of LEVELS) {
        console.log(`Generating Level ${config.id}: ${config.name}...`);
        let bestLevel = null;
        let bestScore = -1;

        // Try multiple times to get a valid level with good difficulty
        for (let attempt = 0; attempt < 500; attempt++) {
            const level = generateLevel(config);
            if (!level) continue;

            // Write to temp file for validator (or mock it)
            // Validator expects file path. Let's modify validator or write temp.
            // Actually, let's just use the validator methods directly if possible.
            // But validator reads from file.
            // Let's write a temp file.
            const tempPath = path.join(outputDir, `temp_${config.id}.json`);
            fs.writeFileSync(tempPath, JSON.stringify(level, null, 4));

            const result = validator.validate(tempPath);
            if (result.valid) {
                // Check if difficulty is increasing?
                // For now just accept valid.
                // Or try to maximize score?
                if (result.difficultyScore > bestScore) {
                    bestScore = result.difficultyScore;
                    bestLevel = level;
                }
                // If we found a valid one, maybe stop early if score is decent?
                // Let's try to find *any* valid one first.
                if (bestScore > 0) break;
            }
        }

        if (bestLevel) {
            const filename = `level${config.id}.json`;
            fs.writeFileSync(path.join(outputDir, filename), JSON.stringify(bestLevel, null, 4));
            console.log(`Saved ${filename} (Score: ${bestScore.toFixed(2)})`);
            // Clean up temp
            const tempPath = path.join(outputDir, `temp_${config.id}.json`);
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        } else {
            console.error(`Failed to generate valid Level ${config.id}`);
        }
    }
}

main();
