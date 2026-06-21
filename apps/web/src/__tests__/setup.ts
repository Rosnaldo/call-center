// Provide a working localStorage before Zustand persist stores are imported,
// preventing "storage.setItem is not a function" in happy-dom workers.
const mockLocalStorage = {
  _data: {} as Record<string, string>,
  getItem(key: string) { return this._data[key] ?? null; },
  setItem(key: string, value: string) { this._data[key] = value; },
  removeItem(key: string) { delete this._data[key]; },
  clear() { this._data = {}; },
  get length() { return Object.keys(this._data).length; },
  key(index: number) { return Object.keys(this._data)[index] ?? null; },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

import { createStores } from '../states/stores';
createStores();
