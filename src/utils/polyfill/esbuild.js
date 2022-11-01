import * as esbuild from 'esbuild-wasm';

let initializePromise;

function initialize() {
  if (!initializePromise) {
    initializePromise = esbuild.initialize({
      worker: typeof Worker != 'undefined',
      wasmURL: 'https://www.unpkg.com/esbuild-wasm@0.14.47/esbuild.wasm' // todo: version
    });
  }
  return initializePromise;
}

function build(e) {
  return initialize().then(() => esbuild.build(e));
}

function transform(e, r) {
  return initialize().then(() => esbuild.transform(e, r));
}

function formatMessages(e, r) {
  return initialize().then(() => esbuild.formatMessages(e, r));
}

function startService() {
  return initialize().then(() => ({
    transform: esbuild.transform,
    build: esbuild.build
  }));
}

export {
  build,
  transform,
  formatMessages,
  startService
};
