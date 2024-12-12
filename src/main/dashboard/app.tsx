import {createEffect, createSignal, Match, Setter, Show, Switch, For, createMemo, Index} from 'solid-js';
import {render} from 'solid-js/web';
import {eureka} from '../ctx';
import close from './assets/icon--close.svg';
import globalCss from './style.css';
import normalizeCss from './normalize.css';
import styles, {stylesheet} from './style.module.css';
import formatMessage from 'format-message';
import {loadedExtensions} from '../middleware/index';
import settingsAgent from '../util/settings';

export enum DashboardStatus {
    NONE,
    LOADER,
    SETTINGS
}

let setModalStatus: Setter<DashboardStatus>;

interface Tab {
  id: DashboardStatus;
  label: string;
}

interface SwitchProps {
  value?: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}

type LoaderType = 'URL' | 'Code' | 'File';

const settings = settingsAgent.getSettings();

/**
 * A component that formats and displays a message based on the provided id and default text.
 * @param props - The properties for the formatted message.
 * @param props.id - The message id.
 * @param props.default - The default message text.
 * @param props.values - Optional values to replace in the message.
 * @returns A formatted message.
 */
function FormattedMessage (props: { id: string, default: string, values?: Record<string, string> }) {
    return <>{formatMessage({id: props.id, default: props.default}, props.values)}</>;
}

/**
 * A component that renders a tab navigation.
 * @param props - The properties for the tab navigation.
 * @param props.tabs - The list of tabs.
 * @param props.active - The currently active tab.
 * @param props.onChange - The function to call when a tab is clicked.
 * @returns A tab navigation component.
 */
function TabNav (props: { tabs: Tab[], active: DashboardStatus, onChange: (tab: DashboardStatus) => void }) {
    return (
        <div class={styles.tabs}>
            <Index each={props.tabs}>{tab => (
                <div
                    class={`${styles.tab} ${tab().id === props.active ? styles.active : ''}`}
                    onClick={() => props.onChange(tab().id)}
                >
                    {tab().label}
                </div>
            )}</Index>
        </div>
    );
}

/**
 * Encodes a string to base64.
 * @param data - The data to encode.
 * @returns The base64 encoded string.
 */
function utoa (data: string) {
    return btoa(unescape(encodeURIComponent(data)));
}

/**
 * Converts a string to a data URL.
 * @param str - The string to convert.
 * @returns The data URL.
 */
function stringToDataURL (str: string) {
    return `data:text/plain;base64,${utoa(str)}`;
}

/**
 * A switch component that toggles between true and false states.
 * @param props - The properties for the switch component.
 * @param props.value - The current value of the switch.
 * @param props.disabled - Whether the switch is disabled.
 * @param props.onChange - The function to call when the switch is toggled.
 * @returns A switch component.
 */
function SwitchComponent (props: SwitchProps) {
    const [value, setValue] = createSignal(false);
    createEffect(() => {
        setValue(props.value ?? false);
    });

    const handleClick = () => {
        if (!props.disabled) {
            props.onChange(!value());
            setValue(!value());
        }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Enter' && !props.disabled) {
            setValue(!value());
            props.onChange(!value());
            event.stopPropagation();
        }
    };

    return (
        <div
            classList={{
                [styles.switch]: true,
                [styles.true]: value(),
                [styles.false]: !value(),
                [styles.disabled]: props.disabled
            }}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
        >
            <div
                classList={{
                    [styles.slider]: true,
                    [styles.true]: value(),
                    [styles.false]: !value()
                }}
            />
            <input class={styles.dummyInput} inputMode="none" />
        </div>
    );
}

/**
 * A component that allows users to load extensions via URL, code, or file.
 * @returns A loader form component.
 */
