import {
  transformRequest,
  isCSSRequest,
  isDirectCSSRequest,
  injectQuery,
  removeImportQuery,
  unwrapId,
  handleFileAddUnlink,
  handleHMRUpdate
} from 'vite';
import fs from 'fs';
import path from 'path';
import {
  writeProjectFiles,
  genProjectInfo,
  sendCompileError,
  getImageContentType,
  findPathName,
  genPkgJson,
  genErrorHtmlCode,
  enhanceErrorInfo
} from '$utils';
import Channel from '$utils/channel';
import '$utils/initFiles/index';
import createServer from './server';

const compileContexts = new Map();

const { busid, wcid } = self;

const channel = new Channel(busid);

// 创建编译上下文
async function createCompileContext(projectInfo, wc, parseError) {
  channel.publish('vite-server-status', {
    ref: wc.ref,
    status: 'initializing'
  });

  // eslint-disable-next-line prefer-const
  let compileContext;

  const { server, initError } = await createServer(channel, {
    cfg: projectInfo,
    wc,
    baseUrl: `/${channel.channelName}/vite`
  }, err => compileContext.initError = err);

  compileContext = {
    cfg: projectInfo,
    wc,
    server,
    initError: parseError ? parseError : initError
  };

  return compileContext;
}

// 根据消息决定初始化编译上下文
channel.subscribe('tree-compilation-request', async (data) => {
  const { compiler_type, tree } = data;

  if (compiler_type === 'vite') {
    const { pkgJson, parseError } = genPkgJson(tree);
    const compileContext = compileContexts.get(wcid);
    let isFileUpdate = compileContext && !compileContext.initError;
    const projectInfo = await genProjectInfo(tree, pkgJson, wcid);

    // 向内存文件系统写入需要构建应用的源码
    writeProjectFiles(projectInfo.root, tree);

    if (isFileUpdate) {
      const { wc } = compileContext;

      if (parseError) {
        compileContext.initError = parseError;
      }

      // 只要项目信息（例如依赖或 tsconfig/jsconfig 等文件内容）不变，则尝试热更新处理
      // 文件变动后（新增/删除/文案内容变动）的热更新处理
      if (JSON.stringify(projectInfo) === JSON.stringify(compileContext.cfg)) {
        const { server } = compileContext;
        const { root } = server.config;
        for (const filePath in wc.tree) {
          // 1. 文件内容变更情况
          if (filePath in tree) {
            if (tree[filePath] !== wc.tree[filePath]) {
              server.moduleGraph.onFileChange(path.join(root, filePath));
              try {
                await handleHMRUpdate(path.join(root, filePath), tree[filePath], server);
              } catch(err) {
                server.ws.send({
                  type: 'error',
                  err
                });
              }
            }
          } else {
            // 2. 删除文件情况
            handleFileAddUnlink(path.join(root, filePath), server, true);
            delete wc.tree[filePath];
          }
        }

        for (const filePath in tree) {
          // 3. 新增文件情况
          if (!(filePath in wc.tree)) {
            handleFileAddUnlink(path.join(root, filePath), server, false);
            server.ws.send({
              type: 'full-reload',
              path: filePath
            });
            wc.tree[filePath] = tree[filePath];
          }
        }
      } else {
        compileContext.server.close();
        isFileUpdate = false;
      }
    }

    if (!isFileUpdate) {
      try {
        const compileContext = await createCompileContext(projectInfo, {
          tree,
          ref: {
            id: wcid
          }
        }, parseError);
        compileContexts.set(wcid, compileContext);
        compileContext.server.ws.send({
          type: 'full-reload'
        });
        // 完成 compileContext 上下文初始化
        self.postMessage({
          cmd: 'compile-context-inited'
        });
      } catch (err) {
        sendCompileError(channel, err, wcid);
        channel.publish('tree-compile-failure', {
          wcid
        });
        return;
      }
    }

    channel.publish('tree-compile-success', {
      wcid,
      imports: [],
      tree: {}
    });
  }
});

