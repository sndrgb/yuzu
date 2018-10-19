import {
  nextUid,
  isElement,
  isPlainObject,
  evaluate,
  bindMethod,
  qs,
  Events,
} from 'yuzu-utils';

import {
  IObject,
  IState,
  fn,
  IListener,
  IRefConstructor,
  IRefInstance,
  IRefFactory,
  eventHandlerFn,
  stateUpdaterFn,
  ReadyStateFn,
} from '../types';

const LISTENER_REGEXP = /^([^ ]+)(?: (.+))?$/;

// tslint:disable-next-line: interface-name no-empty-interface

/**
 * `Component` is an extensible class constructor which provides the building block of Yuzu component system.
 *
 * ```js
 * const instance = new Component({ ... })
 * ```
 *
 * > **Lifecycle**
 * >
 * > | stage    | hooks     |
 * > |----------| --------- |
 * > | `create` | `created` |
 *
 * @class
 * @param {object} [options={}] Instance options
 * @property {boolean} $active `true` if the instance is mounted and initialized
 * @property {object} options Instance options (see [defaultOptions](#defaultOptions))
 * @property {object} state Instance state (see [setState](#setState))
 * @property {Element} $el The instance root DOM element (see [mount](#mount))
 * @property {Object.<string, Element>} $els  Object mapping references to component's child DOM elements (see `selectors` below)
 * @property {{ string: Component }} $refs Object mapping references to child components (see [setRef](#setRef))
 * @property {object} selectors Object mapping a child element's reference name and a CSS selector
 * @property {Object.<string, function|string>} listeners Object mapping DOM listeners and handlers (see [setListener](#setListener))
 * @property {Object.<string, function|string>} actions Object mapping state keys and functions to executed on state update
 * @returns {Component}
 */
export class Component extends Events {
  public static root?: string;
  public static componentName?: string;

  /**
   * ```js
   * Component.UID_DATA_ATTR
   * ```
   * Component root element attribute marker.
   *
   * @static
   * @returns {object}
   */
  public static UID_DATA_ATTR = 'data-cid';

  /**
   * ```js
   * Component.defaultOptions()
   * ```
   * Returns an object with default options.
   *
   * @static
   * @returns {object}
   */
  public static defaultOptions = (): IObject => ({});

  /**
   * ```js
   * Component.isComponent(obj)
   * ```
   *
   * Checks whether the passed-in value is a Component constructor.
   *
   * @static
   * @param {*} value
   * @returns {boolean}
   */
  public static isComponent(value: any): value is typeof Component {
    if (!value || !value.defaultOptions) {
      return false;
    }
    return typeof value.defaultOptions === 'function';
  }

  public options: IObject;

  public detached?: boolean;

  public $active: boolean;

  public $el!: Element;
  public $uid!: string;
  public $els: { [key: string]: Element | null };
  public $refs: { [key: string]: Component };
  public state: IState;
  public $context?: IObject;

  public selectors?: IObject<string>;
  public listeners?: IObject<string | eventHandlerFn>;
  public actions?: IObject<string | fn>;

  public $refsStore: Map<string, Component>;
  public $listeners: Map<eventHandlerFn, IListener>;
  public readyState?: ReadyStateFn;

  /**
   * ```js
   * this.readyState(state, prevState)
   * ```
   *
   * Optional method used to delay the execution of [`ready`](#ready) after the state satisfies to a given condition.
   *
   * Will be executed at every state change until it returns `true`.
   *
   * @name readyState
   * @public
   * @type {function}
   * @param {object} state The current state
   * @param {object} prevState The previous state
   * @returns {boolean}
   */
  /**
   * Component constructor
   */
  constructor(options: IObject = {}) {
    super();
    const defaultOptionsFn = (this.constructor as typeof Component)
      .defaultOptions;

    const defaultOptions =
      typeof defaultOptionsFn === 'function'
        ? defaultOptionsFn.call(this, this)
        : {};

    this.state = {};

    this.options = Object.entries(defaultOptions).reduce(
      (opts: IObject, [key, value]) => {
        let v = options[key] !== undefined ? options[key] : value;
        if (typeof v === 'function' && !Component.isComponent(v)) {
          v = v.bind(this);
        }
        opts[key] = v; // eslint-disable-line no-param-reassign
        return opts;
      },
      {},
    );

    this.$active = false;

    // DOM references
    this.$els = {};

    // sub components references
    this.$refs = {};
    this.$refsStore = new Map();

    this.$listeners = new Map();

    this.created();
  }

