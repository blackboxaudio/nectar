import { getComboBoxState, getSliderState, getToggleState, NativeFunctionAdapter } from '$lib/juce'
import { BooleanParameter, ChoiceParameter, FloatParameter } from './parameters'
import {
    type IBooleanParameterConfig,
    type IChoiceParameterConfig,
    type IFloatParameterConfig,
    type IParameterManager,
    type Parameter,
    ParameterChangeSource,
    type ParameterConfig,
    type ParameterConfigFromType,
    type ParameterFromConfig,
    type ParameterFromType,
    ParameterType,
} from './parameter.types.ts'

/**
 * Describes functionality to manage our parameters in various aspects, including
 * initialization, cleanup, and simple getter methods.
 */
export class ParameterManager implements IParameterManager {
    private _parameters: Record<string, Parameter> = {}
    private _backendCleanups = new Map<string, () => void>()

    async initializeParameters(): Promise<void> {
        const jsonString = await NativeFunctionAdapter.getParametersJsonData()
        const { parameters } = JSON.parse(jsonString) as { parameters: ParameterConfig[] }
        for (const config of parameters) {
            this.registerParameter(config)
        }
    }

    registerParameter<T extends ParameterType>(config: ParameterConfigFromType<T>): ParameterFromType<T> {
        const parameter = this.createParameter<T>(config)
        this._parameters[config.id] = parameter
        this.setupBackendRelay(parameter)
        return parameter
    }

    private createParameter<T extends ParameterType>(config: ParameterConfigFromType<T>): ParameterFromType<T> {
        switch (config.type) {
            case ParameterType.Boolean:
                return new BooleanParameter(config as IBooleanParameterConfig) as unknown as ParameterFromType<T>
            case ParameterType.Choice:
                return new ChoiceParameter(config as IChoiceParameterConfig) as unknown as ParameterFromType<T>
            case ParameterType.Float:
                return new FloatParameter(config as IFloatParameterConfig) as unknown as ParameterFromType<T>
            default:
                throw new Error(`Unsupported parameter type: ${(config as { type: string }).type}`)
        }
    }

    private setupBackendRelay<C extends ParameterConfig>(parameter: ParameterFromConfig<C>): void {
        switch (parameter.type) {
            case ParameterType.Boolean:
                this.setupBooleanParameterRelay(parameter as BooleanParameter)
                break
            case ParameterType.Choice:
                this.setupChoiceParameterRelay(parameter as ChoiceParameter)
                break
            case ParameterType.Float:
                this.setupFloatParameterRelay(parameter as FloatParameter)
                break
        }
    }

    private setupBooleanParameterRelay(parameter: BooleanParameter): void {
        const state = getToggleState(parameter.config.id)

        parameter.setValue(state.getValue(), ParameterChangeSource.Backend)

        const backendListener = state.valueChangedEvent.addListener(() => {
            parameter.setValue(state.getValue(), ParameterChangeSource.Backend)
        })

        const frontendUnsubscribe = parameter.subscribe((value, source) => {
            if (source !== ParameterChangeSource.Backend) {
                state.setValue(value)
            }
        })

        this._backendCleanups.set(parameter.config.id, () => {
            state.valueChangedEvent.removeListener(backendListener)
            frontendUnsubscribe()
        })
    }

    private setupChoiceParameterRelay(parameter: ChoiceParameter): void {
        const state = getComboBoxState(parameter.config.id)

        parameter.setValue(state.getChoiceIndex(), ParameterChangeSource.Backend)

        const backendListener = state.valueChangedEvent.addListener(() => {
            parameter.setValue(state.getChoiceIndex(), ParameterChangeSource.Backend)
        })

        const frontendUnsubscribe = parameter.subscribe((value, source) => {
            if (source !== ParameterChangeSource.Backend) {
                state.setChoiceIndex(value)
            }
        })

        this._backendCleanups.set(parameter.config.id, () => {
            state.valueChangedEvent.removeListener(backendListener)
            frontendUnsubscribe()
        })
    }

    private setupFloatParameterRelay(parameter: FloatParameter): void {
        const state = getSliderState(parameter.config.id)

        parameter.setValue(state.getNormalisedValue(), ParameterChangeSource.Backend)

        const backendListener = state.valueChangedEvent.addListener(() => {
            parameter.setNormalizedValue(state.getNormalisedValue(), true, ParameterChangeSource.Backend)
        })

        const frontendUnsubscribe = parameter.subscribe((_, source) => {
            if (source !== ParameterChangeSource.Backend) {
                /**
                 * CAUTION: JUCE skews and scales the values differently in the backend, so we make sure
                 * to pass it a value it expects via this helper method.
                 */
                state.setNormalisedValue(parameter.displayToJuceNormalized(parameter.displayValue))
            }
        })

        this._backendCleanups.set(parameter.config.id, () => {
            state.valueChangedEvent.removeListener(backendListener)
            frontendUnsubscribe()
        })
    }

    getParameter<T extends ParameterType>(id: string): ParameterFromType<T> | undefined {
        /**
         * CAUTION: This does NOT perform a type-safety check, so
         * it is assuming the correct ParameterType is being passed.
         */
        return this._parameters[id] as ParameterFromType<T>
    }

    getParameters(): Record<string, Parameter> {
        return this._parameters
    }

    hasParameter(id: string): boolean {
        return !!this._parameters[id]
    }

    removeParameter(id: string): void {
        const cleanup = this._backendCleanups.get(id)
        if (cleanup) {
            cleanup()
            this._backendCleanups.delete(id)
        }

        if (id in this._parameters) {
            delete this._parameters[id]
        }
    }

    resetParameters(source?: ParameterChangeSource): void {
        for (const parameter of Object.values(this._parameters)) {
            parameter.resetValue(source ?? ParameterChangeSource.Frontend)
        }
    }

    cleanup(): void {
        this._backendCleanups.forEach((cleanup) => cleanup())
        this._backendCleanups.clear()
        this._parameters = {}
    }
}
