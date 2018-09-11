import dush from 'dush';
import { Sandbox, sandboxComponentOptions } from '../src/sandbox';
import * as context from '../src/context';
import { Component } from '@yuzu/core';
import * as utils from '@yuzu/utils';

/* tslint:disable max-classes-per-file */
describe('`Sandbox`', () => {
  describe('constructor', () => {
    it('extends instance with dush methods', () => {
      const inst = new Sandbox();
      const ev: any = dush();
      Object.keys(ev).forEach((k) => {
        const m = (inst as any)[k];
        expect(typeof m).toBe(typeof ev[k]);
      });
    });

    it('assigns prop `id` to $id attribute', () => {
      const inst = new Sandbox({ id: 'demo' });
      expect(inst.$id).toBe('demo');
    });

    it('auto-generates in id if it is not passed in', () => {
      const inst = new Sandbox();
      expect(inst.$id).toMatch(/_sbx-[0-9]+/);
    });

    it('accepts a CSS selector string as $root', () => {
      const root = document.createElement('div');
      const spy = spyOn(utils, 'qs').and.returnValue(root);
      const inst = new Sandbox({ root: '#root' });
      expect(spy).toHaveBeenCalledWith('#root');
      expect(inst.$root).toBe(root);
    });

    it('accepts an element as $root', () => {
      const root = document.createElement('div');
      const inst = new Sandbox({ root });
      expect(inst.$root).toBe(root);
    });

    it('throws if it resolved root is not an element', () => {
      spyOn(utils, 'qs').and.returnValue(null);
      expect(() => {
        const inst = new Sandbox({ root: '#root' });
      }).toThrowError();
    });

    it('sets a data-sandbox attribute on the root element', () => {
      const root = document.createElement('div');
      const inst = new Sandbox({ root, id: 'demo' });
      expect(root.getAttribute('data-sandbox')).toBe('demo');
    });

    it('creates an internal arary to keep track of registered components', () => {
      const root = document.createElement('div');
      const inst = new Sandbox({ root });
      expect(inst.$registry).toEqual(jasmine.any(Array));
    });

    it('creates an internal map to keep track of component instances', () => {
      const root = document.createElement('div');
      const inst = new Sandbox({ root });
      expect(inst.$instances).toEqual(jasmine.any(Map));
    });

    it('calls register() for every passed-in component configuration', () => {
      const root = document.createElement('div');
      class Child extends Component {
        public static root = 'demo';
      }
      const components = [Child];
      const spy = spyOn(Sandbox.prototype, 'register');
      const inst = new Sandbox({ components, root });
      expect(spy).toHaveBeenCalledWith({ component: Child, selector: 'demo' });
    });

    it('calls register() for every passed-in component configuration (with options)', () => {
      const root = document.createElement('div');
      class Child extends Component {
        public static root = 'demo';
      }
      const components = [
        [Child, { selector: 'custom', prop: true }] as sandboxComponentOptions,
      ];
      const spy = spyOn(Sandbox.prototype, 'register');
      const inst = new Sandbox({ components, root });
      expect(spy).toHaveBeenCalledWith({
        component: Child,
        selector: 'custom',
        prop: true,
      });
    });
  });

  describe('.register()', () => {
    let inst: Sandbox;

    beforeEach(() => {
      inst = new Sandbox({ root: document.createElement('div') });
    });

    it('throws if "component" is not a Component constructor', () => {
      spyOn(Component, 'isComponent').and.returnValue(false);
      expect(() => {
        inst.register({ component: Component, selector: 'demo' });
      }).toThrowError(TypeError);
    });

    it('throws if "selector" is not a string', () => {
      expect(() => {
        inst.register({ component: Component, selector: null as any });
      }).toThrowError(TypeError);
    });

    it('pushes the passed-in params to the internal registry', () => {
      const params = { component: Component, selector: 'demo' };
      inst.register(params);
      expect(inst.$registry[0]).toBe(params);
    });
  });
  describe('.start()', () => {
    let inst: Sandbox;
    const params = { component: Component, selector: 'demo' };
    beforeEach(() => {
      inst = new Sandbox({ root: document.createElement('div') });
      inst.$registry = [params];
    });

    it('should create an internal context', () => {
      const mock = context.createContext({});
      const spy = spyOn(context, 'createContext').and.returnValue(mock);
      const ctx = {};
      inst.start(ctx);
      expect(spy).toHaveBeenCalledWith(ctx);
      expect(inst.$context).toBe(mock);
    });

    it('should emit a "beforeStart" event', () => {
      const spy = spyOn(inst, 'emit');
      inst.start();
      expect(spy).toHaveBeenCalledWith('beforeStart');
    });
  });
});
/* tslint:enable max-classes-per-file */