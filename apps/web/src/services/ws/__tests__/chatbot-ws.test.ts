import { describe, it, expect, beforeEach } from 'vitest';
import { ChatbotWs } from '../chatbot-ws.ts';
import { ITransport, TRANSPORT_OPEN } from '../transport.ts';
import { useChatbotStore } from '../../../states/stores.ts';

class FakeTransport implements ITransport {
  readyState = TRANSPORT_OPEN;
  sent: unknown[] = [];
  onopen: ITransport['onopen'] = null;
  onmessage: ITransport['onmessage'] = null;
  onerror: ITransport['onerror'] = null;
  onclose: ITransport['onclose'] = null;
  send(data: string) { this.sent.push(JSON.parse(data)); }
  close() {}
  receive(msg: unknown) { this.onmessage?.({ data: JSON.stringify(msg) } as MessageEvent); }
}

describe('ChatbotWs allowed apps', () => {
  let transport: FakeTransport;
  let ws: ChatbotWs;

  beforeEach(() => {
    useChatbotStore.getState().resetChatbot();
    transport = new FakeTransport();
    ws = new ChatbotWs(useChatbotStore, 'ws://test', () => transport);
    ws.connect();
  });

  it('opens the modal on open_allowed_apps', () => {
    transport.receive({ event: 'open_allowed_apps' });
    expect(useChatbotStore.getState().isAllowedAppsModalOpen).toBe(true);
  });

  it('sends the picked list and closes the modal', () => {
    transport.receive({ event: 'open_allowed_apps' });

    expect(ws.sendAllowedApps(['com.whatsapp'])).toBe(true);

    expect(transport.sent).toEqual([{ event: 'allowed_apps', apps: ['com.whatsapp'] }]);
    const state = useChatbotStore.getState();
    expect(state.isAllowedAppsModalOpen).toBe(false);
    expect(state.messages.at(-1)).toEqual({ autor: 'user', message: 'com.whatsapp' });
  });

  it('sends the normalized term and stores matching results only', () => {
    transport.receive({ event: 'open_allowed_apps' });

    ws.searchApps('  Spotify ');
    expect(transport.sent).toEqual([{ event: 'search_apps', term: 'spotify' }]);
    expect(useChatbotStore.getState().appSearch.status).toBe('loading');

    const apps = [{ id: 'com.spotify.music', name: 'Spotify', iconUrl: 'https://example.test/s.png' }];
    transport.receive({ event: 'apps_search_results', term: 'spot', apps: [], failed: false }); // stale
    transport.receive({ event: 'apps_search_results', term: 'spotify', apps, failed: false });

    expect(useChatbotStore.getState().appSearch).toEqual({ term: 'spotify', results: apps, status: 'done' });
  });

  it('does not search terms the server would ignore', () => {
    ws.searchApps(' s ');
    expect(transport.sent).toEqual([]);
    expect(useChatbotStore.getState().appSearch.status).toBe('idle');
  });
});
