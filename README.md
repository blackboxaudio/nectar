# `@bbx-audio/nectar`

[![@bbx-audio/nectar: v0.1.23](https://img.shields.io/badge/npm-v0.1.23-blue.svg)](https://github.com/blackboxaudio/nectar)
[![Build](https://github.com/blackboxaudio/nectar/actions/workflows/ci.build.yml/badge.svg)](https://github.com/blackboxaudio/nectar/actions/workflows/ci.build.yml)

> Collection of JUCE-y modules for building web-based plugin GUIs 🧃

## Overview

`nectar` is primarily a TypeScript wrapper around the [JUCE javascript code](https://github.com/juce-framework/JUCE/tree/master/modules/juce_gui_extra/native/javascript) that is used for building WebView-based GUIs. 
It also contains a number of other classes and utilities for things like parameter management, event handling, errors, and math.

This library is framework-agnostic, so feel free to use it in _any_ web-based project 🍻

## Installation

```bash
# NPM
npm i @bbx-audio/nectar

# Yarn
yarn add @bbx-audio/nectar
```

## Usage

Please refer to the [documentation](https://nectar.bbx-audio.com) for a comprehensive overview of this library.

### Initialization

The [`juce`](https://github.com/blackboxaudio/nectar/tree/develop/src/juce) module contains code that needs to be 
executed early in your program so that the communication with the JUCE backend is initialized properly.

This is done by simply adding an extra import statement to the top of your frontend's entrypoint file:
```typescript
// In an entrypoint file e.g., main.ts or index.ts

import '@bbx-audio/nectar/init'
```

### Errors

The [`error`](https://github.com/blackboxaudio/nectar/tree/develop/src/error) module contains the `Result` type, which generally helps improve error handling.

It does this by wrapping the result of a function call in a structure that either contains
the result as expected or the error that occurred during the function's execution.

```typescript
import { Result } from '@bbx-audio/nectar'

function divide(a: number, b: number): Result<number> {
    if (b === 0) {
        return [null, new Error('Unable to divide by zero')]
    } else {
        return [a / b, null]
    }
}

const [result, error] = divide(1, 0)
if (error) {
    // Handle the error
} else {
    // Proceed with the result
}
```

### Events

The [`event`](https://github.com/blackboxaudio/nectar/tree/develop/src/event) module contains a class that allows you to register listener callbacks that are executed when global
window and DOM events are emitted. This has two main benefits:
- Increased performance by limiting the number of actual event listeners to one instead of several since you do not have to add the listeners in each component.
- Improved developer experience by making it easier to subscribe and manage subscriptions to events.

```typescript
import { GlobalEventManager } from '@bbx-audio/nectar'

const unsubscribeToClick = GlobalEventManager.subscribeToClick((event: MouseEvent) => {
    // Do something when the mouse is clicked.
})

// Be sure to invoke the unsubscribe closure that we get as a result of subscribing to the event.
unsubscribeToClick()

// You can also subscribe to key-based events.
const unsubscribeToEnterKey = GlobalEventManager.subscribeToKey('Enter', (pressed: boolean, event: KeyboardEvent) => {
    if (pressed) {
        // Do something when the key is pressed.
    } else {
        // Do something when the key is not pressed (after being pressed).
    }
})

// Cleanup the subscription later.
unsubscribeToEnterKey()
```

### Parameters

The [`parameter`](https://github.com/blackboxaudio/nectar/tree/develop/src/parameter) module contains the classes and utilities to properly setup bidirectional communication with the JUCE backend.

#### Parameter Types

There are three different types of parameters:
- Boolean - A yes or no choice, represented by a boolean value internally.
- Choice - A selection among multiple choices, represented by an integer value internally.
- Float - A decimal number, represented by a float value internally.

You can subscribe to a parameter of any type to register callbacks when its internal value is updated.
This is useful when making sure the UI elements are in-sync with the backend values.

React:

```tsx
import { IBooleanParameter, ParameterChangeSource } from '@bbx-audio/nectar'

interface IToggleButtonProps {
    parameter: IBooleanParameter
}

const ToggleButton = ({ parameter }: IToggleButtonProps) => {
    const [isToggled, setIsToggled] = useState(parameter.getValue())

    useEffect(() => {
        const unsubscribe = parameter.subscribe((value, source) => {
            if (isToggled !== value) {
                setIsToggled(value)
            }
        })
        return () => unsubscribe()
    }, [])

    function onClick(): void {
        parameter.setValue(!isToggled, ParameterChangeSource.Frontend)
    }

    return (
        <button onClick={onClick}>
            {isToggled ? 'On' : 'Off'}
        </button>
    )
}
```

Svelte:
```svelte
<script lang="ts">
    import { IBooleanParameter, ParameterChangeSource } from '@bbx-audio/nectar'
    
    interface IToggleButtonProps {
        parameter: IBooleanParameter
    }
    
    let { parameter }: IToggleButtonProps = $props()
    
    let isToggled = $state(parameter.getValue())
    
    $effect(() => {
        const unsubscribe = parameter.subscribe((value, source) => {
            if (isToggled != value) {
                isToggled = value
            }
        })
        return () => unsubscribe()
    })
    
    function onClick(): void {
        parameter.setValue(!isToggled, ParameterChangeSource.Frontend)
    }
</script>

<button onclick={onClick}>
    {isToggled ? 'On' : 'Off'}
</button>
```

#### Parameter Manager

The `ParameterManager` is a global object that handles backend communication for each parameter that is registered with it.
You can register parameters individually or call a special method that loads parameter data from the backend.

:warning: Do **NOT** call the `initializeParameters` method to unless the backend has been properly setup to pass parameter
configuration information to the frontend in JSON format.

```tsx
import { ParameterManager, ParameterType } from '@bbx-audio/nectar'

// Create the parameter manager
const manager = new ParameterManager()

// Register a simple boolean parameter for toggling mono on and off
const monoParameter = manager.registerParameter<ParameterType.Boolean>({
    id: 'MONO',
    name: 'Mono',
    type: ParameterType.Boolean,
    defaultValue: false,
})

// Pass your mono parameter to a component, like a toggle button
// ...

// Be sure to clean up the manager as well
manager.cleanup()
```

## Contributing

This project is open and welcoming of outside contributions! There are multiple ways you can contribute:
- [File a bug report](https://github.com/blackboxaudio/nectar/issues) if you encounter buggy or erroneous behavior so we can get it fixed ASAP.
- [Open a pull request](https://github.com/blackboxaudio/nectar/compare) if you have some changes you would like to make to the library. **Every pull request MUST be associated with a GitHub issue!**
