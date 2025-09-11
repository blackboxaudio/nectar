import { ParameterChangeSource, type IBooleanParameterConfig, ParameterType } from '../parameter.types.ts'
import { BaseParameter } from './base.parameter.ts'

/**
 * A boolean-based parameter object, exposing the additional
 * functionality to toggle the internal value of the parameter.
 */
export class BooleanParameter extends BaseParameter<ParameterType.Boolean> {
    private _value: boolean

    constructor(config: IBooleanParameterConfig) {
        super(config)
        this._value = config.defaultValue
    }

    getValue(): boolean {
        return this._value
    }

    setValue(value: boolean, source = ParameterChangeSource.Frontend): void {
        const bool = Boolean(value)
        if (this._value !== bool) {
            this._value = bool
            this.notifyListeners(bool, source)
        }
    }

    resetValue(source = ParameterChangeSource.Frontend): void {
        this.setValue(this.config.defaultValue, source)
    }

    toggle(source = ParameterChangeSource.Frontend): void {
        this.setValue(!this._value, source)
    }
}
