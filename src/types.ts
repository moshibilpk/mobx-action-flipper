export type PayloadArgs = {
  name: string;
  args?: any[];
  tree: any;
  before: any;
  startTime: Date;
  storeName: string;
};

export type Event = {
  type: string;
  name: string;
  object: any;
  arguments: any[];
  spyReportEnd?: true;
};

export type Payload = {
  id: string;
  action: {
    type: string;
    payload: any;
  };
  actionName: string;
  took: string;
  startTime: string;
  time: string;
  before: object;
  after: object;
  storeName: string;
  isAsyncStoragePresent?: boolean;
};

export type InitialConfig = {
  asyncStorageOptionsEnabled: boolean;
};

export type Stores = {[name: string]: any};
