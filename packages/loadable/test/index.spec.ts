import { Component } from 'yuzu';
import { Loadable } from '../src';
// import { mount } from '../../../shared/utils';
import * as utils from 'yuzu-utils';

/* tslint:disable max-classes-per-file */
describe('`Loadable`', () => {
  describe('Factory', () => {
    class Child extends Component {}
    let LoadableComponent: typeof Component;
    const fetchData = () => ({});
    beforeEach(() => {
      LoadableComponent = Loadable({
        component: Child,
        fetchData,
      });
    });

    it('returns a component', () => {
      expect(new LoadableComponent()).toEqual(jasmine.any(Component));
    });
    it('sets component root selector based in the child component name', () => {
      expect(LoadableComponent.root).toBe(
        '[data-loadable][data-component="Child"]',
      );
    });

    it('sets the component componentName property', () => {
      expect(LoadableComponent.componentName).toBe('LoadableChild');
    });

    it('extends generated component defaults with passed-in options', () => {
      const options = LoadableComponent.defaultOptions();
      expect(options.component).toBe(Child);
      expect(options.fetchData).toBe(fetchData);
    });

    it('matches default options', () => {
      expect(LoadableComponent.defaultOptions()).toEqual({
        fetchData: jasmine.any(Function),
        component: Child,
        template: jasmine.any(Function),
        loader: null,
        renderRoot: 'div',
        options: {},
        props: jasmine.any(Function),
      });
    });
  });

  describe('render()', () => {
    class Child extends Component {}
    let LoadableComponent: typeof Component;
    let template: any;
    let inst: any;
    beforeEach(() => {
      template = jasmine.createSpy().and.returnValue('');
      LoadableComponent = Loadable({
        component: Child,
        fetchData: () => ({}),
        template,
      });
      inst = new LoadableComponent();
    });

    it('calls template option with state "props" and options', () => {
      const props = {};
      inst.state.props = props;
      inst.render();
      expect(template).toHaveBeenCalledWith({ props, options: inst.options });
    });

    it('returns the first DOM element of the generated template', () => {
      template.and.returnValue('<div></div><p></p>');
      const ret = inst.render();
      expect(ret).toEqual(jasmine.any(HTMLElement));
      expect(ret.tagName).toBe('DIV');
    });

    it('warns for multi-root templates', () => {
      template.and.returnValue('<div></div><p></p>');
      const spy = spyOn(console, 'warn');
      inst.render();
      expect(spy).toHaveBeenCalled();
    });

    it('returns null if the template returns a falsy value', () => {
      const ret = inst.render();
      expect(ret).toBe(null);
    });
  });

  describe('setLoader()', () => {
    class Loader extends Component {}
    let LoadableComponent: typeof Component;
    let inst: any;
    beforeEach(() => {
      LoadableComponent = Loadable({
        component: Component,
        fetchData: () => ({}),
        loader: Loader,
      });
      inst = new LoadableComponent();
    });

    it('returns a resolved promise if loader is not set', () => {
      inst.options.loader = null;
      return inst.setLoader().then(() => {
        expect(true).toBe(true);
      });
    });

    it('mounts the loader as component child and returns the call to "setRef"', async () => {
      const async = document.createElement('div');
      inst.$els.async = async;
      const ret = Promise.resolve(inst);
      const spy = spyOn(inst, 'setRef').and.returnValue(ret);
      const result = await inst.setLoader();
      expect(result).toBe(inst);
      expect(spy).toHaveBeenCalledWith({
        id: 'async',
        el: async,
        component: Loader,
      });
    });
  });

  describe('setComponent()', () => {
    class Child extends Component {}
    let LoadableComponent: typeof Component;
    const options = { demo: true };
    let inst: any;
    beforeEach(() => {
      LoadableComponent = Loadable({
        component: Child,
        options,
        fetchData: () => ({}),
      });
      inst = new LoadableComponent();
    });

    it('mounts the loader as component child and returns the call to "setRef"', async () => {
      const root = document.createElement('div');
      const ret = Promise.resolve(inst);
      const spy = spyOn(inst, 'setRef').and.returnValue(ret);
      const result = await inst.setComponent(root);
      expect(result).toBe(inst);
      expect(spy).toHaveBeenCalledWith(
        {
          el: root,
          id: 'async',
          component: Child,
          demo: true,
        },
        inst.state.props,
      );
    });

    it('evaluates passed-in props', async () => {
      const props = {};
      inst.options.props = props;
      const spy = spyOn(utils, 'evaluate').and.callThrough();
      spyOn(inst, 'setRef');
      await inst.setComponent(document.createElement('div'));
      expect(spy).toHaveBeenCalledWith(props, inst.state.props);
    });

    it('uses $els.async if root element is NOT a DOM element', async () => {
      spyOn(utils, 'isElement').and.returnValue(false);
      inst.$els.async = document.createElement('div');
      const spy = spyOn(inst, 'setRef');
      await inst.setComponent(document.createElement('div'));
      const [arg] = spy.calls.argsFor(0);
      expect(arg.el).toBe(inst.$els.async);
    });
  });

  describe('mounted()', () => {
    let LoadableComponent: typeof Component;
    let inst: any;
    let fetchData: any;
    const data = {};
    let root: HTMLElement;
    beforeEach(() => {
      root = document.createElement('div');
      fetchData = jasmine.createSpy().and.returnValue(data);
      LoadableComponent = Loadable({
        component: Component,
        fetchData,
      });
      inst = new LoadableComponent();
      inst.$el = root;
    });
    it('clears the root element contents and appends a div inside the root element', () => {
      inst.$el.innerHTML = '<p>demo</p>';
      inst.mounted();
      expect(inst.$el.children.length).toBe(1);
      expect(inst.$el.firstElementChild).toEqual(jasmine.any(HTMLElement));
      expect(inst.$el.firstElementChild.tagName).toBe('DIV');
    });

    it('creates a reference to the new child element', () => {
      inst.mounted();
      expect(inst.$els.async).toEqual(jasmine.any(HTMLElement));
      expect(inst.$els.async).toBe(inst.$el.firstElementChild);
    });

    it('allows custom tags a reference to the new child element', () => {
      inst.options.renderRoot = 'span';
      inst.mounted();
      expect(inst.$els.async.tagName).toBe('SPAN');
    });

    it('allows a custom function that returns the child element', () => {
      const async = document.createElement('div');
      const spy = jasmine.createSpy().and.returnValue(async);
      inst.options.renderRoot = spy;
      inst.mounted();
      expect(inst.$els.async).toBe(async);
      expect(spy).toHaveBeenCalledWith(inst.$el);
    });

    it('throws if "renderRoot" is not defined', async () => {
      inst.options.renderRoot = null as any;
      let err;
      try {
        await inst.mounted();
      } catch (e) {
        err = e;
      }
      expect(err).toEqual(jasmine.any(TypeError));
    });

    it('calls .setLoader()', () => {
      const spy = spyOn(inst, 'setLoader');
      inst.mounted();
      expect(spy).toHaveBeenCalled();
    });

    it('calls .options.fetchData() with the instance as first argument', async () => {
      await inst.mounted();
      expect(fetchData).toHaveBeenCalledWith(inst);
    });

    it('logs an error on fetchData failure and returns the instance', async () => {
      const e = new Error('MOCK');
      fetchData.and.throwError(e);
      const spy = spyOn(console, 'error');
      const ret = await inst.mounted();
      expect(spy).toHaveBeenCalledWith(e);
      expect(ret).toBe(inst);
    });

    it('does NOT mount component on error', async () => {
      const e = new Error('MOCK');
      fetchData.and.throwError(e);
      const spy = spyOn(inst, 'setComponent');
      await inst.mounted();
      expect(spy).not.toHaveBeenCalled();
    });

    it('sets the "props" state of the component with the returned data', async () => {
      const spy = spyOn(inst, 'setState');
      await inst.mounted();
      expect(spy).toHaveBeenCalledWith({ props: data });
    });

    it('calls "render()"', async () => {
      const spy = spyOn(inst, 'render');
      await inst.mounted();
      expect(spy).toHaveBeenCalled();
    });

    it('calls "setComponent()" with the result of render', async () => {
      const el = document.createElement('div');
      spyOn(inst, 'render').and.returnValue(el);
      const spy = spyOn(inst, 'setComponent');
      await inst.mounted();
      expect(spy).toHaveBeenCalledWith(el);
    });
  });
});
