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

const ASK_APPS_MESSAGE = {
  autor: 'bot',
  message: 'Quais apps serão permitidos? Use o botão abaixo para selecioná-los.',
  action: 'select_allowed_apps',
};

describe('ChatbotWs allowed apps', () => {
  let transport: FakeTransport;
  let ws: ChatbotWs;

  beforeEach(() => {
    useChatbotStore.getState().resetChatbot();
    transport = new FakeTransport();
    ws = new ChatbotWs(useChatbotStore, 'ws://test', () => transport);
    ws.connect();
  });

  const askForApps = (key = 'messages.askAllowedApps') => {
    transport.receive({ event: 'bot_message', key });
    transport.receive({ event: 'open_allowed_apps' });
  };

  it('puts the button on the bot question instead of opening the modal', () => {
    askForApps();

    const state = useChatbotStore.getState();
    expect(state.isAllowedAppsRequested).toBe(true);
    expect(state.isAllowedAppsModalOpen).toBe(false);
    expect(state.messages.at(-1)).toEqual(ASK_APPS_MESSAGE);
  });

  it('moves the button to the newest request', () => {
    askForApps();
    askForApps('errors.typedApps');

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
    expect(state.messages.at(-1)).toEqual(ASK_APPS_MESSAGE);
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

describe('ChatbotWs choices', () => {
  let transport: FakeTransport;
  let ws: ChatbotWs;

  beforeEach(() => {
    useChatbotStore.getState().resetChatbot();
    transport = new FakeTransport();
    ws = new ChatbotWs(useChatbotStore, 'ws://test', () => transport);
    ws.connect();
  });

  const OS_CHOICES = [{ key: 'choices.android', value: 'android' }, { key: 'choices.ios', value: 'ios' }];
  const YES_NO = [{ key: 'choices.yes', value: 'yes' }, { key: 'choices.no', value: 'no' }];

  it('translates the bot message and its params', () => {
    transport.receive({ event: 'bot_message', key: 'messages.askVersion', params: { os: 'iOS', example: '17.4' } });

    expect(useChatbotStore.getState().messages.at(-1)?.message).toBe('Qual a versão do iOS? (ex.: 17.4)');
  });

  it('formats the summary', () => {
    const summary = { os: 'Android', version: '14', privateDnsHost: null, installOs: 'Linux' };
    transport.receive({ event: 'bot_message', key: 'messages.confirm', params: { summary } });

    expect(useChatbotStore.getState().messages.at(-1)?.message).toBe(
      'Confira os dados:\n  Sistema: Android\n  Versão: 14\n  DNS privado: não\n' +
        '  Instalação USB a partir de: Linux\nEstá correto?',
    );
  });

  it('translates the choice labels', () => {
    transport.receive({ event: 'bot_message', key: 'messages.askDns' });
    transport.receive({ event: 'ask_choice', choices: YES_NO });

    expect(useChatbotStore.getState().messages.at(-1)?.choices).toEqual([
      { label: 'Sim', value: 'yes' },
      { label: 'Não', value: 'no' },
    ]);
  });

  it('puts the buttons on the bot question', () => {
    transport.receive({ event: 'bot_message', key: 'messages.askOs' });
    transport.receive({ event: 'ask_choice', choices: OS_CHOICES });

    const state = useChatbotStore.getState();
    expect(state.isChoiceRequested).toBe(true);
    expect(state.messages.at(-1)).toEqual({
      autor: 'bot',
      message: 'Qual o sistema operacional do celular?',
      action: 'choice',
      choices: [{ label: 'Android', value: 'android' }, { label: 'iOS', value: 'ios' }],
    });
  });

  it('takes the buttons off the previous question', () => {
    transport.receive({ event: 'bot_message', key: 'messages.askOs' });
    transport.receive({ event: 'ask_choice', choices: OS_CHOICES });
    transport.receive({ event: 'bot_message', key: 'messages.askAllowedApps' });
    transport.receive({ event: 'open_allowed_apps' });

    expect(useChatbotStore.getState().messages[0]).toEqual({ autor: 'bot', message: 'Qual o sistema operacional do celular?' });
  });

  it('ends the request once answered', () => {
    transport.receive({ event: 'bot_message', key: 'messages.askOs' });
    transport.receive({ event: 'ask_choice', choices: OS_CHOICES });

    expect(ws.sendMessage('android', 'Android')).toBe(true);

    expect(transport.sent).toEqual([{ event: 'user_message', message: 'android' }]);
    expect(useChatbotStore.getState().messages.at(-1)).toEqual({ autor: 'user', message: 'Android' });
    expect(useChatbotStore.getState().isChoiceRequested).toBe(false);
  });
});

describe('ChatbotWs restart', () => {
  let transport: FakeTransport;
  let ws: ChatbotWs;

  beforeEach(() => {
    useChatbotStore.getState().resetChatbot();
    transport = new FakeTransport();
    ws = new ChatbotWs(useChatbotStore, 'ws://test', () => transport);
    ws.connect();
  });

  it('puts the button on the final message', () => {
    transport.receive({ event: 'bot_message', key: 'messages.finished' });
    transport.receive({ event: 'offer_restart' });

    const state = useChatbotStore.getState();
    expect(state.isRestartOffered).toBe(true);
    expect(state.messages.at(-1)).toEqual({
      autor: 'bot',
      message: 'Esta conversa terminou. Use "Resetar" para começar outra.',
      action: 'restart',
    });
  });

  it('clears the board and asks for a new conversation', () => {
    transport.receive({ event: 'bot_message', key: 'messages.finished' });
    transport.receive({ event: 'offer_restart' });

    expect(ws.restart()).toBe(true);

    expect(transport.sent).toEqual([{ event: 'restart' }]);
    const state = useChatbotStore.getState();
    expect(state.messages).toEqual([]);
    expect(state.isRestartOffered).toBe(false);
    expect(state.isBotTyping).toBe(true);
  });
});

describe('ChatbotWs installer', () => {
  let transport: FakeTransport;
  let ws: ChatbotWs;
  let downloads: string[];
  let token: string | undefined;

  beforeEach(() => {
    useChatbotStore.getState().resetChatbot();
    transport = new FakeTransport();
    downloads = [];
    token = 'user-token';
    ws = new ChatbotWs(useChatbotStore, 'ws://test', () => transport, (url) => downloads.push(url), async () => token);
    ws.connect();
  });

  it('asks the bot for the installer with the user token', async () => {
    expect(await ws.generateInstaller()).toBe(true);

    expect(transport.sent).toEqual([{ event: 'generate_installer', token: 'user-token' }]);
    expect(useChatbotStore.getState().isBotTyping).toBe(true);
  });

  it('asks without a token when logged out', async () => {
    token = undefined;
    await ws.generateInstaller();
    expect(transport.sent).toEqual([{ event: 'generate_installer' }]);
  });

  it('downloads it once ready', async () => {
    await ws.generateInstaller();
    transport.receive({ event: 'bot_message', key: 'messages.installerReady' });
    transport.receive({ event: 'installer_ready', url: '/executable/executables/abc' });

    expect(downloads).toEqual(['/executable/executables/abc']);
    expect(useChatbotStore.getState().isBotTyping).toBe(false);
    expect(useChatbotStore.getState().messages.at(-1)?.message).toBe('Instalador gerado! O download vai começar em instantes.');
  });
});

describe('ChatbotWs send state', () => {
  let transport: FakeTransport;

  beforeEach(() => {
    useChatbotStore.getState().resetChatbot();
    transport = new FakeTransport();
    new ChatbotWs(useChatbotStore, 'ws://test', () => transport).connect();
  });

  it('starts with sending disabled', () => {
    expect(useChatbotStore.getState().isSendEnabled).toBe(false);
  });

  it('follows the sendEnabled param of the bot messages', () => {
    transport.receive({ event: 'bot_message', key: 'messages.askVersion', params: { os: 'iOS', example: '17.4' }, sendEnabled: true });
    expect(useChatbotStore.getState().isSendEnabled).toBe(true);

    transport.receive({ event: 'bot_message', key: 'messages.askDns', sendEnabled: false });
    expect(useChatbotStore.getState().isSendEnabled).toBe(false);
  });
});
