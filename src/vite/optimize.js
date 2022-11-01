import {
  // scanImports,
  createMissingImporterRegisterFn
} from 'vite';
import path from 'path';
import { initDeps, depBaseUrl, genSandboxConfigJson, externalDependencies } from '$utils';

const genNpmUrl = (depName, deps, tree) => {
  const { sandboxConfigJson, parseError } = genSandboxConfigJson(tree);
  if (!parseError && sandboxConfigJson.npmUrlMap) {
    if (sandboxConfigJson.npmUrlMap[depName]) {
      return sandboxConfigJson.npmUrlMap[depName];
    }
  }

  return `${depBaseUrl}/${depName}@${deps[depName]}?bundle&dev&external=${externalDependencies.join(',')}`;
};

// eslint-disable-next-line no-unused-vars
async function optimizeDeps(config, tree, newDeps) {
  const mainHash = '0';
  const data = {
    hash: mainHash,
    browserHash: mainHash,
    optimized: {}
  };

  const deps = {};

  // 基于 package.json 的 dependencies 初始化 deps 对象
  initDeps(tree, deps);

  // if (newDeps) {
  //   console.log('New dependencies: ', Object.keys(newDeps));
  // } else {
  //   const { missing } = await scanImports(config);
  //   newDeps = missing;
  //   console.log('Scanned dependencies: ', Object.keys(newDeps));
  // }

  // for (const depName of Object.keys(newDeps)) {
  //   if (!deps[depName]) {
  //     deps[depName] = 'latest';
  //   }
  // }

  for (const depName of Object.keys(deps)) {
    data.optimized[depName] = {
      file: genNpmUrl(depName, deps, tree),
      needsInterop: false
    };
  }

  return data;
}

// 处理被构建应用的依赖
async function runOptimize(channel, server, { ref, tree }, addInitError) {
  const sendViteServerStatus = (type, data)=> channel.publish(type, Object.assign({ ref }, data));
  // todo: 暂时只传 server.config
  // c = xTt(server.config, tree);
  const config = server.config;
  const filePath = path.join(server.config.root, 'dist/__require.js');

  try {
    server._isRunningOptimizer = true;
    server._optimizeDepsMetadata = await optimizeDeps(config, tree);
    server.moduleGraph.onFileChange(filePath);
  } finally {
    server._isRunningOptimizer = false;
  }

  server._registerMissingImport = createMissingImporterRegisterFn(
    server, 
    (_config, _force, _asCommand, newDeps) => optimizeDeps(config, tree, newDeps)
      .then(data => {
        server.moduleGraph.onFileChange(filePath);
        sendViteServerStatus('vite-server-status', {
          status: 'successful'
        });
        return data;
      }).catch(error => {
        addInitError(error);
        sendViteServerStatus('vite-server-status', {
          status: 'failed'
        });
        return error;
      })
  );
}

export default runOptimize;
