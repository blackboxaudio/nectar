/**
 * A callback executed when a subscribed key transitions or repeats. Returning `true`
 * marks the event as handled, causing the manager to call `preventDefault()` on it;
 * any other return value leaves the browser's default behavior intact.
 */
export type KeyEventCallback = (pressed: boolean, event: KeyboardEvent) => boolean | void

/**
 * Describes the options by which a key subscription can be configured.
 */
export interface IKeySubscriptionOptions {
    /**
     * Restricts the subscription to key events originating inside this element
     * (or while focus is inside it). Without a target, the subscription is global.
     */
    target?: HTMLElement

    /**
     * Whether the callback should fire repeatedly while the key is held. Defaults
     * to false, firing only on the initial press and the release.
     */
    repeat?: boolean
}

/**
 * Describes the handlers invoked over the lifetime of a pointer drag gesture
 * hosted by the event manager.
 */
export interface IDragHandlers {
    /**
     * Invoked for every movement of the dragging pointer.
     */
    onMove: (event: PointerEvent) => void

    /**
     * Invoked once when the gesture ends, whether by release or cancellation.
     */
    onEnd?: (event: PointerEvent) => void
}

/**
 * Describes an object that manages event handlers and state
 * for global window and DOM events.
 */
export interface IGlobalEventManager {
    /**
     * Subscribes to a global pointer-down event, executing the callback provided when
     * any pointer (mouse, touch, or pen) is pressed.
     */
    subscribeToPointerDown(callback: (event: PointerEvent) => void): () => void

    /**
     * Subscribes to a global click event, executing the callback provided when the mouse is clicked.
     *
     * @deprecated Use {@link subscribeToPointerDown} instead, which also covers touch and pen input.
     */
    subscribeToClick(callback: (event: MouseEvent) => void): () => void

    /**
     * Subscribes to a global key event, executing the callback provided when the key is both pressed (key down)
     * and released (key up). Options allow scoping the subscription to an element and opting into
     * auto-repeat while the key is held.
     */
    subscribeToKey(key: string, callback: KeyEventCallback, options?: IKeySubscriptionOptions): () => void

    /**
     * Hosts a pointer drag gesture, attaching one shared set of move / up / cancel listeners
     * for the duration of the gesture and removing them when it ends. Pointer capture is
     * managed centrally on the event's target. Only one drag is ever active; starting a new
     * drag ends the previous one.
     */
    beginDrag(event: PointerEvent, handlers: IDragHandlers): void

    /**
     * Checks whether a given key is pressed.
     */
    isKeyPressed(key: string): boolean

    /**
     * Checks whether the "Ctrl" key is pressed.
     */
    isCtrlPressed(): boolean

    /**
     * Checks whether the "Shift" key is pressed.
     */
    isShiftPressed(): boolean

    /**
     * Checks whether the "Alt" key is pressed.
     */
    isAltPressed(): boolean
}
