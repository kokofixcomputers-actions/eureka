/**
 * @import { ExtensionBlockMetadata, ExtensionMetadata } from '../main/middleware/extension-metadata'
 */

interface DucktypedBlockUtility {
    getParam(paramName: string): any;
}

interface DucktypedUnsupportedAPI {
    ScriptTreeGenerator?: {
        prototype: {
            descendInput: (this: any, block: any) => object;
        }
    }
}

interface DucktypedToolbox {
    refreshSelection(): void;
}

interface DucktypedVM {
    exports?: {
        i_will_not_ask_for_help_when_these_break: () => DucktypedUnsupportedAPI;
        // PenguinMod proposed change
        ScriptTreeGenerator?: DucktypedUnsupportedAPI['ScriptTreeGenerator'];
    }
    ccExtensionManager?: {
        info: Record<string, {api: number}>;
        getExtensionLoadOrder(extensions: string[]): unknown;
    }
    _events: {
        [eventName: string]: ((...args: unknown[]) => unknown) | ((...args: unknown[]) => unknown)[]
    }
    extensionManager: {
        loadExtensionURL(extensionURL: string): Promise<void>;
        refreshBlocks (): Promise<void[]>;
    }
    on (eventName: string, callback: (...args: any[]) => any): void;
    emit (eventName: string, ...args: any[]): void;
    runtime: {
        _primitives: {
            argument_reporter_boolean (
                args: {
                    VALUE: string;
                },
                util: DucktypedBlockUtility
            ): unknown;
            [funcName: string]: (args: Record<string, any>, util: DucktypedBlockUtility) => any;
        };
        makeMessageContextForTarget (target: any): void;
        _registerExtensionPrimitives (info: ExtensionMetadata): void;
        _refreshExtensionPrimitives (info: ExtensionMetadata): void;
        _convertForScratchBlocks (info: ExtensionBlockMetadata, categoryInfo: CategoryInfo): ConvertedBlockInfo;
        _convertButtonForScratchBlocks (info: ExtensionBlockMetadata, categoryInfo: CategoryInfo): ConvertedBlockInfo;
        getEditingTarget (): any;
        getTargetForStage (): any;
    }
    toJSON(optTargetId?: string): string;
    deserializeProject(projectJSON: string, zip): Promise<void>;
    _loadExtensions?(extensionIDs: string[], extensionURLs: Map<string, string>): Promise<void[]>;
    setLocale(locale: string, messages: Record<string, string>): Promise<void>;
    getLocale(): Locales;
}

interface DucktypedBlocksWorkspace {
    toolboxCategoryCallbacks_: {
        PROCEDURE (workspace: DucktypedBlocksWorkspace): HTMLElement[];
    }
    toolboxCategoryCallbacks?: Map<string, (workspace: DucktypedBlocksWorkspace) => void>;
    registerButtonCallback (callbackKey: string, callback: () => void): void;
    registerToolboxCategoryCallback (key: string, func: (ws: DucktypedBlocksWorkspace) => any): void;
    getToolbox(): DucktypedToolbox;
    toolboxRefreshEnabled_: boolean;
}

interface DucktypedScratchBlocks {
    Procedures: {
        addCreateButton_(workspace: DucktypedBlocksWorkspace, xmlList: HTMLElement[]): void;
    }
    Blocks: {
        [opcode: string]: {
            init (): void;
        }
    }
    dragging: {
        BlockDragStrategy (blocks: unknown): void;
    }
    getMainWorkspace (): DucktypedBlocksWorkspace;
    WorkspaceSvg: Ctor<DucktypedBlocksWorkspace>;
    __esModule?: boolean;
}

interface Ctor<T> {
    new (): T;
}
