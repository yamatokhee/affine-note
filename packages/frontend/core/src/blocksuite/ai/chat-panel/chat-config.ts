import type { Signal } from '@preact/signals-core';

export interface AppSidebarConfig {
  getWidth: () => {
    signal: Signal<number | undefined>;
    cleanup: () => void;
  };
  isOpen: () => {
    signal: Signal<boolean | undefined>;
    cleanup: () => void;
  };
}

export interface AINetworkSearchConfig {
  visible: Signal<boolean | undefined>;
  enabled: Signal<boolean | undefined>;
  setEnabled: (state: boolean) => void;
}
