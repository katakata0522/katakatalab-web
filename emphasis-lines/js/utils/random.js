/**
 * Simple Linear Congruential Generator (LCG) for seeded randomness.
 * Uses Numerical Recipes constants for 32-bit LCG.
 * Allows reproducible random numbers for stable rendering.
 */

// LCG Constants (Numerical Recipes 32-bit)
const LCG_A = 1664525;
const LCG_C = 1013904223;
const LCG_M = 4294967296; // 2^32

export class Random {
    constructor(seed = 12345) {
        this.seed = seed >>> 0; // Normalize to 32-bit unsigned
    }

    /**
     * Set a new seed.
     * @param {number} seed 
     */
    setSeed(seed) {
        this.seed = seed >>> 0; // Normalize to 32-bit unsigned
    }

    /**
     * Returns a float between 0 and 1.
     */
    next() {
        this.seed = (LCG_A * this.seed + LCG_C) % LCG_M;
        return this.seed / LCG_M;
    }

    /**
     * Returns a float between min and max.
     */
    range(min, max) {
        return min + this.next() * (max - min);
    }
}
