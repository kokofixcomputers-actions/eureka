import { Settings, getSettingsFromStorage } from '../util/settings';
import { log, warn} from '../util/log';

let dashboardWindow: Window | null = null;

interface MothExtensionInfo {
    name: string;
    sandboxed: boolean;
}

interface MothDispatchedLoad {
    type: 'load';
    info: {
        url: string;
        sandboxed: boolean;
    };
}

interface MothDispatchedAllocate {
    type: 'allocate';
}

interface MothDispatchedUpdateSettings {
    type: 'updateSettings';
    item: {
        name: keyof Settings,
        value: Settings[keyof Settings]
    }
}


type MothDispatched = MothDispatchedAllocate | MothDispatchedLoad | MothDispatchedUpdateSettings;

/**
 * Get all extensions.
 * @returns Extensions.
 */
function getExtensionInfo () {
    const processedExtInfo: MothExtensionInfo[] = [];
    for (const [extId, ext] of window.eureka.loader.loadedScratchExtension.entries()) {
        processedExtInfo.push({
            name: extId,
            sandboxed: ext.env === 'sandboxed'
        });
    }
    return processedExtInfo;
}
/**
 * Handle messages from the frontend (popup window).
 * @param event Event from the frontend.
 */
async function messageHandler (event: MessageEvent) {
    if (event.origin !== 'https://eureka-scratch.vercel.app') { warn('Message origin is not from the default website.'); return; }
    if (!('type' in event.data)) return;
    switch ((event.data as MothDispatched).type) {
        // Handshake: send current extension info in order to prepare frontend.
        case 'allocate':
            log('Handshaking with frontend...');
            dashboardWindow?.postMessage(
                {
                    type: 'handshake',
                    clientInfo: {
                        version: Number(window.eureka.version),
                        url: window.location.host
                    }
                },
                '*'
            );
            dashboardWindow?.postMessage(
                {
                    type: 'extension',
                    extensions: getExtensionInfo()
                },
                '*'
            );
            dashboardWindow?.postMessage(
                {
                    type: 'settings',
                    settings: getSettingsFromStorage()
                },
                '*'
            );
            break;
        case 'load':
            // Load an extension.
            log('Loading extension from frontend...');
            await window.eureka.loader.load(
                event.data.info.url,
                event.data.info.sandboxed ? 'sandboxed' : 'unsandboxed'
            );
            dashboardWindow?.postMessage(
                {
                    type: 'extension',
                    extensions: getExtensionInfo()
                },
                '*'
            );
            break;
        case 'updateSettings':
            log('Updating settings from frontend...');
            window.eureka.settings[event.data.item.name] = event.data.item.value;
            dashboardWindow?.postMessage(
                {
                    type: 'settings',
                    settings: getSettingsFromStorage()
                },
                '*'
            );
            break;
    }
}

// Here we add a listener to process the message
window.addEventListener('message', messageHandler);

/**
 * Open the popup (?) window.
 * @param open window.open function (compatible with ccw).
 */
function openFrontend (open: typeof window.open) {
    // Open the frontend in a popup window
    dashboardWindow = open(
        'https://eureka-scratch.vercel.app/#manage',
        'Eureka',
        'width=800,height=600,popup=yes,status=no,location=no,toolbar=no,menubar=no'
    );
}

export default openFrontend;
