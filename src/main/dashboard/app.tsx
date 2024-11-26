/* eslint-disable */

import { createEffect, createSignal, Match, Setter, Show, Switch } from 'solid-js';
import { render } from 'solid-js/web';
import { eureka } from '../ctx';
import close from './assets/icon--close.svg';
import globalCss from './style.css';
import normalizeCss from './normalize.css';
import styles, { stylesheet } from './style.module.css';
import formatMessage from 'format-message';
import { loadedExtensions } from '../middleware/index';
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

function FormattedMessage (props: { id: string, default: string, values?: Record<string, string> }) {
  return <>{formatMessage({ id: props.id, default: props.default }, props.values)}</>;
}

function TabNav(props: { tabs: Tab[], active: DashboardStatus, onChange: (tab: DashboardStatus) => void }) {
  return (
    <div class={styles.tabs}>
      {props.tabs.map(tab => (
        <div
          class={`${styles.tab} ${tab.id === props.active ? styles.active : ''}`}
          onClick={() => props.onChange(tab.id)}
        >
          {tab.label}
        </div>
      ))}
    </div>
  );
}

function classNames(...classes: (string | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

function utoa(data: string) {
  return btoa(unescape(encodeURIComponent(data)));
}

function stringToDataURL(str: string) {
  return `data:text/plain;base64,${utoa(str)}`;
}

function SwitchComponent (props: SwitchProps) {
  const [value, setValue] = createSignal(props.value ?? false);

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
      class={classNames(styles.switch, value() ? styles.true : styles.false, props.disabled ? styles.disabled : null)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div class={classNames(styles.slider, value() ? styles.true : styles.false, props.disabled ? styles.disabled : null)} />
      <input class={styles.dummyInput} inputMode='none' />
    </div>
  );
}

function LoaderForm() {
  const [loaderType, setLoaderType] = createSignal<LoaderType>('URL');
  const [extensionURL, setURL] = createSignal('');
  const [errorMessage, setErrorMessage] = createSignal('');
  const [extensionCode, setCode] = createSignal('');
  const [extensionFile, setFile] = createSignal<File | null>(null);
  const [fileContent, setFileContent] = createSignal<string | null>(null); // Store file content
  const [loading, setLoading] = createSignal(false);

  function shouldDisable() {
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
  }

  return (
    <div class={styles.loaderForm}>
      <div class={styles.loaderTabs}>
        {(['URL', 'Code', 'File'] as LoaderType[]).map(type => (
          <div
            class={`${styles.loaderTab} ${type === loaderType() ? styles.active : ''}`}
            onClick={() => setLoaderType(type)}
          >
            {formatMessage({ id: `eureka.loader.${type.toLowerCase()}`, default: type })}
          </div>
        ))}
      </div>

      <div class={styles.loaderItems}>
        <Switch>
          <Match when={loaderType() === 'URL'}>
            <input
              type="text"
              placeholder={formatMessage({ id: 'eureka.loader.url.placeholder', default: 'Enter extension URL here' })}
              onChange={(e) => setURL(e.currentTarget.value)}
              value={extensionURL()}
              class={styles.input}
            />
          </Match>
          <Match when={loaderType() === 'Code'}>
            <textarea
              placeholder={formatMessage({ id: 'eureka.loader.code.placeholder', default: 'Paste extension code here' })}
              class={styles.textarea}
              onChange={(e) => setCode(e.currentTarget.value)}
              value={extensionCode()} // Bind value to textarea
            />
          </Match>
          <Match when={loaderType() === 'File'}>
            <input
              type="file"
              accept=".js"
              class={styles.input}
              onChange={(e) => {
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
              setErrorMessage("Error loading extension:" + error);
              console.error("Error loading extension:", error); // Handle any errors that occur during loading
            } finally {
              setLoading(false); // Ensure loading is set to false after loading completes or fails
            }
          }}
        >
          <FormattedMessage id="eureka.loader.load" default="Load Extension" />
        </button>
        {errorMessage() && <span class='errorText'>{errorMessage()}</span>} {/* Display error message below the button */}
      </div>
    </div>
  );
}

function LoadedExtensions() {
  return (
    <div class={styles.loadedExtensions}>
      {Array.from(loadedExtensions.values()).map(({ info }) => (
        <div class={styles.extensionItem}>
          <span class={styles.name}>{info.name}</span>
          <span class={styles.url}>{info.id}</span>
        </div>
      ))}
    </div>
  );
}

function SettingsItem(props: {
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

function SettingsSection(props: {
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

function Dashboard() {
  const [status, setStatus] = createSignal<DashboardStatus>(DashboardStatus.NONE);
  const [wrappedSettings, setWrappedSettings] = createSignal(settings);
  const tabs: Tab[] = [
    { id: DashboardStatus.LOADER, label: formatMessage({id: 'eureka.dashboard.loader', default: 'Loader'}) },
    { id: DashboardStatus.SETTINGS, label: formatMessage({id: 'eureka.dashboard.settings', default: 'Settings'}) },
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
        <div class={styles.modal} onClick={(e) => {
          e.stopPropagation();
        }}>
          <div class={styles.header}>
            <div class={styles.placeholder} />
            <span>
              <FormattedMessage id="eureka.dashboard.title" default="Eureka Dashboard" />
            </span>
            <button onClick={() => setStatus(DashboardStatus.NONE)}>
              <img src={close} alt={formatMessage({id: 'eureka.dashboard.close', default: "Close"})} />
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
                    {Object.entries(wrappedSettings().trap).map(([key, value]) => (
                      <SettingsItem
                        id={key}
                        label={key}
                        value={value}
                        onChange={(newValue) => {
                          settings.trap[key] = newValue;
                        }}
                      />
                    ))}
                  </SettingsSection>

                  <SettingsSection label="Behavior">
                    <SettingsItem
                      id='redirectURL'
                      label="Redirect all URL loading requests to Eureka"
                      value={wrappedSettings().behavior.redirectURL}
                      onChange={(value) => {
                        settings.behavior.redirectURL = value;
                      }}
                      disabled={wrappedSettings().behavior.headless}
                    />
                    <SettingsItem
                      id='redirectDeclared'
                      label="Redirect pre-declared requests to Eureka"
                      value={wrappedSettings().behavior.redirectDeclared}
                      onChange={(value) => {
                        settings.behavior.redirectDeclared = value;
                      }}
                      disabled={wrappedSettings().behavior.headless}
                    />
                    <SettingsItem
                      id='exposeCtx'
                      label="Expose Eureka's global context"
                      value={wrappedSettings().behavior.exposeCtx}
                      onChange={(value) => {
                        settings.behavior.exposeCtx = value;
                      }}
                    />
                    <SettingsItem
                      id='polyfillGlobalInstances'
                      label="Expose Scratch internal instances globally"
                      value={wrappedSettings().behavior.polyfillGlobalInstances}
                      onChange={(value) => {
                        settings.behavior.polyfillGlobalInstances = value;
                      }}
                    />
                    <SettingsItem
                      id='headless'
                      label="Headless mode"
                      value={wrappedSettings().behavior.headless}
                      onChange={(value) => {
                        settings.behavior.headless = value;
                      }}
                    />
                  </SettingsSection>

                  <SettingsSection label="Mixins">
                    {Object.entries(wrappedSettings().mixins).map(([key, value]) => (
                      <SettingsItem
                        id={key}
                        label={key}
                        value={value}
                        onChange={(newValue) => {
                          settings.mixins[key] = newValue;
                        }}
                      />
                    ))}
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


if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

function initialize () {
  const container = document.createElement('div');
  container.id = 'eureka-dashboard-container';
  document.body.appendChild(container);

  const shadow = container.attachShadow({ mode: 'open' });
  
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

eureka.openDashboard = (status: Exclude<DashboardStatus, DashboardStatus.NONE> = DashboardStatus.LOADER) => {
    setModalStatus(status);
};

eureka.closeDashboard = () => {
    setModalStatus(DashboardStatus.NONE);
};
