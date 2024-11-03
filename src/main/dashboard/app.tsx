/* eslint-disable */

import { createEffect, createSignal, Match, Setter, Show, Switch } from 'solid-js';
import { render } from 'solid-js/web';
import { eureka } from '../ctx';
import close from './assets/icon--close.svg';
import globalCss from './style.css';
import styles, { stylesheet } from './style.module.css';

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

  function shouldDisable () {
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
            {type}
          </div>
        ))}
      </div>

      <div class={styles.loaderItems}>
        <Switch>
          <Match when={loaderType() === 'URL'}>
            <input
              type="text"
              placeholder="Extension URL"
              onChange={(e) => setURL(e.currentTarget.value)}
              value={extensionURL()}
              class={styles.input}
            />
          </Match>
          <Match when={loaderType() === 'Code'}>
            <textarea
              placeholder="Paste extension code here"
              class={styles.textarea}
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

        <button class={styles.button} disabled={shouldDisable()} onClick={() => {
          switch (loaderType()) {
            case 'URL':
              eureka.load(extensionURL());
              break;
            case 'Code':
              eureka.load(stringToDataURL(extensionCode()));
              break;
            case 'File':
              if (extensionFile()) {
                const reader = new FileReader();
                reader.onload = () => {
                  eureka.load(reader.result as string);
                };
                reader.readAsText(extensionFile());
              }
              break;
          }
        }}>
          Load Extension
        </button>
      </div>
    </div>
  );
}

function Dashboard() {
  const [status, setStatus] = createSignal<DashboardStatus>(DashboardStatus.NONE);
  const tabs: Tab[] = [
    { id: DashboardStatus.LOADER, label: "Loader" },
    { id: DashboardStatus.SETTINGS, label: "Settings" },
  ];

  createEffect(() => {
    setModalStatus = setStatus;
  });

  return (
    <Show when={status() !== DashboardStatus.NONE}>
      <div class={styles.wrapper}>
        <div class={styles.modal}>
          <div class={styles.header}>
            <div class={styles.placeholder} />
            <span>Eureka Dashboard</span>
            <button onClick={() => setStatus(DashboardStatus.NONE)}>
              <img src={close} alt="Close" />
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
                <div class={styles.loadedExtensions}>
                  {/* Loaded extensions will go here */}
                </div>
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
