/*
  ==============================================================================

   This file is part of the JUCE framework.
   Copyright (c) Raw Material Software Limited

   JUCE is an open source framework subject to commercial or open source
   licensing.

   By downloading, installing, or using the JUCE framework, or combining the
   JUCE framework with any other source code, object code, content or any other
   copyrightable work, you agree to the terms of the JUCE End User Licence
   Agreement, and all incorporated terms including the JUCE Privacy Policy and
   the JUCE Website Terms of Service, as applicable, which will bind you. If you
   do not agree to the terms of these agreements, we will not license the JUCE
   framework to you, and you must discontinue the installation or download
   process and cease use of the JUCE framework.

   JUCE End User Licence Agreement: https://juce.com/legal/juce-8-licence/
   JUCE Privacy Policy: https://juce.com/juce-privacy-policy
   JUCE Website Terms of Service: https://juce.com/juce-website-terms-of-service/

   Or:

   You may also use this code under the terms of the AGPLv3:
   https://www.gnu.org/licenses/agpl-3.0.en.html

   THE JUCE FRAMEWORK IS PROVIDED "AS IS" WITHOUT ANY WARRANTY, AND ALL
   WARRANTIES, WHETHER EXPRESSED OR IMPLIED, INCLUDING WARRANTY OF
   MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE, ARE DISCLAIMED.

  ==============================================================================
*/

import type {
    IComboBoxProperties,
    ICompleteEvent,
    IListenerList,
    IPromiseResolvers,
    IPropertiesChangedEvent,
    ISliderProperties,
    ISliderState,
    IToggleProperties,
    IValueChangedEvent,
} from './types.ts'

import './check_native_interop'

class PromiseHandler {
    private lastPromiseId: number
    private promises: Map<number, IPromiseResolvers>

    constructor() {
        this.lastPromiseId = 0
        this.promises = new Map()

        window.__JUCE__.backend!.addEventListener('__juce__complete', (event: unknown) => {
            const { promiseId, result } = event as ICompleteEvent
            if (this.promises.has(promiseId)) {
                this.promises.get(promiseId)!.resolve(result)
                this.promises.delete(promiseId)
            }
        })
    }

    createPromise(): [number, Promise<unknown>] {
        const promiseId = this.lastPromiseId++
        const result = new Promise<unknown>((resolve, reject) => {
            this.promises.set(promiseId, { resolve: resolve, reject: reject })
        })
        return [promiseId, result]
    }
}

const promiseHandler = new PromiseHandler()

/**
 * Returns a function object that calls a function registered on the JUCE backend and forwards all
 * parameters to it.
 *
 * The provided name should be the same as the name argument passed to
 * WebBrowserComponent::Options.withNativeFunction() on the backend.
 *
 * @param {String} name
 */
function getNativeFunction(name: string): (...args: unknown[]) => Promise<unknown> {
    if (!window.__JUCE__.initialisationData!.__juce__functions.includes(name))
        console.warn(`Creating native function binding for '${name}', which is unknown to the backend`)

    const f = function (...args: unknown[]): Promise<unknown> {
        const [promiseId, result] = promiseHandler.createPromise()

        window.__JUCE__.backend!.emitEvent('__juce__invoke', {
            name: name,
            params: args,
            resultId: promiseId,
        })

        return result
    }

    return f
}

//==============================================================================

class ListenerList<T = unknown> implements IListenerList<T> {
    private listeners: Map<number, (payload: T) => void>
    private listenerId: number

    constructor() {
        this.listeners = new Map()
        this.listenerId = 0
    }

    addListener(fn: (payload: T) => void): number {
        const newListenerId = this.listenerId++
        this.listeners.set(newListenerId, fn)
        return newListenerId
    }

    removeListener(id: number): void {
        if (this.listeners.has(id)) {
            this.listeners.delete(id)
        }
    }

    callListeners(payload: T): void {
        for (const [, value] of this.listeners) {
            value(payload)
        }
    }
}

const BasicControl_valueChangedEventId = 'valueChanged'
const BasicControl_propertiesChangedId = 'propertiesChanged'
const SliderControl_sliderDragStartedEventId = 'sliderDragStarted'
const SliderControl_sliderDragEndedEventId = 'sliderDragEnded'

/**
 * SliderState encapsulates data and callbacks that are synchronised with a WebSliderRelay object
 * on the backend.
 *
 * Use getSliderState() to create a SliderState object. This object will be synchronised with the
 * WebSliderRelay backend object that was created using the same unique name.
 *
 * @param {String} name
 */
class SliderState implements ISliderState {
    public readonly name: string
    private readonly identifier: string
    private scaledValue: number
    public readonly properties: ISliderProperties
    public readonly valueChangedEvent: ListenerList<void>
    public readonly propertiesChangedEvent: ListenerList<void>

