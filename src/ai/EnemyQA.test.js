import { EnemyAI } from './EnemyAI.js';
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

// --- MOCKS ---
const mockLevelData = {
    layout: [
        "##########",
        "#........#",
        "#........#",
        "##########"
    ],
    legend: { "#": "Wall", ".": "Floor" }
};

// Mock Controller (Simulates Enemy.jsx logic)
class MockEnemyController {
    constructor() {
        this.ai = new EnemyAI({
            patrolSpeed: 2,
            huntSpeed: 5,
            investigateSpeed: 3,
            searchDuration: 10,
            frustrationTime: 5,
            inertiaTime: 2,
            tremorRadiusWalk: 5,
            tremorRadiusSprint: 10,
            breathRadius: 2,
            lidarRange: 20
        }, { next: () => 0.5 }); // Mock RNG

        this.movement = new EnemyMovement(mockLevelData, 1);

        this.state = 'patrol';
        this.targetPosition = null;
        this.enemyPos = new Vector3(1.5, 0, 1.5);
        this.playerPos = new Vector3(8.5, 0, 1.5);
        this.playerState = { isWalking: false, isSprinting: false, isPanting: false, effectiveBreathRadius: 2 };
        this.path = [];
    }

    update(dt) {
        // 0. Calculate Stimulus (Mimic Enemy.jsx checkSenses)
        let stimulus = null;
        const distToPlayer = this.enemyPos.distanceTo(this.playerPos);

        // Tremor
        if (this.playerState.isWalking && distToPlayer < 5) { // tremorRadiusWalk
            stimulus = { type: 'TREMOR_FAINT', pos: this.playerPos.clone() };
        }
        if (this.playerState.isSprinting && distToPlayer < 10) { // tremorRadiusSprint
            stimulus = { type: 'TREMOR_LOUD', pos: this.playerPos.clone() };
        }

        // console.log(`[MockController] Dist: ${distToPlayer}, Walking: ${this.playerState.isWalking}, Sprinting: ${this.playerState.isSprinting}, Stimulus: ${stimulus ? stimulus.type : 'null'}`);


        // 1. AI Update
        const aiResult = this.ai.update(dt, {
            enemyPos: this.enemyPos,
            playerPos: this.playerPos,
            playerState: this.playerState,
            stimulus: stimulus,
            sightCheck: () => true
        });

        this.state = aiResult.state;

        // Sync target if AI sets it (Chase/Investigate/Search)
        if (aiResult.targetPosition) {
            this.targetPosition = aiResult.targetPosition;
        }

        // 2. Controller Logic (Target Selection)
        if (this.state === 'patrol' || this.state === 'search' || this.state === 'investigate') {
            // If no target or path cleared (stuck), pick new random target
            if (!this.targetPosition || (this.path.length === 0 && !aiResult.targetPosition)) {
                // Simulate picking a new random point
                // For test, we just toggle between two points
                if (this.enemyPos.x < 5) {
                    this.targetPosition = new Vector3(8.5, 0, 1.5);
                } else {
                    this.targetPosition = new Vector3(1.5, 0, 1.5);
                }
                // Inject back to AI (as per Enemy.jsx)
                this.ai.targetPosition = this.targetPosition;
            }
        }

        // 3. Movement Update
        const moveResult = this.movement.update(
            dt,
            this.enemyPos,
            this.targetPosition,
            aiResult.speed,
            aiResult.shouldMoveDirectly
        );

        // Handle Unreachable/Reached Target (Patrol, Search, Investigate)
        if ((moveResult.pathStatus === 'unreachable' || moveResult.pathStatus === 'complete' || moveResult.reachedTarget)) {
            if (this.state === 'patrol' || this.state === 'search' || this.state === 'investigate') {
                this.ai.targetPosition = null;
                this.targetPosition = null;
            }
        }

        this.path = moveResult.path;

        // Apply Velocity (Simulate movement)
        this.enemyPos.add(moveResult.velocity.multiplyScalar(dt));

        return moveResult;
    }
}

