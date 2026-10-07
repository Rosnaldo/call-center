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

  const askForApps = (message = 'Which apps are allowed?') => {
    transport.receive({ event: 'bot_message', message });
    transport.receive({ event: 'open_allowed_apps' });
  };

  it('puts the button on the bot question instead of opening the modal', () => {
    askForApps();

    const state = useChatbotStore.getState();
    expect(state.isAllowedAppsRequested).toBe(true);
    expect(state.isAllowedAppsModalOpen).toBe(false);
    expect(state.messages.at(-1)).toEqual({ autor: 'bot', message: 'Which apps are allowed?', action: 'select_allowed_apps' });
  });

  it('moves the button to the newest request', () => {
    askForApps();
    askForApps('Please use the button to select the allowed apps.');

    const actions = useChatbotStore.getState().messages.map((m) => m.action);
    expect(actions).toEqual([undefined, 'select_allowed_apps']);
  });

  it('sends the picked list and ends the request', () => {
    askForApps();
    useChatbotStore.getState().openAllowedAppsModal();

    expect(ws.sendAllowedApps(['com.whatsapp'])).toBe(true);

    expect(transport.sent).toEqual([{ event: 'allowed_apps', apps: ['com.whatsapp'] }]);
    const state = useChatbotStore.getState();
    expect(state.isAllowedAppsModalOpen).toBe(false);
    expect(state.isAllowedAppsRequested).toBe(false);
    expect(state.messages.at(-1)).toEqual({ autor: 'user', message: 'com.whatsapp' });
  });

  it('sends the normalized term and stores matching results only', () => {
    askForApps();

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
