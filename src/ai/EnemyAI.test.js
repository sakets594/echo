import { EnemyAI } from './EnemyAI.js';
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
        }
    };
}
let beforeEachFn = () => { };
function beforeEach(fn) { beforeEachFn = fn; }

// Test Suite
describe('EnemyAI', () => {
    let ai;
    let config;
    let rng;

    beforeEach(() => {
        config = {
            patrolSpeed: 2,
            investigateSpeed: 3,
            huntSpeed: 5,
            frustrationTime: 5,
            inertiaTime: 2,
            searchDuration: 10,
            tremorRadiusWalk: 5,
            tremorRadiusSprint: 10,
            breathRadius: 2,
            lidarRange: 20
        };
        rng = { next: () => 0.5 }; // Mock RNG
        ai = new EnemyAI(config, rng);
    });

    test('should initialize in patrol state', () => {
        expect(ai.state).toBe('patrol');
    });

    test('should transition to CHASE on LIDAR stimulus', () => {
        const inputs = {
            enemyPos: new Vector3(0, 0, 0),
            playerPos: new Vector3(10, 0, 0),
            playerState: { isWalking: false },
            stimulus: { type: 'LIDAR', pos: new Vector3(10, 0, 0) },
            sightCheck: () => true
        };

        const result = ai.update(0.1, inputs);
        expect(result.state).toBe('chase');
        // Simple check for target position matching
        if (!ai.targetPosition.equals(inputs.stimulus.pos)) {
            throw new Error('Target position does not match stimulus position');
        }
    });

    test('should transition to INVESTIGATE on FAINT TREMOR', () => {
        const inputs = {
            enemyPos: new Vector3(0, 0, 0),
            playerPos: new Vector3(10, 0, 0),
            playerState: { isWalking: true },
            stimulus: { type: 'TREMOR_FAINT', pos: new Vector3(10, 0, 0) },
            sightCheck: () => true
        };

        const result = ai.update(0.1, inputs);
        expect(result.state).toBe('investigate');
    });

    test('should transition from INVESTIGATE to CHASE after frustration time', () => {
        // First put in investigate
        ai.state = 'investigate';

        const inputs = {
            enemyPos: new Vector3(0, 0, 0),
            playerPos: new Vector3(10, 0, 0),
            playerState: { isWalking: false },
            stimulus: null,
            sightCheck: () => true
        };

        // Update with time < frustration
        ai.update(4.0, inputs);
        expect(ai.state).toBe('investigate');

        // Update with time > frustration
        ai.update(1.1, inputs);
        expect(ai.state).toBe('chase');
    });

    test('should transition from CHASE to SEARCH when player lost for too long', () => {
        ai.state = 'chase';
        ai.targetPosition = new Vector3(10, 0, 0);

        const inputs = {
            enemyPos: new Vector3(0, 0, 0),
            playerPos: new Vector3(20, 0, 0), // Far away
            playerState: { isWalking: false, effectiveBreathRadius: 2 },
            stimulus: null,
            sightCheck: () => true
        };

        // Update - player not detected
        ai.update(0.1, inputs);

        // Simulate time passing > 2s
        ai.update(2.1, inputs);

        expect(ai.state).toBe('search');
    });

    test('should transition from SEARCH to PATROL after timeout', () => {
        ai.state = 'search';
        ai.timers.search = 10; // Reset timer

        const inputs = {
            enemyPos: new Vector3(0, 0, 0),
            playerPos: new Vector3(10, 0, 0),
            playerState: { isWalking: false },
            stimulus: null,
            sightCheck: () => true
        };

        // Update with dt=11 (greater than searchDuration 10)
        ai.update(11.0, inputs);

        expect(ai.state).toBe('patrol');
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