function LoaderForm () {
    const [loaderType, setLoaderType] = createSignal<LoaderType>('URL');
    const [extensionURL, setURL] = createSignal('');
    const [errorMessage, setErrorMessage] = createSignal('');
    const [extensionCode, setCode] = createSignal('');
    const [extensionFile, setFile] = createSignal<File | null>(null);
    const [fileContent, setFileContent] = createSignal<string | null>(null); // Store file content
    const [loading, setLoading] = createSignal(false);

    const shouldDisable = createMemo(() => {
        if (loading()) return true;
        switch (loaderType()) {
        case 'URL':
            return !extensionURL().trim();
        case 'Code':
            return !extensionCode().trim();
        case 'File':
            return !extensionFile(); // Ensure this returns false when a file is selected
        default:
            return true; // Default case to ensure safety
        }
    });

    return (
        <div class={styles.loaderForm}>
            <div class={styles.loaderTabs}>
                <Index each={['URL', 'Code', 'File'] as LoaderType[]}>{type => (
                    <div
                        class={`${styles.loaderTab} ${type() === loaderType() ? styles.active : ''}`}
                        onClick={() => setLoaderType(type)}
                    >
                        {formatMessage({id: `eureka.loader.${type().toLowerCase()}`, default: type()})}
                    </div>
                )}</Index>
            </div>

            <div class={styles.loaderItems}>
                <Switch>
                    <Match when={loaderType() === 'URL'}>
                        <input
                            type="text"
                            placeholder={formatMessage({
                                id: 'eureka.loader.url.placeholder',
                                default: 'Enter extension URL here'
                            })}
                            onChange={e => setURL(e.currentTarget.value)}
                            value={extensionURL()}
                            class={styles.input}
                        />
                    </Match>
                    <Match when={loaderType() === 'Code'}>
                        <textarea
                            placeholder={formatMessage({
                                id: 'eureka.loader.code.placeholder',
                                default: 'Paste extension code here'
                            })}
                            class={styles.textarea}
                            onChange={e => setCode(e.currentTarget.value)}
                            value={extensionCode()} // Bind value to textarea
                        />
                    </Match>
                    <Match when={loaderType() === 'File'}>
                        <input
                            type="file"
                            accept=".js"
                            class={styles.input}
                            onChange={e => {
                                const files = e.currentTarget.files;
                                if (files && files.length > 0) {
                                    const file = files[0];
                                    setFile(file); // Update signal with the selected file

                                    // Read the file as text and store its content
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                        setFileContent(reader.result as string); // Store the file content
                                    };
                                    reader.readAsText(file); // Read the file as text
                                } else {
                                    setFile(null); // Reset if no file is selected
                                    setFileContent(null); // Reset file content if no file is selected
                                }
                            }}
                        />
                    </Match>
                </Switch>

                {/* Button Element */}
                <button
                    class={styles.button}
                    disabled={shouldDisable()}
                    onClick={async () => {
                        setLoading(true); // Set loading to true at the start of loading process
                        try {
                            switch (loaderType()) {
                            case 'URL':
                                await eureka.load(extensionURL());
                                break;
                            case 'Code':
                                await eureka.load(stringToDataURL(extensionCode()));
                                break;
                            case 'File':
                                if (fileContent()) { // Use stored file content
                                    await eureka.load(stringToDataURL(fileContent()));
                                }
                                break;
                            }
            
                        } catch (error) {
                            setErrorMessage(`Error loading extension:${error}`);
                            // Handle any errors that occur during loading
                            console.error('Error loading extension:', error);
                        } finally {
                            setLoading(false); // Ensure loading is set to false after loading completes or fails
                        }
                    }}
                >
                    <FormattedMessage id="eureka.loader.load" default="Load Extension" />
                </button>
                <Show when={errorMessage()}>
                    <span class="errorText">{errorMessage()}</span>
                </Show>
            </div>
        </div>
    );
}

/**
 * A component that displays all loaded extensions.
 * @returns A component that displays all loaded extensions.
 */
function LoadedExtensions () {
    return (
        <div class={styles.loadedExtensions}>
            <For each={Array.from(loadedExtensions.values())}>{props => (
                <div class={styles.extensionItem}>
                    <span class={styles.name}>{props.info.name}</span>
                    <span class={styles.url}>{props.info.id}</span>
                </div>
            )}</For>
        </div>
    );
}

/**
 * A component that displays a settings item.
 * @param props - The properties for the settings item.
 * @returns A settings item component.
 */
