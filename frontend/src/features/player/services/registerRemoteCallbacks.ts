export type RemoteCallbacks = {
  play?: () => void | Promise<void>;
  pause?: () => void | Promise<void>;
  next?: () => void | Promise<void>;
  previous?: () => void | Promise<void>;
  seek?: (ms: number) => void | Promise<void>;
};

let callbacks: RemoteCallbacks = {};

export function setRemoteCallbacks(cbs: RemoteCallbacks): void {
  callbacks = cbs;
}

export function getRemoteCallbacks(): RemoteCallbacks {
  return callbacks;
}
