import type { IGlobalEventManager } from './event.types'

class GlobalEventManagerImpl implements IGlobalEventManager {
    private static _instance: GlobalEventManagerImpl

    private _pressedKeys = new Map<string, boolean>()
    private _keyCallbacks = new Map<string, Set<(pressed: boolean, event: KeyboardEvent) => void>>()
    private _clickCallbacks = new Set<(event: MouseEvent) => void>()

    static getInstance(): IGlobalEventManager {
        if (!this._instance) {
            this._instance = new GlobalEventManagerImpl()
        }
        return this._instance
    }

    private constructor() {
        document.addEventListener('keydown', this.onKeyDown)
        document.addEventListener('keyup', this.onKeyUp)
        document.addEventListener('mousedown', this.onMouseDown)
    }

    private onKeyDown = (event: KeyboardEvent) => {
        const key = event.key
        const wasPressed = this._pressedKeys.get(key) ?? false
        if (!wasPressed) {
            this._pressedKeys.set(key, true)
            const callbacks = this._keyCallbacks.get(key)
            if (callbacks) {
                callbacks.forEach((callback) => callback(true, event))
            }
        }
    }

    private onKeyUp = (event: KeyboardEvent) => {
        const key = event.key
        const wasPressed = this._pressedKeys.get(key) ?? false
        if (wasPressed) {
            this._pressedKeys.set(key, false)
            const callbacks = this._keyCallbacks.get(key)
            if (callbacks) {
                callbacks.forEach((callback) => callback(false, event))
            }
        }
    }

    private onMouseDown = (event: MouseEvent) => {
        this._clickCallbacks.forEach((callback) => callback(event))
    }

    subscribeToClick(callback: (event: MouseEvent) => void): () => void {
        this._clickCallbacks.add(callback)
        return () => this._clickCallbacks.delete(callback)
    }

    subscribeToKey(key: string, callback: (pressed: boolean, event: KeyboardEvent) => void): () => void {
        if (!this._keyCallbacks.has(key)) {
            this._keyCallbacks.set(key, new Set())
        }

        const callbacks = this._keyCallbacks.get(key)!
        callbacks.add(callback)

        return () => {
            callbacks.delete(callback)
            if (callbacks.size === 0) {
                this._keyCallbacks.delete(key)
                this._pressedKeys.delete(key)
            }
        }
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
 * mouse clicks and key presses.
 */
export const GlobalEventManager = GlobalEventManagerImpl.getInstance()
