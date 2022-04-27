import { registerRoute } from 'workbox-routing';
import Channel from '$utils/channel';
import { busid } from '$utils/constant';

const ChannelMap = new Map();

registerRoute(
  /^https?:\/\/localhost:8888\/preview\/*/,
  async ({ request, url }) => {
    const { href, pathname } = url;
    
    let channel = ChannelMap.get(busid);
    if (!channel) {
      channel = new Channel(busid);
      ChannelMap.set(busid, channel);
    }

    const res = await channel.request('serve-request', {
      pathname: pathname.replace(/#.*$/, ''),
      rawUrl: href,
      accept: request?.headers?.get('accept')
    });

    if (res.cache) {
      const viteCache = await caches.open('vite');
      return viteCache.match(href).finally(() => viteCache.delete(href));
    }

    return res.notfound ? new Response('Not found',{
      status: 404,
      statusText: 'NOT FOUND'
    }) : new Response(res.error || 'Error',{
      status: 500,
      statusText: 'SERVER ERROR'
    });
  }
);
