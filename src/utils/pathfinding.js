import { Vector3 } from 'three';

// Constants
const DIAGONAL_COST = 1.414;
const STRAIGHT_COST = 1;

/**
 * A* Pathfinding Algorithm
 * @param {Vector3} start - Start position (world coordinates)
 * @param {Vector3} end - End position (world coordinates)
 * @param {Array<string>} layout - Level layout grid
 * @param {Object} legend - Legend mapping characters to types
 * @param {number} cellSize - Size of each grid cell
 * @returns {Array<Vector3>} - Array of waypoints (world coordinates)
 */
export const findPath = (start, end, layout, legend, cellSize = 2) => {
    // Convert world positions to grid coordinates
    const startGridX = Math.floor(start.x / cellSize);
    const startGridZ = Math.floor(start.z / cellSize);
    const endGridX = Math.floor(end.x / cellSize);
    const endGridZ = Math.floor(end.z / cellSize);

    // Check bounds silently - return empty path if out of bounds
    if (startGridX < 0 || startGridX >= layout[0].length || startGridZ < 0 || startGridZ >= layout.length ||
        endGridX < 0 || endGridX >= layout[0].length || endGridZ < 0 || endGridZ >= layout.length) {
        return [];
    }

    // Reconstruct grid objects for consistency with existing logic
    const startGrid = { x: startGridX, z: startGridZ };
    const endGrid = { x: endGridX, z: endGridZ };

    // Check if end is walkable, if not, find nearest walkable neighbor
    let targetGrid = endGrid;
    if (!isWalkable(targetGrid, layout, legend)) {
        const neighbors = getNeighbors(targetGrid, layout, legend);
        if (neighbors.length > 0) {
            // Pick closest neighbor to original target
            neighbors.sort((a, b) => getDistance(a, endGrid) - getDistance(b, endGrid));
            targetGrid = neighbors[0];
        } else {
            console.warn('Pathfinding: Target is unreachable (inside obstacle)');
            return [];
        }
    }

    // A* Initialization
    const openSet = [];
    const closedSet = new Set();
    const cameFrom = new Map();

    const gScore = new Map(); // Cost from start to node
    const fScore = new Map(); // Estimated total cost (g + h)

    const startKey = `${startGrid.x},${startGrid.z}`;
    gScore.set(startKey, 0);
    fScore.set(startKey, getDistance(startGrid, targetGrid));

    openSet.push(startGrid);


    while (openSet.length > 0) {
        // Get node with lowest fScore
        openSet.sort((a, b) => {
            const fA = fScore.get(`${a.x},${a.z}`) || Infinity;
            const fB = fScore.get(`${b.x},${b.z}`) || Infinity;
            return fA - fB;
        });

        const current = openSet.shift();
        const currentKey = `${current.x},${current.z}`;


        // Reached target?
        if (current.x === targetGrid.x && current.z === targetGrid.z) {
            return reconstructPath(cameFrom, current, cellSize);
        }

        closedSet.add(currentKey);

        const neighbors = getNeighbors(current, layout, legend);

        for (const neighbor of neighbors) {
            const neighborKey = `${neighbor.x},${neighbor.z}`;

            if (closedSet.has(neighborKey)) {
                continue;
            }

            const currentG = gScore.get(currentKey);
            // Calculate cost based on movement type (diagonal vs straight)
            const isDiagonal = neighbor.x !== current.x && neighbor.z !== current.z;
            const moveCost = isDiagonal ? DIAGONAL_COST : STRAIGHT_COST;

            const tentativeGScore = (currentG !== undefined ? currentG : Infinity) + moveCost;


            if (tentativeGScore < (gScore.get(neighborKey) ?? Infinity)) {
                cameFrom.set(neighborKey, current);
                gScore.set(neighborKey, tentativeGScore);
                fScore.set(neighborKey, tentativeGScore + getDistance(neighbor, targetGrid));

                if (!openSet.some(n => n.x === neighbor.x && n.z === neighbor.z)) {
                    openSet.push(neighbor);
                }
            }
        }
    }

    // No path found
    console.warn(`Pathfinding: No path found from ${startKey} to ${targetGrid.x},${targetGrid.z}`);
    return [];
};

/**
 * Get a random walkable tile from the layout
 */
export const getRandomWalkableTile = (layout, legend, cellSize = 2, rng = null) => {
    return getRandomWalkableTileInRadius(layout, legend, cellSize, null, Infinity, rng);
};

/**
 * Get a random walkable tile within a radius of a center point
 */
