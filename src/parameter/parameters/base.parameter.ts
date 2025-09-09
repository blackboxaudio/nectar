import {
    type IParameter,
    ParameterChangeSource,
    type ParameterConfig,
    type ParameterListener,
} from '../parameter.types.ts'

/**
 * Base class for implementing the functionality required by all parameters to bidirectionally
 * communicate with the backend and frontend.
 */
export abstract class BaseParameter<ValueType extends number | boolean> implements IParameter<ValueType> {
    protected _listeners = new Set<ParameterListener<ValueType>>()

    readonly config: ParameterConfig

    constructor(config: ParameterConfig) {
        this.config = config
    }

    get type() {
        return this.config.type
    }

    subscribe(listener: ParameterListener<ValueType>): () => void {
        this._listeners.add(listener)
        return () => this._listeners.delete(listener)
    }

    protected notifyListeners(value: ValueType, source: ParameterChangeSource): void {
        this._listeners.forEach((listener) => listener(value, source))
    }

    abstract getValue(): ValueType
    abstract setValue(value: ValueType, source?: ParameterChangeSource): void
}
