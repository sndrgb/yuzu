// @flow
import { qsa } from 'tsumami';

import type Component from './index';

/**
 * Child iterator
 *
 * @typedef childIterator
 */
type childIterator = (ctx: Component) => Array<any>;

/**
 * Element array Itarator.
 *
 * Returns a function that iterates a function over an array of DOM elements.
 * DOM elements are selected from a CSS selector in the context of the passed-in `Component#$el`.
 *
 * @example
 * const parent = new ParentComponent('#list');
 * const iterator = (el, i) => new ChildComponent(el, { index: i });
 * const childComponentArray = Children('.items', iterator)(parent);
 */
const Children = (selector: string, fn: (el: Element, index: number) => any): childIterator => (ctx: Component): Array<any> => {
    const els: Array<Element> = qsa(selector, ctx.$el);
    return els.map(fn);
};

export default Children;