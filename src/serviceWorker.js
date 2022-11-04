import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import Channel from '$utils/channel';

const ChannelMap = new Map();

registerRoute(
  /^https?:\/\/[^]*\/([^/]{32})\/vite\/([^/]*)(\/.*)$/,
  async ({ request, url, params }) => {
    const [ busid, wcid, pathname ] = params;
    const { href } = url;
    
    let channel = ChannelMap.get(busid);
    if (!channel) {
      channel = new Channel(busid);
      ChannelMap.set(busid, channel);
    }
    const res = await channel.request('serve-request', {
      wcid,
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

registerRoute(
  /^https:\/\/mcuking\.github\.io\/vitesandbox-client\/static\/js\//,
  new CacheFirst({
    cacheName: 'vite-static-root-cache',
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 day
        maxEntries: 500
      })
    ]
  })
);

registerRoute(
  /^https:\/\/esm\.sh/,
  new CacheFirst({ 
    cacheName: 'vite-dependency-files-cache',
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 day
        maxEntries: 500
      })
    ]
  })
);