  /**
   * ```js
   * mount(el, [state])
   * ```
   *
   * Mounts a component instance on a DOM element and initializes it.
   *
   * ?> To prevent initialization and just mount the component set `state` to `null`.
   *
   * > **Lifecycle**
   * >
   * > | stage    | hooks     |
   * > |----------| --------- |
   * > | `mount` | `beforeMount` <sup>(1)</sup>, `mounted` |
   *
   * 1. Just after attaching the root element (`this.$el`) but before any listener and selector registration.
   *
   * @param {string|Element} el Component's root element
   * @param {object|null} [state={}] Initial state
   * @returns {Component}
   */
  public mount(el: string | Element, state: IState | null = {}) {
    if (this.$el) {
      throw new Error('Component is already mounted');
    }

    if (this.detached) {
      throw new Error(
        'You cannot mount a detached component. Please use `init` instead',
      );
    }

    const $el = typeof el === 'string' ? qs(el) : el;

    if (!isElement($el)) {
      // fail silently (kinda...);
      console.warn('Element is not a DOM element', $el); // tslint:disable-line no-console
      return this;
    }

    this.$el = $el; // eslint-disable-line no-multi-assign

    this.beforeMount();

    if (this.selectors) {
      Object.entries(this.selectors).forEach(([key, selector]) => {
        this.$els[key] = qs(selector, this.$el);
      });
    }

    if (this.listeners) {
      Object.entries(this.listeners).forEach(([def, handler]) => {
        this.setListener(def, bindMethod(this, handler));
      });
    }

    if (state) {
      this.init(state);
    }

    this.mounted();

    return this;
  }

  /**
   * ```js
   * init([state])
   * ```
   * Initializes the component instance.
   *
   * > **Lifecycle**
   * >
   * > | stage    | hooks     |
   * > |----------| --------- |
   * > | `init` | `initialize`, `ready` |
   *
   * @param {object|null} [state={}] Initial state
   * @returns {Component}
   */
  public init(state: IState = {}) {
    if (!this.detached && !isElement(this.$el)) {
      throw new Error('component instance not mounted');
    }
    const { $el } = this;

    // initialization placeholder
    let uid = $el && $el.getAttribute(Component.UID_DATA_ATTR);

    if (uid) {
      console.warn(`Element ${uid} is already initialized... skipping`, $el); // tslint:disable-line no-console
      this.$uid = uid;

      return this;
    }

    uid = nextUid();
    this.$uid = uid;

    if ($el) {
      $el.setAttribute(Component.UID_DATA_ATTR, uid);

      if (!$el.id) {
        $el.id = `c_${uid}`;
      }
    }

    this.initialize();

    if (this.actions) {
      Object.entries(this.actions).forEach(([key, method]) => {
        this.on(`change:${key}`, bindMethod(this, method));
      });
    }

    const initialState = Object.assign(this.state, state);
    this.replaceState(initialState);

    this.$active = true;

    if (this.readyState) {
      // is it a promise ?
      const watcher = (current: IState, prev: IState) => {
        if ((this.readyState as ReadyStateFn)(current, prev)) {
          this.off('change:*', watcher);
          this.ready();
        }
      };
      this.on('change:*', watcher);
      return this;
    }

    this.ready();

    return this;
  }

  /**
   * Lifecycle hook called on instance creation.
   *
   * At this stage just the instance options (`this.options`) are initialized.
   *
   *  Overwrite this method with custom logic in your components.
   *
   * ?> Use this hook to tap as early as possible into the component's properties. For example to set a dynamic initial state.
   */
  public created() {} // tslint:disable-line: no-empty

  /**
   * Lifecycle hook called just before mounting the instance onto the root element.
   *
   * At this stage the component is already attached to its root DOM element.
   *
   * Overwrite this method with custom logic in your components.
   */
  public beforeMount() {} // tslint:disable-line: no-empty

  /**
   * Lifecycle hook called when the instance gets mounted onto a DOM element.
   *
   * At this stage both children elements (`this.$els.*`) and event listeners configured in `this.listeners` have been setup.
   *
   * Overwrite this method with custom logic in your components.
   *
   * ?> Use this method when you need to work with the DOM or manage any side-effect that requires the component to be into the DOM.
   */
  public mounted() {} // tslint:disable-line: no-empty

  /**
   * Lifecycle hook called before instance initialization.
   *
   * At this stage the state and state listeners are not yet been initialized.
   *
   * Overwrite this method with custom logic in your components.
   *
   * ?> Use this method to set child components by [setRef](#setRef) and run any preparatory work on the instance.
   */
  public initialize() {} // tslint:disable-line: no-empty

