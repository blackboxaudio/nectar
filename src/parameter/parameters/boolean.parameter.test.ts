import { describe, expect, it, vi } from 'vitest'
import { ParameterChangeSource, ParameterType, type IBooleanParameterConfig } from '../parameter.types.ts'
import { BooleanParameter } from './boolean.parameter.ts'

const config: IBooleanParameterConfig = {
    id: 'bypass',
    name: 'bypass',
    type: ParameterType.Boolean,
    defaultValue: true,
}

describe('BooleanParameter', () => {
    it('honours the configured default value on construction', () => {
        expect(new BooleanParameter(config).getValue()).toBe(true)
    })

    it('toggles and notifies listeners', () => {
        const parameter = new BooleanParameter(config)
        const listener = vi.fn()
        parameter.subscribe(listener)

        parameter.toggle(ParameterChangeSource.Internal)

        expect(parameter.getValue()).toBe(false)
        expect(listener).toHaveBeenCalledWith(false, ParameterChangeSource.Internal)
    })

    it('skips notifications when the value does not change', () => {
        const parameter = new BooleanParameter(config)
        const listener = vi.fn()
        parameter.subscribe(listener)

        parameter.setValue(true)

        expect(listener).not.toHaveBeenCalled()
    })

    it('resets to the default value', () => {
        const parameter = new BooleanParameter(config)
        parameter.setValue(false)
        parameter.resetValue()
        expect(parameter.getValue()).toBe(true)
    })
})