// 重新创建编译上下文
channel.subscribe('vite-reload-request', async({ reqId, wcid }) => {
  const compileContext = compileContexts.get(wcid);
  if (compileContext) {
    compileContexts.delete(compileContext);
    compileContext.server.close();

    const { wc } = compileContext;
    try {
      const { pkgJson, parseError } = genPkgJson(wc.tree);
      const projectInfo = await genProjectInfo(wc.tree, pkgJson, wcid);
      const compileContext = await createCompileContext(projectInfo, wc, parseError);
      compileContexts.set(wcid, compileContext);
    } catch (err) {
      sendCompileError(channel, err, wcid);
    }
  }

  channel.publish('vite-reload-response', {
    reqId,
    result: {}
  });
});

// 根据 service worker 捕获的请求编译对应代码并返回
channel.subscribe('serve-request', async({ reqId, pathname, rawUrl, accept }) => {
  // 当 path 以 / 结尾时，则均指向 index.html
  if (pathname.endsWith('/')) {
    pathname = '/index.html';
    accept = 'text/html';
  }

  // test
  if (pathname.endsWith('/d2c') || pathname.endsWith('/user/:userId')) {
    pathname = '/index.html';
    accept = 'text/html';
  }

  let result = {};

  try {
    const compileContext = compileContexts.get(wcid);
    if (!compileContext) {
      throw new Error('Vite server not yet started');
    }
    const { server, wc, initError } = compileContext;
    const html = accept?.includes('text/html');
    let code;

    // strip ?import
    pathname = removeImportQuery(pathname);
    // Strip valid id prefix. This is prepended to resolved Ids that are
    // not valid browser import specifiers by the importAnalysis plugin.
    pathname = unwrapId(pathname);
    // for CSS, we need to differentiate between normal CSS requests and
    // imports
    if (isCSSRequest(pathname) && accept?.includes('text/css')) {
      pathname = injectQuery(pathname, 'direct');
    }

    let contentType;

    if (isDirectCSSRequest(pathname)) {
      contentType = 'text/css';
    } else if (html) {
      contentType = 'text/html';
    } else if (accept?.includes('image/')) {
      contentType = getImageContentType(pathname);
    } else {
      contentType = 'application/javascript';
    }

    if (initError && pathname !== '/@vite/client') {
      code = genErrorHtmlCode(channel, contentType, initError, wcid);
    } else {
      let path = pathname;
      try {
        if (html) {
          // 从被构建的前端应用源码中查找对应文件，如果存在则编译该文件
          path = findPathName(path, Object.keys(wc.tree));
          if (path) {
            code = await server.transformIndexHtml(path, wc.tree[path]);
          } else if (pathname.startsWith('/@virtual/')) {
            code = await server.transformIndexHtml(pathname, '');
          }
        } else if (contentType.startsWith('image/')) {
          const ret = fs.readFileSync(`${compileContext.cfg.root}${path}`, 'utf8');
          code = ret.buffer || ret;
        } else {
          // transformRequest 从 vite 中获取
          const ret = await transformRequest(pathname, server, { html });
          code = ret?.code; 
        }
      } catch (err) {
        enhanceErrorInfo(err, wc.tree, path, pathname),
        server.ws.send({
          type: 'error',
          err
        });
        if (contentType !== 'text/css') {
          code = genErrorHtmlCode(channel, contentType, err, wcid);
        }
      }
    }

    if (code) {
      const viteCache = await caches.open('vite');
      await viteCache.put(new Request(rawUrl), new Response(code, {
        headers: { 
          'Content-Type': contentType
        }
      }));

      result = {
        cache: true,
        url: pathname
      };
    } else {
      result = {
        notfound: true,
        url: pathname
      };
    }
  } catch (error) {
    console.log(error);
    result = {
      error: error.message,
      url: pathname
    };
  }

  channel.publish('serve-response', {
    reqId,
    result
  });
});