  /**
   * Lifecycle hook called after instance initialization.
   *
   * At this stage State and event binding are already in place.
   *
   * Overwrite this method with custom logic in your components.
   *
   * ?> `ready` lifecycle can be delayed (_async ready_) by implementing a [`readyState`](packages/yuzu/#async-ready-state) method.
   */
  public ready() {} // tslint:disable-line: no-empty

  /**
   * Lifecycle hook called just before closing child refs.
   *
   * This hook is called just before destroying the instance. Every property, listener and state feature is still active.
   *
   * Overwrite this method with custom logic in your components.
   *
   * !> This is an async method. Return a promise in order to suspend the destroy process.
   */
  public beforeDestroy() {} // tslint:disable-line: no-empty

  /**
   * ```js
   * getState(key)
   * ```
   *
   * Returns a property of the state or a default value if the property is not set.
   *
   * ?> In ES6 environments you can use a [destructuring assignment](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment) instead: ` const { name = 'John'} = this.state`
   *
   *
   * @param {string} key Property to return
   * @param {*} def Default value
   * @returns {*}
   * @example
   * const instance = new Component().mount('#app', { a: 1 });
   * // instance.getState('a') === 1
   *
   * // instance.getState('b', false) === false
   */
  public getState(key: string, def?: any) {
    return this.state.hasOwnProperty(key) ? this.state[key] : def;
  }

  /* eslint-disable class-methods-use-this */
  /**
   * ```js
   * shouldUpdateState(string, currentValue, newValue)
   * ```
   * Executes a strict inequality comparison (`!==`) on the passed-in values and returns the result.
   *
   * !> This method is executed on every [`setState`](#setstate) call.
   *
   * You can overwrite this method with your own validation logic.
   *
   * @param {string} key State property name
   * @param {*} currentValue Value stored in the current state
   * @param {*} newValue New value
   * @returns {boolean}
   */
  public shouldUpdateState(key: string, currentValue: any, newValue: any) {
    return currentValue !== newValue;
  }
  /* eslint-enable class-methods-use-this */

  /**
   * ```js
   * setState(updater, [silent])
   * ```
   *
   * Updates the internal instance state by creating a shallow copy of the current state and updating the passed-in keys.
   *
   * If the computed new state is different from the old one it emits a `change:<property>` event for every changed property
   * as well as a global `change:*` event.
   *
   * If the new value argument is a function, it will be executed with the current state as argument.
   * The returned value will be used to update the state.
   *
   * ?> To prevent an instance from emitting `change:` events set the second argument to `true` (silent update).
   *
   * @param {object|function} updater Defines which part of the state must be updated
   * @param {boolean} [silent=false] Update the state without emitting change events
   * @example
   * instance.on('change:a', (next, prev) => console.log(next, prev));
   * instance.setState({ a: 1 }); //emits 'change:a' -> logs undefined,1
   *
   * instance.setState({ a: 1 }); //nothing happens
   * instance.setState({ a: 2 }, true); //nothing happens, again...
   *
   * // use the current state to calculate its next value
   * instance.setState(({ a }) => ({a + 1}));
   */
  public setState<T extends IState = IState>(
    updater: Partial<T> | stateUpdaterFn<T>,
    silent = false,
  ) {
    const changed: string[] = [];
    const { state: prevState } = this;

    const changeSet = evaluate(updater as stateUpdaterFn<T>, this.state);

    this.state = Object.entries(this.state).reduce(
      (newState: IState, [k, prevValue]) => {
        const value = changeSet[k];
        if (
          value === undefined ||
          this.shouldUpdateState(k, prevValue, value) === false
        ) {
          newState[k] = prevValue; // eslint-disable-line no-param-reassign
        } else {
          changed.push(k);
          newState[k] = value; // eslint-disable-line no-param-reassign
        }
        return newState;
      },
      {},
    );

    if (!silent && changed.length > 0) {
      while (changed.length !== 0) {
        const k = changed.pop() as string;
        this.emit(`change:${k}`, this.state[k], prevState[k]);
      }
      this.emit('change:*', this.state, prevState);
    }
  }

  /**
   * ```js
   * replaceState(newState, [silent])
   * ```
   *
   * Replaces the current state of the instance with a completely new state.
   *
   * !> Note that this methods is un-affected by [`shouldUpdateState`](#shouldupdatestate).
   *
   * @param {object} newState The new state object
   * @param {boolean} [silent=false] Replace the state without emitting change events
   * @example
   * instance.replaceState({ a: 1 });
   * // instance.state.a === 1
   * instance.replaceState({ b: 2 });
   * // instance.state.b === 2
   * // instance.state.a === undefined
   */
  public replaceState(newState: IState, silent = false) {
    const { state: prevState } = this;
    this.state = Object.assign({}, newState);
    Object.entries(this.state).forEach(([key, value]) => {
      if (!silent) {
        this.emit(`change:${key}`, value, prevState[key]);
      }
    });
    if (!silent) {
      this.emit('change:*', this.state, prevState);
    }
  }

