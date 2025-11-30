import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

class LevelValidator {
    constructor() {
        this.constraints = [
            this.checkSchema,
            this.checkSymbolCounts,
            this.checkGeometry,
            this.checkSafeStart,
            this.checkKeyDoorSeparation,
            this.checkLockedExit,
            this.checkConnectivity,
            this.checkRiskForReward,
            this.checkSafeStartArea
        ];
    }

    validate(levelPath) {
        console.log(`\nValidating: ${path.basename(levelPath)}`);
        try {
            const content = fs.readFileSync(levelPath, 'utf8');
            const level = JSON.parse(content);
            const results = {
                file: path.basename(levelPath),
                valid: true,
                errors: [],
                difficultyScore: 0,
                metrics: {}
            };

            for (const check of this.constraints) {
                const result = check.call(this, level);
                if (!result.passed) {
                    results.valid = false;
                    results.errors.push(...result.errors);
                }
            }

            if (results.valid) {
                const difficulty = this.calculateDifficulty(level);
                results.difficultyScore = difficulty.score;
                results.metrics = difficulty.metrics;
                console.log(`✅ Passed! Difficulty Score: ${difficulty.score.toFixed(2)}`);
            } else {
                console.log(`❌ Failed with ${results.errors.length} errors:`);
                results.errors.forEach(e => console.log(`  - ${e}`));
            }

            return results;
        } catch (err) {
            console.error(`Error reading/parsing file: ${err.message}`);
            return { valid: false, errors: [err.message] };
        }
    }

    // --- Helpers ---

    getGrid(level) {
        return level.layout.map(row => row.split(''));
    }

