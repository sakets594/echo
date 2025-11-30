# Procedural Level Generation

ECHO features infinite replayability through procedurally generated levels.

## Algorithm: Random Walk
We use a **Random Walk** algorithm to carve out the level layout.

1.  **Grid Initialization**: Start with a grid full of Walls (`#`).
2.  **Carving**: Start at a random point and move in random cardinal directions, turning walls into Floors (`.`).
3.  **Constraints**: We enforce a minimum number of floor tiles to ensure the map is playable.

## Entity & Objective Placement
Once the layout is carved, we place game objects:

1.  **Start (S)**: Placed at a random floor tile.
2.  **Locked Door (L) & Exit (X)**: Placed far from the Start. The Exit is always behind the Locked Door.
3.  **Key (K)**: Placed such that the player must traverse a "Danger Zone" to reach it.
4.  **Enemies (E)**: Placed in areas that intersect the path to the Key, enforcing the "Risk for Reward" design pillar.

## Validation
After generation, a **Validator Script** runs BFS (Breadth-First Search) to ensure:
-   The map is fully connected.
-   The Key is reachable.
-   The Exit is reachable from the Door.
-   The "Safe Start Area" constraint is met (Enemies > 8 tiles away).
