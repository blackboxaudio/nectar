import { describe, expect, it } from 'vitest'
import {
    bestRationalApproximation,
    calculateStartAngle,
    calculateTotalAngle,
    clamp,
    createArcPath,
    decibelsToGain,
    findGreatestCommonDivisor,
    gainToDecibels,
    polarToCartesian,
    round,
    valueToAngle,
} from './math.utils'

describe('clamp', () => {
    it('defaults to the [0, 1] range', () => {
        expect(clamp(5)).toBe(1)
        expect(clamp(-1)).toBe(0)
        expect(clamp(0.5)).toBe(0.5)
    })

    it('respects explicit bounds', () => {
        expect(clamp(5, 0, 10)).toBe(5)
        expect(clamp(-5, -10, -1)).toBe(-5)
        expect(clamp(15, 0, 10)).toBe(10)
    })
})

describe('round', () => {
    it('rounds to the requested number of fraction digits', () => {
        expect(round(3.14159, 2)).toBe(3.14)
        expect(round(2.71828, 3)).toBe(2.718)
        expect(round(5, 0)).toBe(5)
        expect(round(1.999, 2)).toBe(2)
    })
})

describe('gainToDecibels', () => {
    it('converts unity gain to 0 dB and half gain to about -6 dB', () => {
        expect(gainToDecibels(1)).toBe(0)
        expect(gainToDecibels(0.5)).toBeCloseTo(-6.0206, 4)
    })

    /**
     * These two behaviors are pinned deliberately: over-unity gain is rejected as NaN
     * rather than mapped to positive dB, and silence maps to -Infinity. Consumers that
     * feed meters MUST clamp their gain into [0, 1] first or displays will blank out.
     */
    it('returns NaN outside [0, 1] and -Infinity at zero', () => {
        expect(gainToDecibels(1.5)).toBeNaN()
        expect(gainToDecibels(-0.1)).toBeNaN()
        expect(gainToDecibels(0)).toBe(-Infinity)
    })
})

describe('decibelsToGain', () => {
    it('converts decibels back to linear gain', () => {
        expect(decibelsToGain(0)).toBe(1)
        expect(decibelsToGain(-6.0206)).toBeCloseTo(0.5, 4)
    })

    it('treats -100 dB and below as silence', () => {
        expect(decibelsToGain(-100)).toBe(0)
        expect(decibelsToGain(-200)).toBe(0)
    })

    it('round-trips with gainToDecibels inside the audible range', () => {
        for (const db of [-60, -40, -20, -12, -6, -3, 0]) {
            expect(gainToDecibels(decibelsToGain(db))).toBeCloseTo(db, 6)
        }
    })

    it('rejects non-numeric input', () => {
        expect(decibelsToGain(Number.NaN)).toBeNaN()
    })
})

describe('polarToCartesian', () => {
    it('measures angles from 12 o-clock', () => {
        const [topX, topY] = polarToCartesian(50, 50, 40, 0)
        expect(topX).toBeCloseTo(50, 9)
        expect(topY).toBeCloseTo(10, 9)

        const [rightX, rightY] = polarToCartesian(50, 50, 40, 90)
        expect(rightX).toBeCloseTo(90, 9)
        expect(rightY).toBeCloseTo(50, 9)
    })
})

describe('valueToAngle', () => {
    it('sweeps a unipolar value from the start angle across the total angle', () => {
        const startOfTravel = calculateStartAngle() + 90
        expect(valueToAngle(0, 0, 10, 'unipolar')).toBeCloseTo(startOfTravel, 9)
        expect(valueToAngle(10, 0, 10, 'unipolar')).toBeCloseTo(startOfTravel + calculateTotalAngle(), 9)
        expect(valueToAngle(5, 0, 10, 'unipolar')).toBeCloseTo(startOfTravel + calculateTotalAngle() / 2, 9)
    })

    it('centers a bipolar value on zero degrees', () => {
        expect(valueToAngle(0, -10, 10, 'bipolar')).toBeCloseTo(0, 9)
        expect(valueToAngle(10, -10, 10, 'bipolar')).toBeCloseTo(calculateTotalAngle() / 2, 9)
        expect(valueToAngle(-10, -10, 10, 'bipolar')).toBeCloseTo(-calculateTotalAngle() / 2, 9)
    })
})

describe('createArcPath', () => {
    it('builds a closed wedge path around the center', () => {
        const path = createArcPath(50, 50, 40, 0, 90)
        expect(path.startsWith('M 50 50 L')).toBe(true)
        expect(path).toContain('A 40 40')
        expect(path.endsWith('Z')).toBe(true)
    })

    it('sets the large-arc flag only for sweeps beyond 180 degrees', () => {
        expect(createArcPath(0, 0, 10, 0, 90)).toContain('A 10 10 0 0 0')
        expect(createArcPath(0, 0, 10, 0, 270)).toContain('A 10 10 0 1 0')
    })
})

describe('findGreatestCommonDivisor', () => {
    it('finds the greatest common divisor', () => {
        expect(findGreatestCommonDivisor(12, 18)).toBe(6)
        expect(findGreatestCommonDivisor(7, 13)).toBe(1)
        expect(findGreatestCommonDivisor(0, 5)).toBe(5)
        expect(findGreatestCommonDivisor(-12, 18)).toBe(6)
    })
})

describe('bestRationalApproximation', () => {
    it('finds exact fractions for simple decimals', () => {
        expect(bestRationalApproximation(0.5, 1e-6, 100)).toEqual([1, 2])
        expect(bestRationalApproximation(0.75, 1e-6, 100)).toEqual([3, 4])
        expect(bestRationalApproximation(0.3333333, 1e-6, 100)).toEqual([1, 3])
    })

    it('returns whole numbers over one', () => {
        expect(bestRationalApproximation(3, 1e-6, 100)).toEqual([3, 1])
    })
})
