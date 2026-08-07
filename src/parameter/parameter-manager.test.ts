// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ParameterType, type IFloatParameterConfig } from './parameter.types.ts'

/**
 * Importing the manager pulls in the JUCE interop module, which warns while installing
 * its placeholder when no native host is present; silence that for the test run.
 */
vi.spyOn(console, 'warn').mockImplementation(() => {})
vi.spyOn(console, 'log').mockImplementation(() => {})

const { ParameterManager } = await import('./parameter-manager.ts')

const config: IFloatParameterConfig = {
    id: 'hpf',
    name: 'low cut',
    type: ParameterType.Float,
    min: 20,
    max: 20_000,
    defaultValue: 100,
    scale: 'logarithmic',
}

describe('ParameterManager without a JUCE backend', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    /**
     * Regression: the relay used to be wired unconditionally, and the placeholder
     * slider state clobbered every default value to normalized zero (display min).
     */
    it('preserves the configured default under auto detection', () => {
        const manager = new ParameterManager()
        const parameter = manager.registerParameter(config)
        expect(parameter.displayValue).toBeCloseTo(100, 6)
    })

    it('preserves the configured default when the backend is explicitly disabled', () => {
        const manager = new ParameterManager({ backend: 'none' })
        const parameter = manager.registerParameter(config)
        expect(parameter.displayValue).toBeCloseTo(100, 6)
    })

    it('rejects initializeParameters instead of hanging forever', async () => {
        const manager = new ParameterManager({ backend: 'none' })
        await expect(manager.initializeParameters()).rejects.toThrow('JUCE backend')
    })

    it('registers, finds, and removes parameters', () => {
        const manager = new ParameterManager({ backend: 'none' })
        manager.registerParameter(config)

        expect(manager.hasParameter('hpf')).toBe(true)
        expect(manager.getParameter('hpf')).toBeDefined()

        manager.removeParameter('hpf')
        expect(manager.hasParameter('hpf')).toBe(false)
    })

    it('resets all parameters to their defaults', () => {
        const manager = new ParameterManager({ backend: 'none' })
        const parameter = manager.registerParameter(config)

        parameter.setNormalizedValue(1, false)
        manager.resetParameters()

        expect(parameter.displayValue).toBeCloseTo(100, 6)
    })
})
