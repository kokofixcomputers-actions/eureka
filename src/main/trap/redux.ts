import log from '../util/console';

export interface EuRedux {
    target: EventTarget;
    state: any;
    dispatch(action: unknown): unknown;
}

interface MiddlewareAPI<S, A> {
    getState: () => S;
    dispatch: (action: A) => void;
}

type Middleware<S, A> = (api: MiddlewareAPI<S, A>) => (next: (action: A) => void) => (action: A) => void;

class ReDucks {
    static compose<S> (...composeArgs: ((arg: S) => S)[]): (arg: S) => S {
        if (composeArgs.length === 0) return (args: S) => args;
        return (args: S) => {
            const composeArgsReverse = composeArgs.slice(0).reverse();
            let result = composeArgsReverse.shift()!(args);
            for (const fn of composeArgsReverse) {
                result = fn(result);
            }
            return result;
        };
    }

    static applyMiddleware<S, A> (...middlewares: Middleware<S, A>[]) {
        return (createStore: (...args: any[]) => { dispatch: (action: A) => void; getState: () => S }) =>
            (...createStoreArgs: any[]) => {
                const store = createStore(...createStoreArgs);
                let { dispatch } = store;
                const api: MiddlewareAPI<S, A> = {
                    getState: store.getState,
                    dispatch: (action: A) => dispatch(action),
                };
                const initialized = middlewares.map((middleware) => middleware(api));
                dispatch = ReDucks.compose(...initialized)(store.dispatch);
                return Object.assign({}, store, { dispatch });
            };
    }
}

let trappedRedux: EuRedux | object = {};

export function getRedux (): Promise<EuRedux> {
    return new Promise((resolve, reject) => {
        let reduxReady = false;

        let newerCompose = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;

        function compose<S, A> (...args: any[]): (arg: S) => S {
            const euRedux = trappedRedux as EuRedux;
            const reduxTarget: EventTarget = (euRedux.target = new EventTarget());
            euRedux.state = {};
            euRedux.dispatch = () => { };

            if (!reduxReady) {
                resolve(euRedux);
                reduxReady = true;
            }

            function middleware ({ getState, dispatch }: MiddlewareAPI<S, A>) {
                const euRedux = trappedRedux as EuRedux;
                euRedux.dispatch = dispatch;
                euRedux.state = getState();
                return (next: (action: A) => void) => (action: A) => {
                    const nextReturn = next(action);
                    const ev = new CustomEvent('statechanged', {
                        detail: {
                            prev: euRedux.state,
                            next: (euRedux.state = getState()),
                            action,
                        },
                    });
                    reduxTarget.dispatchEvent(ev);
                    return nextReturn;
                };
            }

            args.splice(1, 0, ReDucks.applyMiddleware<S, A>(middleware));
            return newerCompose ? newerCompose.apply(this, args) : ReDucks.compose.apply(this, args);
        }

        try {
            // ScratchAddons has captured redux
            if (window.__scratchAddonsRedux) {
                log.warn('ScratchAddons has captured redux.');
                trappedRedux = window.__scratchAddonsRedux;
                if (!reduxReady) {
                    resolve(trappedRedux as EuRedux);
                    reduxReady = true;
                }
            } else {
                Object.defineProperty(window, '__REDUX_DEVTOOLS_EXTENSION_COMPOSE__', {
                    get: () => compose,
                    set: (v) => {
                        newerCompose = v;
                    }
                });
            }
        } catch (e) {
            reject(e);
        }
    });
}