    findPos(grid, char) {
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                if (grid[y][x] === char) return { x, y };
            }
        }
        return null;
    }

    findAllPos(grid, char) {
        const positions = [];
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                if (grid[y][x] === char) positions.push({ x, y });
            }
        }
        return positions;
    }

    manhattan(p1, p2) {
        return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
    }

    // --- Constraints ---

    checkSchema(level) {
        const errors = [];
        if (!level.width || !level.height || !level.layout || !level.legend) {
            errors.push("Missing required fields (width, height, layout, legend)");
        }
        return { passed: errors.length === 0, errors };
    }

    checkSymbolCounts(level) {
        const grid = this.getGrid(level);
        const counts = {};
        grid.flat().forEach(c => counts[c] = (counts[c] || 0) + 1);

        const errors = [];
        ['S', 'X', 'K', 'L'].forEach(char => {
            if (counts[char] !== 1) errors.push(`Must have exactly one '${char}' (found ${counts[char] || 0})`);
        });
        if (!counts['E'] && level.level_id !== 'level_1_atrium') {
            // errors.push("Must have at least one 'E'"); 
        }
        return { passed: errors.length === 0, errors };
    }

    checkGeometry(level) {
        const errors = [];
        if (level.layout.length !== level.height) errors.push(`Layout height ${level.layout.length} != ${level.height}`);
        level.layout.forEach((row, i) => {
            if (row.length !== level.width) errors.push(`Row ${i} width ${row.length} != ${level.width}`);
        });
        return { passed: errors.length === 0, errors };
    }

    checkSafeStart(level) {
        const grid = this.getGrid(level);
        const startPos = this.findPos(grid, 'S');
        if (!startPos) return { passed: false, errors: ["No Start position"] };

        const row = grid[startPos.y];
        const errors = [];
        if (row.includes('E')) errors.push("Start row contains Enemy");
        if (row.includes('K')) errors.push("Start row contains Key");
        if (row.includes('X')) errors.push("Start row contains Exit");

        return { passed: errors.length === 0, errors };
    }

    checkKeyDoorSeparation(level) {
        const grid = this.getGrid(level);
        const k = this.findPos(grid, 'K');
        const l = this.findPos(grid, 'L');
        if (!k || !l) return { passed: false, errors: ["Missing K or L"] };

        const dist = this.manhattan(k, l);
        const min = 5;
        if (dist <= min) return { passed: false, errors: [`Key too close to Locked Door (dist ${dist} <= ${min})`] };
        return { passed: true, errors: [] };
    }

    checkLockedExit(level) {
        const grid = this.getGrid(level);
        const s = this.findPos(grid, 'S');
        const x = this.findPos(grid, 'X');
        const l = this.findPos(grid, 'L');

        // Path S -> X treating L as Wall
        const pathWithoutKey = this.bfs(grid, s, x, ['#', 'L']);
        if (pathWithoutKey) return { passed: false, errors: ["Exit reachable without unlocking door"] };

        // Path L -> X (should be reachable)
        const pathFromDoor = this.bfs(grid, l, x, ['#']);
        if (!pathFromDoor) return { passed: false, errors: ["Exit not reachable from Locked Door"] };

        return { passed: true, errors: [] };
    }

    checkConnectivity(level) {
        const grid = this.getGrid(level);
        const s = this.findPos(grid, 'S');
        const walkableCount = grid.flat().filter(c => c !== '#').length;

        const reachable = this.floodFill(grid, s);
        if (reachable !== walkableCount) {
            return { passed: false, errors: [`Map not fully connected. Reachable: ${reachable}, Total Walkable: ${walkableCount}`] };
        }
        return { passed: true, errors: [] };
    }

    checkRiskForReward(level) {
        const grid = this.getGrid(level);
        const s = this.findPos(grid, 'S');
        const k = this.findPos(grid, 'K');
        const enemies = this.findAllPos(grid, 'E');

        // Calculate Danger Zones
        const dangerNodes = new Set();
        enemies.forEach(e => {
            for (let dy = -3; dy <= 3; dy++) {
                for (let dx = -3; dx <= 3; dx++) {
                    const nx = e.x + dx;
                    const ny = e.y + dy;
                    if (nx >= 0 && nx < level.width && ny >= 0 && ny < level.height) {
                        dangerNodes.add(`${nx},${ny}`);
                    }
                }
            }
        });

        // Path S -> K avoiding Danger Zones
        const safePath = this.bfs(grid, s, k, ['#', 'L'], (x, y) => !dangerNodes.has(`${x},${y}`));

        // Path S -> K ignoring Danger Zones (to ensure it's possible at all)
        const anyPath = this.bfs(grid, s, k, ['#', 'L']);

        if (!anyPath) return { passed: false, errors: ["Key not reachable from Start"] };

        if (safePath && enemies.length > 0) {
            return { passed: false, errors: ["Path to Key exists without entering Enemy Danger Zone"] };
        }

        return { passed: true, errors: [] };
    }

    checkSafeStartArea(level) {
        const grid = this.getGrid(level);
        const s = this.findPos(grid, 'S');
        const enemies = this.findAllPos(grid, 'E');

        if (!s) return { passed: false, errors: ["No Start position"] };

        const minSafeDist = 8;
        const errors = [];

        enemies.forEach(e => {
            const dist = this.manhattan(s, e);
            if (dist <= minSafeDist) {
                errors.push(`Enemy at (${e.x},${e.y}) is too close to Start (dist ${dist} <= ${minSafeDist})`);
            }
        });

        return { passed: errors.length === 0, errors };
    }

    // --- Difficulty Calculation ---

    calculateDifficulty(level) {
        const grid = this.getGrid(level);
        const s = this.findPos(grid, 'S');
        const k = this.findPos(grid, 'K');
        const x = this.findPos(grid, 'X');
        const enemies = this.findAllPos(grid, 'E');
        const safeSpots = this.findAllPos(grid, 'O').length + this.findCorners(grid).length;
        const walkable = grid.flat().filter(c => c !== '#').length;

        // 1. Danger Zone Exposure
        const fullPath = this.bfsPath(grid, s, k, ['#', 'L']);
        let dangerExp = 0;
        if (fullPath) {
            fullPath.forEach(p => {
                enemies.forEach(e => {
                    if (Math.abs(p.x - e.x) <= 3 && Math.abs(p.y - e.y) <= 3) dangerExp++;
                });
            });
        }

        // 2. Enemy Density
        const enemyDensity = (enemies.length / walkable) * 100;

        // 3. Exploration Factor (Dead Ends > 5)
        const deadEnds = this.countDeadEnds(grid, 5);

        // 4. Cover Scarcity
        const coverScarcity = (1 - (safeSpots / walkable)) * 10;

        // 5. Path Complexity
        const pathLen = (fullPath ? fullPath.length : 0) + (this.bfs(grid, k, x, ['#']) || 0);
        const pathComplexity = pathLen / 10;

        // Formula
        const score = (dangerExp * 3.0) + (enemyDensity * 1.5) + (deadEnds * 1.0) + (coverScarcity * 2.0) + (pathComplexity * 0.5);

        return {
            score,
            metrics: { dangerExp, enemyDensity, deadEnds, coverScarcity, pathComplexity }
        };
    }

    // --- Pathfinding & Utils ---

    bfs(grid, start, end, obstacles, extraCheck = () => true) {
        const q = [{ ...start, dist: 0 }];
        const visited = new Set([`${start.x},${start.y}`]);

        while (q.length > 0) {
            const { x, y, dist } = q.shift();
            if (x === end.x && y === end.y) return dist;

            [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && ny >= 0 && nx < grid[0].length && ny < grid.length) {
                    const cell = grid[ny][nx];
                    if (!obstacles.includes(cell) && !visited.has(`${nx},${ny}`) && extraCheck(nx, ny)) {
                        visited.add(`${nx},${ny}`);
                        q.push({ x: nx, y: ny, dist: dist + 1 });
                    }
                }
            });
        }
        return null;
    }

    bfsPath(grid, start, end, obstacles) {
        const q = [{ ...start, path: [start] }];
        const visited = new Set([`${start.x},${start.y}`]);

        while (q.length > 0) {
            const { x, y, path } = q.shift();
            if (x === end.x && y === end.y) return path;

            [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && ny >= 0 && nx < grid[0].length && ny < grid.length) {
                    const cell = grid[ny][nx];
                    if (!obstacles.includes(cell) && !visited.has(`${nx},${ny}`)) {
                        visited.add(`${nx},${ny}`);
                        q.push({ x: nx, y: ny, path: [...path, { x: nx, y: ny }] });
                    }
                }
            });
        }
        return null;
    }

    floodFill(grid, start) {
        const q = [start];
        const visited = new Set([`${start.x},${start.y}`]);
        let count = 0;

        while (q.length > 0) {
            const { x, y } = q.shift();
            count++;

            [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && ny >= 0 && nx < grid[0].length && ny < grid.length) {
                    const cell = grid[ny][nx];
                    if (cell !== '#' && !visited.has(`${nx},${ny}`)) {
                        visited.add(`${nx},${ny}`);
                        q.push({ x: nx, y: ny });
                    }
                }
            });
        }
        return count;
    }

    countDeadEnds(grid, minDepth) {
        let deadEnds = 0;
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[0].length; x++) {
                if (grid[y][x] === '#') continue;
                let walls = 0;
                [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
                    const nx = x + dx, ny = y + dy;
                    if (nx < 0 || ny < 0 || nx >= grid[0].length || ny >= grid.length || grid[ny][nx] === '#') {
                        walls++;
                    }
                });
                if (walls >= 3) deadEnds++;
            }
        }
        return deadEnds;
    }

    findCorners(grid) {
        const corners = [];
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[0].length; x++) {
                if (grid[y][x] === '#') continue;
                let walls = 0;
                [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
                    const nx = x + dx, ny = y + dy;
                    if (nx < 0 || ny < 0 || nx >= grid[0].length || ny >= grid.length || grid[ny][nx] === '#') {
                        walls++;
                    }
                });
                if (walls >= 2) corners.push({ x, y });
            }
        }
        return corners;
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const validator = new LevelValidator();
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log("Usage: node validate_levels.js <path_to_level_json> [more_paths...]");
    } else {
        args.forEach(file => validator.validate(file));
    }
}

export default LevelValidator;
