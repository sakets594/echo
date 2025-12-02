# Enemy AI Test Plan

## Overview
Comprehensive test plan for the ECHO game's Enemy AI system, including all sensory mechanics, state transitions, and player interaction scenarios.

---

## 1. Enemy State Machine Tests

### 1.1 Patrol State
- [ ] **TC-PATROL-001**: Enemy spawns in patrol state
- [ ] **TC-PATROL-002**: Enemy selects random walkable patrol target on spawn
- [ ] **TC-PATROL-003**: Enemy moves at `patrolSpeed` (2.0 m/s default)
- [ ] **TC-PATROL-004**: Enemy picks new target after reaching current target
- [ ] **TC-PATROL-005**: Enemy only picks targets at least 6m away
- [ ] **TC-PATROL-006**: Enemy uses seeded RNG for deterministic patrol patterns
- [ ] **TC-PATROL-007**: Enemy color is yellow (#ffff00) during patrol

### 1.2 Investigate State
- [ ] **TC-INVESTIGATE-001**: Enemy enters investigate when detecting faint tremors (walking)
- [ ] **TC-INVESTIGATE-002**: Enemy moves toward noise source at `investigateSpeed` (3.0 m/s)
- [ ] **TC-INVESTIGATE-003**: Enemy color is orange (#ff8800) during investigation
- [ ] **TC-INVESTIGATE-004**: Enemy transitions to chase after frustration timer (15s default)
- [ ] **TC-INVESTIGATE-005**: Frustration timer resets when new investigation triggers

### 1.3 Chase State
- [ ] **TC-CHASE-001**: Enemy enters chase on Lidar pulse detection
- [ ] **TC-CHASE-002**: Enemy enters chase on loud tremors (sprinting)
- [ ] **TC-CHASE-003**: Enemy enters chase on breath detection
- [ ] **TC-CHASE-004**: Enemy moves at `huntSpeed` (5.0 m/s default)
- [ ] **TC-CHASE-005**: Enemy color is red (#ff0000) during chase
- [ ] **TC-CHASE-006**: Chase inertia prevents immediate state change (3s minimum)
- [ ] **TC-CHASE-007**: Enemy tracks player's last known position

### 1.4 Search State
- [ ] **TC-SEARCH-001**: Enemy enters search after losing player during chase
- [ ] **TC-SEARCH-002**: Enemy searches last known position for `searchDuration` (10s)
- [ ] **TC-SEARCH-003**: Enemy color is purple (#ff00ff) during search
- [ ] **TC-SEARCH-004**: Enemy returns to patrol after search timeout
- [ ] **TC-SEARCH-005**: Search can be interrupted by new detections

---

## 2. Sensory System Tests

### 2.1 Lidar Pulse Detection
- [ ] **TC-LIDAR-001**: Enemy detects Lidar within 30m range
- [ ] **TC-LIDAR-002**: Enemy ignores Lidar beyond 30m range
- [ ] **TC-LIDAR-003**: Lidar detection triggers chase state
- [ ] **TC-LIDAR-004**: Wall occlusion blocks Lidar detection
- [ ] **TC-LIDAR-005**: Clear line of sight required for detection
- [ ] **TC-LIDAR-006**: Lidar works regardless of player movement state (crouch/walk/sprint)
- [ ] **TC-LIDAR-007**: Multiple walls correctly block detection

### 2.2 Tremor Detection (Movement-based)
- [ ] **TC-TREMOR-001**: Walking generates faint tremors within 10m
- [ ] **TC-TREMOR-002**: Sprinting generates loud tremors within 20m
- [ ] **TC-TREMOR-003**: Crouching generates NO tremors
- [ ] **TC-TREMOR-004**: Faint tremors trigger investigate state
- [ ] **TC-TREMOR-005**: Loud tremors trigger chase state
- [ ] **TC-TREMOR-006**: Standing still generates no tremors
- [ ] **TC-TREMOR-007**: Tremor detection is distance-based (not occlusion-based)

### 2.3 Breath Detection (Proximity)
- [ ] **TC-BREATH-001**: Enemy detects player within 2m (base breath radius)
- [ ] **TC-BREATH-002**: Breath detection requires line of sight
- [ ] **TC-BREATH-003**: Obstacles (pillars) block breath detection
- [ ] **TC-BREATH-004**: Panting expands detection radius to 6m
- [ ] **TC-BREATH-005**: Panting state activates after stamina exhaustion
- [ ] **TC-BREATH-006**: Panting state lasts 3 seconds after stamina recovery
- [ ] **TC-BREATH-007**: Breath detection triggers chase state

### 2.4 Global Noise Detection
- [ ] **TC-NOISE-001**: Clapping generates loud noise (30 instant)
- [ ] **TC-NOISE-002**: Enemy investigates noise > 20
- [ ] **TC-NOISE-003**: Enemy chases noise > 80
- [ ] **TC-NOISE-004**: Noise detection within `clapSoundRadius` (20m)
- [ ] **TC-NOISE-005**: Noise level decays over time

---

## 3. Player Mechanics Tests

### 3.1 Movement States
- [ ] **TC-MOVE-001**: Walking speed is 3.0 m/s
- [ ] **TC-MOVE-002**: Crouching speed is 1.5 m/s
- [ ] **TC-MOVE-003**: Sprinting speed is 8.0 m/s
- [ ] **TC-MOVE-004**: Movement state correctly exposed via userData

### 3.2 Stamina System
- [ ] **TC-STAMINA-001**: Stamina drains while sprinting (25% per second)
- [ ] **TC-STAMINA-002**: Stamina recovers while not sprinting (10% per second)
- [ ] **TC-STAMINA-003**: Sprint disabled when stamina depleted
- [ ] **TC-STAMINA-004**: Panting state triggers at 0 stamina
- [ ] **TC-STAMINA-005**: Panting persists for 3s after full recovery
- [ ] **TC-STAMINA-006**: Stamina UI displays correctly

### 3.3 Audio Feedback
- [ ] **TC-AUDIO-001**: Crouch footsteps play at 0.8s interval, 0.15 volume
- [ ] **TC-AUDIO-002**: Walk footsteps play at 0.5s interval, 0.25 volume
- [ ] **TC-AUDIO-003**: Sprint footsteps play at 0.3s interval, 0.4 volume
- [ ] **TC-AUDIO-004**: playerWalk sound file loads correctly
- [ ] **TC-AUDIO-005**: Footsteps are spatially positioned

### 3.4 Noise Generation
- [ ] **TC-NOISEGEN-001**: Crouching generates 0% noise
- [ ] **TC-NOISEGEN-002**: Walking generates 2% noise per second
- [ ] **TC-NOISEGEN-003**: Sprinting generates 15% noise per second
- [ ] **TC-NOISEGEN-004**: Standing still generates 0% noise

---

## 4. Pathfinding Tests

### 4.1 A* Algorithm
- [ ] **TC-PATH-001**: Enemy finds valid path to target
- [ ] **TC-PATH-002**: Enemy avoids walls and obstacles
- [ ] **TC-PATH-003**: Path targets grid cell centers
- [ ] **TC-PATH-004**: Path recalculates when target moves significantly (>2m)
- [ ] **TC-PATH-005**: Pathfinding fails gracefully when no path exists

### 4.2 Movement Execution
- [ ] **TC-MOVE-EXEC-001**: Enemy follows waypoints in sequence
- [ ] **TC-MOVE-EXEC-002**: Enemy advances waypoint within enemy size radius (1m)
- [ ] **TC-MOVE-EXEC-003**: Enemy stops at final waypoint
- [ ] **TC-MOVE-EXEC-004**: Enemy uses kinematicVelocity physics
- [ ] **TC-MOVE-EXEC-005**: Enemy doesn't get stuck at waypoints
- [ ] **TC-MOVE-EXEC-006**: Path clears on state change

---

## 5. Anti-Exploit Tests ("Sherlock Fixes")

### 5.1 Anti-Kiting
- [ ] **TC-KITE-001**: Frustration timer activates during investigate
- [ ] **TC-KITE-002**: Investigate escalates to chase after 15s
- [ ] **TC-KITE-003**: Timer resets on new investigation trigger

### 5.2 Chase Inertia
- [ ] **TC-INERTIA-001**: Chase state persists for minimum 3 seconds
- [ ] **TC-INERTIA-002**: Enemy completes chase duration before state change
- [ ] **TC-INERTIA-003**: Inertia timer resets on chase re-entry

### 5.3 Panting Mechanic
- [ ] **TC-PANT-001**: Breath radius expands from 2m to 6m when panting
- [ ] **TC-PANT-002**: Panting makes hiding harder
- [ ] **TC-PANT-003**: Panting state is visible to player (UI feedback)

### 5.4 Silent Crouch
- [ ] **TC-SILENT-001**: Crouching bypasses all tremor detection
- [ ] **TC-SILENT-002**: Crouching is only detected by breath sense
- [ ] **TC-SILENT-003**: Crouching footsteps are quiet but audible to player

---

## 6. End Game Tests

### 6.1 Kill Condition
- [ ] **TC-KILL-001**: Enemy kills player within 2.5m distance
- [ ] **TC-KILL-002**: gameOver sound plays on kill
- [ ] **TC-KILL-003**: Game transitions to lost state
- [ ] **TC-KILL-004**: Kill works in all enemy states

### 6.2 Victory Condition
- [ ] **TC-WIN-001**: Victory sound plays when reaching exit
- [ ] **TC-WIN-002**: Game transitions to won state

---

## 7. Debug & Configuration Tests

### 7.1 Leva Controls
- [ ] **TC-LEVA-001**: huntSpeed adjustable (1-15 m/s)
- [ ] **TC-LEVA-002**: investigateSpeed adjustable (1-10 m/s)
- [ ] **TC-LEVA-003**: patrolSpeed adjustable (1-5 m/s)
- [ ] **TC-LEVA-004**: tremorRadiusWalk adjustable (1-50m)
- [ ] **TC-LEVA-005**: tremorRadiusSprint adjustable (10-100m)
- [ ] **TC-LEVA-006**: breathRadius adjustable (0.5-10m)
- [ ] **TC-LEVA-007**: lidarRange adjustable (10-50m)
- [ ] **TC-LEVA-008**: frustrationTime adjustable (1-20s)
- [ ] **TC-LEVA-009**: inertiaTime adjustable (0-10s)
- [ ] **TC-LEVA-010**: Changes apply in real-time

### 7.2 Debug UI
- [ ] **TC-DEBUG-001**: Enemy state displays correctly
- [ ] **TC-DEBUG-002**: Enemy position updates in real-time
- [ ] **TC-DEBUG-003**: Target position displays correctly
- [ ] **TC-DEBUG-004**: Velocity displays correctly
- [ ] **TC-DEBUG-005**: Waypoint distance displays when path exists
- [ ] **TC-DEBUG-006**: Player stamina displays correctly

### 7.3 Seeded Randomness
- [ ] **TC-SEED-001**: Same seed produces same patrol pattern
- [ ] **TC-SEED-002**: Level ID used as default seed
- [ ] **TC-SEED-003**: Custom seed can be provided
- [ ] **TC-SEED-004**: RNG doesn't produce NaN or invalid indices

---

## 8. Integration Tests

### 8.1 "Juke" Evasion Loop
- [ ] **TC-JUKE-001**: Player can sprint to create distance
- [ ] **TC-JUKE-002**: Breaking line of sight stops direct chase
- [ ] **TC-JUKE-003**: Going silent (crouch) prevents detection
- [ ] **TC-JUKE-004**: Enemy searches last known position
- [ ] **TC-JUKE-005**: Player can hide during search phase
- [ ] **TC-JUKE-006**: Complete evasion returns enemy to patrol

### 8.2 Multi-Modal Detection
- [ ] **TC-MULTI-001**: Lidar + Sprint triggers chase
- [ ] **TC-MULTI-002**: Walk near enemy triggers investigate
- [ ] **TC-MULTI-003**: Sprint far from enemy triggers investigate (sound only)
- [ ] **TC-MULTI-004**: Multiple detection sources handled correctly

### 8.3 Level-Specific Behavior
- [ ] **TC-LEVEL-001**: AI config can be overridden per level
- [ ] **TC-LEVEL-002**: Custom speeds work correctly
- [ ] **TC-LEVEL-003**: Custom radii work correctly
- [ ] **TC-LEVEL-004**: All 10 levels are playable

---

## Test Execution Notes

### Priority Levels
- **P0 (Critical)**: Core mechanics that break gameplay if failed
- **P1 (High)**: Important features that significantly impact experience
- **P2 (Medium)**: Polish and refinement features
- **P3 (Low)**: Edge cases and optimization

### Test Environment
- Browser: Chrome/Firefox (latest)
- Input: Keyboard (WASD + Shift + Ctrl + Space)
- Display: 1920x1080 recommended
- Audio: Headphones recommended for spatial audio

### Known Issues
- None currently documented

### Test Metrics
- Total Test Cases: **134**
- Automated: **0** (manual testing only)
- Pass Rate Target: **100%**

---

## Revision History
- **v1.0** (2025-12-02): Initial test plan created covering all implemented AI mechanics
