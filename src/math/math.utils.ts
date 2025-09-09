import type { Polarity } from './math.types'

const FULL_CIRCLE_DEGREES = 360
const RIGHT_ANGLE_DEGREES = 90
const STRAIGHT_ANGLE_DEGREES = 180

const DEFAULT_DEAD_ANGLE_DEGREES = 67.5

/**
 * Finds the best rational approximation of a decimal number within tolerance and denominator limits.
 */
export function bestRationalApproximation(n: number, tolerance: number, maxDenominator: number): [number, number] {
    let a = Math.floor(n)
    let h = [a, 1]
    let k = [1, 0]
    let nFraction = n - a

    while (nFraction > tolerance && k[0] < maxDenominator) {
        nFraction = 1 / nFraction
        a = Math.floor(nFraction)

        const hNew = a * h[0] + h[1]
        const kNew = a * k[0] + k[1]

        h = [hNew, h[0]]
        k = [kNew, k[0]]

        nFraction = nFraction - a
    }

    return [h[0], k[0]]
}

/**
 * Calculates the total sweep angle available for a rotary control, excluding the dead zone.
 */
export function calculateTotalAngle(deadAngleDegrees: number = DEFAULT_DEAD_ANGLE_DEGREES): number {
    return FULL_CIRCLE_DEGREES - deadAngleDegrees
}

/**
 * Calculates the starting angle for a rotary control, positioning the dead zone at the bottom.
 */
export function calculateStartAngle(deadAngleDegrees: number = DEFAULT_DEAD_ANGLE_DEGREES): number {
    return RIGHT_ANGLE_DEGREES + deadAngleDegrees / 2
}

/**
 * Constrains a number between minimum and maximum bounds.
 */
export function clamp(n: number, min: number = 0, max: number = 1): number {
    return Math.min(max, Math.max(n, min))
}

/**
 * Creates an SVG path string for drawing an arc segment between two angles.
 */
export function createArcPath(
    centerX: number,
    centerY: number,
    radius: number,
    startAngle: number,
    endAngle: number
): string {
    const [startX, startY] = polarToCartesian(centerX, centerY, radius, endAngle)
    const [endX, endY] = polarToCartesian(centerX, centerY, radius, startAngle)
    const largeArcFlag = endAngle - startAngle <= STRAIGHT_ANGLE_DEGREES ? 0 : 1

    return ['M', centerX, centerY, 'L', startX, startY, 'A', radius, radius, 0, largeArcFlag, 0, endX, endY, 'Z'].join(
        ' '
    )
}

/**
 * Converts a decibel value to its corresponding linear gain value (0-1 range).
 */
export function decibelsToGain(decibels: number): number {
    if (typeof decibels !== 'number' || isNaN(decibels)) {
        return Number.NaN
    } else {
        if (decibels <= -100) {
            return 0
        } else {
            return Math.min(1, Math.max(0, Math.pow(10, decibels / 20)))
        }
    }
}

/**
 * Finds the greatest common divisor of two integers using Euclid's algorithm.
 */
export function findGreatestCommonDivisor(a: number, b: number): number {
    a = Math.abs(a)
    b = Math.abs(b)
    while (b !== 0) {
        const temp = b
        b = a % b
        a = temp
    }
    return a
}

/**
 * Converts a linear gain value (0-1 range) to its corresponding decibel value.
 */
export function gainToDecibels(gain: number): number {
    if (gain < 0 || gain > 1) {
        return Number.NaN
    } else {
        return gain === 0 ? -Infinity : 20 * Math.log10(gain)
    }
}

/**
 * Converts polar coordinates to Cartesian coordinates with angle measured from vertical.
 */
export function polarToCartesian(
    centerX: number,
    centerY: number,
    radius: number,
    angleDegrees: number
): [number, number] {
    const angleRadians = ((angleDegrees - RIGHT_ANGLE_DEGREES) * Math.PI) / STRAIGHT_ANGLE_DEGREES
    return [centerX + radius * Math.cos(angleRadians), centerY + radius * Math.sin(angleRadians)]
}

/**
 * Rounds a number to the specified number of decimal places.
 */
export function round(n: number, fractionDigits: number): number {
    return Number(n.toFixed(fractionDigits))
}

/**
 * Converts a control value within a range to its corresponding rotary control angle.
 */
export function valueToAngle(
    value: number,
    min: number,
    max: number,
    polarity: Polarity,
    deadAngleDegrees = DEFAULT_DEAD_ANGLE_DEGREES
): number {
    const totalAngle = calculateTotalAngle(deadAngleDegrees)

    if (polarity === 'bipolar') {
        const centerValue = (max + min) / 2
        const range = (max - min) / 2
        const offset = (value - centerValue) / range
        return (offset * totalAngle) / 2
    } else {
        const startAngle = calculateStartAngle(deadAngleDegrees)
        const normalized = (value - min) / (max - min)
        return startAngle + RIGHT_ANGLE_DEGREES + normalized * totalAngle
    }
}
