import type { Scale } from '$lib/math'

/**
 * The potential sources that a parameter can be changed from, useful
 * for preventing feedback loops in the bidirectional communication
 * system that parameters use.
 */
export enum ParameterChangeSource {
    /**
     * Indicates the parameter was changed from the backend source,
     * i.e. the host or JUCE.
     */
    Backend,

    /**
     * Indicates the parameter was changed from a frontend source,
     * i.e. user input.
     */
    Frontend,

    /**
     * Indicates the parameter was changed from an internal source,
     * i.e. internal frontend logic.
     */
    Internal,
}

/**
 * The type of parameter, describing its internal value's
 * data type and how to communicate with the JUCE backend.
 */
export enum ParameterType {
    /**
     * A value representing true or false.
     */
    Boolean = 'boolean',

    /**
     * A value representing a selection among
     * multiple choices, indicated by an index value.
     */
    Choice = 'choice',

    /**
     * A value representing a floating-point number.
     */
    Float = 'float',
}

/**
 * Generic type definition for a parameter object, containing the necessities
 * for getting and setting values as well as listening for changes.
 */
export interface IParameter<ValueType extends number | boolean> {
    /**
     * The particular parameter type of this parameter.
     */
    readonly type: ParameterType

    /**
     * The particular configuration of this parameter.
     */
    readonly config: ParameterConfig

    /**
     * Registers a listener callback that executes when changes occur to this parameter's
     * internal value.
     */
    subscribe(listener: ParameterListener<ValueType>): () => void

    /**
     * Gets the current internal value of this parameter.
     */
    getValue(): ValueType

    /**
     * Sets the internal value of this parameter.
     */
    setValue(value: ValueType, source?: ParameterChangeSource): void
}

/**
 * Describes a boolean-based parameter object, exposing the additional
 * functionality to toggle the internal value of the parameter.
 */
export interface IBooleanParameter extends IParameter<boolean> {
    readonly type: ParameterType.Boolean
    readonly config: IBooleanParameterConfig

    toggle(source?: ParameterChangeSource): void
}

/**
 * Describes a choice or integer-based parameter object, exposing the additional
 * functionality to set the choice by a particular value if it exists among the choices
 * from the original configuration.
 */
export interface IChoiceParameter extends IParameter<number> {
    readonly type: ParameterType.Choice
    readonly config: IChoiceParameterConfig

    /**
     * Sets the choice index of this parameter by a given value. If the value does NOT
     * exist in the array of choices in the original configuration, then nothing will occur.
     */
    setChoiceByValue(value: number | string, source?: ParameterChangeSource): void
}

/**
 * Describes a float-based parameter object, containing a normalized value
 * for internal calculations and a display value for showing the value to
 * the user in a human-readable way.
 */
export interface IFloatParameter extends IParameter<number> {
    readonly type: ParameterType.Float
    readonly config: IFloatParameterConfig

    /**
     * The internal state of this parameter represented as a normalized value.
     */
    readonly normalizedValue: number

    /**
     * The default value of this parameter represented as a normalized value.
     */
    readonly normalizedDefaultValue: number

    /**
     * The internal state of this parameter represented as a display value.
     */
    readonly displayValue: number

    /**
     * Sets the internal state of this parameter according to the given normalized value.
     */
    setNormalizedValue(value: number, shouldNotify: boolean, source?: ParameterChangeSource): void

    /**
     * Sets the internal state of this parameter according to the given display value.
     */
    setDisplayValue(value: number, source?: ParameterChangeSource): void

    /**
     * Converts a display value to a normalized value.
     */
    displayToNormalized(displayValue: number): number

    /**
     * Converts a display value to a normalized value as expected by JUCE in the backend.
     */
    displayToJuceNormalized(displayValue: number): number
}

/**
 * Union type representing all the parameter object types.
 */
export type Parameter = IBooleanParameter | IChoiceParameter | IFloatParameter

/**
 * Describes the properties by which a parameter can be configured.
 */
interface IBaseParameterConfig {
    /**
     * The identifier associated with this parameter. This MUST be one of the plugin's
     * defined parameter IDs in the C++ backend.
     */
    id: string

    /**
     * The display name of the parameter as it will appear to the user both in the plugin's
     * user interface and the native Ableton interface.
     */
    name: string

    /**
     * The type of value that corresponds to this parameter.
     */
    type: ParameterType
}

