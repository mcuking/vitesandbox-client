import { parse } from 'node-url';

// npm install --save node-url@npm:url

const URL = globalThis.URL;
const URLSearchParams = globalThis.URLSearchParams;

function pathToFileURL(path) {
  return new URL(path, 'file://');
}

function fileURLToPath(url) {
  if (url.protocol === 'file:') {
    return url.pathname;
  }

  throw new Error(`fileURLToPath(${url})`);
}

export {
  URL,
  URLSearchParams,
  parse,
  pathToFileURL,
  fileURLToPath
};

