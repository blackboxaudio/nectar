/**
 * Describes an object that manages event handlers and state
 * for global window and DOM events.
 */
export interface IGlobalEventManager {
    /**
     * Subscribes to a global click event, executing the callback provided when the mouse is clicked.
     */
    subscribeToClick(callback: (event: MouseEvent) => void): () => void

    /**
     * Subscribes to a global key event, executing the callback provided when the key is both pressed (key down)
     * and released (key up).
     */
    subscribeToKey(key: string, callback: (pressed: boolean, event: KeyboardEvent) => void): () => void

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
