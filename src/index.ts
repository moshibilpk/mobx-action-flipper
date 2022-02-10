import {addPlugin} from 'react-native-flipper';
import {spy, toJS} from 'mobx';

let isFirstRun = true;
let currentConnection: any = null;
let storeRecord: null | Stores = null;
const storeActionMethods: {[name: string]: string[]} = {};
const payloadsArray: any[] = [];

type PayloadArgs = {
  name: string;
  args?: any[];
  tree: any;
  before: any;
  startTime: Date;
  storeName: string;
};

type Event = {
  type: string;
  name: string;
  object: any;
  arguments: any[];
  spyReportEnd?: true;
};

type Stores = {[name: string]: any};

export const debugMobxActions = (stores: Stores) => {
  //@ts-ignore
  if (!__DEV__ || !isFirstRun) {
    return;
  }
  initPlugin(stores);
  spy(makeMobxDebugger() as any);
  isFirstRun = false;
};

const initPlugin = (stores: Stores) => {
  if (currentConnection === null) {
    storeRecord = stores;
    addPlugin({
      getId() {
        return 'mobx-action-debugger';
      },
      onConnect(connection) {
        currentConnection = connection;

        const startTime = new Date();
        const payload = generatePayload({
          name: 'INIT',
          tree: {},
          startTime,
          before: {},
          storeName: '',
        });
        currentConnection.send('init', payload);
      },
      onDisconnect() {},
      runInBackground() {
        return true;
      },
    });
  }
};

const getStoreName = (property: string) => {
  if (!property) {
    return '';
  }
  let finalStoreName = '';
  for (const [storeName, store] of Object.entries(storeRecord ?? {})) {
    if (store[property]) {
      finalStoreName = storeName;
      break;
    }
  }
  return finalStoreName;
};

const makeMobxDebugger = () => {
  let payload: any | undefined;
  return (event: Event) => {
    if (!currentConnection) {
      return;
    }
    if (!payload && event.name && event.type === 'action') {
      const storeName = getStoreName(event.name);
      if (storeName) {
        const startTime = new Date();
        const observableKeys = Object.keys(event.object ?? {});
        storeActionMethods[storeName] = observableKeys;
        const before: any = {};
        observableKeys.forEach((name) => {
          if (typeof storeRecord?.[storeName]?.[name] !== undefined) {
            before[name] = toJS(storeRecord?.[storeName]?.[name]);
          }
        });
        payload = generatePayload({
          args:
            event?.arguments?.length && event.arguments[0].nativeEvent
              ? undefined
              : event.arguments,
          name: event.name,
          storeName,
          tree: {},
          before,
          startTime,
        });
      }
      return;
    }
    if (payload && event.spyReportEnd) {
      payload.took = `${
        Date.now() - Date.parse(payload.startTime.toString())
      } ms`;
      payloadsArray.push({...payload});
      setTimeout(() => {
        const payloadToSend = payloadsArray[payloadsArray.length - 1];
        const currentStore = storeRecord?.[payloadToSend.storeName] ?? {};
        const after: any = {};
        storeActionMethods[payloadToSend.storeName].forEach((name) => {
          if (typeof currentStore[name] !== undefined) {
            after[name] = toJS(currentStore[name]);
          }
        });
        payloadToSend.after = after;
        try {
          currentConnection.send('action', payloadToSend);
        } catch (error) {
          console.log(error);
        }
        payloadsArray.pop();
      }, 100);
      payload = null;
    }
  };
};

const generatePayload = ({
  name,
  args,
  tree,
  before,
  startTime,
  storeName,
}: PayloadArgs) => {
  const stringifyNumber = (input: number) =>
    input < 10 ? `0${input}` : `${input}`;

  return {
    id: (Math.random() + 1).toString(36).substring(7) + Date.now(),
    startTime: startTime.toISOString(),
    time: `${stringifyNumber(startTime.getHours())}:${stringifyNumber(
      startTime.getMinutes(),
    )}:${stringifyNumber(startTime.getSeconds())}.${stringifyNumber(
      startTime.getMilliseconds(),
    )}`,
    took: '',
    action: {type: name, payload: args ? args[0] : undefined},
    before,
    storeName,
    after: tree,
  };
};