    constructor(name: string) {
        if (!window.__JUCE__.initialisationData!.__juce__sliders.includes(name))
            console.warn("Creating SliderState for '" + name + "', which is unknown to the backend")

        this.name = name
        this.identifier = '__juce__slider' + this.name
        this.scaledValue = 0
        this.properties = {
            start: 0,
            end: 1,
            skew: 1,
            name: '',
            label: '',
            numSteps: 100,
            interval: 0,
            parameterIndex: -1,
        }
        this.valueChangedEvent = new ListenerList<void>()
        this.propertiesChangedEvent = new ListenerList<void>()

        window.__JUCE__.backend!.addEventListener(this.identifier, (event: unknown) => this.handleEvent(event))

        window.__JUCE__.backend!.emitEvent(this.identifier, {
            eventType: 'requestInitialUpdate',
        })
    }

    /**
     * Sets the normalised value of the corresponding backend parameter. This value is always in the
     * [0, 1] range (inclusive).
     *
     * The meaning of this range is the same as in the case of
     * AudioProcessorParameter::getValue() (C++).
     *
     * @param {number} newValue
     */
    setNormalisedValue(newValue: number): void {
        this.scaledValue = this.snapToLegalValue(this.normalisedToScaledValue(newValue))

        window.__JUCE__.backend!.emitEvent(this.identifier, {
            eventType: BasicControl_valueChangedEventId,
            value: this.scaledValue,
        })
    }

    /**
     * This function should be called first thing when the user starts interacting with the slider.
     */
    sliderDragStarted(): void {
        window.__JUCE__.backend!.emitEvent(this.identifier, {
            eventType: SliderControl_sliderDragStartedEventId,
        })
    }

    /**
     * This function should be called when the user finished the interaction with the slider.
     */
    sliderDragEnded(): void {
        window.__JUCE__.backend!.emitEvent(this.identifier, {
            eventType: SliderControl_sliderDragEndedEventId,
        })
    }

    /** Internal. */
    private handleEvent(event: unknown): void {
        const eventObj = event as IValueChangedEvent & IPropertiesChangedEvent

        if (eventObj.eventType == BasicControl_valueChangedEventId) {
            this.scaledValue = eventObj.value as number
            this.valueChangedEvent.callListeners()
        }
        if (eventObj.eventType == BasicControl_propertiesChangedId) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { eventType: _, ...rest } = eventObj
            Object.assign(this.properties, rest)
            this.propertiesChangedEvent.callListeners()
        }
    }

    /**
     * Returns the scaled value of the parameter. This corresponds to the return value of
     * NormalisableRange::convertFrom0to1() (C++). This value will differ from a linear
     * [0, 1] range if a non-default NormalisableRange was set for the parameter.
     */
    getScaledValue(): number {
        return this.scaledValue
    }

    /**
     * Returns the normalised value of the corresponding backend parameter. This value is always in the
     * [0, 1] range (inclusive).
     *
     * The meaning of this range is the same as in the case of
     * AudioProcessorParameter::getValue() (C++).
     */
    getNormalisedValue(): number {
        return Math.pow(
            (this.scaledValue - this.properties.start) / (this.properties.end - this.properties.start),
            this.properties.skew
        )
    }

    /** Internal. */
    private normalisedToScaledValue(normalisedValue: number): number {
        return (
            Math.pow(normalisedValue, 1 / this.properties.skew) * (this.properties.end - this.properties.start) +
            this.properties.start
        )
    }

    /** Internal. */
    private snapToLegalValue(value: number): number {
        const interval = this.properties.interval

        if (interval == 0) return value

        const start = this.properties.start
        const clamp = (val: number, min = 0, max = 1): number => Math.max(min, Math.min(max, val))

        return clamp(
            start + interval * Math.floor((value - start) / interval + 0.5),
            this.properties.start,
            this.properties.end
        )
    }
}

const sliderStates = new Map<string, SliderState>()

for (const sliderName of window.__JUCE__.initialisationData!.__juce__sliders)
    sliderStates.set(sliderName, new SliderState(sliderName))

/**
 * Returns a SliderState object that is connected to the backend WebSliderRelay object that was
 * created with the same name argument.
 *
 * To register a WebSliderRelay object create one with the right name and add it to the
 * WebBrowserComponent::Options struct using withOptionsFrom.
 *
 * @param {String} name
 */
function getSliderState(name: string): SliderState {
    if (!sliderStates.has(name)) sliderStates.set(name, new SliderState(name))

    return sliderStates.get(name)!
}