function SettingsItem (props: {
  id: string,
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
    return (
        <div class={styles.settingsItem}>
            <span>
                <FormattedMessage id={`eureka.settings.${props.id}`} default={props.label} />
            </span>
            <SwitchComponent
                value={props.value}
                onChange={props.onChange}
                disabled={props.disabled}
            />
        </div>
    );
}

/**
 * A component that displays a settings section.
 * @param props - The properties for the settings section.
 * @returns A settings section component.
 */
function SettingsSection (props: {
  label: string;
  children: any;
}) {
    return (
        <>
            <span class={styles.label}>
                <FormattedMessage id={`eureka.settings.${props.label.toLowerCase()}`} default={props.label} />
            </span>
            {props.children}
        </>
    );
}

/**
 * A component that displays the Eureka dashboard.
 * @returns A dashboard component.
 */
function Dashboard () {
    const [status, setStatus] = createSignal<DashboardStatus>(DashboardStatus.NONE);
    const [wrappedSettings, setWrappedSettings] = createSignal(settings);
    const tabs: Tab[] = [
        {id: DashboardStatus.LOADER, label: formatMessage({id: 'eureka.dashboard.loader', default: 'Loader'})},
        {id: DashboardStatus.SETTINGS, label: formatMessage({id: 'eureka.dashboard.settings', default: 'Settings'})}
    ];

    createEffect(() => {
        setModalStatus = setStatus;
    });

    createEffect(() => {
        settingsAgent.subscribe(() => {
            setWrappedSettings(settingsAgent.getSettings());
        });
    });

    return (
        <Show when={status() !== DashboardStatus.NONE}>
            <div class={styles.wrapper} onClick={() => {
                setStatus(DashboardStatus.NONE);
            }}>
                <div class={styles.modal} onClick={e => {
                    e.stopPropagation();
                }}>
                    <div class={styles.header}>
                        <div class={styles.placeholder} />
                        <span>
                            <FormattedMessage id="eureka.dashboard.title" default="Eureka Dashboard" />
                        </span>
                        <button onClick={() => setStatus(DashboardStatus.NONE)}>
                            <img src={close} alt={formatMessage({id: 'eureka.dashboard.close', default: 'Close'})} />
                        </button>
                    </div>
                    <div class={styles.body}>
                        <TabNav
                            tabs={tabs}
                            active={status()}
                            onChange={setStatus}
                        />
            
                        <Switch>
                            <Match when={status() === DashboardStatus.LOADER}>
                                <LoaderForm />
                                <LoadedExtensions />
                            </Match>
                            <Match when={status() === DashboardStatus.SETTINGS}>
                                <div class={styles.settings}>
                                    <SettingsSection label="Trap">
                                        <Index each={Object.entries(wrappedSettings().trap)}>{accessor => (
                                            <SettingsItem
                                                id={accessor()[0]}
                                                label={accessor()[0]}
                                                value={accessor()[1]}
                                                onChange={newValue => {
                                                    settings.trap[accessor()[0]] = newValue;
                                                }}
                                            />
                                        )}</Index>
                                    </SettingsSection>

                                    <SettingsSection label="Behavior">
                                        <SettingsItem
                                            id="redirectURL"
                                            label="Redirect all URL loading requests to Eureka"
                                            value={wrappedSettings().behavior.redirectURL}
                                            onChange={value => {
                                                settings.behavior.redirectURL = value;
                                            }}
                                            disabled={wrappedSettings().behavior.headless}
                                        />
                                        <SettingsItem
                                            id="redirectDeclared"
                                            label="Redirect pre-declared requests to Eureka"
                                            value={wrappedSettings().behavior.redirectDeclared}
                                            onChange={value => {
                                                settings.behavior.redirectDeclared = value;
                                            }}
                                            disabled={wrappedSettings().behavior.headless}
                                        />
                                        <SettingsItem
                                            id="exposeCtx"
                                            label="Expose Eureka's global context"
                                            value={wrappedSettings().behavior.exposeCtx}
                                            onChange={value => {
                                                settings.behavior.exposeCtx = value;
                                            }}
                                        />
                                        <SettingsItem
                                            id="polyfillGlobalInstances"
                                            label="Expose Scratch internal instances globally"
                                            value={wrappedSettings().behavior.polyfillGlobalInstances}
                                            onChange={value => {
                                                settings.behavior.polyfillGlobalInstances = value;
                                            }}
                                        />
                                        <SettingsItem
                                            id="headless"
                                            label="Headless mode"
                                            value={wrappedSettings().behavior.headless}
                                            onChange={value => {
                                                settings.behavior.headless = value;
                                            }}
                                        />
                                    </SettingsSection>

                                    <SettingsSection label="Mixins">
                                        <Index each={Object.entries(wrappedSettings().mixins)}>{accessor => (
                                            <SettingsItem
                                                id={accessor()[0]}
                                                label={accessor()[0]}
                                                value={accessor()[1]}
                                                onChange={newValue => {
                                                    settings.mixins[accessor()[0]] = newValue;
                                                }}
                                            />
                                        )}</Index>
                                    </SettingsSection>
                                </div>
                            </Match>
                        </Switch>
                    </div>
                </div>
            </div>
        </Show>
    );
}

/**
 * Initializes the Eureka dashboard.
 */
function initialize () {
    const container = document.createElement('div');
    container.id = 'eureka-dashboard-container';
    document.body.appendChild(container);

    const shadow = container.attachShadow({mode: 'open'});

    const globalStyle = document.createElement('style');
    globalStyle.id = 'eureka-styles';
    globalStyle.innerHTML = globalCss;

    const normalizeStyle = document.createElement('style');
    normalizeStyle.id = 'eureka-normalize';
    normalizeStyle.innerHTML = `${normalizeCss}\n${stylesheet}`;

    const content = document.createElement('div');
    content.id = 'eureka-dashboard';

    document.head.appendChild(globalStyle);
    shadow.appendChild(normalizeStyle);
    shadow.appendChild(content);

    render(() => <Dashboard />, content);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

eureka.openDashboard = (status: Exclude<DashboardStatus, DashboardStatus.NONE> = DashboardStatus.LOADER) => {
    setModalStatus(status);
};

eureka.closeDashboard = () => {
    setModalStatus(DashboardStatus.NONE);
};
