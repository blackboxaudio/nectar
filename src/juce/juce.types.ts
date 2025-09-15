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

/**
 * Describes global methods designed to be invoked by the plugin's C++ backend
 * at a rate of 60 FPS.
 */
export interface IBbxGlobal {
    /**
     * Updates the sample data available in the frontend.
     */
    updateSampleData(data: ISampleData): void

    /**
     * Updates the spectrum data available in the frontend.
     */
    updateSpectrumData(data: ISpectrumData): void

    /**
     * Updates the volume unit (VU) data available in the frontend.
     */
    updateVuData(data: IVuData): void
}

/**
 * Represents per-channel audio sample data.
 */
export interface ISampleData {
    /**
     * The individual sample buffers for each channel in the audio signal.
     */
    channels: Float32Array[]

    /**
     * The number of samples processed by the plugin per-second.
     */
    sampleRate: number

    /**
     * The number of channels in the audio signal.
     */
    numChannels: number

    /**
     * The number of samples in the audio signal (per-channel, NOT total).
     */
    numSamples: number

    /**
     * The UNIX timestamp of when this sample data was generated.
     */
    timestamp: number
}

/**
 * Represents frequency spectrum data of an audio signal, summed
 * down to mono if not originally in mono.
 */
export interface ISpectrumData {
    /**
     * The array of levels for each frequency bin in the FFT.
     */
    magnitudes: Float32Array

    /**
     * The number of samples processed by the plugin per-second.
     */
    sampleRate: number

    /**
     * The number of samples used to process the FFT.
     */
    fftSize: number

    /**
     * The UNIX timestamp of when this spectrum data was generated.
     */
    timestamp: number
}

/**
 * Represents data for a volume unit (VU) meter.
 */
export interface IVuData {
    /**
     * The (RMS) gain of the left channel.
     */
    leftLevel: number

    /**
     * The (RMS) gain of the right channel.
     */
    rightLevel: number

    /**
     * The (peak) gain of the left channel.
     */
    leftPeak: number

    /**
     * The (peak) gain of the right channel.
     */
    rightPeak: number

    /**
     * The UNIX timestamp of when this VU data was generated.
     */
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
