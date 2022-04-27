import { Workbox } from 'workbox-window';
import sourceCode from '$utils/source-code';

// 初始化运行 vite 的 web worker，用于编译 service worker 拦截的被构建应用的页面请求对应的代码
const viteWorker = new Worker('/vite-worker.js', { type: 'module' });
viteWorker.postMessage(sourceCode);  

// 初始化 service worker 并创建 iframe 用于加载被构建应用的页面
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    const wb = new Workbox('/service-worker.js',{
      updateViaCache: 'none',
      type: 'module'
    });

    wb.register().then(() => {
      const iframe = document.createElement('iframe');
      iframe.src = '/preview/index.html';
      iframe.setAttribute('style', 'width: 100%; height: 100%; border: 0; outline: 0;');
      document.body.appendChild(iframe);
    });
  });
}
