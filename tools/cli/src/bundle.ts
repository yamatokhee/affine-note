import type { Package } from '@affine-tools/utils/workspace';
import webpack, { type Compiler, type Configuration } from 'webpack';
import WebpackDevServer from 'webpack-dev-server';
import { merge } from 'webpack-merge';

import { Option, PackageCommand } from './command';
import { createWebpackConfig } from './webpack';

function getChannel() {
  const channel = process.env.BUILD_TYPE ?? 'canary';
  switch (channel) {
    case 'canary':
    case 'beta':
    case 'stable':
    case 'internal':
      return channel;
    default: {
      throw new Error(
        `BUILD_TYPE must be one of canary, beta, stable, internal, received [${channel}]`
      );
    }
  }
}

export async function getConfig(pkg: Package, dev: boolean) {
  let config = createWebpackConfig(pkg, {
    mode: dev ? 'development' : 'production',
    channel: getChannel(),
  });

  let configOverride: Configuration | undefined;
  const overrideConfigPath = pkg.join('webpack.config.ts');

  if (overrideConfigPath.isFile()) {
    const override = await import(overrideConfigPath.toFileUrl().toString());
    configOverride = override.config ?? override.default;
  }

  if (configOverride) {
    config = merge(config, configOverride);
  }

  return config;
}

export async function start(
  compiler: Compiler,
  config: Configuration['devServer']
): Promise<WebpackDevServer> {
  const devServer = new WebpackDevServer(config, compiler);

  await devServer.start();

  return devServer;
}

export async function build(compiler: Compiler) {
  compiler.run((error, stats) => {
    if (error) {
      console.error(error);
      process.exit(1);
    }
    if (stats) {
      if (stats.hasErrors()) {
        console.error(stats.toString('errors-only'));
        process.exit(1);
      } else {
        console.log(stats.toString('minimal'));
      }
    }
  });
}

export class BundleCommand extends PackageCommand {
  static override paths = [['bundle'], ['webpack'], ['pack'], ['bun']];

  // bundle is not able to run with deps
  override _deps = false;
  override waitDeps = false;

  dev = Option.Boolean('--dev,-d', false, {
    description: 'Run in Development mode',
  });

  async execute() {
    this.logger.info(`Packing package ${this.package}...`);

    const config = await getConfig(
      this.workspace.getPackage(this.package),
      this.dev
    );

    const compiler = webpack(config);

    if (this.dev) {
      await start(compiler, config.devServer);
    } else {
      await build(compiler);
    }
  }
}
