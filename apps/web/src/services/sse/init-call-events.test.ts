import { describe, it, expect, vi, afterEach } from 'vitest';
import { InitCallEvents, ISseSource } from './init-call-events.ts';
import { Properties } from '../../properties.ts';
import { createStores } from '../../states/stores.ts';

afterEach(() => {
  Properties.reset();
});

// Regression test for a real bug: backendUrl can carry a trailing slash in
// prod/dev (VITE_BACKEND_URL=".../iam/", proxied by nginx's location /iam/).
// A plain template-string join produced ".../iam//call-events/stream", which
// 404'd behind nginx (double slash isn't collapsed) even though the token
// and IAM route were both fine — see the incident this test was added for.
describe('InitCallEvents', () => {
  it('strips a trailing slash from backendUrl before building the SSE url', () => {
    Properties.override({ backendUrl: 'http://example.com/iam/' });
    const stores = createStores();
    const factory = vi.fn((): ISseSource => ({ onmessage: null, close: () => {} }));

    new InitCallEvents().init('tok', stores, factory);

    expect(factory).toHaveBeenCalledWith('http://example.com/iam/call-events/stream?token=tok');
  });

  it('builds the same url when backendUrl has no trailing slash', () => {
    Properties.override({ backendUrl: 'http://example.com/iam' });
    const stores = createStores();
    const factory = vi.fn((): ISseSource => ({ onmessage: null, close: () => {} }));

    new InitCallEvents().init('tok', stores, factory);

    expect(factory).toHaveBeenCalledWith('http://example.com/iam/call-events/stream?token=tok');
  });
});
