import { Workbox } from 'workbox-window';
import Channel from '$utils/channel';
import MD5 from 'crypto-js/md5';

class SandboxClient {
  constructor(code, busid, wcid) {
    this.channel = new Channel(busid);

    // 初始化运行 vite 的 web worker，用于编译 service worker 拦截的被构建应用的页面请求对应的代码
    const viteWorker = new Worker(new URL('./viteWorker.js', import.meta.url), {
      name: 'viteWorker'
    });

    viteWorker.onmessage = (event) => {
      const data = event.data;
      switch (data.cmd) {
      case 'ready': {
        // vite worker 完成代码加载后，向 vite worker 传递被构建应用的源码
        this.channel.request('tree-compilation-request', {
          compiler_type: 'vite',
          tree: code
        });
        break;
      }
      case 'compile-context-inited': {
        // vite worker 初始化编译环境后，动态创建 iframe 用于加载被构建应用的页面
        const iframe = document.createElement('iframe');
        iframe.src = `./${busid}/vite/${wcid}/`;
        iframe.id = 'inner-sandbox-container';
        iframe.setAttribute('style', 'width: 100%; height: 100vh; border: 0; outline: 0;');
        iframe.dataset.busid = busid;
        iframe.dataset.wcid = wcid;
        document.body.appendChild(iframe);
        window.parent.postMessage({
          type: 'inner-sandbox-container-created'
        }, '*');
        break;
      }
      default:
        break;
      }
    };

    // 通知 vite worker 加载对应代码
    viteWorker.postMessage({
      cmd: 'init',
      payload: {
        busid,
        wcid
      }
    });
  }

  updatePreview(files) {
    this.channel.request('tree-compilation-request', {
      compiler_type: 'vite',
      tree: files
    });
  }
}

const isProd = window.location.protocol === 'https:';
// 初始化 service worker 并动态创建 iframe 用于加载被构建应用的页面
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    const wb = new Workbox(`${isProd ? '/vitesandbox-client' : ''}/serviceWorker.js`,{
      updateViaCache: 'none',
      type: 'module'
    });

    wb.register();
  });
}

let sandboxClient;

// 接收调用沙箱的平台传来的需要构建的项目代码
window.addEventListener('message', ({ data }) => {
  if(data?.type === 'compile-esm'){
    const { files, busid: _busid, wcid: _wcid } = data.payload;
    if (sandboxClient) {
      sandboxClient.updatePreview(files);
    } else {
      const busid = MD5(JSON.stringify(_busid) || '').toString();
      const wcid = MD5(JSON.stringify(_wcid || '')).toString();
      sandboxClient = new SandboxClient(files, busid, wcid);
    }
  }
});
