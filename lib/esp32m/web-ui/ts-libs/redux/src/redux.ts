import { AnyAction, configureStore, Selector, Store } from '@reduxjs/toolkit';
import { isBrowser } from '@ts-libs/tools';
import { getPlugins } from '@ts-libs/plugins';
import { debounce } from '@ts-libs/tools';
import deepEqual from 'fast-deep-equal';
import { combineReducers, Middleware, ReducersMapObject } from 'redux';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PersistConfig,
  Persistor,
  persistReducer,
  persistStore,
  PURGE,
  REGISTER,
  REHYDRATE,
  Storage,
} from 'redux-persist';
import { AsyncNodeStorage } from './node/storage';
import { Observable, timeout } from 'rxjs';
import {
  IRedux,
  TObservableSelectorOptions,
  TReduxPlugin,
  TStateRoot,
} from './types';

function createDefaultStore<S>(): [Store<S>, Promise<Persistor> | undefined] {
  const reducers: ReducersMapObject = {};
  const middleware: Array<Middleware> = [];
  const plugins = getPlugins<TReduxPlugin>((p) => !!p.redux);
  const hasPesistence = plugins.some(({ redux }) => !!redux.persist);
  let defaultStorage: Storage | undefined;
  if (hasPesistence) {
    defaultStorage =
      plugins.reduce((p, { redux }) => {
        const { storage } = redux;
        if (storage)
          if (p)
            throw new Error(
              'multiple redux storage backends are not supported'
            );
          else return storage;
        return p;
      }, defaultStorage) ||
      (isBrowser()
        ? // eslint-disable-next-line @typescript-eslint/no-var-requires
          require('redux-persist/lib/storage')?.default
        : new AsyncNodeStorage('./'));
  }
  const ignoredActions: Array<string> = [];
  plugins.forEach(({ name, redux }) => {
    let { reducer } = redux;
    const { middleware: m, persist } = redux;
    if (reducer) {
      if (persist) {
        const pc: PersistConfig<S> = {
          key: name,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          storage: redux.storage || defaultStorage!,
          keyPrefix: 'redux-',
        };
        if (typeof persist === 'object') Object.assign(pc, persist);
        reducer = persistReducer(pc, reducer);
      }
      reducers[name] = reducer;
    }
    if (m) middleware.push(m);
  });
  // middleware.push(logger);
  if (hasPesistence)
    ignoredActions.push(FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER);
  const reducer = combineReducers(reducers);
  const store: Store<S> = configureStore({
    reducer,
    middleware: (m) =>
      m({
        serializableCheck: {
          ignoredActions,
          warnAfter: 500,
        },
        immutableCheck: { warnAfter: 500 },
      }).concat(...middleware),
  });
  let persistor: Promise<Persistor> | undefined;
  if (hasPesistence) {
    const ps = persistStore(store);
    persistor = new Promise((resolve) => {
      if (ps.getState().bootstrapped) resolve(ps);
      else ps.subscribe(() => resolve(ps));
    });
  }
  return [store, persistor];
}

class Redux<S = TStateRoot> implements IRedux<S> {
  readonly store: Store<S, AnyAction>;
  readonly persistor?: Promise<Persistor>;
  get dispatch() {
    return this.store.dispatch;
  }
  get getState() {
    return this.store.getState;
  }
  constructor(store?: Store<S>) {
    if (store) this.store = store;
    else {
      const [s, p] = createDefaultStore<S>();
      this.store = s;
      this.persistor = p;
    }
  }
  observable(timeout?: number): Observable<S> {
    // We could just use pipe(debounce()) for this, but that's suboptimal
    // for the cases when there are many subscribers for the same timeout.
    // So instead of having each dispatch to bump into multiple debounces
    // with the same timeout, we have only one store subscription per debounce timeout
    const wait = timeout || 0;
    return (
      this._observables[wait] ||
      (this._observables[wait] = new Observable((subscriber) => {
        const { subscribe, getState } = this.store;
        const debounced = debounce(() => subscriber.next(getState()), wait);
        return subscribe(debounced);
      }))
    );
  }
  observableSelector<T>(
    selector: Selector<S, T>,
    options?: TObservableSelectorOptions<S>
  ): Observable<[T, T | undefined]> {
    const { getState } = this.store;
    const equal = options?.shallow
      ? (a: T, b: T) => a === b
      : (a: T, b: T) => a === b || deepEqual(a, b);
    return this.observable(options?.debounce || 10).pipe(
      (obs) =>
        new Observable((subscriber) => {
          let prev = selector(getState());
          if (options?.emitInitial) subscriber.next([prev, undefined]);
          const sub = obs.subscribe({
            next: (s) => {
              const next = selector(s);
              if (!equal(prev, next)) subscriber.next([next, prev]);
              prev = next;
            },
            error: (e) => subscriber.error(e),
            complete: () => subscriber.complete(),
          });
          return () => sub.unsubscribe();
        })
    );
  }
  private readonly _observables: Record<number, Observable<S>> = {};
}

/*
const logger: Middleware = (store) => (next) => (action) => {
  console.log('dispatching', action);
  let result = next(action);
  console.log('next state', store.getState());
  return result;
};
*/

let instance: Redux<any>;
const wrappers = new Map<Store, Redux<any>>();

export function getRedux<S = TStateRoot>(store?: Store<S>): IRedux<S> {
  return store
    ? wrappers.get(store) ||
        (() => {
          const r = new Redux(store);
          wrappers.set(store, r);
          return r;
        })()
    : instance || (instance = new Redux<S>());
}

export function observableSelector<T, S = TStateRoot>(
  selector: Selector<S, T>,
  options?: TObservableSelectorOptions<S>
): Observable<[T, T | undefined]> {
  const redux = getRedux(options?.store);
  return redux.observableSelector(selector, options);
}

interface WhenSelectorOptions<S = TStateRoot>
  extends TObservableSelectorOptions<S> {
  timeout?: Parameters<typeof timeout>[0];
}

export function whenSelector<T>(
  selector: Selector<TStateRoot, T>,
  predicate: (next: T, prev?: T) => boolean,
  options?: WhenSelectorOptions
) {
  return new Promise((resolve, reject) => {
    const { getState } = getRedux(options?.store).store;
    const state = selector(getState());
    if (predicate(state)) resolve(state);
    else {
      let obs = observableSelector(selector, options);
      if (options?.timeout) obs = obs.pipe(timeout(options?.timeout));
      const subscription = obs.subscribe({
        next: ([next, prev]) => {
          if (predicate(next, prev)) {
            subscription.unsubscribe();
            resolve(next);
          }
        },
        error: (e) => {
          subscription.unsubscribe();
          reject(e);
        },
      });
    }
  });
}
