import { ParameterChangeSource, type IBooleanParameterConfig } from '../parameter.types.ts'
import { BaseParameter } from './base.parameter.ts'

/**
 * A boolean-based parameter object, exposing the additional
 * functionality to toggle the internal value of the parameter.
 */
export class BooleanParameter extends BaseParameter<boolean> {
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

    toggle(source = ParameterChangeSource.Frontend): void {
        this.setValue(!this._value, source)
    }
}