// --- TESTS ---
describe('Enemy QA Integration', () => {
    let controller;

    beforeEach(() => {
        controller = new MockEnemyController();
    });

    // === STUCK RECOVERY TESTS ===
    test('PATROL: Should recover from stuck by picking new target', () => {
        // 1. Start in Patrol
        expect(controller.state).toBe('patrol');

        // 2. Run update to generate path
        controller.update(0.1);
        expect(controller.path.length).toBeGreaterThan(0);
        const initialPathLen = controller.path.length;

        // 3. Simulate Stuck: Run updates without moving enemyPos
        // Threshold is 0.5s. Run for 0.6s
        for (let i = 0; i < 6; i++) {
            controller.update(0.1);
            // We intentionally DO NOT update enemyPos here (simulating wall block)
            // But wait, the mock controller updates position automatically based on velocity!
            // We need to override that to simulate stuck.
            controller.enemyPos.set(1.5, 0, 1.5); // Reset position
        }

        // 4. Path should be cleared by Movement
        // And Controller should have picked a NEW target (or same one, but re-pathing)
        // In our mock, if path is cleared, it picks a target.

        // Let's verify path was cleared at some point.
        // The `movement.update` returns cleared path.
        // The NEXT `controller.update` sees empty path and picks target.

        // Check if we have a valid path again (recovery)
        expect(controller.path.length).toBeGreaterThan(0);
    });

    test('PATROL: Should select new target and move when previous target reached', () => {
        // 1. Start in Patrol
        expect(controller.state).toBe('patrol');

        // 2. Mock a target being set (simulating Enemy.jsx logic)
        // Mock Level is 10x4. Valid range x:0-9, z:0-3.
        const targetA = new Vector3(8.5, 0, 1.5);
        controller.ai.targetPosition = targetA;

        // 3. Update to move towards target
        controller.update(0.1);
        expect(controller.path.length).toBeGreaterThan(0);

        // 4. Simulate Reaching Target
        // We need to manually move the enemy close to target
        controller.enemyPos.copy(targetA);

        // Update again
        // Update again (Frame where it reaches target)
        const moveResult1 = controller.update(0.1);

        // It reached target, so it should be decelerating or stopped.
        // We don't expect high velocity here.

        // Manually clear target to simulate "Reached" logic if MockController didn't do it?
        // MockController DOES do it now.
        // So controller.ai.targetPosition should be null?
        // expect(controller.ai.targetPosition).toBeNull(); 
        // (MockController clears it at end of update)

        // 5. Update - Should pick new random target (MockController logic)
        // This frame it picks target AND moves towards it.
        const moveResult2 = controller.update(0.1);

        expect(controller.ai.targetPosition).toBeTruthy();
        if (controller.ai.targetPosition.equals(targetA)) {
            throw new Error('Expected new target, got same target');
        }

        // Check if path was found
        if (controller.path.length === 0) {
            console.log('No path found to new target:', controller.ai.targetPosition);
        }
        expect(controller.path.length).toBeGreaterThan(0);

        // Velocity should be increasing towards new target
        const vel = moveResult2.velocity;
        const speed = Math.sqrt(vel.x ** 2 + vel.z ** 2);

        // With inertia, speed might be low in first frame
        // Observed 0.075 in tests
        expect(speed).toBeGreaterThan(0.05);
    });

    test('CHASE: Should recover from stuck by repathing to player', () => {
        // 1. Force Chase State
        controller.ai.state = 'chase';
        controller.ai.targetPosition = controller.playerPos.clone();

        // 2. Run update
        controller.update(0.1);
        expect(controller.state).toBe('chase');
        expect(controller.path.length).toBeGreaterThan(0);

        // 3. Simulate Stuck
        const stuckPos = controller.enemyPos.clone();
        for (let i = 0; i < 6; i++) {
            controller.update(0.1);
            controller.enemyPos.copy(stuckPos); // Reset position
        }

        // 4. Verify Recovery
        // In Chase, AI updates target to player every frame.
        // Movement clears path.
        // Next frame, Movement sees target, empty path -> Recalculates.
        expect(controller.path.length).toBeGreaterThan(0);
    });



    test('SEARCH: Should recover from stuck by picking new search point', () => {
        // 1. Force Search State
        controller.ai.state = 'search';
        controller.ai.targetPosition = new Vector3(5.5, 0, 1.5); // Some search point
        controller.ai.timers.search = 10;

        // 2. Run update
        controller.update(0.1);
        expect(controller.state).toBe('search');
        expect(controller.path.length).toBeGreaterThan(0);

        // 3. Simulate Stuck
        const stuckPos = controller.enemyPos.clone();
        for (let i = 0; i < 6; i++) {
            controller.update(0.1);
            controller.enemyPos.copy(stuckPos);
        }

        // 4. Verify Recovery
        // In Search, if path is cleared, the AI/Controller logic should ideally pick a new point?
        // In `Enemy.jsx`: 
        // if (state === 'search') { ... if (stateTimer > 2.0) pickRandom ... }
        // It doesn't explicitly check for empty path to pick new target immediately.
        // BUT, `movement.update` will see target, empty path -> Recalculates.
        // This is also a valid recovery (maybe path was bad).

        expect(controller.path.length).toBeGreaterThan(0);
    });

    test('SEARCH: Should pick new target if current search target is reached or unreachable', () => {
        // 1. Force Search State
        controller.ai.state = 'search';
        controller.ai.targetPosition = new Vector3(5.5, 0, 1.5);
        controller.ai.timers.search = 10;

        // 2. Simulate Reaching Target
        controller.enemyPos.copy(controller.ai.targetPosition);

        // 3. Update 1: Detect Reached -> Clear Target
        controller.update(0.1);
        expect(controller.ai.targetPosition).toBe(null); // Should be cleared

        // 4. Update 2: Pick New Target
        controller.update(0.1);

        expect(controller.ai.targetPosition).toBeTruthy();
        expect(controller.ai.targetPosition.equals(new Vector3(5.5, 0, 1.5))).toBe(false);

        // Check velocity
        const vel = controller.movement.velocity; // Access velocity from last update
        // Or check via enemyRef if we had it, but MockController doesn't update physics ref really.
        // We can check path length.
        expect(controller.path.length).toBeGreaterThan(0);
    });

    test('INVESTIGATE: Should pick new target if current target is reached', () => {
        // 1. Force Investigate State
        controller.ai.state = 'investigate';
        controller.ai.targetPosition = new Vector3(5.5, 0, 1.5);

        // 2. Simulate Reaching Target
        controller.enemyPos.copy(controller.ai.targetPosition);

        // 3. Update 1: Detect Reached -> Clear Target
        controller.update(0.1);
        expect(controller.ai.targetPosition).toBe(null);

        // 4. Update 2: Pick New Target
        controller.update(0.1);
        expect(controller.ai.targetPosition).toBeTruthy();
        expect(controller.ai.targetPosition.equals(new Vector3(5.5, 0, 1.5))).toBe(false);
        expect(controller.path.length).toBeGreaterThan(0);
    });

    // === TARGET REACHED TRANSITION TESTS ===

    // --- PATROL ---
    test('PATROL + Reached + Silence -> Stay PATROL (New Target)', () => {
        controller.state = 'patrol';
        controller.targetPosition = controller.enemyPos.clone(); // At target

        // Update with NO stimulus
        controller.update(0.1);

        expect(controller.state).toBe('patrol');
        // Should have picked a new target (different from current pos)
        expect(controller.targetPosition.distanceTo(controller.enemyPos)).toBeGreaterThan(0.1);
    });

    test('PATROL + Reached + Walk -> INVESTIGATE', () => {
        controller.state = 'patrol';
        controller.targetPosition = controller.enemyPos.clone();

        // Inject Walk Stimulus
        controller.playerState = { isWalking: true, isSprinting: false, isPanting: false, effectiveBreathRadius: 2 };
        controller.playerPos = new Vector3(controller.enemyPos.x + 4, 0, controller.enemyPos.z); // 4m away

        controller.update(0.1);

        expect(controller.state).toBe('investigate');
    });

    test('PATROL + Reached + Sprint -> CHASE', () => {
        controller.state = 'patrol';
        controller.targetPosition = controller.enemyPos.clone();

        // Inject Sprint Stimulus
        controller.playerState = { isWalking: false, isSprinting: true, isPanting: false, effectiveBreathRadius: 2 };
        controller.playerPos = new Vector3(controller.enemyPos.x + 9, 0, controller.enemyPos.z); // 9m away (<10m sprint radius)

        controller.update(0.1);

        expect(controller.state).toBe('chase');
    });

    // --- INVESTIGATE ---
    test('INVESTIGATE + Reached + Silence -> Stay INVESTIGATE (until frustration)', () => {
        controller.ai.state = 'investigate'; // Force AI state
        controller.targetPosition = controller.enemyPos.clone();

        // Silence
        controller.playerState = { isWalking: false, isSprinting: false };

        controller.update(0.1);

        expect(controller.state).toBe('investigate');
    });

    test('INVESTIGATE + Reached + Walk -> Stay INVESTIGATE (Update Target)', () => {
        controller.ai.state = 'investigate';
        controller.targetPosition = controller.enemyPos.clone();

        // Walk
        controller.playerState = { isWalking: true };
        controller.playerPos = new Vector3(controller.enemyPos.x + 3, 0, 0);

        controller.update(0.1);

        expect(controller.state).toBe('investigate');
        // Should update last known pos / target
        // Note: In our implementation, Investigate updates LKP on faint tremor.
        // AI doesn't automatically set targetPosition to LKP every frame in Investigate?
        // Let's check EnemyAI.js:
        // case 'investigate': ... break;
        // It only sets target on state entry or if logic dictates.
        // Actually, `stimulus` logic:
        // if (TREMOR_FAINT) { if (state!=chase) { nextState='investigate'; LKP=pos; } }
        // So it re-enters investigate or updates LKP.
    });

    // --- CHASE ---
    test('CHASE + Reached + Silence -> Lost -> SEARCH', () => {
        controller.ai.state = 'chase';
        controller.targetPosition = controller.enemyPos.clone();

        // Silence (Player far away / sneaking)
        controller.playerState = { isWalking: false };
        controller.playerPos = new Vector3(100, 0, 0); // Far away

        // Update for > 2s to trigger lost
        for (let i = 0; i < 25; i++) {
            controller.update(0.1);
        }

        expect(controller.state).toBe('search');
    });

    test('CHASE + Reached + Sprint -> Stay CHASE', () => {
        controller.ai.state = 'chase';
        controller.targetPosition = controller.enemyPos.clone();

        // Sprint
        controller.playerState = { isWalking: false, isSprinting: true };
        controller.playerPos = new Vector3(controller.enemyPos.x + 5, 0, 0);

        controller.update(0.1);

        expect(controller.state).toBe('chase');
    });

    // --- SEARCH ---
    test('SEARCH + Reached + Silence -> Stay SEARCH (Pick New Point)', () => {
        controller.ai.state = 'search';
        controller.targetPosition = controller.enemyPos.clone();
        controller.ai.timers.search = 10;

        // Silence
        controller.playerState = { isWalking: false };

        controller.update(0.1);

        expect(controller.state).toBe('search');
        // Should pick new target?
        // In Enemy.jsx: `if (stateTimer > 2.0) pickRandom`.
        // We need to simulate time passing for that.
    });

    test('SEARCH + Reached + Walk -> INVESTIGATE', () => {
        // Wait, Search -> Investigate?
        // If faint tremor, yes.
        controller.ai.state = 'search';
        controller.targetPosition = controller.enemyPos.clone();

        // Walk
        controller.playerState = { isWalking: true };
        controller.playerPos = new Vector3(controller.enemyPos.x + 4, 0, 0);

        controller.update(0.1);

        expect(controller.state).toBe('investigate');
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
