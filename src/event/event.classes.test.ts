// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'

/**
 * jsdom does not implement PointerEvent, so the tests synthesize one on top of
 * MouseEvent with the fields the manager relies on.
 */
class FakePointerEvent extends MouseEvent {
    pointerId: number
    pointerType: string

    constructor(type: string, init: PointerEventInit = {}) {
        super(type, init)
        this.pointerId = init.pointerId ?? 0
        this.pointerType = init.pointerType ?? 'mouse'
    }
}

Object.defineProperty(window, 'PointerEvent', { value: FakePointerEvent })

const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

const { GlobalEventManager } = await import('./event.classes.ts')

function pressKey(key: string, init: KeyboardEventInit = {}, node: EventTarget = document): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
    node.dispatchEvent(event)
    return event
}

function releaseKey(key: string, node: EventTarget = document): KeyboardEvent {
    const event = new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true })
    node.dispatchEvent(event)
    return event
}

const CONSTRUCTOR_EVENTS = ['keydown', 'keyup', 'pointerdown']

describe('GlobalEventManager listener efficiency', () => {
    it('keeps exactly three document listeners regardless of subscription count', () => {
        const unsubscribers: (() => void)[] = []
        for (let i = 0; i < 10; i++) {
            unsubscribers.push(GlobalEventManager.subscribeToKey(`Key${i}`, () => {}))
            unsubscribers.push(GlobalEventManager.subscribeToPointerDown(() => {}))
        }

        const constructorRegistrations = addEventListenerSpy.mock.calls.filter(([type]) =>
            CONSTRUCTOR_EVENTS.includes(type as string)
        )
        expect(constructorRegistrations).toHaveLength(3)

        unsubscribers.forEach((unsubscribe) => unsubscribe())
    })
})

describe('GlobalEventManager key subscriptions', () => {
    it('scopes subscriptions to a target element', () => {
        const inside = document.createElement('div')
        const outside = document.createElement('div')
        document.body.append(inside, outside)

        const callback = vi.fn()
        const unsubscribe = GlobalEventManager.subscribeToKey('s', callback, { target: inside })

        pressKey('s', {}, outside)
        expect(callback).not.toHaveBeenCalled()
        releaseKey('s', outside)

        pressKey('s', {}, inside)
        expect(callback).toHaveBeenCalledTimes(1)

        releaseKey('s', inside)
        unsubscribe()
        inside.remove()
        outside.remove()
    })

    it('honours a scoped target through the focused element', () => {
        const container = document.createElement('div')
        const input = document.createElement('input')
        container.appendChild(input)
        document.body.appendChild(container)
        input.focus()

        const callback = vi.fn()
        const unsubscribe = GlobalEventManager.subscribeToKey('f', callback, { target: container })

        pressKey('f', {}, document)
        expect(callback).toHaveBeenCalledTimes(1)

        releaseKey('f')
        unsubscribe()
        container.remove()
    })

    it('calls preventDefault only when a callback reports the event as handled', () => {
        const handledUnsubscribe = GlobalEventManager.subscribeToKey('p', () => true)
        const handledEvent = pressKey('p')
        expect(handledEvent.defaultPrevented).toBe(true)
        releaseKey('p')
        handledUnsubscribe()

        const passiveUnsubscribe = GlobalEventManager.subscribeToKey('q', () => {})
        const passiveEvent = pressKey('q')
        expect(passiveEvent.defaultPrevented).toBe(false)
        releaseKey('q')
        passiveUnsubscribe()
    })

    it('fires held keys only for subscribers that opted into repeat', () => {
        const single = vi.fn()
        const repeating = vi.fn()
        const unsubscribeSingle = GlobalEventManager.subscribeToKey('r', single)
        const unsubscribeRepeating = GlobalEventManager.subscribeToKey('r', repeating, { repeat: true })

        pressKey('r')
        pressKey('r', { repeat: true })
        pressKey('r', { repeat: true })
        releaseKey('r')

        expect(single).toHaveBeenCalledTimes(2)
        expect(repeating).toHaveBeenCalledTimes(4)

        unsubscribeSingle()
        unsubscribeRepeating()
    })

    it('keeps the pressed state of a held key when its last subscriber leaves', () => {
        const unsubscribe = GlobalEventManager.subscribeToKey('Shift', () => {})

        pressKey('Shift')
        unsubscribe()

        expect(GlobalEventManager.isShiftPressed()).toBe(true)

        releaseKey('Shift')
        expect(GlobalEventManager.isShiftPressed()).toBe(false)
    })
})

