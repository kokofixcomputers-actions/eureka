import './meta.js?userscript-metadata';
import log from './util/console';
import settingsAgent from './util/settings';
import { version } from '../../package.json';
import { getVMInstance } from './trap/vm';
import { getScratchBlocksInstance } from './trap/blocks';
import './util/l10n';
import formatMessage from 'format-message';
import { eureka } from './ctx';
import { applyPatches } from './patches/applier';
import { setLocale } from './util/l10n';

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
            const vm = eureka.vm = await getVMInstance();
            setLocale(vm.getLocale());
            if (settings.trap.blocks) {
                try {
                    eureka.blocks = await getScratchBlocksInstance(vm);
                } catch (e) {
                    log.error(
                        formatMessage({
                            id: 'eureka.failedToGetBlocks',
                            default: 'Failed to get ScratchBlocks.'
                        })
                        , '\n', e);
                }
            }

            if (settings.behavior.headless) {
                log.warn(
                    formatMessage({
                        id: 'eureka.headlessTips',
                        default: 'Headless mode on, stop apply patches.'
                    })
                );
            } else {
                applyPatches(vm, eureka.blocks, eureka);
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


if (settings.behavior.exposeCtx) {
    globalThis.eureka = eureka;
}
