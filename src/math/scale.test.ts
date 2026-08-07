import { describe, expect, it, vi } from 'vitest'
import type { Scale } from './math.types'
import { applyScale, unapplyScale } from './scale'

const MIN_HZ = 20
const MAX_HZ = 20_000

const ALL_SCALES: (Scale | undefined)[] = ['linear', 'quadratic', 'cubic', 'logarithmic', 'exponential', undefined]

describe('applyScale', () => {
    it('maps the logarithmic curve over 20 Hz - 20 kHz to the geometric oracle values', () => {
        expect(applyScale(0, 'logarithmic', MIN_HZ, MAX_HZ)).toBeCloseTo(20, 9)
        expect(applyScale(0.25, 'logarithmic', MIN_HZ, MAX_HZ)).toBeCloseTo(112.46826503807, 6)
        expect(applyScale(0.5, 'logarithmic', MIN_HZ, MAX_HZ)).toBeCloseTo(632.45553203368, 6)
        expect(applyScale(1, 'logarithmic', MIN_HZ, MAX_HZ)).toBeCloseTo(20_000, 6)
    })

    it('is continuous approaching zero, unlike the old fixed 100:1 curve', () => {
        const nearZero = applyScale(1e-9, 'logarithmic', MIN_HZ, MAX_HZ)
        expect(nearZero).toBeGreaterThan(MIN_HZ)
        expect(nearZero).toBeLessThan(MIN_HZ + 0.001)
    })

    it('treats exponential as an alias of logarithmic', () => {
        for (let i = 0; i <= 16; i++) {
            const n = i / 16
            expect(applyScale(n, 'exponential', MIN_HZ, MAX_HZ)).toBe(applyScale(n, 'logarithmic', MIN_HZ, MAX_HZ))
        }
    })

    it('applies true power curves for quadratic and cubic instead of falling back to linear', () => {
        expect(applyScale(0.5, 'quadratic', 0, 100)).toBeCloseTo(25, 9)
        expect(applyScale(0.5, 'cubic', 0, 100)).toBeCloseTo(12.5, 9)
        expect(applyScale(0.5, 'linear', 0, 100)).toBeCloseTo(50, 9)
    })

    it('defaults to linear when no scale is given', () => {
        expect(applyScale(0.3, undefined, 0, 10)).toBeCloseTo(3, 9)
    })

    it('clamps the normalized input into [0, 1]', () => {
        expect(applyScale(-0.5, 'linear', 0, 10)).toBe(0)
        expect(applyScale(1.5, 'linear', 0, 10)).toBe(10)
    })

    it('collapses a degenerate range to its minimum', () => {
        expect(applyScale(0.7, 'linear', 5, 5)).toBe(5)
        expect(applyScale(0.7, 'logarithmic', 5, 5)).toBe(5)
    })

    it('falls back to linear with a warning when logarithmic is configured with min <= 0', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

        expect(applyScale(0.5, 'logarithmic', 0, 100)).toBeCloseTo(50, 9)
        expect(unapplyScale(50, 'logarithmic', 0, 100)).toBeCloseTo(0.5, 9)
        expect(applyScale(0.5, 'logarithmic', -10, 100)).toBeCloseTo(45, 9)

        expect(warn).toHaveBeenCalled()
        warn.mockRestore()
    })
})

describe('unapplyScale', () => {
    it('round-trips applyScale across the full normalized range for every scale', () => {
        for (const scale of ALL_SCALES) {
            for (let i = 0; i <= 32; i++) {
                const n = i / 32
                const display = applyScale(n, scale, MIN_HZ, MAX_HZ)
                expect(unapplyScale(display, scale, MIN_HZ, MAX_HZ)).toBeCloseTo(n, 9)
            }
        }
    })

    it('inverts the logarithmic oracle values', () => {
        expect(unapplyScale(112.46826503807, 'logarithmic', MIN_HZ, MAX_HZ)).toBeCloseTo(0.25, 9)
        expect(unapplyScale(632.45553203368, 'logarithmic', MIN_HZ, MAX_HZ)).toBeCloseTo(0.5, 9)
    })

    it('clamps display values outside [min, max] into range', () => {
        expect(unapplyScale(5, 'logarithmic', MIN_HZ, MAX_HZ)).toBe(0)
        expect(unapplyScale(30_000, 'logarithmic', MIN_HZ, MAX_HZ)).toBe(1)
        expect(unapplyScale(-3, 'linear', 0, 10)).toBe(0)
        expect(unapplyScale(13, 'linear', 0, 10)).toBe(1)
    })

    it('returns zero for a degenerate range', () => {
        expect(unapplyScale(5, 'linear', 5, 5)).toBe(0)
    })
})
