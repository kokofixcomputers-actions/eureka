import './meta.js?userscript-metadata';
import log from './util/console';
import settingsAgent from './util/settings';
import { version } from '../../package.json';
import { getVMInstance } from './trap/vm';
import { getScratchBlocksInstance } from './trap/blocks';
import './util/l10n';
import formatMessage from 'format-message';
import { eureka } from './ctx';
import { applyPatchesForVM, applyPatchesForBlocks } from './patches/applier';
import { setLocale } from './util/l10n';
import { getRedux } from './trap/redux';
import './dashboard/app';

log.info(
    formatMessage({
        id: 'eureka.loading',
        default: 'Eureka (Version {version})'
    }, {version})
);

const settings = settingsAgent.getSettings();

// Set traps
(async () => {
    if (settings.trap.vm) {
        try {
            const vm = eureka.vm = await getVMInstance().then(vm => {
                if (settings.trap.blocks) {
                    getScratchBlocksInstance(vm).then(blocks => {
                        eureka.blocks = blocks;
                        log.info(
                            formatMessage({
                                id: 'eureka.blocksReady',
                                default: 'ScratchBlocks is ready.'
                            })
                        );
                        if (settings.behavior.polyfillGlobalInstances && typeof globalThis.ScratchBlocks === 'undefined') {
                            globalThis.ScratchBlocks = eureka.blocks;
                        }

                        if (!settings.behavior.headless) {
                            applyPatchesForBlocks(eureka.blocks);
                        }
                    }).catch(e => {
                        log.error(
                            formatMessage({
                                id: 'eureka.failedToGetBlocks',
                                default: 'Failed to get ScratchBlocks.'
                            })
                            , '\n', e);
                    });
                }
                return vm;
            });
            if (settings.behavior.polyfillGlobalInstances && typeof globalThis.vm === 'undefined') {
                globalThis.vm = vm;
            }
            setLocale(vm.getLocale());

            if (settings.behavior.headless) {
                log.warn(
                    formatMessage({
                        id: 'eureka.headlessTips',
                        default: 'Headless mode on, stop apply patches.'
                    })
                );
            } else {
                applyPatchesForVM(vm, eureka);
            }
        } catch (e) {
            log.error(
                formatMessage({
                    id: 'eureka.failedToGetVM',
                    default: 'Failed to get VM.'
                })
                , '\n', e);
        }
    }
})();

(async () => {
    if (settings.trap.redux) {
        try {
            log.info(
                formatMessage({
                    id: 'eureka.gettingRedux',
                    default: 'Getting Redux...'
                })
            );
            eureka.redux = await getRedux();
            log.info(
                formatMessage({
                    id: 'eureka.reduxReady',
                    default: 'Redux is ready.'
                })
            );
            if (settings.behavior.polyfillGlobalInstances && typeof globalThis.ReduxStore === 'undefined') {
                globalThis.ReduxStore = {
                    dispatch: eureka.redux.dispatch,
                    getState: () => eureka.redux.state,
                    subscribe: (cb: (state: any) => void) => {
                        if (typeof cb !== 'function') {
                            throw new Error('The listener is not a function');
                        }
                        const wrappedCb = (ev: CustomEvent) => {
                            cb(ev.detail.next);
                        };
                        eureka.redux.target.addEventListener('statechanged', wrappedCb);
                        return () => {
                            eureka.redux.target.removeEventListener('statechanged', wrappedCb);
                        };
                    }
                };
            }
        } catch (e) {
            log.error(
                formatMessage({
                    id: 'eureka.failedToGetRedux',
                    default: 'Failed to get Redux.'
                })
                , '\n', e);
        }
    }
})();


if (settings.behavior.exposeCtx) {
    globalThis.eureka = eureka;
}
