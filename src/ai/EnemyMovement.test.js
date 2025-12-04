import { EnemyMovement } from './EnemyMovement.js';
import { Vector3 } from 'three';

// Simple Test Runner
const tests = [];
function describe(name, fn) {
    console.log(`\nSuite: ${name}`);
    fn();
}
function test(name, fn) {
    tests.push({ name, fn });
}
function expect(actual) {
    return {
        toBe: (expected) => {
            if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`);
        },
        toEqual: (expected) => {
            const actualStr = JSON.stringify(actual);
            const expectedStr = JSON.stringify(expected);
            if (actualStr !== expectedStr) throw new Error(`Expected ${expectedStr}, got ${actualStr}`);
        },
        toBeGreaterThan: (expected) => {
            if (actual <= expected) throw new Error(`Expected > ${expected}, got ${actual}`);
        }
    };
}
let beforeEachFn = () => { };
function beforeEach(fn) { beforeEachFn = fn; }

// Mock Level Data
const mockLevelData = {
    layout: [
        "#####",
        "#...#",
        "#...#",
        "#####"
    ],
    legend: {
        "#": "Wall",
        ".": "Floor"
    }
};

describe('EnemyMovement', () => {
    let movement;

    beforeEach(() => {
        movement = new EnemyMovement(mockLevelData, 1);
    });

    test('should return zero velocity if no target', () => {
        const result = movement.update(0.1, new Vector3(0, 0, 0), null, 5, false);
        expect(result.velocity.x).toBe(0);
        expect(result.velocity.z).toBe(0);
    });

    test('should calculate path to target', () => {
        // Start at (1,1) -> Target (3,1)
        // Layout:
        // #####
        // #S.E# (S=1,1 E=3,1)
        // #####
        const currentPos = new Vector3(1.5, 0, 1.5); // Center of tile 1,1
        const targetPos = new Vector3(3.5, 0, 1.5); // Center of tile 3,1

        const result = movement.update(0.1, currentPos, targetPos, 5, false);

        // Should have a path
        expect(result.path.length).toBeGreaterThan(0);
        // Should have velocity towards next waypoint
        expect(Math.abs(result.velocity.x)).toBeGreaterThan(0);
    });

    test('should move directly if flag is set', () => {
        const currentPos = new Vector3(0, 0, 0);
        const targetPos = new Vector3(10, 0, 0);

        const result = movement.update(0.1, currentPos, targetPos, 5, true);

        // Velocity should be (5, 0, 0)
        expect(result.velocity.x).toBe(5);
        expect(result.velocity.z).toBe(0);
        // Path should be empty
        expect(result.path.length).toBe(0);
    });

    test('should advance waypoints when reached', () => {
        // Manually set a path
        movement.path = [new Vector3(1, 0, 0), new Vector3(2, 0, 0)];
        movement.currentPathIndex = 0;

        const currentPos = new Vector3(0.9, 0, 0); // Very close to first waypoint (1,0,0)
        const targetPos = new Vector3(2, 0, 0);

        const result = movement.update(0.1, currentPos, targetPos, 5, false);

        // Should have advanced to index 1
        expect(result.currentPathIndex).toBe(1);
    });

    test('should detect being stuck and clear path', () => {
        // Setup: Enemy has a path and is trying to move
        movement.path = [new Vector3(10, 0, 0)];
        movement.currentPathIndex = 0;

        const startPos = new Vector3(0, 0, 0);
        const targetPos = new Vector3(10, 0, 0);

        // 1. First update - should return velocity
        let result = movement.update(0.1, startPos, targetPos, 5, false);
        expect(result.velocity.x).toBeGreaterThan(0);

        // 2. Simulate getting stuck: Call update multiple times with SAME position
        // We need to trigger the stuck threshold (e.g. 0.5s or 1s)
        // Let's assume threshold is 0.5s for test

        for (let i = 0; i < 10; i++) {
            result = movement.update(0.1, startPos, targetPos, 5, false);
        }

        // 3. Should eventually detect stuck and clear path (or return stuck flag)
        // For now, let's expect path to be cleared so it forces recalculation
        expect(result.path.length).toBe(0);
    });

    test('should skip pathfinding when target is very close (<1m)', () => {
        const currentPos = new Vector3(0, 0, 0);
        const targetPos = new Vector3(0.8, 0, 0); // 0.8m away

        // Ensure no existing path
        movement.path = [];

        const result = movement.update(0.1, currentPos, targetPos, 5, false);

        // Should NOT generate a path (skips pathfinding)
        expect(result.path.length).toBe(0);
        // But should still have velocity (direct movement is not handled here, 
        // actually wait - if path is empty, velocity is 0 unless shouldMoveDirectly is true)
        // In EnemyMovement.js:
        // if (distToTarget < pathfindThreshold) { ... if(path.length>0) clear ... }
        // It does NOT set velocity if path is empty and !shouldMoveDirectly.
        // The Controller (Enemy.jsx) handles "direct chase" if close.
        // But if just "close" without direct flag, it might stop?

        // Let's check logic:
        // if (targetPos) { ... if (dist < threshold) { clear path } ... }
        // ...
        // if (path.length > 0) { ... } else { velocity = 0 }

        // So currently, if <1m and NOT direct move, it stops. 
        // This might be intended (reached target behavior) or bug if we want it to shimmy closer.
        // The test confirms CURRENT behavior.
        expect(result.velocity.x).toBe(0);
    });

    test('should pathfind when target is close but >1m (e.g. 1.3m)', () => {
        // Use valid walkable positions
        // Tile 1,1 center is 1.5, 1.5
        // Tile 2,1 center is 2.5, 1.5
        const currentPos = new Vector3(1.5, 0, 1.5);
        const targetPos = new Vector3(2.8, 0, 1.5); // 1.3m away

        // Ensure no existing path
        movement.path = [];

        const result = movement.update(0.1, currentPos, targetPos, 5, false);

        // Should generate a path because it's > 1.0m threshold
        expect(result.path.length).toBeGreaterThan(0);
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
