# Minimap System

The Minimap provides a top-down view of the level, helping players navigate the dark environment.

## Rendering
The Minimap is a separate React component that renders an HTML Canvas overlay.

1.  **Grid Parsing**: It reads the `levelData` JSON.
2.  **Drawing**: It iterates through the grid and draws rectangles for Walls, Floors, and the Player.
3.  **Fog of War**: Initially, only the area around the Start is visible. As the player moves, we update a "visited" set to reveal more of the map.

## Synchronization
The Minimap needs to track the player's real-time position.

-   We pass a `playerRef` (referencing the Rapier RigidBody) to the Minimap component.
-   In a `useFrame` loop, we read the player's position from the physics engine and update the Minimap's drawing context.
-   We convert World Coordinates (3D) to Grid Coordinates (2D) to draw the player marker correctly.

```javascript
// Minimap.jsx
useFrame(() => {
    if (!playerRef.current) return;
    const { x, z } = playerRef.current.translation();
    // Convert to canvas coordinates
    const mapX = (x / CELL_SIZE) * TILE_SIZE;
    const mapY = (z / CELL_SIZE) * TILE_SIZE;
    // Draw...
});
```
