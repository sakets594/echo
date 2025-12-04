import { Vector3 } from 'three';

export class EnemyAI {
    constructor(config, rng) {
        this.config = config;
        this.rng = rng;

        // State
        this.state = 'patrol';
        this.targetPosition = null;
        this.lastKnownPosition = null;

        // Timers
        this.timers = {
            search: 0,
            frustration: 0,
            inertia: 0,
            state: 0,
            lost: 0
        };

        // State tracking
        this.searchStartTime = null;
    }

    update(dt, inputs) {
        const {
            enemyPos,
            playerPos,
            playerState,
            stimulus,
            sightCheck, // Function(start, end) -> boolean (true if clear line of sight)
            targetOverride // Optional: Force a specific target
        } = inputs;

        const enemyVec = new Vector3(enemyPos.x, enemyPos.y, enemyPos.z);

        // Handle missing player (e.g. in Test Mode)
        let playerVec = null;
        let distToPlayer = Infinity;

        if (playerPos) {
            playerVec = new Vector3(playerPos.x, playerPos.y, playerPos.z);
            distToPlayer = enemyVec.distanceTo(playerVec);
        }

        // 1. Process Stimulus & Global Triggers
        let nextState = this.state;
        let nextTarget = this.targetPosition;
        let events = [];

        // Check for target override
        if (targetOverride) {
            // If we have an override, we might want to switch to a specific state or just move there
            // For now, let's assume if an override is given, we go to 'investigate' or 'patrol' to that point
            // But the UI might want to force state too. 
            // Let's just set the target and let the state logic handle it, 
            // OR we can say if targetOverride is present, we are in a "forced" mode.
            // Ideally, the caller sets the state too.
            this.targetPosition = targetOverride.clone();
        }

        if (stimulus) {
            if (stimulus.type === 'LIDAR' || stimulus.type === 'TREMOR_LOUD' || stimulus.type === 'BREATH') {
                // Instant Chase
                nextState = 'chase';
                this.lastKnownPosition = stimulus.pos.clone();
                this.timers.inertia = this.config.inertiaTime;
            } else if (stimulus.type === 'TREMOR_FAINT') {
                // Investigate if not already chasing
                if (this.state !== 'chase') {
                    nextState = 'investigate';
                    this.lastKnownPosition = stimulus.pos.clone();
                } else {
                    // If chasing, update LKP
                    this.lastKnownPosition = stimulus.pos.clone();
                }
            }
        }

        // 2. State Logic
        switch (this.state) {
            case 'patrol':
                // Random walking logic handled in target selection
                break;

            case 'investigate':
                this.timers.frustration += dt;
                if (this.timers.frustration > this.config.frustrationTime) {
                    // Frustrated -> Chase
                    console.log('[EnemyAI] Frustrated! Switching to Chase.');
                    nextState = 'chase';
                    this.timers.inertia = this.config.inertiaTime;
                }
                break;

            // Chase and Search transitions handled in Target Selection logic below
        }

        // 3. Handle State Transitions
        if (nextState !== this.state) {
            console.log(`[EnemyAI] State: ${this.state} -> ${nextState}`);
            events.push(`StateChange:${this.state}->${nextState}`);
            this.state = nextState;
            this.timers.state = 0;
            this.timers.frustration = 0;

            // Clear target on state change to force re-evaluation
            // Exception: if we have a specific target from stimulus (like Lidar origin)
            // OR if we have a targetOverride
            if (targetOverride) {
                this.targetPosition = targetOverride.clone();
            } else if (nextState === 'chase' && stimulus) {
                this.targetPosition = stimulus.pos.clone();
            } else {
                this.targetPosition = null;
            }

            if (nextState === 'chase') {
                events.push('playSound:hunt');
            }
        }

        // 4. Target Selection & Logic per State
        let speed = this.config.patrolSpeed;

        if (this.state === 'chase') {
            speed = this.config.huntSpeed;
            this.timers.inertia -= dt;

            // Check breath detection for occlusion
            let breathOccluded = false;
            let breathDetected = false;

            // We need to check if we can detect player via breath
            // This logic was previously in the component, moving it here requires raycasting
            // We use the injected sightCheck function

            if (playerVec && playerState && distToPlayer < playerState.effectiveBreathRadius) {
                // Check occlusion using injected function
                // sightCheck returns TRUE if clear, FALSE if occluded
                const hasLineOfSight = sightCheck(enemyVec, playerVec);
                breathOccluded = !hasLineOfSight;

                // If close enough (<1m) and not occluded, breath is detected
                // Note: The original logic allowed detection <1m even if occluded (bumped into)
                if (hasLineOfSight || distToPlayer < 1.0) {
                    breathDetected = true;
                }
            }

            // Check if we can still detect the player (via any sense)
            const canDetectPlayer = playerVec && playerState && (
                (playerState.isWalking && distToPlayer < this.config.tremorRadiusWalk) ||
                (playerState.isSprinting && distToPlayer < this.config.tremorRadiusSprint) ||
                breathDetected
            );

            if (canDetectPlayer) {
                // Still detecting player - update target to CURRENT player position
                this.targetPosition = playerVec.clone();
                this.lastKnownPosition = playerVec.clone();
                this.timers.lost = 0; // Reset lost timer
                // console.log(`[EnemyAI] Tracking player`);
            } else {
                // Lost track of player
                this.timers.lost += dt;

                if (this.timers.lost > 2.0) {
                    console.log(`[EnemyAI] Player escaped! Entering SEARCH at last known position`);
                    this.state = 'search';
                    // Use lastKnownPosition if available, otherwise use current player position
                    const searchTarget = this.lastKnownPosition ? this.lastKnownPosition.clone() : (playerVec ? playerVec.clone() : enemyVec.clone());
                    this.targetPosition = searchTarget;
                    this.timers.search = this.config.searchDuration; // Initialize search timer
                    this.timers.inertia = 0;
                    this.timers.lost = 0;
                }
            }

        } else if (this.state === 'search') {
            speed = this.config.investigateSpeed;
            this.timers.search -= dt;

            // console.log(`[EnemyAI] SEARCH - Time Left: ${this.timers.search.toFixed(1)}s`);

            if (this.timers.search <= 0) {
                console.log('[EnemyAI] Search timeout, returning to PATROL');
                this.state = 'patrol';
                this.targetPosition = null;
                this.lastKnownPosition = null;
            }

            // Random point logic handled by Movement/Component for now, 
            // or we can emit a "requestRandomTarget" event?
            // For now, let's keep the target as is (LKP)
        } else {
            // Patrol
            speed = this.config.patrolSpeed;
            // Target selection for patrol is complex (needs level layout). 
            // We'll let the Component/Movement handle picking new patrol points if targetPosition is null.
        }

        // Force target override again just in case state logic cleared it
        if (targetOverride) {
            this.targetPosition = targetOverride.clone();
        }

        return {
            state: this.state,
            targetPosition: this.targetPosition,
            speed: speed,
            events: events,
            shouldMoveDirectly: (this.state === 'chase' && playerVec && distToPlayer < playerState.effectiveBreathRadius && (distToPlayer < 1.0 || !breathOccluded) && distToPlayer > 0.5)
        };
    }
}
