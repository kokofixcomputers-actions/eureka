/* eslint-disable no-var */
declare var Blockly: DucktypedScratchBlocks;
declare var eureka: EurekaContext | undefined;

interface EurekaContext {
    declaredIds: string[];
    vm?: DucktypedVM;
    blocks?: DucktypedScratchBlocks | undefined;
}
