const sourceCode = {
  '/preview/index.html': {
    code: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <link rel="icon" href="data:image/ico;base64,aWNv">
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Vite App</title>
      </head>
      <body>
        <div id="root">你好啊 index.html</div>
        <script type="module" src="/preview/src/index.js"></script>
      </body>
      </html>`,
    contentType: 'text/html;charset=UTF-8'
  },
  '/preview/src/index.js': {
    code: `
      setTimeout(() => {
        alert('我是被拦截的 index.js');
      }, 1000);
    `,
    contentType: 'text/javascript;charset=UTF-8'
  }
};

export default sourceCode;
