import log from '../util/console';
import settingsAgent from '../util/settings';
import { MixinApplicator } from '../util/inject';
import { injectToolbox } from './toolbox-stuffs';
import { forwardedLoadExtensionURL, loadedExtensions, predefinedCallbackKeys, refreshForwardedBlocks } from '../middleware';
import { BlockType } from '../middleware/extension-metadata';
import xmlEscape from '../util/xml-escape';
import { maybeFormatMessage } from '../util/maybe-format-message';
import * as l10n from '../util/l10n';
import formatMessage from 'format-message';

const settings = settingsAgent.getSettings();
const idToURLMapping = new Map<string, string>();

/**
 * Utility function to determine if a value is a Promise.
 * @param {*} value Value to check for a Promise.
 * @return {boolean} True if the value appears to be a Promise.
 */
function isPromise (value: unknown) {
    return (
        value !== null &&
        typeof value === 'object' &&
        typeof (value as Promise<unknown>).then === 'function'
    );
}

const checkEureka = (eurekaFlag: string): boolean | null => {
    switch (eurekaFlag) {
        case '🧐 Chibi?':
            log.warn("'🧐 Chibi?' is deprecated, use '🧐 Eureka?' instead.");
            return true;
        case '🧐 Chibi Installed?':
            log.warn("'🧐 Chibi Installed?' is deprecated, use '🧐 Eureka?' instead.");
            return true;
        case '🧐 Eureka?':
            return true;
    }
    return null;
};

/**
 * Get sanitized non-core extension ID for a given sb3 opcode.
 * Note that this should never return a URL. If in the future the SB3 loader supports loading extensions by URL, this
 * ID should be used to (for example) look up the extension's full URL from a table in the SB3's JSON.
 * @param {!string} opcode The opcode to examine for extension.
 * @return {?string} The extension ID, if it exists and is not a core extension.
 */
function getExtensionIdForOpcode (opcode: string) {
    // Allowed ID characters are those matching the regular expression [\w-]: A-Z, a-z, 0-9, and hyphen ("-").
    const index = opcode.indexOf('_');
    const forbiddenSymbols = /[^\w-]/g;
    const prefix = opcode.substring(0, index).replace(forbiddenSymbols, '-');
    if (prefix !== '') return prefix;
}

