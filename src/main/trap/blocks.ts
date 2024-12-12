/**
 * Get Blockly instance.
 * @param vm Virtual machine instance. For some reasons we cannot use VM here.
 * @returns Blockly instance.
 */
export function getScratchBlocksInstance (vm: DucktypedVM): Promise<DucktypedScratchBlocks> {
    const getScratchBlocksInstanceInternal: () => any | null = () => {
        // Hijack Function.prototype.apply to get React element instance.
        const hijack = (fn: (...args: unknown[]) => unknown) => {
            const _orig = Function.prototype.apply;
            // eslint-disable-next-line no-extend-native
            Function.prototype.apply = function (thisArg: any) {
                return thisArg;
            };
            const result = fn();
            // eslint-disable-next-line no-extend-native
            Function.prototype.apply = _orig;
            return result;
        };

        const events = vm._events?.EXTENSION_ADDED;
        if (events) {
            if (events instanceof Function) {
                // It is a function, just hijack it.
                const result = hijack(events);
                if (result && typeof result === 'object' && 'ScratchBlocks' in result) {
                    return result.ScratchBlocks;
                }
            } else {
                // It is an array, hijack every listeners.
                for (const value of events) {
                    const result = hijack(value);
                    if (result && typeof result === 'object' && 'ScratchBlocks' in result) {
                        return result.ScratchBlocks;
                    }
                }
            }
        }
        return null;
    };
    if (getScratchBlocksInstance.cache) {
        return Promise.resolve(getScratchBlocksInstance.cache);
    }
    let res = getScratchBlocksInstanceInternal();
    if (res) {
        return Promise.resolve(getScratchBlocksInstance.cache = res);
    }
    return new Promise(resolve => {
        // eslint-disable-next-line no-undefined
        let state: any = undefined;
        Reflect.defineProperty(vm._events, 'EXTENSION_ADDED', {
            get: () => state,
            set (v) {
                state = v;
                res = getScratchBlocksInstanceInternal();
                if (res) {
                    Reflect.defineProperty(vm._events, 'EXTENSION_ADDED', {
                        value: state,
                        writable: true
                    });
                    getScratchBlocksInstance.cache = res;
                    resolve(res);
                }
            },
            configurable: true
        });
    });
}

getScratchBlocksInstance.cache = null as DucktypedScratchBlocks | null;
