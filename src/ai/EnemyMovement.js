import { Vector3 } from 'three';
import { findPath, getRandomWalkableTile, getRandomWalkableTileInRadius } from '../utils/pathfinding.js';

export class EnemyMovement {
    constructor(levelData, cellSize = 1) {
        this.levelData = levelData;
        this.cellSize = cellSize;

        // State
        this.path = [];
        this.currentPathIndex = 0;
        this.lastTargetPos = new Vector3();
        this.lastPathCalculationTime = 0;

        // Stuck detection
        this.lastPosition = new Vector3();
        this.stuckTimer = 0;
        this.hasStarted = false;

        // Inertia
        this.currentVelocity = new Vector3();
    }

    update(dt, currentPos, targetPos, speed, shouldMoveDirectly) {
        const enemyVec = new Vector3(currentPos.x, currentPos.y, currentPos.z);
        let velocity = new Vector3();
        let reachedTarget = false;
        let pathStatus = 'idle';

        if (!this.hasStarted) {
            this.lastPosition.copy(enemyVec);
            this.hasStarted = true;
        }

        // 1. Direct Movement (Bypass Pathfinding)
        if (shouldMoveDirectly && targetPos) {
            const dir = new Vector3(targetPos.x - enemyVec.x, 0, targetPos.z - enemyVec.z);
            dir.normalize();
            // Direct movement is usually for attack lunges, so we might want instant velocity
            // But let's apply some smoothing if it's not a dash?
            // For now, keep direct movement snappy
            velocity = dir.multiplyScalar(speed);
            this.currentVelocity.copy(velocity); // Sync inertia

            // Clear path since we're moving directly
            this.path = [];
            this.currentPathIndex = 0;

            return { velocity, reachedTarget: false, path: this.path, currentPathIndex: this.currentPathIndex };
        }

        // 2. Pathfinding Logic
        if (targetPos) {
            const distToTarget = enemyVec.distanceTo(targetPos);

            // Adaptive threshold logic (simplified for now, can be injected or passed in)
            // For now using standard threshold
            const pathfindThreshold = 1.0;

            if (distToTarget < pathfindThreshold) {
                // Close enough to skip pathfinding
                if (this.path.length > 0) {
                    this.path = [];
                    this.currentPathIndex = 0;
                }
                // Consider reached if within threshold
                reachedTarget = true;
                pathStatus = 'complete';

                // Slow down when reached
                this.currentVelocity.lerp(new Vector3(0, 0, 0), dt * 5);
                velocity.copy(this.currentVelocity);

            } else {
                // Recalculation logic
                const targetMoved = this.lastTargetPos.distanceTo(targetPos) > 3.0;
                const timePassed = ((Date.now() / 1000) - this.lastPathCalculationTime) > 1.0;
                const shouldRecalculate = this.path.length === 0 || (targetMoved && timePassed);

                if (shouldRecalculate) {
                    if (this.levelData && this.levelData.layout) {
                        const newPath = findPath(enemyVec, targetPos, this.levelData.layout, this.levelData.legend, this.cellSize);
                        if (newPath.length > 0) {
                            this.path = newPath;
                            this.currentPathIndex = 0;
                            this.lastTargetPos.copy(targetPos);
                            this.lastPathCalculationTime = Date.now() / 1000;
                        }
                    }
                }
            }
        }

        // 3. Follow Path

        if (this.path.length > 0 && this.currentPathIndex < this.path.length) {
            pathStatus = 'moving';

            // Stuck Detection
            this.stuckTimer += dt;
            if (this.stuckTimer > 0.5) {
                const distMoved = enemyVec.distanceTo(this.lastPosition);
                if (distMoved < 0.1) {
                    console.log('[EnemyMovement] Stuck detected! Clearing path.');
                    this.path = [];
                    this.currentPathIndex = 0;
                    pathStatus = 'stuck';
                }
                this.lastPosition.copy(enemyVec);
                this.stuckTimer = 0;
            }

            // Check if path was cleared by stuck detection
            if (this.path.length === 0) {
                return { velocity, reachedTarget, path: this.path, currentPathIndex: this.currentPathIndex, pathStatus };
            }

            // Loop to consume waypoints if we are close to them
            while (this.currentPathIndex < this.path.length) {
                const nextWaypoint = this.path[this.currentPathIndex];
                const dir = new Vector3(nextWaypoint.x - enemyVec.x, 0, nextWaypoint.z - enemyVec.z);
                const distToWaypoint = dir.length();
                const reachThreshold = 1.0; // ENEMY_SIZE

                if (distToWaypoint < reachThreshold) {
                    this.currentPathIndex++;
                    if (this.currentPathIndex >= this.path.length) {
                        // Reached end of path
                        // Check if this was a partial path (unreachable target)
                        const distToTarget = targetPos ? enemyVec.distanceTo(targetPos) : 0;
                        if (targetPos && distToTarget > 2.0) {
                            console.log('[EnemyMovement] Reached end of path but target is far. Unreachable?');
                            pathStatus = 'unreachable';
                        } else {
                            pathStatus = 'complete';
                            reachedTarget = true;
                        }

                        this.path = [];
                        this.currentPathIndex = 0;
                        break; // Stop processing
                    }
                } else {
                    // Steering / Inertia Logic
                    const desiredVelocity = dir.normalize().multiplyScalar(speed);
                    const turnSpeed = 5.0; // Adjust for more/less inertia

                    this.currentVelocity.lerp(desiredVelocity, dt * turnSpeed);
                    velocity.copy(this.currentVelocity);
                    break; // Found a valid waypoint to move towards
                }
            }
        } else {
            // Reset stuck timer if not moving
            this.stuckTimer = 0;
            this.lastPosition.copy(enemyVec);

            // Decelerate if no path
            if (!reachedTarget) { // If reachedTarget, we already handled deceleration above
                this.currentVelocity.lerp(new Vector3(0, 0, 0), dt * 5);
                velocity.copy(this.currentVelocity);
            }
        }

        return { velocity, reachedTarget, path: this.path, currentPathIndex: this.currentPathIndex, pathStatus };
    }

    // Helper to pick random patrol points
    getRandomPatrolPoint(rng, center = null, radius = Infinity) {
        if (center && radius !== Infinity) {
            return getRandomWalkableTileInRadius(this.levelData.layout, this.levelData.legend, this.cellSize, center, radius, rng);
        }
        return getRandomWalkableTile(this.levelData.layout, this.levelData.legend, this.cellSize, rng);
    }
}
