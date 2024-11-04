/* eslint-disable */

import { createEffect, createSignal, Match, Setter, Show, Switch } from 'solid-js';
import { render } from 'solid-js/web';
import { eureka } from '../ctx';
import close from './assets/icon--close.svg';
import globalCss from './style.css';
import styles, { stylesheet } from './style.module.css';
import formatMessage from 'format-message';
import { loadedExtensions } from '../middleware/index';

export enum DashboardStatus {
    NONE,
    LOADER,
    SETTINGS
}

let setModalStatus: Setter<DashboardStatus>;

type Tab = {
  id: DashboardStatus;
  label: string;
};

type LoaderType = 'URL' | 'Code' | 'File';

function FormattedMessage (props: { id: string, default: string, values?: Record<string, string> }) {
  return <>{formatMessage({ id: props.id, default: '' }, props.values)}</>;
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

function stringToDataURL (str: string) {
  return `data:text/plain;base64,${btoa(str)}`;
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
  const tabs: Tab[] = [
    { id: DashboardStatus.LOADER, label: formatMessage({id: 'eureka.dashboard.loader', default: 'Loader'}) },
    { id: DashboardStatus.SETTINGS, label: formatMessage({id: 'eureka.dashboard.settings', default: 'Settings'}) },
  ];

  createEffect(() => {
    setModalStatus = setStatus;
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
                  <p>Settings go here.</p>
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
render(() => (
    <div id='eureka-dashboard'>
        <Dashboard />
    </div>
), document.body);

eureka.openDashboard = (status: Exclude<DashboardStatus, DashboardStatus.NONE>) => {
    setModalStatus(status);
};

eureka.closeDashboard = () => {
    setModalStatus(DashboardStatus.NONE);
};
