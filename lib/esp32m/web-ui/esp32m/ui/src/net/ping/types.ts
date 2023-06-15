import { NetInterfaces } from '../types';

export const Name = 'ping';
export const StartAction = 'ping/start';

export interface IConfig {
  target: string;
  count: number;
  interval: number;
  timeout: number;
  size: number;
  ttl: number;
  iface: number;
  interfaces: NetInterfaces;
}

export interface IResultSuccess {
  status: number;
  seq: number;
  ttl: number;
  time: number;
  bytes: number;
  addr: string;
}

export interface IResultTimeout {
  status: number;
  seq: number;
  addr: string;
}

export interface IResultEnd {
  status: number;
  rx: number;
  tx: number;
  time: number;
}

export interface ILocalState {
  results?: Array<IResultEnd & IResultSuccess & IResultTimeout>;
}
