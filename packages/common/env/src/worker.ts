export function getWorkerUrl(name: string) {
  if (BUILD_CONFIG.debug && !name.endsWith('.worker.js')) {
    throw new Error(`worker should be named with '.worker.js', get ${name}`);
  }

  return environment.workerPath + name + '?v=' + BUILD_CONFIG.appVersion;
}
