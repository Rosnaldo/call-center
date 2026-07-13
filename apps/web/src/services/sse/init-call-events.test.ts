import { describe, it, expect, vi, afterEach } from 'vitest';
import { InitCallEvents, ISseSource } from './init-call-events.ts';
import { Properties } from '../../properties.ts';
import { createStores } from '../../states/stores.ts';

afterEach(() => {
  Properties.reset();
});

// Regression test for a real bug: realtimeWsUrl can carry a trailing slash in
// prod/dev (VITE_REALTIME_WS_URL="wss://.../realtime/", proxied by nginx's
// location /realtime/call-events/). A plain template-string join produced
// ".../realtime//call-events/stream", which 404'd behind nginx (double slash
// isn't collapsed) even though the token and route were both fine — see the
// incident this test was added for. realtime now serves this stream itself
// (see apps/realtime/src/routes/call_events.ts) — IAM still publishes the
// events, but only ever over Redis, never directly to the browser — so the
// url is built from realtimeWsUrl (ws(s):// swapped for http(s)://) the same
// way init-realtime-events.ts already does for its own stream.
describe('InitCallEvents', () => {
  it('strips a trailing slash from realtimeWsUrl and swaps ws for http before building the SSE url', () => {
    Properties.override({ realtimeWsUrl: 'wss://example.com/realtime/' });
    const stores = createStores();
    const factory = vi.fn((): ISseSource => ({ onmessage: null, close: () => {} }));

    new InitCallEvents().init('tok', stores, factory);

    expect(factory).toHaveBeenCalledWith('https://example.com/realtime/call-events/stream?token=tok');
  });

  it('builds the same url when realtimeWsUrl has no trailing slash', () => {
    Properties.override({ realtimeWsUrl: 'wss://example.com/realtime' });
    const stores = createStores();
    const factory = vi.fn((): ISseSource => ({ onmessage: null, close: () => {} }));

    new InitCallEvents().init('tok', stores, factory);

    expect(factory).toHaveBeenCalledWith('https://example.com/realtime/call-events/stream?token=tok');
  });
});
