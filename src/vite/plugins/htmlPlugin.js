import { genSandboxConfigJson, setDomainCode, genImportMap, initDeps } from '$utils';

export function resourceIsCss(resource) {
  // 兼容 url 带 search 的情况
  // 例如：https://xxx/sandbox.base.css?v=0
  const pathname = new URL(resource).pathname;
  const match = pathname.match(/\.([^.]*)$/);

  return (match && match[1] === 'css') || resource.includes('fonts.googleapis');
}

const htmlPlugin = ({ tree }) => ({
  name: 'vite:html:transform',
  transformIndexHtml: {
    enforce: 'pre',
    transform(html) {
      const deps = {};
      // 基于 package.json 的 dependencies 初始化 deps 对象
      initDeps(tree, deps);

      // 默认注入修改 domain 的 js 代码
      const tags = [
        {
          tag: 'script',
          attrs: {
            type: 'importmap'
          },
          children: genImportMap(deps)
        },
        {
          tag: 'script',
          attrs: {
            type: 'text/javascript'
          },
          children: setDomainCode
        }
      ];
  
      // 通过 sandbox.config.json 注入的 js 代码
      const { sandboxConfigJson, parseError } = genSandboxConfigJson(tree);
      if (!parseError) {
        if (sandboxConfigJson.evaluateJavaScript) {
          tags.push({
            tag: 'script',
            attrs: {
              type: 'text/javascript'
            },
            children: sandboxConfigJson.evaluateJavaScript
          });
        }
        
        if (sandboxConfigJson.externalResources && Array.isArray(sandboxConfigJson.externalResources)) {
          sandboxConfigJson.externalResources.forEach((resource) => {
            if (resourceIsCss(resource)) {
              tags.push({
                tag: 'link',
                attrs: {
                  id: 'external-css',
                  rel: 'stylesheet',
                  type: 'text/css',
                  href: resource,
                  media: 'all'
                }
              });
            } else {
              tags.push({
                tag: 'script',
                attrs: {
                  id: 'external-js',
                  async: false,
                  src: resource
                }
              });
            }
          });
        }
      }

      return {
        html,
        tags
      };
    }
  }
});

export default htmlPlugin;
