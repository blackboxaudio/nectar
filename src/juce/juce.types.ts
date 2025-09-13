// index

export interface ICompleteEvent {
    promiseId: number
    result: unknown
}

export interface IListenerList<T = unknown> {
    addListener(fn: (payload: T) => void): number
    removeListener(id: number): void
    callListeners(payload: T): void
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

export interface ISliderState {
    readonly name: string
    readonly properties: ISliderProperties
    readonly valueChangedEvent: IListenerList<void>
    readonly propertiesChangedEvent: IListenerList<void>

    setNormalisedValue(newValue: number): void
    sliderDragStarted(): void
    sliderDragEnded(): void
    getScaledValue(): number
    getNormalisedValue(): number
}

export interface IToggleProperties {
    name: string
    parameterIndex: number
}

export interface IToggleState {
    readonly name: string
    readonly properties: IToggleProperties
    readonly valueChangedEvent: IListenerList<void>
    readonly propertiesChangedEvent: IListenerList<void>

    getValue(): boolean
    setValue(newValue: boolean): void
}

export interface IComboBoxProperties {
    name: string
    parameterIndex: number
    choices: string[]
}

export interface IComboBoxState {
    readonly name: string
    readonly properties: IComboBoxProperties
    readonly valueChangedEvent: IListenerList<void>
    readonly propertiesChangedEvent: IListenerList<void>

    getChoiceIndex(): number
    setChoiceIndex(index: number): void
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

export interface IBbxGlobal {
    updateVuData(data: IVuData): void
}

export interface IVuData {
    leftLevel: number
    rightLevel: number
    leftPeak: number
    rightPeak: number
    timestamp: number
}

declare global {
    interface Window {
        __BBX__: IBbxGlobal
        __JUCE__: IJuceGlobal
        initializeParameters: (jsonString: string) => void
        inAndroidUserScriptEval?: boolean
    }
}