  /**
   * ```js
   * broadcast(event, [...params])
   * ```
   *
   * Emits a `broadcast:<eventname>` event on every child component listed in `$refs`.
   *
   * @param {string} event Event name
   * @param {*[]} [params] Additional arguments to pass to the handler
   * @example
   * const child = new Component('#child');
   * child.on('broadcast:log', (str) => console.log(str));
   *
   * instance.setRef({ id: 'child', component: child });
   * instance.broadcast('log', 'test') // child component logs 'test'
   */
  public broadcast(event: string, ...params: any[]) {
    this.$refsStore.forEach((instance) => {
      instance.emit(`broadcast:${event}`, ...params);
    });
  }

  /**
   * ```js
   * setListener(string, handler)
   * ```
   *
   * Sets a DOM event listener.
   *
   * The first argument must be a string composed by an event name (ie `click`) and a CSS selector (`.element`)
   * separated by a space.
   *
   * If the CSS selector starts with `@` the listener will be attached to the
   * corresponding reference child element (`this.$els.<element>`), if any.
   *
   * @param {string} def Event and target element definition. Format `eventName [target]`
   * @param {function} handler Event handler
   * @example
   *
   * // attach a click handler to a child element
   * instance.setListener('click .button', () => ...)
   *
   * // attach a click handler to this.$els.btn
   * instance.setListener('click @btn', () => ...)
   *
   * // attach a click handler to this.$el
   * instance.setListener('click', () => ...)
   */
  public setListener(def: string, handler: eventHandlerFn) {
    let event;
    let selector;
    const match = def && def.match(LISTENER_REGEXP);
    if (match) {
      const $el = this.$el;
      [, event, selector = $el] = match;
      let element;

      if (typeof selector === 'string') {
        element = selector.startsWith('@')
          ? this.$els[selector.slice(1)]
          : qs(selector, $el);
      } else {
        element = selector;
      }

      if (element) {
        element.addEventListener(event, handler);
        this.$listeners.set(handler, { event, element });
      }
    }
  }

  /**
   * ```js
   * removeListeners()
   * ```
   *
   * Removes all DOM event listeners attached with `.setListener`.
   *
   */
  public removeListeners() {
    this.$listeners.forEach(({ event, element }, handler) => {
      element.removeEventListener(event, handler);
    });
    this.$listeners.clear();
  }

