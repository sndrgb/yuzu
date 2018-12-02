import { Component } from './component';
import { IObject, IStateLogger } from '../types';
/**
 * `devtools` is an helper function that will expose the instance of a Component in a `$yuzu` property attached to its root DOM element.
 *
 * !> To improve performance in production, this property will be available just when `process.env.NODE_ENV !== 'production'`.
 *
 * To initialize the devtools copy the following code into your entry point:
 *
 * ```js
 * import { Component, devtools } from 'yuzu';
 *
 * devtools(Component);
 * ```
 */
let devtools: (c: typeof Component) => void;

export type YuzuRoot = Element & { $yuzu: Component };

if (process.env.NODE_ENV !== 'production') {
  const createStateLogger = (label: string): IStateLogger<Component> => {
    const $listeners = new Map<string, any>();

    return {

      subscribe(instance, event = 'change:*') {
        const listener = this.log.bind(this, 'change');
        if ($listeners.has(event)) {
          /* tslint:disable no-console */
          console.warn(`Already listening for "${event}" on ${instance.$uid}`)
          /* tslint:enable no-console */
        }
        instance.on(event, listener);
        $listeners.set(event, listener);
        return () => {
          this.unsubscribe(instance, event);
        };

      },
      unsubscribe(instance, event = 'change:*') {
        if ($listeners.has(event)) {
          instance.off(event, $listeners.get(event));
          $listeners.delete(event);
        }
      },
      unsubscribeAll(instance) {
        $listeners.forEach((listener, event) => {
          instance.off(event, listener);
        })
        $listeners.clear();
      },
      log(msg, next, prev, args) {
        if (process.env.NODE_ENV !== 'production') {
          /* tslint:disable no-console */
          const head = [
            `%c${label}: %c${msg}`,
            'color: gray; font-weight: lighter',
            'color: green; font-weight: bolder',
          ];
          if (args && args.length > 0) {
            head.push(...args);
          }

          console.groupCollapsed(...head);

          if (prev) {
            console.log(
              '%cprev state',
              'color: gray; font-weight: bolder',
              prev,
            );
            console.log(
              '%cnext state',
              'color: green; font-weight: bolder',
              next,
            );
          } else {
            console.log(
              '%cinitial state',
              'color: gray; font-weight: bolder',
              next,
            );
          }
          console.groupEnd();
          /* tslint:enable no-console */
        }
      },
    };
  };

  /* eslint-disable no-param-reassign */
  devtools = (ComponentClass) => {
    const proto = ComponentClass.prototype;
    const { mount, init } = proto;

    function refTree(root: Component, tree: IObject) {
      if (root.$refsStore.size > 0) {
        root.$refsStore.forEach((ref, name) => {
          tree[name] = Object.create(null);
          refTree(ref, tree[name]);
        });
      }
      Object.defineProperty(tree, '$self', {
        enumerable: false,
        value: Object.assign(Object.create(null), {
          $raw: root,
          state: Object.assign(Object.create(null), root.state),
        }),
      });
      return tree;
    }

    proto.mount = function mountDev(...args) {
      mount.call(this, ...args);
      Object.defineProperty(this.$el as YuzuRoot, '$yuzu', {
        enumerable: false,
        writable: false,
        value: this,
      });

      Object.defineProperty(this, '$$getTree', {
        enumerable: false,
        writable: false,
        value() {
          const tree = Object.create(null);
          return refTree(this, tree);
        },
      });

      return this;
    };

    proto.init = function mountDev(state) {
      Object.defineProperties(this, {
        $$logStart: {
          enumerable: false,
          writable: false,
          value(label = null, event = 'change:*', listen = true) {
            const name =
              label ||
              this.options.debugLabel ||
             `${this.constructor.name || 'Component'}#${this.$uid}`

            if (!this.$$logger) {
              this.$$logger = createStateLogger(name);
            }
            if (listen) {
              this.$$logger.subscribe(this, event);
            }
          },
        },
        $$logEnd: {
          enumerable: false,
          writable: false,
          value(event?: string) {
            if (this.$$logger) {
              if (event) {
                this.$$logger.unsubscribe(this, event);
                return
              }
              this.$$logger.unsubscribeAll(this)
              this.$$logger = undefined;
            }
          },
        },
      });
      return init.call(this, state);
    };

    // @ts-ignore: Devtools Hooks
    if (window.__YUZU_DEVTOOLS_GLOBAL_HOOK__) {
      // @ts-ignore
      window.__YUZU_DEVTOOLS_GLOBAL_HOOK__.init(Component);
    }
  };

  /* eslint-enable no-param-reassign */
} else {
  devtools = (ComponentClass) => undefined;
}

export { devtools };
