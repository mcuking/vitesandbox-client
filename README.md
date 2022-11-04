## ViteSandbox

An Online Vite Sandbox that compiles web projects based on [browser-vite](https://github.com/divriots/browser-vite)

You can try ViteSandbox in the page: 

https://mcuking.github.io/vitesandbox-client-example/

![image](https://p5.music.126.net/obj/wo3DlcOGw6DClTvDisK1/21563423527/5b7e/3c08/04c9/43ccb28711508866358d16ecbf537db2.png)

### Usage

Usage Example Code:

```js
import Sandbox from './sandbox';

const files = {
  '/package.json': JSON.stringify(packageJson),
  '/index.html': htmlCode,
  '/src/index.js': entryCode,
  '/src/index.less': lessCode,
  '/src/App.js': appCode,
};

<Sandbox
  bundlerURL="https://mcuking.github.io/vitesandbox-client/"
  files={files} />
```

For more details, please check this repo: https://github.com/mcuking/vitesandbox-client-example

### Architecture

<img src="https://p6.music.126.net/obj/wo3DlcOGw6DClTvDisK1/14157639156/bad1/9f64/f6cd/7db732aac361163527b82be5342125d5.png" width=800/>

### Article

[搭建一个浏览器版 Vite 沙箱](https://github.com/mcuking/blog/issues/111)
