# Gameplay Tweaks for Environmental Hazards

*Problem: Current gameplay values (Speed, Noise) make hazards feel optional or "forced" because the core threat (Enemy) is too weak.*

## 1. Pursuit Pressure (Speed Balancing)
**Current State:**
- Player Walk: 5
- Player Sprint: 10
- Enemy Hunt: 4
- *Result: Player can casually walk away from a hunting enemy. No need to use hazards.*

**Required Tweak:**
- **Enemy Hunt Speed**: Increase to **7.0** (Faster than Walk, slower than Sprint).
- **Logic**:
    - If Player Walks (5) -> Caught.
    - If Player Sprints (10) -> Escapes, but generates **High Noise**.
    - *Outcome*: Player is forced to Sprint (making noise) OR use a Hazard (Steam Vent) to hide.

## 2. Stealth Viability (Noise Thresholds)
**Current State:**
- Player Walk Noise: 5/sec
- Enemy Stalk Threshold: > 50
- *Result: Walking is too safe. Players rarely trigger "Stalk" mode unless they spam Clap.*

**Required Tweak:**
- **Enemy Stalk Threshold**: Lower to **30**.
- **Enemy Hunt Threshold**: Lower to **60**.
- **Player Walk Noise**: Increase to **8/sec**.
- *Outcome*: Continuous walking will trigger "Stalk" mode quickly, forcing players to **Crouch** (0 Noise) or stop frequently. This makes "Crunchy Surfaces" (High Noise) actually dangerous.

## 3. State Persistence (Hunting Mode)
**Current State:**
- Enemy switches state immediately when noise drops.
- *Result: Player can just stop moving to end a chase.*

**Required Tweak:**
- **Hunt Cooldown**: Add a `huntTimer` (e.g., 5 seconds).
- **Logic**: When Noise drops below threshold, Enemy stays in "Hunt" mode for 5 more seconds, moving to the *last known position*.
- *Outcome*: Player must actively evade/hide, not just stop.

## 4. Hazard-Specific Mechanics
- **Crunchy Surfaces**: Since "Jump" is disabled, the only counter-play is **Slow Walk** (Crouch).
    - *Tweak*: Ensure "Crunchy Surface" noise ignores the Crouch modifier (always loud).
- **Steam Vents**:
    - *Tweak*: Needs to reset the Enemy's `targetPosition` to null or "lost" if the player enters the steam zone while crouching.

## Summary of Changes
| Parameter | Current | New | Reason |
| :--- | :--- | :--- | :--- |
| Enemy Hunt Speed | 4 | **7** | Force Sprinting/Evasion |
| Stalk Threshold | 50 | **30** | Make Walking riskier |
| Hunt Threshold | 80 | **60** | Easier to trigger Hunt |
| Hunt Cooldown | 0s | **5s** | Prevent cheese (stopping) |
