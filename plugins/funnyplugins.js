const imasigma = {
  id: 'imasigma',
  name: 'Im a sigma',
  description: `Let's every one of your messages know that you're a sigma`,
  origFetch: null,
  start() {
    if (!this.origFetch) this.origFetch = window.fetch;
    const origFetch = this.origFetch;

    window.fetch = function (input, init) {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      const isInsert = url.indexOf('/rest/v1/messages') !== -1
                    && init && init.method === 'POST';
      if (isInsert && init.body) {
        try {
          const body = JSON.parse(init.body);
          if (typeof body.content === 'string') {
            body.content = body.content + ` \n* (I'm a sigma)`;
            init.body = JSON.stringify(body);
          }
        } catch (e) {}
      }
      return origFetch.call(this, input, init);
    };
  },
  stop() {
    if (this.origFetch) {
      window.fetch = this.origFetch;
      this.origFetch = null;
    }
  },
};
const SIXSEVEN = {
  id: 'SIXSEVEN',
  name: 'SIXSEVEN',
  description: 'HIHI S-S-SIXSEVENNs (makes every message you send have 67)',
  origFetch: null,
  start() {
    if (!this.origFetch) this.origFetch = window.fetch;
    const origFetch = this.origFetch;

    window.fetch = function (input, init) {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      const isInsert = url.indexOf('/rest/v1/messages') !== -1
                    && init && init.method === 'POST';
      if (isInsert && init.body) {
        try {
          const body = JSON.parse(init.body);
          if (typeof body.content === 'string') {
            body.content = body.content + ' 67';
            init.body = JSON.stringify(body);
          }
        } catch (e) {}
      }
      return origFetch.call(this, input, init);
    };
  },
  stop() {
    if (this.origFetch) {
      window.fetch = this.origFetch;
      this.origFetch = null;
    }
  },
};


PluginHost.register(SIXSEVEN);
PluginHost.register(imasigma);