# Research: Juke & Evasion Mechanics in Horror Games

To implement a realistic "Juke" system in *Echo*, we analyzed mechanics from industry-standard horror/stealth games.

## 1. The Core Mechanic: "Last Known Position" (LKP)
Used in: *Alien: Isolation*, *Splinter Cell*, *Metal Gear Solid*.

When the AI loses track of the player (Visual or Audio), it does not reset. Instead, it targets the **Last Known Position**.
- **The Juke**: The player creates a stimulus (noise/visual) at Point A, then silently moves to Point B while the AI investigates Point A.
- **Implementation in Echo**:
    - Enemy stores `lastKnownVector`.
    - If `LineOfSight` is broken, Enemy continues to `lastKnownVector`.
    - **Player Strategy**: Sprint to corner -> Break LOS -> Crouch/Walk away.

## 2. Search Patterns & Persistence
Used in: *Alien: Isolation*, *Outlast*.

Upon reaching the LKP and finding nothing, the AI enters a **Search State**.
- **Behavior**: The AI checks nearby hiding spots (lockers, under beds) or looks around randomly.
- **Duration**: The search lasts for a variable time (e.g., 5-10s) before returning to Patrol.
- **Implementation in Echo**:
    - Enemy reaches `lastKnownVector`.
    - Enters `Searching` state.
    - Picks 2-3 random points within 3m radius to "look at".
    - **Player Strategy**: Don't just hide *at* the corner; move *past* it.

## 3. "Mind Gaming" & Looping
Used in: *Dead by Daylight*.

- **Red Stain / Directional Cues**: Killers emit a light/stain showing their facing direction. Survivors use this to predict movement around high walls.
- **Double Back**: The Killer (or Survivor) fakes moving one way around a loop, then doubles back to catch the other off-guard.
- **Implementation in Echo**:
    - **Lidar as "Red Stain"**: The Enemy could emit a faint "pulse" or sound directionality that lets the player know which way it is facing through walls (if close).
    - **Prediction**: If the Enemy sees the player running Left, it might try to intercept (advanced) or just follow (standard). For *Echo*, simple following is likely sufficient for now.

## 4. The "Director" AI (Pacing)
Used in: *Alien: Isolation*, *Left 4 Dead*.

A background system that monitors "Tension".
- If the player hasn't seen the enemy in a while, the Director "hints" the enemy towards the player (without giving exact location).
- If the player is under high stress (constant chases), the Director pulls the enemy away to give breathing room.
- **Implementation in Echo**:
    - **Teleport/Leash**: If Enemy is > 50m away for too long, respawn/move it closer (e.g., to a vent nearby).
    - **Mercy**: If Player dies repeatedly, slightly lower Enemy speed or detection radius? (Maybe later).

## Summary for Echo Implementation
To support "Juking", we need:
1.  **LKP Memory**: Enemy runs to where it *last* heard/saw you, not where you *are*.
2.  **Decay/Search**: Enemy lingers at LKP, giving you time to sneak away.
3.  **Stamina/Speed Gap**: Player Sprint (10) > Enemy Hunt (7) allows creating the gap needed to break LOS.
