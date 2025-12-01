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

const levelsDir = path.join(__dirname, '../src/levels');
const CELL_SIZE = 2;

console.log('--- Starting Pathfinding Tests for ALL Levels ---');

// Get all JSON files
const files = fs.readdirSync(levelsDir).filter(file => file.endsWith('.json'));
files.sort((a, b) => {
    // Sort numerically if possible (level1, level2, ..., level10)
    const numA = parseInt(a.replace('level', '').replace('.json', ''));
    const numB = parseInt(b.replace('level', '').replace('.json', ''));
    return numA - numB;
});

let totalLevelsPassed = 0;
let totalLevelsFailed = 0;

files.forEach(file => {
    console.log(`\nTesting ${file}...`);
    const levelPath = path.join(levelsDir, file);
    const levelData = JSON.parse(fs.readFileSync(levelPath, 'utf8'));
    const { layout, legend } = levelData;

    // Create a test legend where Locked Door is treated as Floor to verify connectivity assuming keys are collected
    const testLegend = { ...legend };
    Object.keys(testLegend).forEach(key => {
        if (testLegend[key] === 'Locked Door') {
            testLegend[key] = 'Floor';
        }
    });

    let enemySpawnPos = null;
    let startPos = null;
    let exitPos = null;
    const floorTiles = [];

    // Parse Level
    layout.forEach((row, z) => {
        row.split('').forEach((char, x) => {
            const type = legend[char];
            const pos = new Vector3(x * CELL_SIZE, 1, z * CELL_SIZE);

            if (type === 'Entity') enemySpawnPos = pos;
            if (type === 'Start') startPos = pos;
            if (type === 'Exit') exitPos = pos;

            // Collect all walkable tiles
            if (type !== 'Wall' && type !== 'Pillar' && type !== 'Locked Door') {
                floorTiles.push(pos);
            }
        });
    });

    let levelPassed = true;

    // Check 1: Enemy Spawn Exists
    if (!enemySpawnPos) {
        console.warn(`  [WARN] No Entity spawn found in ${file}. Skipping connectivity test.`);
        // Not necessarily a fail if the level just doesn't have an enemy yet, but for this test we care about enemy pathing.
        // Let's count it as a pass but warn.
    } else {
        // Check 2: Connectivity (Enemy -> All Floor Tiles)
        let unreachableCount = 0;
        let isolatedCount = 0;

        floorTiles.forEach(tile => {
            const pathFromEnemy = findPath(enemySpawnPos, tile, layout, testLegend, CELL_SIZE);

            if (pathFromEnemy.length === 0) {
                // Enemy can't reach it. Can the Player reach it?
                // If Player can't reach it either, it's an isolated artifact and we can ignore it.
                let pathFromPlayer = [];
                if (startPos) {
                    pathFromPlayer = findPath(startPos, tile, layout, testLegend, CELL_SIZE);
                }

                if (pathFromPlayer.length === 0) {
                    // Globally isolated
                    // console.warn(`  [WARN] Isolated Tile at ${tile.x}, ${tile.z} (Unreachable by Player & Enemy). Ignoring.`);
                    isolatedCount++;
                } else {
                    // Player can reach it, but Enemy cannot! This is a bug.
                    console.error(`  [FAIL] Unreachable Tile at ${tile.x}, ${tile.z} (Reachable by Player, but NOT Enemy).`);
                    unreachableCount++;
                }
            }
        });

        if (unreachableCount === 0) {
            if (isolatedCount > 0) {
                console.log(`  [PASS] Connectivity: All relevant tiles reachable (${isolatedCount} isolated tiles ignored).`);
            } else {
                console.log(`  [PASS] Connectivity: All ${floorTiles.length} walkable tiles are reachable.`);
            }
        } else {
            console.error(`  [FAIL] Connectivity: ${unreachableCount} relevant tiles are unreachable from Enemy spawn.`);
            levelPassed = false;
        }
    }

    // Check 3: Start -> Exit (if both exist)
    if (startPos && exitPos) {
        const path = findPath(startPos, exitPos, layout, testLegend, CELL_SIZE);
        if (path.length > 0) {
            console.log(`  [PASS] Start -> Exit: Path found (Length: ${path.length}).`);
        } else {
            console.error(`  [FAIL] Start -> Exit: No path found.`);
            levelPassed = false;
        }
    }

    if (levelPassed) {
        totalLevelsPassed++;
    } else {
        totalLevelsFailed++;
    }
});

console.log('\n--- Test Summary ---');
console.log(`Total Levels: ${files.length}`);
console.log(`Passed: ${totalLevelsPassed}`);
console.log(`Failed: ${totalLevelsFailed}`);

if (totalLevelsFailed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
