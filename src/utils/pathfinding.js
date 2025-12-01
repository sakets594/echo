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
    // Convert world coordinates to grid coordinates
    const startGrid = worldToGrid(start, cellSize);
    const endGrid = worldToGrid(end, cellSize);

    // Ensure start and end are within bounds
    if (!isValid(startGrid, layout) || !isValid(endGrid, layout)) {
        console.warn('Pathfinding: Start or End position is out of bounds');
        return [];
    }

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
            const tentativeGScore = (currentG !== undefined ? currentG : Infinity) + getDistance(current, neighbor);


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
export const getRandomWalkableTile = (layout, legend, cellSize = 2) => {
    const walkableTiles = [];
    layout.forEach((row, z) => {
        row.split('').forEach((char, x) => {
            if (isWalkable({ x, z }, layout, legend)) {
                walkableTiles.push({ x, z });
            }
        });
    });

    if (walkableTiles.length === 0) return null;

    const randomTile = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
    return gridToWorld(randomTile, cellSize);
};

// --- Helper Functions ---

const worldToGrid = (pos, cellSize) => {
    return {
        x: Math.round(pos.x / cellSize),
        z: Math.round(pos.z / cellSize)
    };
};

const gridToWorld = (gridPos, cellSize) => {
    return new Vector3(gridPos.x * cellSize, 1, gridPos.z * cellSize);
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
        { x: 1, z: 0 }   // Right
    ];

    for (const dir of dirs) {
        const neighbor = { x: gridPos.x + dir.x, z: gridPos.z + dir.z };
        if (isWalkable(neighbor, layout, legend)) {
            neighbors.push(neighbor);
        }
    }
    return neighbors;
};

const getDistance = (a, b) => {
    // Manhattan distance for heuristic
    return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
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
