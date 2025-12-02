/**
 * Simple Seeded Random Number Generator (LCG - Linear Congruential Generator)
 * Ensures deterministic, reproducible randomness for each level
 */
export class SeededRandom {
    constructor(seed) {
        // Convert to number if string, handle NaN, ensure positive
        const numericSeed = Number(seed) || 12345;
        this.seed = numericSeed % 2147483647;
        if (this.seed <= 0) this.seed += 2147483646;

        console.log(`[SeededRandom] Initialized with seed: ${seed} -> ${this.seed}`);
    }

    /**
     * Returns a pseudo-random number between 0 (inclusive) and 1 (exclusive)
     */
    next() {
        this.seed = (this.seed * 16807) % 2147483647;
        const result = (this.seed - 1) / 2147483646;

        // Safety check
        if (isNaN(result) || !isFinite(result)) {
            console.error(`[SeededRandom] Generated NaN or Infinity! Seed: ${this.seed}`);
            this.seed = 12345; // Reset to default
            return 0.5;
        }

        return result;
    }

    /**
     * Returns a random integer between min (inclusive) and max (exclusive)
     */
    nextInt(min, max) {
        if (min >= max) {
            console.error(`[SeededRandom] Invalid range: min=${min}, max=${max}`);
            return min;
        }

        const random = this.next();
        const result = Math.floor(random * (max - min)) + min;

        // Safety check
        if (isNaN(result) || !isFinite(result) || result < min || result >= max) {
            console.error(`[SeededRandom] Invalid nextInt result: ${result} (min=${min}, max=${max}, random=${random})`);
            return min; // Return minimum value as safe fallback
        }

        return result;
    }

    /**
     * Returns a random element from an array
     */
    choice(array) {
        if (array.length === 0) return null;
        return array[this.nextInt(0, array.length)];
    }
}