/**
 * ToggleState encapsulates data and callbacks that are synchronised with a WebToggleRelay object
 * on the backend.
 *
 * Use getToggleState() to create a ToggleState object. This object will be synchronised with the
 * WebToggleRelay backend object that was created using the same unique name.
 *
 * @param {String} name
 */
class ToggleState {
    public readonly name: string
    private readonly identifier: string
    private value: boolean
    public readonly properties: IToggleProperties
    public readonly valueChangedEvent: ListenerList<void>
    public readonly propertiesChangedEvent: ListenerList<void>

    constructor(name: string) {
        if (!window.__JUCE__.initialisationData!.__juce__toggles.includes(name))
            console.warn("Creating ToggleState for '" + name + "', which is unknown to the backend")

        this.name = name
        this.identifier = '__juce__toggle' + this.name
        this.value = false
        this.properties = {
            name: '',
            parameterIndex: -1,
        }
        this.valueChangedEvent = new ListenerList<void>()
        this.propertiesChangedEvent = new ListenerList<void>()

        window.__JUCE__.backend!.addEventListener(this.identifier, (event: unknown) => this.handleEvent(event))

        window.__JUCE__.backend!.emitEvent(this.identifier, {
            eventType: 'requestInitialUpdate',
        })
    }

    /** Returns the value corresponding to the associated WebToggleRelay's (C++) state. */
    getValue(): boolean {
        return this.value
    }

    /** Informs the backend to change the associated WebToggleRelay's (C++) state. */
    setValue(newValue: boolean): void {
        this.value = newValue

        window.__JUCE__.backend!.emitEvent(this.identifier, {
            eventType: BasicControl_valueChangedEventId,
            value: this.value,
        })
    }

    /** Internal. */
    private handleEvent(event: unknown): void {
        const eventObj = event as IValueChangedEvent & IPropertiesChangedEvent

        if (eventObj.eventType == BasicControl_valueChangedEventId) {
            this.value = eventObj.value as boolean
            this.valueChangedEvent.callListeners()
        }
        if (eventObj.eventType == BasicControl_propertiesChangedId) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { eventType: _, ...rest } = eventObj
            Object.assign(this.properties, rest)
            this.propertiesChangedEvent.callListeners()
        }
    }
}

const toggleStates = new Map<string, ToggleState>()

for (const name of window.__JUCE__.initialisationData!.__juce__toggles) toggleStates.set(name, new ToggleState(name))

/**
 * Returns a ToggleState object that is connected to the backend WebToggleButtonRelay object that was
 * created with the same name argument.
 *
 * To register a WebToggleButtonRelay object create one with the right name and add it to the
 * WebBrowserComponent::Options struct using withOptionsFrom.
 *
 * @param {String} name
 */
function getToggleState(name: string): ToggleState {
    if (!toggleStates.has(name)) toggleStates.set(name, new ToggleState(name))

    return toggleStates.get(name)!
}

/**
 * ComboBoxState encapsulates data and callbacks that are synchronised with a WebComboBoxRelay object
 * on the backend.
 *
 * Use getComboBoxState() to create a ComboBoxState object. This object will be synchronised with the
 * WebComboBoxRelay backend object that was created using the same unique name.
 *
 * @param {String} name
 */
class ComboBoxState {
    public readonly name: string
    private readonly identifier: string
    private value: number
    public readonly properties: IComboBoxProperties
    public readonly valueChangedEvent: ListenerList<void>
    public readonly propertiesChangedEvent: ListenerList<void>

    constructor(name: string) {
        if (!window.__JUCE__.initialisationData!.__juce__comboBoxes.includes(name))
            console.warn("Creating ComboBoxState for '" + name + "', which is unknown to the backend")

        this.name = name
        this.identifier = '__juce__comboBox' + this.name
        this.value = 0.0
        this.properties = {
            name: '',
            parameterIndex: -1,
            choices: [],
        }
        this.valueChangedEvent = new ListenerList<void>()
        this.propertiesChangedEvent = new ListenerList<void>()

        window.__JUCE__.backend!.addEventListener(this.identifier, (event: unknown) => this.handleEvent(event))

        window.__JUCE__.backend!.emitEvent(this.identifier, {
            eventType: 'requestInitialUpdate',
        })
    }

    /**
     * Returns the value corresponding to the associated WebComboBoxRelay's (C++) state.
     *
     * This is an index identifying which element of the properties.choices array is currently
     * selected.
     */
    getChoiceIndex(): number {
        return Math.round(this.value * (this.properties.choices.length - 1))
    }

