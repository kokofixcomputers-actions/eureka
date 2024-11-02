import log from '../util/console';
import settingsAgent from '../util/settings';
import { MixinApplicator } from '../util/inject';
import { injectToolbox } from './toolbox-stuffs';
import { forwardedLoadExtensionURL, predefinedCallbackKeys, refreshForwardedBlocks } from '../middleware';
import { BlockType } from '../middleware/extension-metadata';
import xmlEscape from '../util/xml-escape';
import { maybeFormatMessage } from '../util/maybe-format-message';

const settings = settingsAgent.getSettings();

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

export function applyPatches (vm: DucktypedVM, blocks: DucktypedScratchBlocks | undefined, ctx: EurekaContext) {
    // Add eureka's toolbox stuffs
    if (blocks) {
        if (settings.mixins['blocks.Procedures.addCreateButton_']) {
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
    } else if (settings.mixins['blocks.getMainWorkspace().toolboxCategoryCallbacks_']) {
        const toolboxCallbacks = window.Blockly?.getMainWorkspace()?.toolboxCategoryCallbacks_;
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

    const workspace = (blocks ?? globalThis.Blockly).getMainWorkspace();
    workspace.getToolbox().refreshSelection();
    workspace.toolboxRefreshEnabled_ = true;


    if (settings.mixins['vm.extensionManager.loadExtensionURL']) {
        MixinApplicator.applyTo(
            vm.extensionManager,
            {
                loadExtensionURL (originalMethod, extensionURL) {
                    if (settings.behavior.redirectDeclared && ctx.declaredIds.includes(extensionURL)) {
                        return forwardedLoadExtensionURL(extensionURL);
                    }

                    const isURL = (url: string) => {
                        try {
                            new URL(url);
                            return true;
                        } catch (e) {
                            return false;
                        }
                    };

                    if (settings.behavior.redirectURL && isURL(extensionURL)) {
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
                    const scratchObj = JSON.parse(origJSON);

                    return JSON.stringify(scratchObj);
                },
            }
        );
    }

    if (settings.mixins['vm.deserializeProject']) {
        MixinApplicator.applyTo(
            vm,
            {
                deserializeProject (originalMethod, projectJSON, zip) {
                    originalMethod?.(projectJSON, zip);
                    return Promise.resolve();
                },
            }
        );
    }

    if (settings.mixins['vm._loadExtensions'] && typeof vm._loadExtensions === 'function') {
        MixinApplicator.applyTo(
            vm,
            {
                async _loadExtensions (originalMethod, extensionIDs, extensionURLs) {
                    const result = originalMethod?.(extensionIDs, extensionURLs);

                    return result;
                },
            }
        );
    }

    if (settings.mixins['vm.setLocale']) {
        MixinApplicator.applyTo(
            vm,
            {
                setLocale (originalMethod, locale, messages) {
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
                            extensionId in ctx.declaredIds
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

