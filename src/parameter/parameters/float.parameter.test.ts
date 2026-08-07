import { describe, expect, it, vi } from 'vitest'
import { ParameterChangeSource, ParameterType, type IFloatParameterConfig } from '../parameter.types.ts'
import { FloatParameter } from './float.parameter.ts'

function createLogFrequencyConfig(overrides: Partial<IFloatParameterConfig> = {}): IFloatParameterConfig {
    return {
        id: 'hpf',
        name: 'low cut',
        type: ParameterType.Float,
        min: 20,
        max: 20_000,
        defaultValue: 100,
        scale: 'logarithmic',
        unit: 'Hz',
        ...overrides,
    }
}

describe('FloatParameter', () => {
    it('honours the configured default value on construction', () => {
        const parameter = new FloatParameter(createLogFrequencyConfig())
        expect(parameter.displayValue).toBeCloseTo(100, 6)
        expect(parameter.normalizedValue).toBeCloseTo(0.2329902, 6)
    })

    /**
     * Regression: the old fixed 100:1 logarithmic curve produced a NEGATIVE normalized
     * value (about -0.198) for a 100 Hz default on a 20 Hz - 20 kHz range, which then
     * leaked out of range through normalizedValue and normalizedDefaultValue.
     */
    it('keeps the constructed and default normalized values inside [0, 1]', () => {
        const parameter = new FloatParameter(createLogFrequencyConfig())
        expect(parameter.normalizedValue).toBeGreaterThanOrEqual(0)
        expect(parameter.normalizedValue).toBeLessThanOrEqual(1)
        expect(parameter.normalizedDefaultValue).toBeGreaterThanOrEqual(0)
        expect(parameter.normalizedDefaultValue).toBeLessThanOrEqual(1)
        expect(parameter.normalizedDefaultValue).toBeCloseTo(parameter.normalizedValue, 9)
    })

    it('clamps setNormalizedValue into [0, 1]', () => {
        const parameter = new FloatParameter(createLogFrequencyConfig())
        parameter.setNormalizedValue(1.5, false)
        expect(parameter.normalizedValue).toBe(1)
        parameter.setNormalizedValue(-0.2, false)
        expect(parameter.normalizedValue).toBe(0)
    })

    it('skips notifications when the value does not change', () => {
        const parameter = new FloatParameter(createLogFrequencyConfig())
        const listener = vi.fn()
        parameter.subscribe(listener)

        parameter.setNormalizedValue(0.5, true)
        parameter.setNormalizedValue(0.5, true)

        expect(listener).toHaveBeenCalledTimes(1)
    })

    /**
     * Regression: setDisplayValue used to write the normalized value directly without
     * notifying listeners, silently desyncing subscribers, and without clamping.
     */
    it('notifies listeners from setDisplayValue with the given source', () => {
        const parameter = new FloatParameter(createLogFrequencyConfig())
        const listener = vi.fn()
        parameter.subscribe(listener)

        parameter.setDisplayValue(1000, ParameterChangeSource.Internal)

        expect(listener).toHaveBeenCalledTimes(1)
        expect(listener.mock.calls[0][0]).toBeCloseTo(0.56632333, 6)
        expect(listener.mock.calls[0][1]).toBe(ParameterChangeSource.Internal)
        expect(parameter.displayValue).toBeCloseTo(1000, 6)
    })

    it('defaults setDisplayValue to the frontend source and clamps out-of-range values', () => {
        const parameter = new FloatParameter(createLogFrequencyConfig())
        const listener = vi.fn()
        parameter.subscribe(listener)

        parameter.setDisplayValue(30_000)

        expect(parameter.normalizedValue).toBe(1)
        expect(listener.mock.calls[0][1]).toBe(ParameterChangeSource.Frontend)
    })

    it('resets to the default value and notifies', () => {
        const parameter = new FloatParameter(createLogFrequencyConfig())
        parameter.setNormalizedValue(0.9, false)

        const listener = vi.fn()
        parameter.subscribe(listener)
        parameter.resetValue()

        expect(parameter.displayValue).toBeCloseTo(100, 6)
        expect(listener).toHaveBeenCalledTimes(1)
    })

    it('snaps display values to the configured interval', () => {
        const parameter = new FloatParameter({
            id: 'amount',
            name: 'amount',
            type: ParameterType.Float,
            min: 0,
            max: 100,
            defaultValue: 0,
            interval: 5,
        })

        expect(parameter.normalizedToDisplay(0.501)).toBe(50)
        expect(parameter.normalizedToDisplay(0.529)).toBe(55)
    })

    describe('midpoint skew', () => {
        const config: IFloatParameterConfig = {
            id: 'gain',
            name: 'gain',
            type: ParameterType.Float,
            min: 0,
            max: 10,
            defaultValue: 0,
            midpoint: 2.5,
        }

        it('places the midpoint value at half travel', () => {
            const parameter = new FloatParameter(config)
            expect(parameter.normalizedToDisplay(0.5)).toBeCloseTo(2.5, 9)
            expect(parameter.displayToNormalized(2.5)).toBeCloseTo(0.5, 9)
        })

        it('takes precedence over a configured scale', () => {
            const parameter = new FloatParameter({ ...config, scale: 'quadratic' })
            expect(parameter.normalizedToDisplay(0.5)).toBeCloseTo(2.5, 9)
        })

        it('converts display values to the skewed JUCE normalized domain', () => {
            const parameter = new FloatParameter(config)
            expect(parameter.displayToJuceNormalized(2.5)).toBeCloseTo(0.5, 9)
        })

        /**
         * Regression: displayToJuceNormalized duplicated the skew math without the
         * guard, so a midpoint equal to min produced an infinite skew and the method
         * returned 1 for every input.
         */
        it('guards degenerate midpoints instead of collapsing to a constant', () => {
            const atMin = new FloatParameter({ ...config, midpoint: 0 })
            expect(atMin.displayToJuceNormalized(5)).toBeCloseTo(0.5, 9)

            const atMax = new FloatParameter({ ...config, midpoint: 10 })
            expect(atMax.displayToJuceNormalized(5)).toBeCloseTo(0.5, 9)
        })
    })
})
