import { EnemyMovement } from './EnemyMovement.js';
import { Vector3 } from 'three';

// --- TEST RUNNER ---
const tests = [];
function describe(name, fn) { console.log(`\nSuite: ${name}`); fn(); }
function test(name, fn) { tests.push({ name, fn }); }
function expect(actual) {
    return {
        toBe: (expected) => { if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`); },
        toEqual: (expected) => { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); },
        toBeGreaterThan: (expected) => { if (actual <= expected) throw new Error(`Expected > ${expected}, got ${actual}`); },
        toBeTruthy: () => { if (!actual) throw new Error(`Expected truthy, got ${actual}`); },
        toBeFalsy: () => { if (actual) throw new Error(`Expected falsy, got ${actual}`); }
    };
}
let beforeEachFn = () => { };
function beforeEach(fn) { beforeEachFn = fn; }

// --- LEVEL 1 DATA ---
// Inlined from src/levels/level1.json
const level1Data = {
    level_id: "level_1_the_awakening",
    width: 15,
    height: 10,
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
    layout: [
        "###############",
        "###.E######...#",
        "##.O.#####....#",
        "##.......#.S.O#",
        "##..##K.......#",
        "#...##.....#..#",
        "###.##........#",
        "##XL#######...#",
        "###########...#",
        "###############"
    ]
};

const CELL_SIZE = 3;

describe('Enemy Level 1 Stuck Scenario', () => {
    let movement;

    beforeEach(() => {
        movement = new EnemyMovement(level1Data, CELL_SIZE);
    });

    test('Should find path from [11.7, 10.5] to [7.5, 7.5]', () => {
        // Start: [11.7, 10.5] -> Grid [3, 3] (Row 3, Col 3)
        // Target: [7.5, 7.5] -> Grid [2, 2] (Row 2, Col 2)

        const startPos = new Vector3(11.7, 0, 10.5);
        const targetPos = new Vector3(7.5, 0, 7.5);

        // 1. First update to calculate path
        const result = movement.update(0.1, startPos, targetPos, 5, false);

        // Should have a path
        expect(result.path.length).toBeGreaterThan(0);

        // Verify path start and end
        // Path should start near [11.7, 10.5] and end near [7.5, 7.5]
        // Note: Pathfinding returns center of tiles.
        // [3,3] center -> (3*3 + 1.5, 3*3 + 1.5) = (10.5, 10.5)
        // [2,2] center -> (2*3 + 1.5, 2*3 + 1.5) = (7.5, 7.5)

        // Wait, 11.7 is in cell 3 (range 9-12). Center is 10.5.
        // So startPos 11.7 is offset from center 10.5.

        console.log(`Path length: ${result.path.length}`);
        result.path.forEach((p, i) => console.log(`WP ${i}: ${p.x}, ${p.z}`));
    });

    test('Should detect stuck at [11.7, 10.5] and clear path', () => {
        const startPos = new Vector3(11.7, 0, 10.5);
        const targetPos = new Vector3(7.5, 0, 7.5);

        // 1. Initialize path
        let result = movement.update(0.1, startPos, targetPos, 5, false);
        expect(result.path.length).toBeGreaterThan(0);

        // 2. Simulate Stuck (Position doesn't change)
        // Threshold is 0.5s.
        let stuckDetected = false;
        for (let i = 0; i < 10; i++) {
            result = movement.update(0.1, startPos, targetPos, 5, false);
            if (result.path.length === 0) {
                stuckDetected = true;
                break;
            }
        }

        // 3. Should detect stuck and clear path
        expect(stuckDetected).toBe(true);
        console.log('Stuck detected, path cleared.');
    });
    test('Should handle pathfinding from [12.4, 10.5] to [7.5, 7.5]', () => {
        const startPos = new Vector3(12.4, 0, 10.5);
        const targetPos = new Vector3(7.5, 0, 7.5);

        const result = movement.update(0.1, startPos, targetPos, 2, false);

        console.log(`Path length: ${result.path.length}, Status: ${result.pathStatus}`);
        result.path.forEach((p, i) => console.log(`WP ${i}: ${p.x}, ${p.z}`));

        // Simulate moving to the last waypoint
        movement.currentPathIndex = result.path.length - 1;
        const lastWP = result.path[result.path.length - 1];

        // Place enemy AT the last waypoint
        const finalResult = movement.update(0.1, lastWP, targetPos, 2, false);

        console.log(`Final Status: ${finalResult.pathStatus}`);
        // With Math.floor fix, this path is now reachable!
        expect(finalResult.pathStatus).toBe('complete');
    });
    test('Should handle close range patrol [33.5, 19.5] -> [34.4, 19.5] (Dist 0.9)', () => {
        const startPos = new Vector3(33.5, 0, 19.5);
        const targetPos = new Vector3(34.4, 0, 19.5);

        // Distance is 0.9
        // Threshold is 1.0

        const result = movement.update(0.1, startPos, targetPos, 2, false);

        console.log(`Path length: ${result.path.length}, Status: ${result.pathStatus}, Reached: ${result.reachedTarget}`);

        // It should either:
        // 1. Generate a path (if dist >= threshold)
        // 2. Or return reachedTarget = true (if dist < threshold)
        // 3. Or move directly? (But direct flag is false)

        // If it returns empty path and NOT reached, it's stuck.

        if (result.path.length === 0 && !result.reachedTarget) {
            throw new Error('Stuck! No path and not reached.');
        }
    });
    test('Should handle same-tile patrol [33.5, 19.5] -> [34.5, 19.5] (Dist 1.0)', () => {
        const startPos = new Vector3(33.5, 0, 19.5);
        const targetPos = new Vector3(34.5, 0, 19.5);

        // Distance is 1.0. Threshold is 1.0.
        // 1.0 < 1.0 is False. So it attempts pathfinding.
        // Both are likely in the same grid cell (Cell Size 3).
        // 33.5 / 3 = 11.16
        // 34.5 / 3 = 11.5
        // Same tile. Pathfinding might return empty or just target?

        const result = movement.update(0.1, startPos, targetPos, 2, false);

        console.log(`Path length: ${result.path.length}, Status: ${result.pathStatus}, Reached: ${result.reachedTarget}`);

        if (result.path.length === 0 && !result.reachedTarget && result.velocity.length() === 0) {
            throw new Error('Stuck! No path, not reached, no velocity.');
        }
    });
    test('Should handle patrol [7.8, 8.4] -> [7.5, 7.5] (Dist ~0.95)', () => {
        const startPos = new Vector3(7.8, 0, 8.4);
        const targetPos = new Vector3(7.5, 0, 7.5);

        // Distance is ~0.95m
        // Threshold is 1.0m

        const result = movement.update(0.1, startPos, targetPos, 2, false);

        console.log(`Path length: ${result.path.length}, Status: ${result.pathStatus}, Reached: ${result.reachedTarget}`);

        // Should be reached or moving
        if (result.path.length === 0 && !result.reachedTarget && result.velocity.length() === 0) {
            throw new Error('Stuck! No path, not reached, no velocity.');
        }
    });
});

// Run Tests
(async () => {
    let passed = 0;
    let failed = 0;
    for (const t of tests) {
        try {
            beforeEachFn();
            await t.fn();
            console.log(`✅ ${t.name}`);
            passed++;
        } catch (e) {
            console.log(`❌ ${t.name}`);
            console.error(e);
            failed++;
        }
    }
    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
})();
