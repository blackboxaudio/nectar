import type { Scale } from './math.types'
import { clamp } from './math.utils'

let hasWarnedNonPositiveMin = false

function isLogarithmicRangeValid(min: number): boolean {
    if (min > 0) {
        return true
    }

    /**
     * CAUTION: A ratio curve cannot represent a range that touches or crosses zero,
     * and silently returning NaN / -Infinity would be worse than a loud fallback,
     * so we warn once and treat the range as linear.
     */
    if (!hasWarnedNonPositiveMin) {
        hasWarnedNonPositiveMin = true
        console.warn(
            `The 'logarithmic' scale requires a minimum greater than zero (received ${min}). Falling back to 'linear'.`
        )
    }

    return false
}

/**
 * Maps a normalized value in [0, 1] to a display value in [min, max] according to
 * the given scale.
 *
 * - `linear` — straight interpolation between min and max.
 * - `quadratic` — power curve (n^2), biasing travel toward the low end of the range.
 * - `cubic` — power curve (n^3), a stronger low-end bias than `quadratic`.
 * - `logarithmic` — ratio curve `min * (max / min)^n`, giving equal travel per octave
 *   or decade. Requires `min > 0`; otherwise falls back to `linear` with a warning.
 * - `exponential` — deprecated alias of `logarithmic`.
 */
export function applyScale(normalizedValue: number, scale: Scale | undefined, min: number, max: number): number {
    if (max <= min) {
        return min
    }

    const n = clamp(normalizedValue)
    switch (scale) {
        case 'quadratic':
            return min + n * n * (max - min)
        case 'cubic':
            return min + n * n * n * (max - min)
        case 'exponential':
        case 'logarithmic':
            if (!isLogarithmicRangeValid(min)) {
                return min + n * (max - min)
            }
            return min * Math.pow(max / min, n)
        default:
            return min + n * (max - min)
    }
}

/**
 * Maps a display value in [min, max] back to a normalized value in [0, 1], inverting
 * the curve applied by {@link applyScale}. Display values outside [min, max] are
 * clamped into range first.
 */
export function unapplyScale(displayValue: number, scale: Scale | undefined, min: number, max: number): number {
    if (max <= min) {
        return 0
    }

    const v = clamp(displayValue, min, max)
    switch (scale) {
        case 'quadratic':
            return Math.sqrt((v - min) / (max - min))
        case 'cubic':
            return Math.cbrt((v - min) / (max - min))
        case 'exponential':
        case 'logarithmic':
            if (!isLogarithmicRangeValid(min)) {
                return (v - min) / (max - min)
            }
            return Math.log(v / min) / Math.log(max / min)
        default:
            return (v - min) / (max - min)
    }
}
