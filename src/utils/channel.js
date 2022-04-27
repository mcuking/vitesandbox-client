class Channel {
  constructor(channelName) {
    this.channelName = channelName;
    this.listeners = new Map();
    this.broadcastChannel = new BroadcastChannel(channelName);
    this.broadcastChannel.addEventListener('message', this.onEvent.bind(this));
  }

  subscribe(type, callback) {
    let callbacks = this.listeners.get(type);

    if (!callbacks) {
      callbacks = new Set();
      this.listeners.set(type, callbacks);
    }

    callbacks.add(callback);

    return () => {
      const callbacks = this.listeners.get(type);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  request(originType = 'serve-request', data) {
    const reqId = Date.now().toString(36);
    const type = originType.toString().replace('request', 'response');

    return new Promise(resolve => {
      const clear = this.subscribe(type, response => {
        if (response.reqId === reqId) {
          clear();
          delete response.reqId;
          resolve(response.result);
        }
      });

      this.publish(originType, { ...data, reqId });
    });
  }

  publish(type, data) {
    this.broadcastChannel.postMessage({
      type,
      data
    });
  }

  onEvent(event) {
    this.notifyListeners(event.data.type, event.data.data);
  }

  notifyListeners(type, data) {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      callbacks.forEach(callback=>{
        try {
          callback(data);
        } catch (err) {
          console.error(err);
        }
      });
    }
  }
}

export default Channel;
