import { applyScale, clamp, unapplyScale } from '$lib/math'
import { ParameterChangeSource, type IFloatParameterConfig, ParameterType } from '../parameter.types.ts'
import { BaseParameter } from './base.parameter.ts'

/**
 * A float-based parameter object, containing a normalized value
 * for internal calculations and a display value for showing the value to
 * the user in a human-readable way.
 */
export class FloatParameter extends BaseParameter<ParameterType.Float> {
    private _normalizedValue: number

    constructor(config: IFloatParameterConfig) {
        super(config)
        this._normalizedValue = clamp(this.displayToNormalized(config.defaultValue))
    }

    // Fields & attributes

    getValue(): number {
        return this._normalizedValue
    }

    setValue(value: number | boolean, source = ParameterChangeSource.Frontend): void {
        this.setNormalizedValue(value as number, true, source)
    }

    resetValue(source = ParameterChangeSource.Frontend): void {
        this.setValue(this.displayToNormalized(this.config.defaultValue), source)
    }

    get normalizedValue() {
        return this._normalizedValue
    }

    get normalizedDefaultValue() {
        const { defaultValue } = this.config as IFloatParameterConfig
        return clamp(this.displayToNormalized(defaultValue))
    }

    setNormalizedValue(
        value: number,
        shouldNotify: boolean,
        source: ParameterChangeSource = ParameterChangeSource.Frontend
    ): void {
        const clamped = clamp(value)
        if (this._normalizedValue !== clamped) {
            this._normalizedValue = clamped
            if (shouldNotify) {
                this.notifyListeners(clamped, source)
            }
        }
    }

    get displayValue() {
        return this.normalizedToDisplay(this._normalizedValue)
    }

    setDisplayValue(value: number, source: ParameterChangeSource = ParameterChangeSource.Frontend): void {
        this.setNormalizedValue(this.displayToNormalized(value), true, source)
    }

    // Mathematics

    displayToJuceNormalized(displayValue: number): number {
        const config = this.config as IFloatParameterConfig
        const linear = (displayValue - config.min) / (config.max - config.min)

        if (config.midpoint !== undefined) {
            const skew = this.calculateSkewFactor(config.midpoint)
            if (skew === 1) {
                return linear
            } else {
                return Math.pow(linear, 1 / skew)
            }
        } else {
            return linear
        }
    }

    displayToNormalized(displayValue: number): number {
        const config = this.config as IFloatParameterConfig

        if (config.midpoint !== undefined) {
            const clamped = clamp(displayValue, config.min, config.max)
            const linear = (clamped - config.min) / (config.max - config.min)
            return this.unapplySkew(linear, config.midpoint)
        }

        return unapplyScale(displayValue, config.scale, config.min, config.max)
    }

    normalizedToDisplay(normalizedValue: number): number {
        const config = this.config as IFloatParameterConfig

        let value: number
        if (config.midpoint !== undefined) {
            const skewed = this.applySkew(clamp(normalizedValue), config.midpoint)
            value = config.min + skewed * (config.max - config.min)
        } else {
            value = applyScale(normalizedValue, config.scale, config.min, config.max)
        }

        if (config.interval) {
            value = this.snapToInterval(value)
        }

        return value
    }

    private calculateSkewFactor(midpoint: number): number {
        const config = this.config as IFloatParameterConfig
        const range = config.max - config.min
        const normalizedMidpoint = (midpoint - config.min) / range

        /**
         * CAUTION: Avoid division by zero or log of zero / negative values.
         */
        if (normalizedMidpoint <= 0 || normalizedMidpoint >= 1) {
            return 1
        } else {
            return Math.log(normalizedMidpoint) / Math.log(0.5)
        }
    }

    private applySkew(normalizedValue: number, midpoint: number): number {
        const skew = this.calculateSkewFactor(midpoint)
        return skew === 1 ? normalizedValue : Math.pow(normalizedValue, skew)
    }

    private unapplySkew(linear: number, midpoint: number): number {
        const skew = this.calculateSkewFactor(midpoint)
        return skew === 1 ? linear : Math.pow(linear, 1 / skew)
    }

    private snapToInterval(value: number): number {
        const config = this.config as IFloatParameterConfig
        if (config.interval) {
            return Math.round(value / config.interval) * config.interval
        } else {
            return value
        }
    }
}