/**
 * Describes the properties by which a boolean-based parameter can be configured.
 */
export interface IBooleanParameterConfig extends IBaseParameterConfig {
    /**
     * The specific type definition for this parameter.
     */
    type: ParameterType.Boolean

    /**
     * The default yes or no value for this parameter.
     */
    defaultValue: boolean
}

/**
 * Describes the properties by which a choice or int-based parameter can be configured.
 */
export interface IChoiceParameterConfig extends IBaseParameterConfig {
    /**
     * The specific type definition for this parameter.
     */
    type: ParameterType.Choice

    /**
     * The available choices for this parameter, which can be either numbers
     * or strings.
     */
    choices: number[] | string[]

    /**
     * The index of the default value for this parameter.
     */
    defaultValueIndex: number
}

/**
 * Describes the properties by which a float-based parameter can be configured.
 */
export interface IFloatParameterConfig extends IBaseParameterConfig {
    /**
     * The specific type definition for this parameter.
     */
    type: ParameterType.Float

    /**
     * The minimum (scaled) value that this parameter can be.
     */
    min: number

    /**
     * The maximum (scaled) value that this parameter can be.
     */
    max: number

    /**
     * The default (scaled) value for this parameter.
     */
    defaultValue: number

    /**
     * An optional scale that defines what mathematical curve is used
     * when mapping values.
     */
    scale?: Scale

    /**
     * An optional (scaled) value that indicates what value should be displayed
     * when the slider is in its 12 o'clock position. Internally, this is adjusting
     * the skew such that a normalized value of 0.5 will return this display value.
     */
    midpoint?: number

    /**
     * An optional value indicating the amount by which this parameter will snap to values
     * within its specified range.
     */
    interval?: number

    /**
     * An optional string representing the unit of measurement of this parameter's values.
     */
    unit?: string

    /**
     * The degree of precision to use to when displaying this parameter's value(s).
     */
    fractionDigits?: number
}

/**
 * Union type representing all the parameter config types.
 */
export type ParameterConfig = IBooleanParameterConfig | IChoiceParameterConfig | IFloatParameterConfig

export type ParameterConfigFromType<T extends ParameterType> = T extends ParameterType.Boolean
    ? IBooleanParameterConfig
    : T extends ParameterType.Choice
      ? IChoiceParameterConfig
      : T extends ParameterType.Float
        ? IFloatParameterConfig
        : never

/**
 * Utility type for deriving the specific parameter object from the
 * parameter config.
 */
export type ParameterFromConfig<C extends ParameterConfig> = C extends IBooleanParameterConfig
    ? IBooleanParameter
    : C extends IChoiceParameterConfig
      ? IChoiceParameter
      : C extends IFloatParameterConfig
        ? IFloatParameter
        : never

/**
 * Utility type for deriving the specific parameter object from the
 * parameter type.
 */
export type ParameterFromType<T extends ParameterType> = T extends ParameterType.Boolean
    ? IBooleanParameter
    : T extends ParameterType.Choice
      ? IChoiceParameter
      : T extends ParameterType.Float
        ? IFloatParameter
        : never

/**
 * Describes functionality to manage our parameters in various aspects, including
 * initialization, cleanup, and simple getter methods.
 */
export interface IParameterManager {
    /**
     * Loads and initializes parameters from data embedded in the backend.
     */
    initializeParameters(): Promise<void>

    /**
     * Sets up the workings for a single parameter, creating the object
     * and wiring up bidirectional communication with the backend.
     */
    registerParameter<T extends ParameterType>(config: ParameterConfigFromType<T>): ParameterFromType<T>

    /**
     * Retrieve the parameter object with the given ID.
     */
    getParameter<T extends ParameterType>(id: string): ParameterFromType<T> | undefined

    /**
     * Retrieve all parameters.
     */
    getParameters(): Record<string, Parameter>

    /**
     * Checks whether there is a parameter with the given ID.
     */
    hasParameter(id: string): boolean

    /**
     * Removes the parameter with the given ID if it exists.
     */
    removeParameter(id: string): void

    /**
     * Removes all event subscribers and ensures no dangling listeners, etc.
     */
    cleanup(): void
}

/**
 * A callback-function definition that is executed when a parameter is updated. It passes a
 * new normalized value and a source, which is useful for determining what actions should be taken
 * for specific sources.
 */
export type ParameterListener<V extends number | boolean> = (value: V, source: ParameterChangeSource) => void
