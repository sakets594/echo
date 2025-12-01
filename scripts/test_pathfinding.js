import { findPath } from '../src/utils/pathfinding.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock Vector3 for Node environment
class Vector3 {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

// Mock Level Data
const level1Path = path.join(__dirname, '../src/levels/level1.json');
const level1Data = JSON.parse(fs.readFileSync(level1Path, 'utf8'));
const { layout, legend } = level1Data;
const CELL_SIZE = 2;

console.log('--- Starting Pathfinding Tests ---');

// Test 1: Basic Pathing (Start to Exit)
console.log('\nTest 1: Basic Pathing (Start to Exit)');
let startPos, exitPos;

layout.forEach((row, z) => {
    row.split('').forEach((char, x) => {
        if (legend[char] === 'Start') startPos = new Vector3(x * CELL_SIZE, 1, z * CELL_SIZE);
        if (legend[char] === 'Exit') exitPos = new Vector3(x * CELL_SIZE, 1, z * CELL_SIZE);
    });
});

if (!startPos || !exitPos) {
    console.error('FAILED: Could not find Start or Exit in level layout.');
} else {
    const path = findPath(startPos, exitPos, layout, legend, CELL_SIZE);
    if (path.length > 0) {
        console.log(`PASSED: Path found from Start to Exit. Length: ${path.length}`);
    } else {
        console.error('FAILED: No path found from Start to Exit.');
    }
}

// Test 2: Connectivity (Enemy Spawn to All Floor Tiles)
console.log('\nTest 2: Connectivity (Enemy Spawn to All Floor Tiles)');
let enemySpawnPos;
const floorTiles = [];

layout.forEach((row, z) => {
    row.split('').forEach((char, x) => {
        if (legend[char] === 'Entity') enemySpawnPos = new Vector3(x * CELL_SIZE, 1, z * CELL_SIZE);
        if (legend[char] === 'Floor' || legend[char] === 'Start' || legend[char] === 'Key' || legend[char] === 'Exit') {
            floorTiles.push(new Vector3(x * CELL_SIZE, 1, z * CELL_SIZE));
        }
    });
});

if (!enemySpawnPos) {
    console.error('FAILED: Could not find Entity spawn in level layout.');
} else {
    let unreachableCount = 0;
    floorTiles.forEach(tile => {
        const path = findPath(enemySpawnPos, tile, layout, legend, CELL_SIZE);
        if (path.length === 0) {
            console.error(`Unreachable Tile: ${tile.x}, ${tile.z}`);
            unreachableCount++;
        }
    });

    if (unreachableCount === 0) {
        console.log(`PASSED: All ${floorTiles.length} floor tiles are reachable from Enemy spawn.`);
    } else {
        console.error(`FAILED: ${unreachableCount} tiles are unreachable.`);
    }
}

// Test 3: Obstacle Avoidance (Mock Grid)
console.log('\nTest 3: Obstacle Avoidance');
const mockLayout = [
    ".....",
    ".###.",
    "....."
];
const mockLegend = { ".": "Floor", "#": "Wall" };
const mockStart = new Vector3(0 * CELL_SIZE, 1, 0 * CELL_SIZE); // Top Left
const mockEnd = new Vector3(4 * CELL_SIZE, 1, 0 * CELL_SIZE);   // Top Right (blocked by wall in middle row?) No, path is clear on top row.
// Let's make it harder.
// S . . . E
// . # # # .
// . . . . .
// Start (0,0), End (4,0). Wall at (1,1), (2,1), (3,1).
// Path should be straight line 0,0 -> 1,0 -> 2,0 -> 3,0 -> 4,0.

// Let's force it to go around.
// S # E
// . . .
const mockLayout2 = [
    ".#.",
    "..."
];
// Start (0,0), End (2,0). Wall at (1,0).
// Path should go (0,0) -> (0,1) -> (1,1) -> (2,1) -> (2,0).

const start2 = new Vector3(0 * CELL_SIZE, 1, 0 * CELL_SIZE);
const end2 = new Vector3(2 * CELL_SIZE, 1, 0 * CELL_SIZE);

const path2 = findPath(start2, end2, mockLayout2, mockLegend, CELL_SIZE);

if (path2.length > 0) {
    console.log(`PASSED: Path found around obstacle. Length: ${path2.length}`);
    // Verify path goes through row 1 (z=1 * CELL_SIZE = 2)
    const goesAround = path2.some(p => p.z === 1 * CELL_SIZE);
    if (goesAround) {
        console.log('PASSED: Path correctly goes around the wall.');
    } else {
        console.error('FAILED: Path goes through the wall!');
    }
} else {
    console.error('FAILED: No path found around obstacle.');
}
