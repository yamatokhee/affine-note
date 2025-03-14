import { signal } from '@preact/signals-core';

import { Boxed } from '../boxed';
import { isPureObject } from '../is-pure-object';
import { native2Y } from '../native-y';
import { Text } from '../text';
import type { UnRecord } from '../types';
import type { CreateProxyOptions } from './types';
import {
  getFirstKey,
  isProxy,
  keyWithoutPrefix,
  keyWithPrefix,
  markProxy,
} from './utils';

function initializeProxy(options: CreateProxyOptions) {
  const { basePath, yMap, base, root } = options;

  Object.entries(base).forEach(([key, value]) => {
    if (isPureObject(value) && !isProxy(value)) {
      const proxy = createProxy({
        ...options,
        yMap,
        base: value as UnRecord,
        root,
        basePath: basePath ? `${basePath}.${key}` : key,
      });
      base[key] = proxy;
    }
  });
}

export function createProxy(options: CreateProxyOptions): UnRecord {
  const {
    yMap,
    base,
    root,
    onDispose,
    shouldByPassSignal,
    shouldByPassYjs,
    byPassSignalUpdate,
    basePath,
    onChange,
    initialized,
    transform,
    stashed,
  } = options;
  const isRoot = !basePath;

  if (isProxy(base)) {
    return base;
  }

  initializeProxy(options);

  const proxy = new Proxy(base, {
    has: (target, p) => {
      return Reflect.has(target, p);
    },
    get: (target, p, receiver) => {
      return Reflect.get(target, p, receiver);
    },
    set: (target, p, value, receiver) => {
      if (typeof p === 'string') {
        const list: Array<() => void> = [];
        const fullPath = basePath ? `${basePath}.${p}` : p;
        const firstKey = getFirstKey(fullPath);
        const isStashed = stashed.has(firstKey);

        const updateSignal = (value: unknown) => {
          if (shouldByPassSignal()) {
            return;
          }

          const signalKey = `${firstKey}$`;
          if (!(signalKey in root)) {
            if (!isRoot) {
              return;
            }
            const signalData = signal(value);
            root[signalKey] = signalData;
            const unsubscribe = signalData.subscribe(next => {
              if (!initialized()) {
                return;
              }
              byPassSignalUpdate(() => {
                proxy[p] = next;
                onChange?.(firstKey, true);
              });
            });
            const subscription = onDispose.subscribe(() => {
              subscription.unsubscribe();
              unsubscribe();
            });
            return;
          }
          byPassSignalUpdate(() => {
            const prev = root[firstKey];
            const next = isRoot
              ? value
              : isPureObject(prev)
                ? { ...prev }
                : Array.isArray(prev)
                  ? [...prev]
                  : prev;
            // @ts-expect-error allow magic props
            root[signalKey].value = next;
            onChange?.(firstKey, true);
          });
        };

        if (isPureObject(value)) {
          const syncYMap = () => {
            if (shouldByPassYjs()) {
              return;
            }
            yMap.forEach((_, key) => {
              if (initialized() && keyWithoutPrefix(key).startsWith(fullPath)) {
                yMap.delete(key);
              }
            });
            const run = (obj: object, basePath: string) => {
              Object.entries(obj).forEach(([key, value]) => {
                const fullPath = basePath ? `${basePath}.${key}` : key;
                if (isPureObject(value)) {
                  run(value, fullPath);
                } else {
                  list.push(() => {
                    if (value instanceof Text || Boxed.is(value)) {
                      value.bind(() => {
                        onChange?.(firstKey, true);
                      });
                    }
                    yMap.set(keyWithPrefix(fullPath), native2Y(value));
                  });
                }
              });
            };
            run(value, fullPath);
            if (list.length && initialized()) {
              yMap.doc?.transact(
                () => {
                  list.forEach(fn => fn());
                },
                { proxy: true }
              );
            }
          };

          if (!isStashed) {
            syncYMap();
          }

          const next = createProxy({
            ...options,
            basePath: fullPath,
            yMap,
            base: value as UnRecord,
            root,
          });

          const result = Reflect.set(target, p, next, receiver);
          updateSignal(next);
          return result;
        }

        if (value instanceof Text || Boxed.is(value)) {
          value.bind(() => {
            onChange?.(firstKey, true);
          });
        }
        const yValue = native2Y(value);
        const next = transform(firstKey, value, yValue);
        if (!isStashed && initialized() && !shouldByPassYjs()) {
          yMap.doc?.transact(
            () => {
              yMap.set(keyWithPrefix(fullPath), yValue);
            },
            { proxy: true }
          );
        }

        const result = Reflect.set(target, p, next, receiver);
        updateSignal(next);
        return result;
      }
      return Reflect.set(target, p, value, receiver);
    },
    deleteProperty: (target, p) => {
      if (typeof p === 'string') {
        const fullPath = basePath ? `${basePath}.${p}` : p;
        const firstKey = getFirstKey(fullPath);
        const isStashed = stashed.has(firstKey);

        const updateSignal = () => {
          if (shouldByPassSignal()) {
            return;
          }

          const signalKey = `${firstKey}$`;
          if (!(signalKey in root)) {
            if (!isRoot) {
              return;
            }
            delete root[signalKey];
            return;
          }
          byPassSignalUpdate(() => {
            const prev = root[firstKey];
            const next = isRoot
              ? prev
              : isPureObject(prev)
                ? { ...prev }
                : Array.isArray(prev)
                  ? [...prev]
                  : prev;
            // @ts-expect-error allow magic props
            root[signalKey].value = next;
            onChange?.(firstKey, true);
          });
        };

        if (!isStashed && initialized() && !shouldByPassYjs()) {
          yMap.doc?.transact(
            () => {
              const fullKey = keyWithPrefix(fullPath);
              yMap.forEach((_, key) => {
                if (key.startsWith(fullKey)) {
                  yMap.delete(key);
                }
              });
            },
            { proxy: true }
          );
        }

        const result = Reflect.deleteProperty(target, p);
        updateSignal();
        return result;
      }
      return Reflect.deleteProperty(target, p);
    },
  });

  markProxy(proxy);

  return proxy;
}
