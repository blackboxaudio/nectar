import {
    type IParameter,
    ParameterChangeSource,
    type ParameterConfigFromType,
    type ParameterListener,
    ParameterType,
    type ParameterValueFromType,
} from '../parameter.types.ts'

/**
 * Base class for implementing the functionality required by all parameters to bidirectionally
 * communicate with the backend and frontend.
 */
export abstract class BaseParameter<T extends ParameterType> implements IParameter<T> {
    protected _listeners = new Set<ParameterListener<ParameterValueFromType<T>>>()

    readonly config: ParameterConfigFromType<T>

    constructor(config: ParameterConfigFromType<T>) {
        this.config = config
    }

    get type(): T {
        return this.config.type as T
    }

    subscribe(listener: ParameterListener<ParameterValueFromType<T>>): () => void {
        this._listeners.add(listener)
        return () => this._listeners.delete(listener)
    }

    protected notifyListeners(value: ParameterValueFromType<T>, source: ParameterChangeSource): void {
        this._listeners.forEach((listener) => listener(value, source))
    }

    abstract getValue(): ParameterValueFromType<T>
    abstract setValue(value: ParameterValueFromType<T>, source?: ParameterChangeSource): void
    abstract resetValue(source?: ParameterChangeSource): void
}
