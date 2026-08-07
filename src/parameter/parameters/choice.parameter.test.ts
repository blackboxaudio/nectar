import { describe, expect, it, vi } from 'vitest'
import { ParameterType, type IChoiceParameterConfig } from '../parameter.types.ts'
import { ChoiceParameter } from './choice.parameter.ts'

const config: IChoiceParameterConfig = {
    id: 'noiseType',
    name: 'noise type',
    type: ParameterType.Choice,
    choices: ['white', 'pink', 'brown'],
    defaultValueIndex: 1,
}

describe('ChoiceParameter', () => {
    it('honours the configured default index on construction', () => {
        expect(new ChoiceParameter(config).getValue()).toBe(1)
    })

    it('clamps the default index into the range of choices', () => {
        expect(new ChoiceParameter({ ...config, defaultValueIndex: 9 }).getValue()).toBe(2)
        expect(new ChoiceParameter({ ...config, defaultValueIndex: -3 }).getValue()).toBe(0)
    })

    it('clamps set values into the range of choices', () => {
        const parameter = new ChoiceParameter(config)
        parameter.setValue(5)
        expect(parameter.getValue()).toBe(2)
        parameter.setValue(-1)
        expect(parameter.getValue()).toBe(0)
    })

    it('sets the choice by value and notifies', () => {
        const parameter = new ChoiceParameter(config)
        const listener = vi.fn()
        parameter.subscribe(listener)

        parameter.setChoiceByValue('brown')

        expect(parameter.getValue()).toBe(2)
        expect(listener).toHaveBeenCalledTimes(1)
    })

    it('ignores unknown values in setChoiceByValue', () => {
        const parameter = new ChoiceParameter(config)
        const listener = vi.fn()
        parameter.subscribe(listener)

        parameter.setChoiceByValue('violet')

        expect(parameter.getValue()).toBe(1)
        expect(listener).not.toHaveBeenCalled()
    })

    it('resets to the default index', () => {
        const parameter = new ChoiceParameter(config)
        parameter.setValue(2)
        parameter.resetValue()
        expect(parameter.getValue()).toBe(1)
    })
})