    /**
     * Informs the backend to change the associated WebComboBoxRelay's (C++) state.
     *
     * This should be called with the index identifying the selected element from the
     * properties.choices array.
     */
    setChoiceIndex(index: number): void {
        const numItems = this.properties.choices.length
        this.value = numItems > 1 ? index / (numItems - 1) : 0.0

        window.__JUCE__.backend!.emitEvent(this.identifier, {
            eventType: BasicControl_valueChangedEventId,
            value: this.value,
        })
    }

    /** Internal. */
    private handleEvent(event: unknown): void {
        const eventObj = event as IValueChangedEvent & IPropertiesChangedEvent

        if (eventObj.eventType == BasicControl_valueChangedEventId) {
            this.value = eventObj.value as number
            this.valueChangedEvent.callListeners()
        }
        if (eventObj.eventType == BasicControl_propertiesChangedId) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { eventType: _, ...rest } = eventObj
            Object.assign(this.properties, rest)
            this.propertiesChangedEvent.callListeners()
        }
    }
}

const comboBoxStates = new Map<string, ComboBoxState>()

for (const name of window.__JUCE__.initialisationData!.__juce__comboBoxes)
    comboBoxStates.set(name, new ComboBoxState(name))

/**
 * Returns a ComboBoxState object that is connected to the backend WebComboBoxRelay object that was
 * created with the same name argument.
 *
 * To register a WebComboBoxRelay object create one with the right name and add it to the
 * WebBrowserComponent::Options struct using withOptionsFrom.
 *
 * @param {String} name
 */
function getComboBoxState(name: string): ComboBoxState {
    if (!comboBoxStates.has(name)) comboBoxStates.set(name, new ComboBoxState(name))

    return comboBoxStates.get(name)!
}

/**
 * Appends a platform-specific prefix to the path to ensure that a request sent to this address will
 * be received by the backend's ResourceProvider.
 * @param {String} path
 */
function getBackendResourceAddress(path: string): string {
    const platform =
        window.__JUCE__.initialisationData!.__juce__platform.length > 0
            ? window.__JUCE__.initialisationData!.__juce__platform[0]
            : ''

    if (platform == 'windows' || platform == 'android') return 'https://juce.backend/' + path

    if (platform == 'macos' || platform == 'ios' || platform == 'linux') return 'juce://juce.backend/' + path

    console.warn('getBackendResourceAddress() called, but no JUCE native backend is detected.')
    return path
}

/**
 * This helper class is intended to aid the implementation of
 * AudioProcessorEditor::getControlParameterIndex() for editors using a WebView interface.
 *
 * Create an instance of this class and call its handleMouseMove() method in each mousemove event.
 *
 * This class can be used to continuously report the controlParameterIndexAnnotation attribute's
 * value related to the DOM element that is currently under the mouse pointer.
 *
 * This value is defined at all times as follows
 * * the annotation attribute's value for the DOM element directly under the mouse, if it has it,
 * * the annotation attribute's value for the first parent element, that has it,
 * * -1 otherwise.
 *
 * Whenever there is a change in this value, an event is emitted to the frontend with the new value.
 * You can use a ControlParameterIndexReceiver object on the backend to listen to these events.
 *
 * @param {String} controlParameterIndexAnnotation
 */
class ControlParameterIndexUpdater {
    private readonly controlParameterIndexAnnotation: string
    private lastElement: Element | null
    private lastControlParameterIndex: number | null

    constructor(controlParameterIndexAnnotation: string) {
        this.controlParameterIndexAnnotation = controlParameterIndexAnnotation
        this.lastElement = null
        this.lastControlParameterIndex = null
    }

    handleMouseMove(event: MouseEvent): void {
        const currentElement = document.elementFromPoint(event.clientX, event.clientY)

        if (currentElement === this.lastElement) return
        this.lastElement = currentElement

        let controlParameterIndex = -1

        if (currentElement !== null) controlParameterIndex = this.getControlParameterIndex(currentElement)

        if (controlParameterIndex === this.lastControlParameterIndex) return
        this.lastControlParameterIndex = controlParameterIndex

        window.__JUCE__.backend!.emitEvent('__juce__controlParameterIndexChanged', controlParameterIndex)
    }

    //==============================================================================
    private getControlParameterIndex(element: Element): number {
        const isValidNonRootElement = (e: Element | null): e is Element => {
            return e !== null && e !== document.documentElement
        }

        while (isValidNonRootElement(element)) {
            if (element.hasAttribute(this.controlParameterIndexAnnotation)) {
                const attr = element.getAttribute(this.controlParameterIndexAnnotation)
                return attr ? parseInt(attr, 10) : -1
            }

            element = element.parentElement!
        }

        return -1
    }
}

export {
    getNativeFunction,
    getSliderState,
    getToggleState,
    getComboBoxState,
    getBackendResourceAddress,
    ControlParameterIndexUpdater,
}

export * from './types'
