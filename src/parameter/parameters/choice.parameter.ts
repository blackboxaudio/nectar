import { ParameterChangeSource, type IChoiceParameterConfig } from '../parameter.types.ts'
import { BaseParameter } from './base.parameter.ts'

/**
 * A choice or integer-based parameter object, exposing the additional
 * functionality to set the choice by a particular value if it exists among the choices
 * from the original configuration.
 */
export class ChoiceParameter extends BaseParameter<number> {
    private _choiceIndex: number

    constructor(config: IChoiceParameterConfig) {
        super(config)
        this._choiceIndex = this.clampIndex(config.defaultValueIndex)
    }

    getValue(): number {
        return this._choiceIndex
    }

    setValue(value: number, source = ParameterChangeSource.Frontend): void {
        const index = this.clampIndex(Math.round(Number(value)))
        if (this._choiceIndex !== index) {
            this._choiceIndex = index
            this.notifyListeners(index, source)
        }
    }

    setChoiceByValue(value: number | string, source = ParameterChangeSource.Frontend): void {
        const index = (this.config as IChoiceParameterConfig).choices.indexOf(value as never)
        if (index !== -1) {
            this._choiceIndex = index
            this.notifyListeners(index, source)
        }
    }

    private clampIndex(index: number): number {
        return Math.max(0, Math.min((this.config as IChoiceParameterConfig).choices.length - 1, index))
    }
}
