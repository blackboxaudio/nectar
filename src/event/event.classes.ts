import type { IDragHandlers, IGlobalEventManager, IKeySubscriptionOptions, KeyEventCallback } from './event.types'

interface IKeySubscription {
    callback: KeyEventCallback
    target?: HTMLElement
    repeat: boolean
}

interface IActiveDrag {
    pointerId: number
    target: Element | null
    onMove: (event: PointerEvent) => void
    onFinish: (event: PointerEvent) => void
    onEnd?: (event: PointerEvent) => void
}

class GlobalEventManagerImpl implements IGlobalEventManager {
    private static _instance: GlobalEventManagerImpl

    private _pressedKeys = new Map<string, boolean>()
    private _keySubscriptions = new Map<string, Set<IKeySubscription>>()
    private _pointerDownCallbacks = new Set<(event: PointerEvent) => void>()
    private _activeDrag: IActiveDrag | null = null

    static getInstance(): IGlobalEventManager {
        if (!this._instance) {
            this._instance = new GlobalEventManagerImpl()
        }
        return this._instance
    }

    private constructor() {
        document.addEventListener('keydown', this.onKeyDown)
        document.addEventListener('keyup', this.onKeyUp)
        document.addEventListener('pointerdown', this.onPointerDown)
    }

    private onKeyDown = (event: KeyboardEvent) => {
        const key = event.key
        const isRepeat = event.repeat || (this._pressedKeys.get(key) ?? false)
        this._pressedKeys.set(key, true)

        const subscriptions = this._keySubscriptions.get(key)
        if (subscriptions) {
            this.dispatchKeyEvent(subscriptions, true, event, isRepeat)
        }
    }

    private onKeyUp = (event: KeyboardEvent) => {
        const key = event.key
        const wasPressed = this._pressedKeys.get(key) ?? false
        if (wasPressed) {
            this._pressedKeys.set(key, false)
            const subscriptions = this._keySubscriptions.get(key)
            if (subscriptions) {
                this.dispatchKeyEvent(subscriptions, false, event, false)
            }
        }
    }

    private dispatchKeyEvent(
        subscriptions: Set<IKeySubscription>,
        pressed: boolean,
        event: KeyboardEvent,
        isRepeat: boolean
    ): void {
        let handled = false
        subscriptions.forEach((subscription) => {
            if (isRepeat && !subscription.repeat) {
                return
            }
            if (!this.isWithinTarget(subscription.target, event)) {
                return
            }
            if (subscription.callback(pressed, event) === true) {
                handled = true
            }
        })

        if (handled) {
            event.preventDefault()
        }
    }

    private isWithinTarget(target: HTMLElement | undefined, event: Event): boolean {
        if (!target) {
            return true
        }
        if (event.target instanceof Node && target.contains(event.target)) {
            return true
        }
        return document.activeElement !== null && target.contains(document.activeElement)
    }

    private onPointerDown = (event: PointerEvent) => {
        this._pointerDownCallbacks.forEach((callback) => callback(event))
    }

    subscribeToPointerDown(callback: (event: PointerEvent) => void): () => void {
        this._pointerDownCallbacks.add(callback)
        return () => this._pointerDownCallbacks.delete(callback)
    }

    subscribeToClick(callback: (event: MouseEvent) => void): () => void {
        return this.subscribeToPointerDown(callback)
    }

    subscribeToKey(key: string, callback: KeyEventCallback, options?: IKeySubscriptionOptions): () => void {
        if (!this._keySubscriptions.has(key)) {
            this._keySubscriptions.set(key, new Set())
        }

        const subscriptions = this._keySubscriptions.get(key)!
        const subscription: IKeySubscription = {
            callback,
            target: options?.target,
            repeat: options?.repeat ?? false,
        }
        subscriptions.add(subscription)

        return () => {
            subscriptions.delete(subscription)

            /**
             * CAUTION: Pressed state is deliberately kept when the last subscriber leaves.
             * Deleting it would zero the recorded state of a key that is physically held,
             * which corrupts modifier queries like isShiftPressed().
             */
            if (subscriptions.size === 0) {
                this._keySubscriptions.delete(key)
            }
        }
    }

    beginDrag(event: PointerEvent, handlers: IDragHandlers): void {
        if (this._activeDrag) {
            this.finishDrag(event)
        }

        const pointerId = event.pointerId
        const target = event.target instanceof Element ? event.target : null

        try {
            target?.setPointerCapture(pointerId)
        } catch {
            /**
             * CAUTION: Capture can fail for detached elements or environments without
             * pointer capture support; the drag still works via the document listeners.
             */
        }

        const onMove = (moveEvent: PointerEvent) => {
            if (moveEvent.pointerId === pointerId) {
                handlers.onMove(moveEvent)
            }
        }
        const onFinish = (finishEvent: PointerEvent) => {
            if (finishEvent.pointerId === pointerId) {
                this.finishDrag(finishEvent)
            }
        }

        document.addEventListener('pointermove', onMove)
        document.addEventListener('pointerup', onFinish)
        document.addEventListener('pointercancel', onFinish)

        this._activeDrag = { pointerId, target, onMove, onFinish, onEnd: handlers.onEnd }
    }

    private finishDrag(event: PointerEvent): void {
        const drag = this._activeDrag
        if (!drag) {
            return
        }

        this._activeDrag = null
        document.removeEventListener('pointermove', drag.onMove)
        document.removeEventListener('pointerup', drag.onFinish)
        document.removeEventListener('pointercancel', drag.onFinish)

        try {
            drag.target?.releasePointerCapture(drag.pointerId)
        } catch {
            /**
             * CAUTION: Release fails when capture was never established; nothing to undo.
             */
        }

        drag.onEnd?.(event)
    }

    isKeyPressed(key: string): boolean {
        return this._pressedKeys.get(key) ?? false
    }

    isCtrlPressed(): boolean {
        return this.isKeyPressed('Control')
    }

    isShiftPressed(): boolean {
        return this.isKeyPressed('Shift')
    }

    isAltPressed(): boolean {
        return this.isKeyPressed('Alt')
    }
}

/**
 * Allows registering event handlers for global window and DOM events, such as
 * pointer presses and key presses.
 */
export const GlobalEventManager = GlobalEventManagerImpl.getInstance()
