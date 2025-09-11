import type { Scale } from '$lib/math'
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
        this._normalizedValue = this.displayToNormalized(config.defaultValue)
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
        return this.displayToNormalized(defaultValue)
    }

    setNormalizedValue(
        value: number,
        shouldNotify: boolean,
        source: ParameterChangeSource = ParameterChangeSource.Frontend
    ): void {
        const clamped = Math.max(0, Math.min(1, value))
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

    setDisplayValue(value: number) {
        this._normalizedValue = this.displayToNormalized(value)
    }

    // Mathematics

    displayToJuceNormalized(displayValue: number): number {
        const config = this.config as IFloatParameterConfig
        const range = config.max - config.min
        const linear = (displayValue - config.min) / range

        if (config.midpoint !== undefined) {
            const normalizedMidpoint = (config.midpoint - config.min) / range
            const skew = Math.log(normalizedMidpoint) / Math.log(0.5)
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
        const clamped = Math.max(config.min, Math.min(config.max, displayValue))
        const linear = (clamped - config.min) / (config.max - config.min)
        return this.unapplyScale(linear, config.scale, config.midpoint)
    }

    normalizedToDisplay(normalizedValue: number): number {
        const config = this.config as IFloatParameterConfig
        const scaled = this.applyScale(normalizedValue, config.scale, config.midpoint)
        let value = config.min + scaled * (config.max - config.min)

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

    private applyScale(normalizedValue: number, scale?: Scale, midpoint?: number): number {
        if (midpoint !== undefined) {
            const skew = this.calculateSkewFactor(midpoint)
            if (skew === 1) {
                return normalizedValue
            } else {
                return Math.pow(normalizedValue, skew)
            }
        } else {
            switch (scale) {
                case 'exponential':
                    return normalizedValue * normalizedValue
                case 'logarithmic':
                    return normalizedValue === 0 ? 0 : Math.pow(10, normalizedValue * 2 - 2)
                default:
                    return normalizedValue
            }
        }
    }

    private unapplyScale(scaled: number, scale?: Scale, midpoint?: number): number {
        if (midpoint !== undefined) {
            const skew = this.calculateSkewFactor(midpoint)
            if (skew === 1) {
                return scaled
            } else {
                return Math.pow(scaled, 1 / skew)
            }
        } else {
            switch (scale) {
                case 'exponential':
                    return Math.sqrt(scaled)
                case 'logarithmic':
                    return scaled === 0 ? 0 : (Math.log10(scaled) + 2) / 2
                default:
                    return scaled
            }
        }
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
