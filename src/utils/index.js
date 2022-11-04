import fs from 'fs';
import path from 'path';

const packageJsonPath = '/package.json';

const sandboxConfigJsonPath = '/sandbox.config.json';

const depBaseUrl = 'https://esm.sh';

// 'react@16.8.0/cjs/react.development.js' -> 
// ['react/cjs/react.development.js', 'react', '16.8.0', '/cjs/react.development.js', ...]
const dependencyNameRE = /^((?:@[^/A-Z:]+\/)?[^@/._A-Z:~)('!*][^@/A-Z:~)('!*]*)(?:@(.+?))?(\/[^\\/].*?)?$/;

const configFileNames = ['tsconfig.json', 'jsconfig.json'];

const externalDependencies = ['react', 'react-dom'];

const setDomainCode = `
  try {
    // 修改 domain，以便让外部页面和 iframe 页面在同一个域名下，主要目的是为了直接监听 iframe 页面的事件 xxx
    document.domain = window.location.hostname.split('.').slice(-2).join('.');
  } catch (error) {
    //
  }
`;

function genImportMap(deps) {
  const importMap = {
    imports: {}
  };
  for (const depName of externalDependencies) {
    const version = deps[depName];
    if (version) {
      importMap.imports[depName] = `${depBaseUrl}/${depName}@${version}?dev&bundle&external=${externalDependencies.join(',')}`;
    } else {
      importMap.imports[depName] = `${depBaseUrl}/${depName}@latest?dev&bundle&external=${externalDependencies.join(',')}`;
    }
  }

  return JSON.stringify(importMap);
}

function writeFileSync(_path, contents) {
  try {
    fs.mkdirSync(path.dirname(_path), { recursive: true});
    fs.writeFileSync(_path, contents);
  } catch (error) {
    console.log(error);
  }
}

function genSandboxConfigJson(tree) {
  if (!(sandboxConfigJsonPath in tree)) {
    return {
      sandboxConfigJson: {}
    };
  }

  try {
    return {
      sandboxConfigJson: JSON.parse(tree[sandboxConfigJsonPath])
    };
  } catch (error) {
    tree[sandboxConfigJsonPath] = '{}';
    error.message = `Parsing ${sandboxConfigJsonPath}: ${error.message}`;
    return {
      sandboxConfigJson: {},
      parseError: error
    };
  }
}

function genPkgJson(tree) {
  if (!(packageJsonPath in tree)) {
    return {
      pkgJson: {}
    };
  }

  try {
    return {
      pkgJson: JSON.parse(tree[packageJsonPath])
    };
  } catch (error) {
    tree[packageJsonPath] = '{}';
    error.message = `Parsing ${packageJsonPath}: ${error.message}`;
    return {
      pkgJson: {},
      parseError: error
    };
  }
}

// 基于 package.json 的 dependencies 初始化 deps 对象
function initDeps(tree, deps) {
  if (packageJsonPath in tree) {
    const { dependencies } = JSON.parse(tree[packageJsonPath]);

    Object.entries(dependencies || []).forEach(([name, version]) => {
      const ver = deps[name];
      if (ver) {
        if (version !== ver) {
          console.log(`Already pinned dependency: ${name}@${ver} (${version} requested, ignored)`);
        }
      } else {
        deps[name] = version;
      }
    });
  }
}

function writeProjectFiles(root, tree) { 
  for (const [filename, code] of Object.entries(tree)) {
    writeFileSync(path.join(root, filename), code);
  }
}
 
function genProjectInfo(tree, pkgJson, wcid) {
  const { dependencies = {}, devDependencies = {}, peerDependencies = {} } = pkgJson;
  const isSomeFrameWork = name => name in dependencies || name in devDependencies || name in peerDependencies;

  return {
    useReact: isSomeFrameWork('react'),
    useSolid: isSomeFrameWork('solid-js'),
    useVue: isSomeFrameWork('vue'),
    useSvelte: isSomeFrameWork('svelte'),
    useStencil: isSomeFrameWork('@stencil/core'),
    dependencies,
    devDependencies,
    peerDependencies,
    root: `/@root/${wcid}`,
    configFiles: Object.fromEntries(configFileNames.map(configFileName => [configFileName, tree[configFileName]]))
  };
}

function sendCompileError(channel, err, wcid) {
  const error = Array.isArray(err) ? err : [err];
  channel.publish('compile-error', {
    wcid,
    errors: error.map(e => ({
      stack: e.stack,
      message: e.message,
      filename: e.filename,
      lineno: e.start && e.start.line,
      colno: e.start && e.start.column
    }))
  });
}

function getImageContentType(pathname) {
  const extname = path.extname(pathname).slice(1);
  switch (extname) {
  case 'svg':
    return 'image/svg+xml';
  case 'jpeg':
  case 'jpg':
    return 'image/jpeg';
  default:
    return `image/${extname}`;
  }
}

function _findPathName(pathNameArr, pathname) {
  const i = new RegExp(`^${pathname}\\.(mdx?|html?|astro|njk)$`);
  return pathNameArr.find(p => i.test(p));
}

function findPathName(pathname, pathNameArr) {
  if (pathNameArr.includes(pathname)) {
    return pathname;
  }
  if (pathname === '' || pathname.endsWith('/')) {
    _findPathName(pathNameArr, `${pathname}index`);
  }
  if (!(new RegExp('\\.(mdx?|html?|astro|njk)$').test(pathname))) {
    return _findPathName(pathNameArr, pathname);
  }
}

function genErrorHtmlCode(channel, contentType, error, wcid) {
  let code = `
  import(/*@vite-ignore*/ '/${channel.channelName}/vite/${wcid}/@vite/client').then(({ handleMessage }) => handleMessage({
      type: 'error',
      err: ${JSON.stringify(error)},
  }));
  `;

  if (contentType === 'text/html') {
    code = `<!DOCTYPE html><html><head><script type='module'>${code}</script></head><body></body></html>`;
  }
  return code;
}

function enhanceErrorInfo(error, tree, path, pathname) {
  if (error.plugin === 'vite:import-analysis') {
    const [ , importer, source] = error.message?.match(/Failed to resolve import '([^']+)' from '([^']+)'/) || [];
    const [ , dependency] = importer?.match(/^((?:@[^/A-Z:]+\/)?[^@/._A-Z:~)('!*][^@/A-Z:~)('!*]*)(?:@(.+?))?(\/[^\\/].*?)?$/) || [];
    if (dependency) {
      error.message = `Missing dependency '${dependency}' imported from '${source}'`;
    }
  } else if (!error.id) {
    if (pathname && tree[pathname]) {
      error.id = `/${pathname}`;
    } else {
      error.message = `Error processing ${pathname} ${error?.message}`;
    }
  }
}

export {
  dependencyNameRE,
  depBaseUrl,
  configFileNames,
  externalDependencies,
  setDomainCode,
  genImportMap,
  writeFileSync,
  genSandboxConfigJson,
  initDeps,
  writeProjectFiles,
  genProjectInfo,
  sendCompileError,
  getImageContentType,
  findPathName,
  genPkgJson,
  genErrorHtmlCode,
  enhanceErrorInfo
};
