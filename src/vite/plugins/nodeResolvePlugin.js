// import path from 'path';
import { dependencyNameRE, depBaseUrl, genPkgJson } from '$utils';

const nodeResolvePlugin = ({ tree }) => {
  let server;
  return {
    name: 'vite:node:resolve',
    enforce: 'pre',
    configureServer(_server) {
      server = _server;
    },
    resolveId(id, _, { ssr }) {
      if (/dist\/__require\.js$/.test(id)) {
        return '/dist/__require.js';
      }
              
      const dependencyInfos = dependencyNameRE.exec(id);
      if (dependencyInfos) {
        if (ssr) {
          return {
            id,
            external: true
          };
        }
        const { _optimizeDepsMetadata } = server;
        if (_optimizeDepsMetadata) {
          // 从 optimized 中查询对应依赖代码在 cdn 上的地址
          const depData = _optimizeDepsMetadata.optimized[id];
          if (depData?.src) {
            return {
              id: depData.file,
              external: true
            };
          }

          // // 如果在 optimized 上不存在，但又是安装过的依赖，则将其添加到 optimized，并返回对应代码文件的路径
          // server?._registerMissingImport?.call(server, id, id, undefined);
          // return path.join('/node_modules', dependencyInfos[1], 'index.js');
        }
        
        const [, dependencyName, , pathname] = dependencyInfos;
        const { pkgJson, parseError } = genPkgJson(tree);
        if (!parseError) {
          const { dependencies } = pkgJson;
          if (!dependencies[dependencyName]) {
            throw new Error(`${dependencyName} not implicited in package.json`);
          }

          return {
            id: `https://esm.sh/${dependencyName}@${dependencies[dependencyName]}${pathname}`,
            external: true
          };
        }
      }
    },
    load(id) {
      // 如果是动态 import，则将动态 import 的函数代码返回
      if (id === '/dist/__require.js') {
        if (server?._optimizeDepsMetadata) {
          return `
            export default function require(library) {
              const flat = library.replace(/[\\/\\.]/g, '_');
              return import(/*@vite-ignore*/ ${JSON.stringify(depBaseUrl)}+flat).then(m => ({...m, ...m.default}));
            }
        `;
        } else {
          console.warn('Trying to access dynamic require but dependencies aren\'t optimized yet');
          return `
            export default function require(library) {
                throw new Error('Missing library: ' + library)
            }`;
        }
      }
    }
  };
};

export default nodeResolvePlugin;
