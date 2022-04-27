import Channel from '$utils/channel';
import { busid } from '$utils/constant';

let sourceCode;

onmessage = ({ data }) => {
  sourceCode = data;
};

const channel = new Channel(busid);

// 根据 service worker 捕获的请求编译对应代码并返回
channel.subscribe('serve-request', async({ reqId, pathname, rawUrl }) => {
  let result = {};

  try {
    if (sourceCode[pathname]) {
      const viteCache = await caches.open('vite');

      await viteCache.put(new Request(rawUrl), new Response(sourceCode[pathname].code, {
        headers: {
          'Content-Type': sourceCode[pathname].contentType
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
