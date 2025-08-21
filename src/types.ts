// index

export interface ICompleteEvent {
    promiseId: number
    result: unknown
}

export interface IValueChangedEvent {
    eventType: string
    value: unknown
}

export interface IPropertiesChangedEvent {
    eventType: string
    [key: string]: unknown
}

export interface ISliderProperties {
    start: number
    end: number
    skew: number
    name: string
    label: string
    numSteps: number
    interval: number
    parameterIndex: number
}

export interface IToggleProperties {
    name: string
    parameterIndex: number
}

export interface IComboBoxProperties {
    name: string
    parameterIndex: number
    choices: string[]
}

export interface IPromiseResolvers {
    resolve: (value: unknown) => void
    reject: (reason?: unknown) => void
}

// check_native_interop

export interface IJuceInitialisationData {
    __juce__platform: string[]
    __juce__functions: string[]
    __juce__registeredGlobalEventIds: string[]
    __juce__sliders: string[]
    __juce__toggles: string[]
    __juce__comboBoxes: string[]
}

export interface IJuceBackend {
    addEventListener(eventId: string, fn: (payload: unknown) => void): [string, number]
    removeEventListener(listener: [string, number]): void
    emitEvent(eventId: string, object: unknown): void
    emitByBackend(eventId: string, object: string): void
}

export interface IJuceGlobal {
    postMessage: (message: string) => void
    initialisationData?: IJuceInitialisationData
    backend?: IJuceBackend
    getAndroidUserScripts?: () => string
}

declare global {
    interface Window {
        __JUCE__: IJuceGlobal
        inAndroidUserScriptEval?: boolean
    }
}
