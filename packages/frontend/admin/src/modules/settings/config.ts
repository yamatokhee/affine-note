import CONFIG from '../../config.json';

export type ConfigDescriptor = {
  desc: string;
  type: 'String' | 'Number' | 'Boolean' | 'Array' | 'Object';
  env?: string;
  link?: string;
};

export type AppConfig = typeof CONFIG;
export type AvailableConfig = {
  [K in keyof AppConfig]: {
    module: K;
    fields: Array<keyof AppConfig[K]>;
  };
}[keyof AppConfig];

const IGNORED_MODULES: (keyof AppConfig)[] = [
  'db',
  'redis',
  'copilot', // not ready
];

if (!environment.isSelfHosted) {
  IGNORED_MODULES.push('payment');
}

export { CONFIG as ALL_CONFIG };
export const ALL_CONFIGURABLE_MODULES = Object.keys(CONFIG).filter(
  key => !IGNORED_MODULES.includes(key as keyof AppConfig)
) as (keyof AppConfig)[];
