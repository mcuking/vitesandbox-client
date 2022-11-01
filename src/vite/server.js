import {
  transformRequest,
  resolveConfig,
  createPluginContainer,
  createDevHtmlTransformFn,
  ModuleGraph,
  transformWithEsbuild,
  ssrTransform,
  // ssrLoadModule,
  generateCodeFrame
} from 'vite';
import reactPlugin from '@vitejs/plugin-react';
import pluginTransformReactJsx from '@babel/plugin-transform-react-jsx';
import viteClientPlugin from './plugins/viteClientPlugin';
import nodeResolvePlugin from './plugins/nodeResolvePlugin';
import htmlPlugin from './plugins/htmlPlugin';
import runOptimize from './optimize';

function Nlt(id, text) {
  return text.replace(new RegExp(`(\\S+:)?/?@root/${id}`,'g'), '');
}

async function createServer(channel, { cfg, wc, baseUrl }, addInitError) {
  const bablePlugins = [
    pluginTransformReactJsx
  ];

  const vitePlugins = [
    // virtual plugin to provide vite client/env special entries (see below)
    viteClientPlugin(),
    // virtual plugin to resolve NPM dependencies, e.g. using unpkg, skypack or another provider (browser-vite only handles project files)
    nodeResolvePlugin({
      tree: wc.tree
    }),
    // add vite plugins you need here (e.g. vue, react, astro ...)
    reactPlugin({
      jsxRuntime: 'classic',
      babel: {
        plugins: bablePlugins
      }
    }),
    htmlPlugin({
      tree: wc.tree
    })
  ];

  // 暂时只支持 react
  const config = await resolveConfig(
    {
      plugins: vitePlugins,
      base: `${baseUrl}/${wc.ref.id}/`,
      cacheDir: 'browser',
      root: cfg.root,
      resolve: {
        alias: cfg.alias
      }
    }, 
    'serve'
  );
  const plugins = config.plugins;
  const pluginContainer = await createPluginContainer(config);
  const moduleGraph = new ModuleGraph((url, ssr) => pluginContainer.resolveId(url, undefined, {
    ssr
  }));

  const watcher = {
    // eslint-disable-next-line no-unused-vars
    on(what, cb) {
      return watcher;
    },
    add() {}
  };
  const server = {
    config,
    pluginContainer,
    moduleGraph,
    transformWithEsbuild,
    transformRequest(url, options) {
      return transformRequest(url, server, options);
    },
    ssrTransform,
    printUrls() {},
    transformIndexHtml: null,
    _globImporters: {},
    ws: {
      send(data) {
        const err = data.err;

        if (err) {
          data.err = Object.assign({}, err, {
            stack: err.stack,
            message: err.message
          });
        }
        channel.publish('vite-hmr', Object.assign({}, data, { ref: wc.ref }));
      },
      async close() {},
      on() {},
      off() {}
    },
    middlewares: false,
    app: undefined,
    httpServer: undefined,
    watcher: watcher,
    async ssrLoadModule() {
      // // todo: loadModule 待实现
      // return ssrLoadModule(url, server, () => null);
    },
    ssrFixStacktrace() {},
    listen: undefined,
    async close() {},
    async restart() {},
    _optimizeDepsMetadata: null,
    _isRunningOptimizer: false,
    _pendingReload: undefined,
    _registerMissingImport: undefined,
    _ssrExternals: [],
    _restartPromise: null,
    _forceOptimizeOnRestart: false,
    _pendingRequests: new Map()
  };

  server.transformIndexHtml = createDevHtmlTransformFn(server);

  // apply server configuration hooks from plugins
  const postHooks = [];
  for (const plugin of plugins) {
    if (plugin.configureServer) {
      postHooks.push(await plugin.configureServer(server));
    }
  }

  // run post config hooks
  // This is applied before the html middleware so that user middleware can
  // serve custom content instead of index.html.
  postHooks.forEach((fn) => fn && fn());

  let initError;
  try {
    await pluginContainer.buildStart({});
    await runOptimize(channel, server, wc, addInitError);
  } catch (error) {
    initError = error,
    initError.message = error.message.replace(/^Build failed with \d+ error.*:/, 'Failed to start compilation server:');
    const { location } = (error.errors == null ? undefined : error.errors[0]) || {};

    if (location?.file) {
      initError.id = `${location.file}:${location?.line || 0}:${location?.column || 0}`;
      initError.loc = location;
      initError.frame = generateCodeFrame(wc.tree[Nlt(wc.ref.id, location.file).slice(1)], location);
    }
  }

  const createResolver = config.createResolver;
  config.createResolver = option =>{
    const resolveFn = createResolver(option);
    return async(id, importer, aliasOnly, ssr)=>{
      const code = await resolveFn(id, importer, aliasOnly, ssr);
      // if (!code && !aliasOnly) {
      //     let ret = dependencyNameRE.exec(id);
      //     if (ret) {
      //         let [name, version, pathname] = ret.slice(1);
      //         let _optimizeDepsMetadata = R._optimizeDepsMetadata;
      //         let versionedEntry = _optimizeDepsMetadata?.$pinDependency$(version ? `${name}@${version}` : name);
      //         if (versionedEntry) {
      //             let ce = await i4r(versionedEntry);
      //             for (let[fe, A] of Object.entries(ce)) {
      //                 let W = path.join(e.root, 'node_modules', name, fe);
      //                 uN(W, A);
      //             }
      //             code = await resolveFn(path.join(e.root, 'node_modules', name, pathname), importer, aliasOnly, ssr)
      //         }
      //     }
      // }
      return code;
    };
  };
  
  return {
    server,
    initError
  };
}

export default createServer;
