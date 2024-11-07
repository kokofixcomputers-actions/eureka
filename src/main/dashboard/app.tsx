/* eslint-disable */

import { createEffect, createSignal, Match, Setter, Show, Switch } from 'solid-js';
import { render } from 'solid-js/web';
import { eureka } from '../ctx';
import close from './assets/icon--close.svg';
import globalCss from './style.css';
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

function stringToDataURL (str: string) {
  return `data:text/plain;base64,${btoa(str)}`;
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
  const [extensionCode, setCode] = createSignal('');
  const [extensionFile, setFile] = createSignal<File | null>();
  const [loading, setLoading] = createSignal(false);

  function shouldDisable () {
    if (loading()) return true;
    switch (loaderType()) {
      case 'URL':
        return !extensionURL().trim();
      case 'Code':
        return !extensionCode().trim();
      case 'File':
        return !extensionFile();
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
            {formatMessage({id: `eureka.loader.${type.toLowerCase()}`, default: type})}
          </div>
        ))}
      </div>

      <div class={styles.loaderItems}>
        <Switch>
          <Match when={loaderType() === 'URL'}>
            <input
              type="text"
              placeholder={formatMessage({id: 'eureka.loader.url.placeholder', default: 'Enter extension URL here'})}
              onChange={(e) => setURL(e.currentTarget.value)}
              value={extensionURL()}
              class={styles.input}
            />
          </Match>
          <Match when={loaderType() === 'Code'}>
            <textarea
              placeholder={formatMessage({id: 'eureka.loader.code.placeholder', default: 'Paste extension code here'})}
              class={styles.textarea}
              onChange={(e) => setCode(e.currentTarget.value)}
            />
          </Match>
          <Match when={loaderType() === 'File'}>
            <input
              type="file"
              accept=".js"
              class={styles.input}
              placeholder={formatMessage({id: 'eureka.loader.file.placeholder', default: 'Choose a file'})}
            />
          </Match>
        </Switch>

        <button
          class={styles.button}
          disabled={shouldDisable()}
          onClick={async () => {
          switch (loaderType()) {
            case 'URL':
              setLoading(true);
              await eureka.load(extensionURL());
              setLoading(false);
              break;
            case 'Code':
              setLoading(true);
              await eureka.load(stringToDataURL(extensionCode()));
              setLoading(false);
              break;
            case 'File':
              if (extensionFile()) {
                const reader = new FileReader();
                reader.onload = async () => {
                  setLoading(true);
                  eureka.load(reader.result as string);
                  setLoading(false);
                };
                reader.readAsText(extensionFile());
              }
              break;
          }
        }}>
          <FormattedMessage id="eureka.loader.load" default="Load Extension" />
        </button>
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
                  <span class={styles.label}>
                    <FormattedMessage id='eureka.settings.trap' default='Trap' />
                  </span>
                  <div class={styles.settingsItem}>
                    <span>
                      <FormattedMessage id='eureka.settings.vm' default='VirtualMachine' />
                    </span>
                    <SwitchComponent value={wrappedSettings().trap.vm} onChange={(value) => {
                      settings.trap.vm = value;
                    }} />
                  </div>
                  <div class={styles.settingsItem}>
                    <span>
                      <FormattedMessage id='eureka.settings.blocks' default='ScratchBlocks' />
                    </span>
                    <SwitchComponent value={wrappedSettings().trap.blocks} onChange={(value) => {
                      settings.trap.blocks = value;
                    }} />
                  </div>
                  <div class={styles.settingsItem}>
                    <span>
                      <FormattedMessage id='eureka.settings.redux' default='ReduxStore' />
                    </span>
                    <SwitchComponent value={wrappedSettings().trap.redux} onChange={(value) => {
                      settings.trap.redux = value;
                    }} />
                  </div>
                  <span class={styles.label}>
                    <FormattedMessage id='eureka.settings.behavior' default='Behavior' />
                  </span>
                  <div class={styles.settingsItem}>
                    <span>
                      <FormattedMessage id='eureka.settings.redirectURL' default='Redirect all URL loading requests to Eureka' />
                    </span>
                      <SwitchComponent value={wrappedSettings().behavior.redirectURL} onChange={(value) => {
                        settings.behavior.redirectURL = value;
                      }} disabled={wrappedSettings().behavior.headless} />
                  </div>
                  <div class={styles.settingsItem}>
                    <span>
                      <FormattedMessage id='eureka.settings.redirectDeclared' default='Redirect pre-declared requests to Eureka' />
                    </span>
                      <SwitchComponent value={wrappedSettings().behavior.redirectDeclared} onChange={(value) => {
                        settings.behavior.redirectDeclared = value;
                      }} disabled={wrappedSettings().behavior.headless} />
                  </div>
                  <div class={styles.settingsItem}>
                    <span>
                      <FormattedMessage id='eureka.settings.exposeCtx' default={`Expose Eureka's global context`} />
                    </span>
                    <SwitchComponent value={wrappedSettings().behavior.exposeCtx} onChange={(value) => {
                      settings.behavior.exposeCtx = value;
                    }} />
                  </div>
                  <div class={styles.settingsItem}>
                    <span>
                      <FormattedMessage id='eureka.settings.polyfillGlobalInstances' default="Expose Scratch internal instances globally" />
                    </span>
                    <SwitchComponent value={wrappedSettings().behavior.polyfillGlobalInstances} onChange={(value) => {
                      settings.behavior.polyfillGlobalInstances = value;
                    }} />
                  </div>
                  <div class={styles.settingsItem}>
                    <span>
                      <FormattedMessage id='eureka.settings.headless' default={`Skip applying patches`} />
                    </span>
                    <SwitchComponent value={wrappedSettings().behavior.headless} onChange={(value) => {
                      settings.behavior.headless = value;
                    }} />
                  </div>
                  <span class={styles.label}>
                    <FormattedMessage id='eureka.settings.mixins' default='Mixins' />
                  </span>
                  <div class={styles.settingsItem}>
                    <span>
                      <FormattedMessage id='eureka.settings.vm.extensionManager.loadExtensionURL' default='vm.extensionManager.loadExtensionURL' />
                    </span>
                    <SwitchComponent value={wrappedSettings().mixins['vm.extensionManager.loadExtensionURL']} onChange={(value) => {
                      settings.mixins['vm.extensionManager.loadExtensionURL'] = value;
                    }} />
                  </div>
                  <div class={styles.settingsItem}>
                    <span>
                      <FormattedMessage id='eureka.settings.vm.extensionManager.refreshBlocks' default='vm.extensionManager.refreshBlocks' />
                    </span>
                    <SwitchComponent value={wrappedSettings().mixins['vm.extensionManager.refreshBlocks']} onChange={(value) => {
                      settings.mixins['vm.extensionManager.refreshBlocks'] = value;
                    }} />
                  </div>
                  <div class={styles.settingsItem}>
                    <span>
                      <FormattedMessage id='eureka.settings.vm.toJSON' default='vm.toJSON' />
                    </span>
                    <SwitchComponent value={wrappedSettings().mixins['vm.toJSON']} onChange={(value) => {
                      settings.mixins['vm.toJSON'] = value;
                    }} />
                  </div>
                  <div class={styles.settingsItem}>
                    <span>
                      <FormattedMessage id='eureka.settings.vm.deserializeProject' default='vm.deserializeProject' />
                    </span>
                    <SwitchComponent value={wrappedSettings().mixins['vm.deserializeProject']} onChange={(value) => {
                      settings.mixins['vm.deserializeProject'] = value;
                    }} />
                  </div>
                  <div class={styles.settingsItem}>
                    <span>
                      <FormattedMessage id='eureka.settings.vm._loadExtensions' default='vm._loadExtensions' />
                    </span>
                    <SwitchComponent value={wrappedSettings().mixins['vm._loadExtensions']} onChange={(value) => {
                      settings.mixins['vm._loadExtensions'] = value;
                    }} />
                  </div>
                  <div class={styles.settingsItem}>
                    <span>
                      <FormattedMessage id='eureka.settings.vm.setLocale' default='vm.setLocale' />
                    </span>
                    <SwitchComponent value={wrappedSettings().mixins['vm.setLocale']} onChange={(value) => {
                      settings.mixins['vm.setLocale'] = value;
                    }} />
                  </div>
                  <div class={styles.settingsItem}>
                    <span>
                      <FormattedMessage id='eureka.settings.vm.runtime._primitives.argument_reporter_boolean' default='vm.runtime._primitives.argument_reporter_boolean' />
                    </span>
                    <SwitchComponent value={wrappedSettings().mixins['vm.runtime._primitives.argument_reporter_boolean']} onChange={(value) => {
                      settings.mixins['vm.runtime._primitives.argument_reporter_boolean'] = value;
                    }} />
                  </div>
                  <div class={styles.settingsItem}>
                    <span>
                      <FormattedMessage id='eureka.settings.vm.exports.ScriptTreeGenerator.prototype.descendInput' default='vm.exports.ScriptTreeGenerator.prototype.descendInput' />
                    </span>
                    <SwitchComponent value={wrappedSettings().mixins['vm.exports.ScriptTreeGenerator.prototype.descendInput']} onChange={(value) => {
                      settings.mixins['vm.exports.ScriptTreeGenerator.prototype.descendInput'] = value;
                    }} />
                  </div>
                  <div class={styles.settingsItem}>
                    <span>
                      <FormattedMessage id='eureka.settings.vm.ccExtensionManager.getExtensionLoadOrder' default='vm.ccExtensionManager.getExtensionLoadOrder' />
                    </span>
                    <SwitchComponent value={wrappedSettings().mixins['vm.ccExtensionManager.getExtensionLoadOrder']} onChange={(value) => {
                      settings.mixins['vm.ccExtensionManager.getExtensionLoadOrder'] = value;
                    }} />
                  </div>
                  <div class={styles.settingsItem}>
                    <span>
                      <FormattedMessage id='eureka.settings.blocks.Procedures.addCreateButton_' default='blocks.Procedures.addCreateButton_' />
                    </span>
                    <SwitchComponent value={wrappedSettings().mixins['blocks.Procedures.addCreateButton_']} onChange={(value) => {
                      settings.mixins['blocks.Procedures.addCreateButton_'] = value;
                    }} />
                  </div>
                  <div class={styles.settingsItem}>
                    <span>
                      <FormattedMessage id='eureka.settings.blocks.getMainWorkspace().toolboxCategoryCallbacks_.PROCEDURE' default='blocks.getMainWorkspace().toolboxCategoryCallbacks_.PROCEDURE' />
                    </span>
                    <SwitchComponent value={wrappedSettings().mixins['blocks.getMainWorkspace().toolboxCategoryCallbacks_.PROCEDURE']} onChange={(value) => {
                      settings.mixins['blocks.getMainWorkspace().toolboxCategoryCallbacks_.PROCEDURE'] = value;
                    }} />
                  </div>
                  <div class={styles.settingsItem}>
                    <span>
                      <FormattedMessage id='eureka.settings.blocks.WorkspaceSvg.prototype.registerToolboxCategoryCallback' default='blocks.WorkspaceSvg.prototype.registerToolboxCategoryCallback' />
                    </span>
                    <SwitchComponent value={wrappedSettings().mixins['blocks.WorkspaceSvg.prototype.registerToolboxCategoryCallback']} onChange={(value) => {
                      settings.mixins['blocks.WorkspaceSvg.prototype.registerToolboxCategoryCallback'] = value;
                    }} />
                  </div>
                  <div class={styles.settingsItem}>
                    <span>
                      <FormattedMessage id='eureka.settings.blocks.getMainWorkspace().toolboxCategoryCallbacks.PROCEDURE' default='blocks.getMainWorkspace().toolboxCategoryCallbacks.PROCEDURE' />
                    </span>
                    <SwitchComponent value={wrappedSettings().mixins['blocks.getMainWorkspace().toolboxCategoryCallbacks.PROCEDURE']} onChange={(value) => {
                      settings.mixins['blocks.getMainWorkspace().toolboxCategoryCallbacks.PROCEDURE'] = value;
                    }} />
                  </div>
                  <div class={styles.settingsItem}>
                    <span>
                      <FormattedMessage id='eureka.settings.blocks.Blocks.argument_reporter_boolean.init' default='blocks.Blocks.argument_reporter_boolean.init' />
                    </span>
                    <SwitchComponent value={wrappedSettings().mixins['blocks.Blocks.argument_reporter_boolean.init']} onChange={(value) => {
                      settings.mixins['blocks.Blocks.argument_reporter_boolean.init'] = value;
                    }} />
                  </div>
                  <div class={styles.settingsItem}>
                    <span>
                      <FormattedMessage id='eureka.settings.vm.runtime._convertButtonForScratchBlocks' default='vm.runtime._convertButtonForScratchBlocks' />
                    </span>
                    <SwitchComponent value={wrappedSettings().mixins['vm.runtime._convertButtonForScratchBlocks']} onChange={(value) => {
                      settings.mixins['vm.runtime._convertButtonForScratchBlocks'] = value;
                    }} />
                  </div>
                  <div class={styles.settingsItem}>
                    <span>
                      <FormattedMessage id='eureka.settings.vm.runtime._convertForScratchBlocks' default='vm.runtime._convertForScratchBlocks' />
                    </span>
                    <SwitchComponent value={wrappedSettings().mixins['vm.runtime._convertForScratchBlocks']} onChange={(value) => {
                      settings.mixins['vm.runtime._convertForScratchBlocks'] = value;
                    }} />
                  </div>
                </div>
              </Match>
            </Switch>
          </div>
        </div>
      </div>
    </Show>
  );
}

const style = document.createElement('style');
style.id = 'eureka-styles';
style.innerHTML = `${globalCss}\n${stylesheet}`;
document.head.append(style);

document.addEventListener('DOMContentLoaded', () => {
  render(() => (
    <div id='eureka-dashboard'>
      <Dashboard />
    </div>
  ), document.body);
});

eureka.openDashboard = (status: Exclude<DashboardStatus, DashboardStatus.NONE> = DashboardStatus.LOADER) => {
    setModalStatus(status);
};

eureka.closeDashboard = () => {
    setModalStatus(DashboardStatus.NONE);
};