export function applyPatches (vm: DucktypedVM, blocks: DucktypedScratchBlocks | undefined, ctx: EurekaContext) {
    // Add eureka's toolbox stuffs
    if (blocks) {
        if (settings.mixins['blocks.Procedures.addCreateButton_']) {
            if (blocks.__esModule) {
                log.info('Modern blockly detected');

                // Replace initial category callback
                if (settings.mixins['blocks.getMainWorkspace().toolboxCategoryCallbacks.PROCEDURE']) {
                    const toolboxCallbacks = blocks?.getMainWorkspace()?.toolboxCategoryCallbacks;
                    const originalCallback = toolboxCallbacks.get('PROCEDURE');
                    toolboxCallbacks.set('PROCEDURE', function (workspace) {
                        const xmlList = originalCallback.call(this, workspace);
                        injectToolbox(xmlList, workspace);

                        return xmlList;
                    });
                }

                // Hijack register method
                if (settings.mixins['blocks.WorkspaceSvg.prototype.registerToolboxCategoryCallback']) {
                    MixinApplicator.applyTo(
                        blocks.WorkspaceSvg.prototype,
                        {
                            registerToolboxCategoryCallback (originalMethod, key, callback) {
                                if (key === 'PROCEDURE') {
                                    const originalCallback = callback;
                                    callback = function (workspace) {
                                        const xmlList = originalCallback.call(this, workspace);
                                        injectToolbox(xmlList, workspace);

                                        return xmlList;
                                    };
                                }

                                return originalMethod(key, callback);
                            },
                        }
                    );
                }

                if (settings.mixins['blocks.Blocks.argument_reporter_boolean.init']) {
                    MixinApplicator.applyTo(
                        blocks.Blocks.argument_reporter_boolean,
                        {
                            init(originalMethod) {
                                originalMethod();
                                queueMicrotask(() => {
                                    if (this.getFieldValue('VALUE') === '🧐 Eureka?' && !(this.dragStrategy instanceof blocks.dragging.BlockDragStrategy) && !this.isInFlyout) {
                                        this.setDragStrategy(new blocks.dragging.BlockDragStrategy(this));
                                        this.dragStrategy.block?.dispose();
                                    }
                                });
                            }
                        }
                    );
                }
            } else {
                MixinApplicator.applyTo(
                    blocks.Procedures,
                    {
                        addCreateButton_ (originalMethod, workspace, xmlList) {
                            originalMethod?.(workspace, xmlList);
                            injectToolbox(xmlList, workspace);
                        }
                    }
                );
            }
        }
    } else if (settings.mixins['blocks.getMainWorkspace().toolboxCategoryCallbacks_.PROCEDURE']) {
        const toolboxCallbacks = globalThis.Blockly?.getMainWorkspace()?.toolboxCategoryCallbacks_;
        MixinApplicator.applyTo(
            toolboxCallbacks,
            {
                PROCEDURE (originalMethod, workspace) {
                    const xmlList = originalMethod?.(workspace);
                    injectToolbox(xmlList, workspace);
                    
                    return xmlList;
                }
            }
        );
    }

    const workspace = (blocks ?? globalThis.Blockly).getMainWorkspace?.();
    if (!workspace) {
        log.error('Failed to refresh toolbox: workspace is undefined');
    }
    workspace.getToolbox().refreshSelection();
    workspace.toolboxRefreshEnabled_ = true;


    if (settings.mixins['vm.extensionManager.loadExtensionURL']) {
        MixinApplicator.applyTo(
            vm.extensionManager,
            {
                loadExtensionURL (originalMethod, extensionURL) {
                    if (idToURLMapping.has(extensionURL)) {
                        extensionURL = idToURLMapping.get(extensionURL)!;
                    }

                    if (settings.behavior.redirectDeclared && ctx.declaredIds.includes(extensionURL) && !loadedExtensions.has(extensionURL)) {
                        return forwardedLoadExtensionURL(extensionURL);
                    }

                    const isURL = (url: string) => {
                        try {
                            new URL(url);
                            return true;
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        } catch (e) {
                            return false;
                        }
                    };

                    if (settings.behavior.redirectURL && isURL(extensionURL) && !loadedExtensions.has(extensionURL)) {
                        ctx.declaredIds.push(extensionURL);
                        return forwardedLoadExtensionURL(extensionURL);
                    }

                    return originalMethod?.(extensionURL);
                },
            }
        );
    }

    if (settings.mixins['vm.extensionManager.refreshBlocks']) {
        MixinApplicator.applyTo(
            vm.extensionManager,
            {
                async refreshBlocks (originalMethod) {
                    const result = await originalMethod?.();
                    return [...result, await refreshForwardedBlocks()];
                },
            }
        );
    }

    if (settings.mixins['vm.toJSON']) {
        MixinApplicator.applyTo(
            vm,
            {
                toJSON (originalMethod, optTargetId) {
                    const origJSON = originalMethod?.(optTargetId);
                    const obj = JSON.parse(origJSON);
                    
                    // Create a Record of extension's id - extension's url from loadedExtensions
                    const extensionInfo: Record<string, string> = {};
                    loadedExtensions.forEach(({info}, url) => {
                        extensionInfo[info.id] = url;
                    });

                    const sideloadIds = Object.keys(extensionInfo);

                    if ('targets' in obj) {
                        for (const target of obj.targets) {
                            for (const blockId in target.blocks) {
                                const block = target.blocks[blockId];
                                if (!block.opcode) continue;
                                const extensionId = getExtensionIdForOpcode(block.opcode);
                                if (!extensionId) continue;
                                if (sideloadIds.includes(extensionId)) {
                                    const mutation = block.mutation ? JSON.stringify(block.mutation) : null;
                                    if (!('mutation' in block)) block.mutation = {};
                                    block.mutation.proccode = `[📎 Sideload] ${block.opcode}`;
                                    block.mutation.children = [];
                                    if (mutation) block.mutation.mutation = mutation;
                                    block.mutation.tagName = 'mutation';

                                    block.opcode = 'procedures_call';
                                }
                            }
                        }
                        for (const i in obj.monitors) {
                            const monitor = obj.monitors[i];
                            if (!monitor.opcode) continue;
                            const extensionId = getExtensionIdForOpcode(monitor.opcode);
                            if (!extensionId) continue;
                            if (sideloadIds.includes(extensionId)) {
                                if (!('sideloadMonitors' in obj)) obj.sideloadMonitors = [];
                                obj.sideloadMonitors.push(monitor);
                                obj.monitors.splice(i, 1);
                            }
                        }
                    } else {
                        for (const blockId in obj.blocks) {
                            const block = obj.blocks[blockId];
                            if (!block.opcode) continue;
                            const extensionId = getExtensionIdForOpcode(block.opcode);
                            if (!extensionId) continue;
                            if (sideloadIds.includes(extensionId)) {
                                if (!('mutation' in block)) block.mutation = {};
                                block.mutation.proccode = `[📎 Sideload] ${block.opcode}`;
                                block.mutation.children = [];
                                block.mutation.tagName = 'mutation';

                                block.opcode = 'procedures_call';
                            }
                        }
                    }

                    obj.sideloadExtensionURLs = extensionInfo;

                    return JSON.stringify(obj);
                },
            }
        );
    }

    if (settings.mixins['vm.deserializeProject']) {
        MixinApplicator.applyTo(
            vm,
            {
                deserializeProject (originalMethod, projectJSON, zip) {
                    const sideloadExtensionURLs: Record<string, string> = typeof projectJSON.sideloadExtensionURLs === 'object' ? projectJSON.sideloadExtensionURLs as Record<string, string> : {};
                    const extensionURLs: Record<string, string> = typeof projectJSON.extensionURLs === 'object' ? projectJSON.extensionURLs as Record<string, string> : {};

                    // Migrate from old eureka
                    if (projectJSON.extensionEnvs) {
                        log.info('Old eureka-ify project detected, migrating...');
                        projectJSON.sideloadExtensionEnvs =
                            projectJSON.extensionEnvs as Record<string, unknown>;
                        delete projectJSON.extensionEnvs;
                    }

                    if (projectJSON.targets instanceof Array) {
                        for (const target of projectJSON.targets) {
                            for (const blockId in target.blocks) {
                                const block = target.blocks[blockId];
                                if (block.opcode === 'procedures_call' && block.mutation) {
                                    if (!block.mutation.proccode.trim().startsWith('[📎 Sideload] ')) {
                                        continue;
                                    }
                                    const originalOpcode = block.mutation.proccode.trim().substring(14);
                                    const extensionId = getExtensionIdForOpcode(originalOpcode);
                                    if (!extensionId) {
                                        log.warn(
                                            `find a sideload block with an invalid id: ${originalOpcode}, ignored.`
                                        );
                                        continue;
                                    }
                                    block.opcode = originalOpcode;
                                    const url = sideloadExtensionURLs[extensionId] ?? extensionURLs[extensionId];
                                    ctx.declaredIds.push(extensionId, url);
                                    idToURLMapping.set(extensionId, url);
                                    try {
                                        const mutation = typeof block.mutation.mutation === 'string' ? JSON.parse(block.mutation.mutation) : null;
                                        if (mutation) {
                                            block.mutation = mutation;
                                        } else delete block.mutation;
                                    } catch (e) {
                                        log.error(formatMessage({
                                            id: 'eureka.errorIgnored',
                                            default: 'An error occurred while parsing the mutation of a sideload block, ignored. Error: {error}',
                                        }), e);
                                        delete block.mutation;
                                    }
                                } else if ((getExtensionIdForOpcode(block.opcode) in sideloadExtensionURLs) || (typeof projectJSON.sideloadExtensionEnvs === 'object' && getExtensionIdForOpcode(block.opcode) in projectJSON.sideloadExtensionEnvs)) {
                                    const extensionId = getExtensionIdForOpcode(block.opcode);
                                    const url = sideloadExtensionURLs[extensionId] ?? extensionURLs[extensionId];
                                    ctx.declaredIds.push(extensionId, url);
                                    idToURLMapping.set(extensionId, url);
                                }
                            }
                        }
                    }

                    if (typeof projectJSON.sideloadExtensionURLs === 'object') {
                        delete projectJSON.sideloadExtensionURLs;
                    }

                    if (
                        projectJSON.sideloadMonitors instanceof Array &&
                        projectJSON.monitors instanceof Array
                    ) {
                        projectJSON.monitors.push(...projectJSON.sideloadMonitors);
                        delete projectJSON.sideloadMonitors;
                    }

                    if (typeof projectJSON.sideloadExtensionEnvs === 'object') {
                        delete projectJSON.sideloadExtensionEnvs;
                    }

                    return originalMethod?.(projectJSON, zip);
                },
            }
        );
    }

    if (settings.mixins['vm._loadExtensions'] && typeof vm._loadExtensions === 'function') {
        MixinApplicator.applyTo(
            vm,
            {
                async _loadExtensions (originalMethod, extensionIDs, extensionURLs) {
                    const sideloadExtensionPromises: Promise<void>[] = [];
                    for (const extensionId of extensionIDs) {
                        if (ctx.declaredIds.includes(extensionId)) {
                            const loadResult = this.extensionManager.loadExtensionURL(extensionId);
                            if (isPromise(loadResult)) {
                                sideloadExtensionPromises.push(loadResult as unknown as Promise<void>);
                            }
                            extensionIDs.delete(extensionId);
                        }
                    }

                    return Promise.all([
                        originalMethod?.(extensionIDs, extensionURLs),
                        ...sideloadExtensionPromises
                    ]).then();

                },
            }
        );
    }

    if (settings.mixins['vm.setLocale']) {
        MixinApplicator.applyTo(
            vm,
            {
                setLocale (originalMethod, locale, messages) {
                    l10n.setLocale(locale);
                    vm.emit('LOCALE_CHANGED', locale);
                    return originalMethod?.(locale, messages);
                },
            }
        );
    }

    if (settings.mixins['vm.runtime._primitives.argument_reporter_boolean']) {
        MixinApplicator.applyTo(
            vm.runtime._primitives,
            {
                argument_reporter_boolean (originalMethod, args, util) {
                    const eurekaFlag = String(args.VALUE);
                    const value = util.getParam(eurekaFlag);
                    if (value === null) {
                        return (
                            checkEureka(String(eurekaFlag)) ??
                            originalMethod?.(args, util)
                        );
                    }
                    // Since the param exists, assume the following checks will be skipped for performance purposes.
                    return value;
                },
            }
        );
    }

    const ScriptTreeGenerator = vm.exports?.ScriptTreeGenerator ?? getUnsupportedAPI(vm)?.ScriptTreeGenerator;
    if (ScriptTreeGenerator && settings.mixins['vm.exports.ScriptTreeGenerator.prototype.descendInput']) {
        MixinApplicator.applyTo(
            ScriptTreeGenerator.prototype,
            {
                descendInput (originalMethod, block) {
                    switch (block.opcode) {
                        case 'argument_reporter_boolean': {
                            const name = block.fields.VALUE.value;
                            const index = this.script.arguments.lastIndexOf(name);
                            if (index === -1) {
                                if (checkEureka(name) !== null) {
                                    return {
                                        kind: 'constant',
                                        value: true
                                    };
                                }
                            }
                        }
                    }
                    return originalMethod?.(block);
                },
            }
        );
    }

    if (typeof vm.ccExtensionManager === 'object' && settings.mixins['vm.ccExtensionManager.getExtensionLoadOrder']) {
        MixinApplicator.applyTo(
            vm.ccExtensionManager,
            {
                getExtensionLoadOrder (originalMethod, extensions) {
                    for (const extensionId of extensions) {
                        if (
                            !Object.prototype.hasOwnProperty.call(
                                vm.ccExtensionManager!.info,
                                extensionId
                            ) &&
                            ctx.declaredIds.includes(extensionId)
                        ) {
                            vm.ccExtensionManager!.info[extensionId] = {
                                api: 0
                            };
                        }
                    }

                    return originalMethod?.(extensions);
                }
            }
        );
    }

    if (settings.mixins['vm.runtime._convertForScratchBlocks']) {
        MixinApplicator.applyTo(
            vm.runtime,
            {
                _convertForScratchBlocks (originalMethod, blockInfo, categoryInfo) {
                    if (typeof blockInfo !== 'string') {
                        switch (blockInfo.blockType) {
                            case BlockType.LABEL:
                                return {
                                    info: blockInfo,
                                    xml: `<label text="${xmlEscape(blockInfo.text)}"/>`
                                };
                            case BlockType.XML:
                                return {
                                    info: blockInfo,
                                    xml: blockInfo.xml
                                };
                            default: {
                                if ('extensions' in blockInfo) {
                                    const converted = originalMethod?.(blockInfo, categoryInfo);
                                    if (!('extensions' in converted.json)) converted.json.extensions = [/*'scratch_extension'*/];
                                    for (const extension of blockInfo.extensions!) {
                                        if (!converted.json.extensions.includes(extension)) {
                                            converted.json.extensions.push(extension);
                                        }
                                    }
                                    return converted;
                                }
                                return originalMethod?.(blockInfo, categoryInfo);
                            }
                        }
                    }
                    return originalMethod?.(blockInfo, categoryInfo);
                },
            }
        );
    }

    if (settings.mixins['vm.runtime._convertButtonForScratchBlocks']) {
        MixinApplicator.applyTo(
            vm.runtime,
            {
                _convertButtonForScratchBlocks (originalMethod, buttonInfo, categoryInfo) {
                    if (ctx.blocks && buttonInfo.func && !predefinedCallbackKeys.includes(buttonInfo.func)) {
                        const workspace = window.Blockly.getMainWorkspace();
                        const extensionMessageContext = this.makeMessageContextForTarget();
                        const buttonText = maybeFormatMessage(buttonInfo.text, extensionMessageContext)!;

                        workspace.registerButtonCallback(`${categoryInfo.id}_${buttonInfo.func}`, buttonInfo.callFunc);
                        return {
                            info: buttonInfo,
                            xml: `<button text="${xmlEscape(buttonText)}" callbackKey="${xmlEscape(`${categoryInfo.id}_${buttonInfo.func}`)}"></button>`
                        };
                    }
                    return originalMethod?.(buttonInfo, categoryInfo);
                },
            }
        );
    }
}

function getUnsupportedAPI (vm: DucktypedVM) {
    if (typeof vm.exports?.i_will_not_ask_for_help_when_these_break === 'function') {
        // Do not emit any warning messages
        const warn = console.warn;
        console.warn = function () { }; // No-op
        const api = vm.exports.i_will_not_ask_for_help_when_these_break();
        console.warn = warn;
        return api;
    }
    return null;
}

