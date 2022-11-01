self.onmessage = async (e) => {
  const data = e.data;
  switch (data.cmd) {
  case 'init':
    self.busid = data.payload.busid;
    self.wcid = data.payload.wcid;
    await import('./vite/index.js');
    self.postMessage({
      cmd: 'ready'
    });
    break;
  }
};
