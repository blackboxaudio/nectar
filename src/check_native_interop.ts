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

import type { IJuceGlobal } from './types'

if (
    typeof window.__JUCE__ !== 'undefined' &&
    typeof window.__JUCE__.getAndroidUserScripts !== 'undefined' &&
    typeof window.inAndroidUserScriptEval === 'undefined'
) {
    window.inAndroidUserScriptEval = true
    eval(window.__JUCE__.getAndroidUserScripts())
    delete window.inAndroidUserScriptEval
}

{
    if (typeof window.__JUCE__ == 'undefined') {
        console.warn(`
        The 'window.__JUCE__' object is undefined.\n
        Native integration features will not work.\n
        Defining a placeholder 'window.__JUCE__' object.
    `)

        window.__JUCE__ = {
            postMessage: function (): void {},
        } satisfies Partial<IJuceGlobal>
    }

    if (typeof window.__JUCE__.initialisationData === 'undefined') {
        window.__JUCE__.initialisationData = {
            __juce__platform: [],
            __juce__functions: [],
            __juce__registeredGlobalEventIds: [],
            __juce__sliders: [],
            __juce__toggles: [],
            __juce__comboBoxes: [],
        }
    }

    class ListenerList<T = unknown> {
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

    class EventListenerList {
        private eventListeners: Map<string, ListenerList>

        constructor() {
            this.eventListeners = new Map()
        }

        addEventListener(eventId: string, fn: (event: unknown) => void): [string, number] {
            if (!this.eventListeners.has(eventId)) this.eventListeners.set(eventId, new ListenerList())

            const id = this.eventListeners.get(eventId)!.addListener(fn)

            return [eventId, id]
        }

        removeEventListener([eventId, id]: [string, number]): void {
            if (this.eventListeners.has(eventId)) {
                this.eventListeners.get(eventId)!.removeListener(id)
            }
        }

        emitEvent(eventId: string, object: unknown): void {
            if (this.eventListeners.has(eventId)) this.eventListeners.get(eventId)!.callListeners(object)
        }
    }

    class Backend {
        private listeners: EventListenerList

        constructor() {
            this.listeners = new EventListenerList()
        }

        addEventListener(eventId: string, fn: (event: unknown) => void): [string, number] {
            return this.listeners.addEventListener(eventId, fn)
        }

        removeEventListener([eventId, id]: [string, number]): void {
            this.listeners.removeEventListener([eventId, id])
        }

        emitEvent(eventId: string, object: unknown): void {
            window.__JUCE__.postMessage(JSON.stringify({ eventId: eventId, payload: object }))
        }

        emitByBackend(eventId: string, object: string): void {
            this.listeners.emitEvent(eventId, JSON.parse(object))
        }
    }

    if (typeof window.__JUCE__.backend === 'undefined') {
        window.__JUCE__.backend = new Backend()
    }
}
