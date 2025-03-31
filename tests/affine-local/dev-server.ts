import { getConfig, start } from '@affine-tools/cli/bundle';
import { Workspace } from '@affine-tools/utils/workspace';
import webpack from 'webpack';

export default async () => {
  const ws = new Workspace();
  const webpackConfig = await getConfig(ws.getPackage('@affine/web'), true);
  const definedPort = webpackConfig.devServer?.port ?? 8080;

  await new Promise<void>((resolve, reject) => {
    start(webpack(webpackConfig), {
      ...webpackConfig.devServer,
      onListening: server => {
        // dev server has already started
        if (server.options.port !== definedPort) {
          server.compiler.close(reject);
          server.stop().catch(reject);
          resolve();
        }
      },
      proxy: [],
    })
      .then(server => {
        server.middleware?.waitUntilValid?.(stats => {
          if (stats?.hasErrors()) {
            reject(new Error('Webpack build failed'));
          } else {
            resolve();
          }
        });
      })
      .catch(reject);
  });
  console.log('Dev server started');
};
