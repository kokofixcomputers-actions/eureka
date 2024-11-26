import log from '../util/console';

export interface EuRedux {
    target: EventTarget;
    state: Partial<DucktypedState>;
    dispatch(action: DucktypedAction): unknown;
}

interface MiddlewareAPI<S, A> {
    getState: () => S;
    dispatch: (action: A) => void;
}

interface DucktypedAction {
    type: string;
    [key: string]: unknown;
}

interface DucktypedState {
    scratchGui: DucktypedGUIState;
    scratchPaint: DucktypedPaintState;
    locales: DucktypedLocalesState;
    [key: string]: unknown;
}

interface DucktypedPaintState {
    [key: string]: unknown;
}

interface DucktypedLocalesState {
    locale: string;
    messages: Record<string, string>;
    messagesByLocale: Record<string, Record<string, string>>;
}

interface DucktypedGUIState {
    vm: DucktypedVM;
    [key: string]: unknown;
}

type Middleware<S, A> = (api: MiddlewareAPI<S, A>) => (next: (action: A) => void) => (action: A) => void;

type ScratchReduxStore = MiddlewareAPI<DucktypedState, DucktypedAction>;

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
                euRedux.dispatch = dispatch as (action: DucktypedAction) => unknown;
                euRedux.state = getState() as Partial<DucktypedState>;
                return (next: (action: A) => void) => (action: A) => {
                    const nextReturn = next(action);
                    const ev = new CustomEvent('statechanged', {
                        detail: {
                            prev: euRedux.state,
                            next: (euRedux.state = getState() as Partial<DucktypedState>),
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

/**
 * Get redux store instance from DOM, this operation may expensive and rely on react's implementation.
 * We only use it when page has been loaded and we cannot trap VM.
 * 
 * Reference: https://pablo.gg/en/blog/coding/how-to-get-the-redux-state-from-a-react-18-production-build-via-the-browsers-console/
 * @returns 
 */
export function getReduxStoreFromDOM (): ScratchReduxStore | null {
    const internalRoots = Array.from(document.querySelectorAll('*')).map((el) => {
        const key = Object.keys(el).filter((keyName) => keyName.includes('__reactContainer')).at(-1);
        return el[key];
    }).filter((key) => key);

    for (const root of internalRoots) {
        const seen = new Map();
        const stores = new Set<ScratchReduxStore>();
        
        const search = (obj) => {
            if (seen.has(obj)) {
                return;
            }
            seen.set(obj, true);
            
            for (const name in obj) {
                if (name === 'getState') {
                    const store = obj as ScratchReduxStore;
                    const state = store.getState();
                    if (state?.scratchGui?.vm && state.scratchPaint && state.locales) {
                        return store; // Found target store
                    }
                    stores.add(obj);
                }

                // eslint-disable-next-line no-prototype-builtins
                if ((obj?.hasOwnProperty?.(name)) && (typeof obj[name] === 'object') && (obj[name] !== null)) {
                    const result = search(obj[name]);
                    if (result) return result; // Propagate found store
                }
            }
        };

        const result = search(root);
        if (result) return result;
    }
    return null;
}