export const getRandomWalkableTileInRadius = (layout, legend, cellSize = 2, center = null, radius = Infinity, rng = null) => {
    const walkableTiles = [];

    // Optimization: If radius is small, only check relevant grid area
    let minX = 0, maxX = layout[0].length - 1;
    let minZ = 0, maxZ = layout.length - 1;

    if (center && radius !== Infinity) {
        const centerGrid = worldToGrid(center, cellSize);
        const radiusGrid = Math.ceil(radius / cellSize);
        minX = Math.max(0, centerGrid.x - radiusGrid);
        maxX = Math.min(layout[0].length - 1, centerGrid.x + radiusGrid);
        minZ = Math.max(0, centerGrid.z - radiusGrid);
        maxZ = Math.min(layout.length - 1, centerGrid.z + radiusGrid);
    }

    for (let z = minZ; z <= maxZ; z++) {
        const row = layout[z];
        for (let x = minX; x <= maxX; x++) {
            const char = row[x];
            if (isWalkable({ x, z }, layout, legend)) {
                // Check radius if center is provided
                if (center && radius !== Infinity) {
                    const tilePos = gridToWorld({ x, z }, cellSize);
                    if (tilePos.distanceTo(center) <= radius) {
                        walkableTiles.push({ x, z });
                    }
                } else {
                    walkableTiles.push({ x, z });
                }
            }
        }
    }

    if (walkableTiles.length === 0) return null;

    // Use seeded RNG if provided, otherwise use Math.random
    let randomIndex;
    if (rng) {
        randomIndex = rng.nextInt(0, walkableTiles.length);
        // Bounds check for safety
        if (randomIndex < 0 || randomIndex >= walkableTiles.length) {
            console.error(`[Pathfinding] Invalid random index: ${randomIndex} (array length: ${walkableTiles.length})`);
            randomIndex = Math.floor(Math.random() * walkableTiles.length);
        }
    } else {
        randomIndex = Math.floor(Math.random() * walkableTiles.length);
    }

    const randomTile = walkableTiles[randomIndex];

    if (!randomTile) {
        console.error(`[Pathfinding] randomTile is undefined! Index: ${randomIndex}, Array length: ${walkableTiles.length}`);
        return null;
    }

    return gridToWorld(randomTile, cellSize);
};

// --- Helper Functions ---

const worldToGrid = (pos, cellSize) => {
    return {
        x: Math.floor(pos.x / cellSize),
        z: Math.floor(pos.z / cellSize)
    };
};

const gridToWorld = (gridPos, cellSize) => {
    return new Vector3(
        (gridPos.x * cellSize) + (cellSize / 2),
        1,
        (gridPos.z * cellSize) + (cellSize / 2)
    );
};

const isValid = (gridPos, layout) => {
    return gridPos.z >= 0 && gridPos.z < layout.length &&
        gridPos.x >= 0 && gridPos.x < layout[0].length;
};

const isWalkable = (gridPos, layout, legend) => {
    if (!isValid(gridPos, layout)) {
        return false;
    }
    const char = layout[gridPos.z][gridPos.x];
    const type = legend[char];
    const walkable = type !== 'Wall' && type !== 'Pillar' && type !== 'Locked Door';
    return walkable;
};

const getNeighbors = (gridPos, layout, legend) => {
    const neighbors = [];
    const dirs = [
        { x: 0, z: -1 }, // Up
        { x: 0, z: 1 },  // Down
        { x: -1, z: 0 }, // Left
        { x: 1, z: 0 },   // Right
        // Diagonals
        { x: -1, z: -1 }, // Up-Left
        { x: 1, z: -1 },  // Up-Right
        { x: -1, z: 1 },  // Down-Left
        { x: 1, z: 1 }    // Down-Right
    ];

    for (const dir of dirs) {
        const neighbor = { x: gridPos.x + dir.x, z: gridPos.z + dir.z };

        // Basic walkability check
        if (isWalkable(neighbor, layout, legend)) {
            // Diagonal check: prevent corner cutting
            if (dir.x !== 0 && dir.z !== 0) {
                // Check adjacent cardinals
                const card1 = { x: gridPos.x + dir.x, z: gridPos.z };
                const card2 = { x: gridPos.x, z: gridPos.z + dir.z };

                if (isWalkable(card1, layout, legend) && isWalkable(card2, layout, legend)) {
                    neighbors.push(neighbor);
                }
            } else {
                neighbors.push(neighbor);
            }
        }
    }
    return neighbors;
};

const getDistance = (a, b) => {
    // Octile distance for 8-direction movement
    const dx = Math.abs(a.x - b.x);
    const dz = Math.abs(a.z - b.z);
    return (dx + dz) + (DIAGONAL_COST - 2 * STRAIGHT_COST) * Math.min(dx, dz);
};

const reconstructPath = (cameFrom, current, cellSize) => {
    const totalPath = [gridToWorld(current, cellSize)];
    let currentKey = `${current.x},${current.z}`;

    while (cameFrom.has(currentKey)) {
        current = cameFrom.get(currentKey);
        currentKey = `${current.x},${current.z}`;
        totalPath.unshift(gridToWorld(current, cellSize));
    }
    return totalPath;
};