  /**
   * ```js
   * setRef(config, [props])
   * ```
   *
   * Attaches a reference to a child component.
   *
   * If a reference `id` is already attached, the previous one is destroyed and replaced with the new one.
   *
   * ?> This is an async method returning a promise.
   *
   * @param {object} config A child component configuration object
   * @param {string} config.id Reference id. Will be used to set a reference to the child component onto `this.$refs`
   * @param {component} config.component Component constructor or component instance
   * @param {string|HTMLElement} config.el Child component root element. Ignored if `config.component` is a component instance
   * @param {Object} config.on Child component event listeners. Format `{ 'eventname': handler }`
   * @param {*} config.* Any other property listed here will be passed to the constructor as option
   * @param {object} [props] Child component initial state
   * @returns {Promise}
   * @example
   * const parent = new Component('#root');
   *
   * class ChildComponent extends Component {}
   *
   * // as constructor
   * parent.setRef({
   *   id: 'child',
   *   component: ChildComponent,
   *   el: '#child',
   *   // other options here...
   * });
   *
   * // as instance
   * parent.setRef({
   *   id: 'child',
   *   component: new ChildComponent({ ... }).mount('#child', null) // <-- prevent component init
   * });
   *
   * // sync parent - child state
   * // updates child `parentCount` state whenever `parent.state.count` changes
   * parent.setRef({
   *   id: 'child',
   *   component: ChildComponent,
   *   el: '#child',
   *   // other options here...
   * }, {
   *   parentCount: (parentState) => parentState.count
   * });
   */
  public async setRef(
    refCfg:
      | IRefConstructor<typeof Component>
      | IRefInstance<Component>
      | IRefFactory<Component>,
    props?: IState,
  ) {
    let ref: Component;
    if (!isPlainObject(refCfg)) {
      throw new TypeError('Invalid reference configuration');
    }

    const { component: ChildComponent, el, id, on, ...options } = refCfg;
    const { detached } = this;

    if (el && detached) {
      throw new Error(
        `setRef "${id}": you cannot define a component with DOM root as child of a detached component.`,
      );
    }

    if (Component.isComponent(ChildComponent)) {
      ref = new ChildComponent(options);
    } else if (ChildComponent instanceof Component) {
      ref = ChildComponent;
    } else if (typeof ChildComponent === 'function') {
      ref = (ChildComponent as IRefFactory<Component>['component'])(
        el,
        this.state,
      );
    } else {
      throw new TypeError('Invalid reference configuration');
    }

    // $context gets propagated to every child component
    // this way we can use `connect`-ed components as reference
    if (this.$context) {
      Object.defineProperty(ref, '$context', {
        enumerable: false,
        get: () => this.$context,
      });
    }

    if (!id) {
      throw new Error('Invalid reference id string');
    }

    // bind events...
    if (on) {
      Object.entries(on).forEach(([name, handler]) => {
        ref.on(name, handler);
      });
    }

    const { $refs } = this;
    const prevRef = $refs[id];
    const refState: IState = {};
    $refs[id] = ref;
    this.$refsStore.set(id, ref);

    if (!ref.detached && !ref.$el) {
      if (!el) {
        throw new Error(
          `You need to provide a root element for the child element with id "${id}".`,
        );
      }
      ref.mount(el, null);
    }

    if (props) {
      Object.entries(props).forEach(([name, value]) => {
        if (typeof value === 'function') {
          let key = name;
          let src = '*';
          if (name.includes('>')) {
            [src = '*', key] = name.split('>');
          }
          refState[key] = value(
            src !== '*' ? this.state[src] : this.state,
            ref,
          );
          this.on(`change:${src}`, (state) => {
            ref.setState({ [key]: value(state, ref) });
          });
        } else {
          refState[name] = value;
        }
      });
    }
    const { $el } = this;

    if (prevRef) {
      await prevRef.destroy();
      if (
        prevRef.$el &&
        $el.contains(prevRef.$el) &&
        prevRef.$el.parentElement &&
        ref.$el
      ) {
        prevRef.$el.parentElement.replaceChild(ref.$el, prevRef.$el);
      } else if (ref.$el && !$el.contains(ref.$el)) {
        $el.appendChild(ref.$el);
      }
      return ref.init(refState);
    }

    if (ref.$el && !$el.contains(ref.$el)) {
      $el.appendChild(ref.$el);
    }
    return ref.init(refState);
  }

  /**
   * Destroys and detaches a specific child component by its reference `id` (as set in `setRef`).
   *
   * @param {string} id Child component reference id
   * @param {boolean} [detach=false] Remove the child component root element from the DOM
   * @returns {Promise}
   */
  public async destroyRef(id: string, detach: boolean = false) {
    const { $refsStore } = this;
    const ref = $refsStore.get(id);
    if (!ref) {
      throw new Error(`Child component "${id}" not found.`);
    }
    $refsStore.delete(id);
    delete this.$refs[id];
    if (!detach) {
      return ref.destroy();
    }
    return ref.destroy().then(() => {
      if (ref.$el && ref.$el.parentElement) {
        ref.$el.parentElement.removeChild(ref.$el);
      }
    });
  }

  /**
   * Calls `.destroy()` on every child references and detaches them from the parent component.
   *
   * !> This is an async method returning a promise
   *
   * @returns {Promise}
   */
  public async destroyRefs() {
    const { $refsStore } = this;

    if ($refsStore.size === 0) {
      // exit early!
      return Promise.resolve();
    }

    try {
      const result = await Promise.all(
        [...$refsStore.values()].map((ref) => ref.destroy()),
      );
      this.$refs = {};
      $refsStore.clear();
      return result;
    } catch (e) {
      // tslint:disable-next-line no-console
      console.error(
        'An error occurred while destroy the component child components',
        e,
      );
      return Promise.reject(e);
    }
  }

  /**
   * ```js
   * destroy()
   * ```
   *
   * Detaches DOM events, instance's events and destroys all references as well.
   *
   * > **Lifecycle**
   * >
   * > | stage    | hooks     |
   * > |----------| --------- |
   * > | `destroy` | `beforeDestroy` |
   *
   *
   * !> This is an async method returning a promise
   *
   * @returns {Promise}
   */
  public async destroy() {
    await this.beforeDestroy();
    this.removeListeners();
    this.off();
    if (this.$el) {
      this.$el.removeAttribute(Component.UID_DATA_ATTR); // eslint-disable-line no-console
    }

    try {
      await this.destroyRefs();
      this.$active = false;

      return Promise.resolve();
    } catch (e) {
      console.error('destroy catch: ', e); // tslint:disable-line no-console
      return Promise.reject(e);
    }
  }
}