describe('GlobalEventManager pointer subscriptions', () => {
    it('notifies pointer-down subscribers and supports the deprecated click alias', () => {
        const pointerCallback = vi.fn()
        const clickCallback = vi.fn()
        const unsubscribePointer = GlobalEventManager.subscribeToPointerDown(pointerCallback)
        const unsubscribeClick = GlobalEventManager.subscribeToClick(clickCallback)

        document.dispatchEvent(new FakePointerEvent('pointerdown', { pointerId: 1, bubbles: true }))

        expect(pointerCallback).toHaveBeenCalledTimes(1)
        expect(clickCallback).toHaveBeenCalledTimes(1)

        unsubscribePointer()
        unsubscribeClick()
    })
})

describe('GlobalEventManager drag hosting', () => {
    function dispatchPointer(type: string, pointerId: number): void {
        document.dispatchEvent(new FakePointerEvent(type, { pointerId, bubbles: true }))
    }

    it('routes moves for the dragging pointer only and ends on pointer up', () => {
        const onMove = vi.fn()
        const onEnd = vi.fn()

        GlobalEventManager.beginDrag(new FakePointerEvent('pointerdown', { pointerId: 7 }), { onMove, onEnd })

        dispatchPointer('pointermove', 7)
        dispatchPointer('pointermove', 9)
        expect(onMove).toHaveBeenCalledTimes(1)

        dispatchPointer('pointerup', 7)
        expect(onEnd).toHaveBeenCalledTimes(1)

        dispatchPointer('pointermove', 7)
        expect(onMove).toHaveBeenCalledTimes(1)
    })

    it('removes its document listeners on pointer up', () => {
        removeEventListenerSpy.mockClear()

        GlobalEventManager.beginDrag(new FakePointerEvent('pointerdown', { pointerId: 3 }), { onMove: vi.fn() })
        dispatchPointer('pointerup', 3)

        const removedTypes = removeEventListenerSpy.mock.calls.map(([type]) => type)
        expect(removedTypes).toContain('pointermove')
        expect(removedTypes).toContain('pointerup')
        expect(removedTypes).toContain('pointercancel')
    })

    /**
     * A leak here would be permanent: cancellation is the path taken when the OS
     * steals the pointer (scrolling, alerts, palm rejection), not user release.
     */
    it('removes its document listeners on pointer cancel', () => {
        const onMove = vi.fn()
        const onEnd = vi.fn()
        removeEventListenerSpy.mockClear()

        GlobalEventManager.beginDrag(new FakePointerEvent('pointerdown', { pointerId: 4 }), { onMove, onEnd })
        dispatchPointer('pointercancel', 4)

        expect(onEnd).toHaveBeenCalledTimes(1)
        const removedTypes = removeEventListenerSpy.mock.calls.map(([type]) => type)
        expect(removedTypes).toContain('pointermove')
        expect(removedTypes).toContain('pointerup')
        expect(removedTypes).toContain('pointercancel')

        dispatchPointer('pointermove', 4)
        expect(onMove).not.toHaveBeenCalled()
    })

    it('ends the previous drag when a new one begins', () => {
        const firstEnd = vi.fn()
        const secondMove = vi.fn()

        GlobalEventManager.beginDrag(new FakePointerEvent('pointerdown', { pointerId: 5 }), {
            onMove: vi.fn(),
            onEnd: firstEnd,
        })
        GlobalEventManager.beginDrag(new FakePointerEvent('pointerdown', { pointerId: 6 }), { onMove: secondMove })

        expect(firstEnd).toHaveBeenCalledTimes(1)

        dispatchPointer('pointermove', 6)
        expect(secondMove).toHaveBeenCalledTimes(1)

        dispatchPointer('pointerup', 6)
    })
})
