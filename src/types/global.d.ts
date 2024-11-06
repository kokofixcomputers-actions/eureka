/**
 * @import import { DashboardStatus } from "../main/dashboard/app";
 */

/* eslint-disable no-var */
declare var Blockly: DucktypedScratchBlocks;
declare var eureka: EurekaContext | undefined;

interface EurekaContext {
    declaredIds: string[];
    vm?: DucktypedVM;
    version: string;
    blocks?: DucktypedScratchBlocks | undefined;
    openDashboard? (status?: DashboardStatus): void;
    closeDashboard? (): void;
    load? (url: string): void;
}
