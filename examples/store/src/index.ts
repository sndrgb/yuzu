import { Component, mount } from '@packages/yuzu/src';
import { createContext } from '@packages/application/src';
import { List } from './list';
import { Counter } from './counter';
import { createStore } from './store';
import { connect } from './connect';

const addItem = ({ items }) => ({
  items: [...items, items.length],
});

const setTotal = ({ items }) => ({
  total: items.length,
});

const ConnectedList = connect(
  ({ items }) => ({ items }),
  (dispatch) => ({
    onClick: async () => {
      await dispatch(addItem);
      dispatch(setTotal);
    },
  }),
)(List);

const ConnectedCounter = connect(
  ({ total }) => ({ count: total }),
  null,
)(Counter);

const $store = createStore({
  items: [],
  total: 0,
});

const context = createContext({ $store });

class App extends Component {
  public initialize() {
    mount(ConnectedList, '#list')(this);
    mount(ConnectedCounter, '#num')(this);
  }
}

context.inject(new App()).mount('#app');
