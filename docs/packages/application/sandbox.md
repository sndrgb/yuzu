# Sandbox

Sandbox creates a hub that groups a set of components within a container DOM element and manages their initialization and lifecyle.

An example scenario might be a panel of your interface where you place multiple instances of your components, start and stop them while keeping everything separated from other parts of the application.

<!-- TOC depthTo:3 -->

- [Example](#example)
- [Custom Options](#custom-options)
- [Inline Options](#inline-options)
- [Lifecycle Event Hooks](#lifecycle-event-hooks)
- [Instance Context](#instance-context)
- [API Summary](#api-summary)
  - [Lifecycle Methods](#lifecycle-methods)
- [Event Bus](#event-bus)
- [API Documentation](#api-documentation)

<!-- /TOC -->

## Example

Suppose we have the following Yuzu components:

```js
class Timer extends Component {
  static root = '.Timer';
  // ...
}

class Counter extends Component {
  static root = '.Counter';

  static defaultOptions = () => ({
    // ...
    theme: 'default',
  });
  // ...
}
```

And the following HTML:

```html
<body>
  <div id="app">
    <div class="Timer">
      <!-- -->
    </div>
    <div class="Counter">
      <!-- -->
    </div>
    <div class="Counter">
      <!-- -->
    </div>
  </div>
</body>
```

Without `Sandbox` we'd have to manually query the DOM and initialize a component for each matched element (one `Timer` and two `Counter`s).

`Sandbox` will take care of that for us:

```js
import { Sandbox } from 'yuzu-application';

const sandbox = new Sandbox({
  root: '#app',
  components: [Timer, Counter],
});

sandbox.start();
```

[![Edit Yuzu Demo](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/4w5ml1kmk0?initialpath=%2Fsandbox-base&module=%2Fexamples%2Fsandbox%2Fbase%2Findex.js)

Upon calling `sandbox.start()` the sandbox will query the DOM inside `#app`, match elements based on each components' `.root` static property and initialize matching component on them.

To un-mount the sandbox and its child components just run `sandbox.stop()`. This will trigger each instance `destroy` method as well.

?> To prevent a component for being initialized (for example when you want to initialize it at a later moment) just add a `data-skip` attribute to it's root element.

## Custom Options

You can also pass custom properties or CSS matchers for a component in order to alter the default options and element matching selector:

In the following example `Counter` will be initialized on elements matching `'.myCustomCounter'` CSS selector.

```js
const sandbox = new Sandbox({
  root: '#app',
  components: [Timer, [Counter, { selector: '.myCustomCounter' }]],
});
```

Every other property added to the object will be passed as instance options at initialization time.

```js
// starts 'myCustomCounter' with the 'dark' theme
const sandbox = new Sandbox({
  root: '#app',
  components: [Timer, [Counter, { theme: 'dark' }]],
});
```

## Inline Options

Custom options will be used on every component instance in the sandbox. In order to further customize each instance you can set a `data-ui-*` attribute on the component's root element.

Starting from the example above let's change the HTML to:

```diff
<body>
  <div id="app">
    <div class="Timer">
      <!-- -->
    </div>
    <div class="Counter">
      <!-- -->
    </div>
-    <div class="Counter">
+    <div class="Counter" data-ui-theme="light">
      <!-- -->
    </div>
  </div>
</body>
```

On `sandbox.start()` the first Counter will be initialized with the `dark` theme, but the second will pick the `light` one.

[![Edit Yuzu Demo](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/4w5ml1kmk0?initialpath=%2Fsandbox-custom&module=%2Fexamples%2Fsandbox%2Fwithoptions%2Findex.js)

## Lifecycle Event Hooks

To interact with a sandbox instance during its lifecycle you can attach event listeners to that instance. Available methods are those provided by [dush](https://github.com/tunnckocore/dush).

```js
sandbox.on('start', () => {
  console.log('Sandbox started');
});

sandbox.start();

// will log 'Sandbox started' on start
```

Here below is a table with all available events.

| name          | triggered by | lifecycle phase        |
| ------------- | ------------ | ---------------------- |
| `beforeStart` | `start()`    | startup <sup>(1)</sup> |
| `startup`     | `start()`    | running <sup>(2)</sup> |
| `beforeStop`  | `stop()`     | shutdown               |
| `stop`        | `stop()`     | stopped <sup>(3)</sup> |
| `error`       | `stop()`     | error <sup>(4)</sup>   |

1.  Just before initializing registered components and after `$context` initialization.
1.  Instances has been initialized. Since `ready` state can be async there's no guarantee that components' instances are completely initialized at this stage.
1.  Instances have been cleared and completely destroyed.
1.  When something fails while shutting down the sandbox an `error` event will be triggered with the error as argument.

## Instance Context

The Sandbox `start` method accepts an object that will be used as data for a shared [context](/packages/application/context) instance attached to the sandbox `$context` property.

?> The sandbox context will be automatically injected into every component instance inside the sandbox. See [context](/packages/application/context) for details.

```js
// shared sandbox theme
const sandbox = new Sandbox({
  root: '#app',
  components: [Timer, Counter],
});

sandbox.start({ theme: 'dark' });

sandbox.$context.getData().theme === 'dark';

// inside a component use this.$context.theme
```

## API Summary

### Lifecycle Methods

- `start` Starts the sandbox and initializes matched components
- `stop` (async) Stops the sandbox and calls `destroy` on instantiated components

## Event Bus

- `on`
- `once`
- `off`
- `emit`

See [dush](https://github.com/tunnckocore/dush) for details.

## API Documentation

- [Sandbox](/packages/application/api/sandbox)
