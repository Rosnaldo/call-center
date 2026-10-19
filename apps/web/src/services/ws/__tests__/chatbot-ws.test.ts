import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatbotWs, formatSummary, translateBotText } from '../chatbot-ws.ts';
import { ITransport, TRANSPORT_OPEN } from '../transport.ts';
import { useChatbotParamsStore, useChatbotStore } from '../../../states/stores.ts';

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
  text: { key: 'messages.askAllowedApps' },
  action: 'select_allowed_apps',
};

describe('ChatbotWs allowed apps', () => {
  let transport: FakeTransport;
  let ws: ChatbotWs;

  beforeEach(() => {
    useChatbotStore.getState().resetChatbot();
    transport = new FakeTransport();
    ws = new ChatbotWs(useChatbotStore, useChatbotParamsStore, 'ws://test', () => transport);
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
    ws = new ChatbotWs(useChatbotStore, useChatbotParamsStore, 'ws://test', () => transport);
    ws.connect();
  });

  const OS_CHOICES = [{ key: 'choices.android', value: 'android' }, { key: 'choices.ios', value: 'ios' }];
  const YES_NO = [{ key: 'choices.yes', value: 'yes' }, { key: 'choices.no', value: 'no' }];

  it('translates the bot message and its params', () => {
    transport.receive({ event: 'bot_message', key: 'messages.askVersion', params: { os: 'iOS', example: '17.4' } });

    expect(useChatbotStore.getState().messages.at(-1)?.message).toBe('Qual a versão do iOS? (ex.: 17.4)');
  });

  it('formats the summary', () => {
    const summary = { os: 'Android', version: '14', privateDnsHost: null, installOs: 'Linux', appVersion: '1.0.0' };

    expect(formatSummary(summary)).toBe(
      '  Sistema: Android\n  Versão: 14\n  DNS privado: não\n' +
        '  Instalação USB a partir de: Linux\n  Versão da configuração: 1.0.0',
    );
  });

  it('offers the installer once finished, without listing the data', () => {
    const summary = { os: 'Android', version: '14', privateDnsHost: null, installOs: 'Linux', appVersion: '1.0.0' };
    transport.receive({ event: 'bot_message', key: 'messages.done', params: { summary } });

    expect(useChatbotStore.getState().messages.at(-1)?.message).toBe(
      'Gerar instalador do celular para configurar ambiente Device Owner.\nLembre-se de formatar o celular antes de executar o instalador.',
    );
  });

  it('asks to check the summary before confirming, without listing the data', () => {
    const summary = { os: 'Android', version: '14', privateDnsHost: null, installOs: 'Linux', appVersion: '1.0.0' };
    transport.receive({ event: 'bot_message', key: 'messages.confirm', params: { summary } });

    expect(useChatbotStore.getState().messages.at(-1)?.message).toBe('Confira o resumo antes de prosseguir.');
  });

  it('translates the choice labels', () => {
    transport.receive({ event: 'bot_message', key: 'messages.askDns' });
    transport.receive({ event: 'ask_choice', choices: YES_NO });

    expect(useChatbotStore.getState().messages.at(-1)?.choices).toEqual([
      { label: 'Sim', value: 'yes', key: 'choices.yes' },
      { label: 'Não', value: 'no', key: 'choices.no' },
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
      text: { key: 'messages.askOs' },
      action: 'choice',
      choices: [
        { label: 'Android', value: 'android', key: 'choices.android' },
        { label: 'iOS', value: 'ios', key: 'choices.ios' },
      ],
    });
  });

  it('takes the buttons off the previous question', () => {
    transport.receive({ event: 'bot_message', key: 'messages.askOs' });
    transport.receive({ event: 'ask_choice', choices: OS_CHOICES });
    transport.receive({ event: 'bot_message', key: 'messages.askAllowedApps' });
    transport.receive({ event: 'open_allowed_apps' });

    expect(useChatbotStore.getState().messages[0]).toEqual({
      autor: 'bot',
      message: 'Qual o sistema operacional do celular?',
      text: { key: 'messages.askOs' },
    });
  });

  it('ends the request once answered', async () => {
    transport.receive({ event: 'bot_message', key: 'messages.askOs' });
    transport.receive({ event: 'ask_choice', choices: OS_CHOICES });

    expect(ws.sendMessage('android', 'Android')).toBe(true);

    await vi.waitFor(() => expect(transport.sent).toEqual([{ event: 'user_message', message: 'android' }]));
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
    ws = new ChatbotWs(useChatbotStore, useChatbotParamsStore, 'ws://test', () => transport);
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
      text: { key: 'messages.finished' },
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
    expect(state.botActivity).toBe('processing');
  });
});

describe('ChatbotWs installer', () => {
  let transport: FakeTransport;
  let ws: ChatbotWs;
  let token: string | undefined;

  beforeEach(() => {
    useChatbotStore.getState().resetChatbot();
    transport = new FakeTransport();
    token = 'user-token';
    ws = new ChatbotWs(useChatbotStore, useChatbotParamsStore, 'ws://test', () => transport, async () => token);
    ws.connect();
  });

  it('asks the bot for the installer with the user token', async () => {
    expect(await ws.generateInstaller()).toBe(true);

    expect(transport.sent).toEqual([{ event: 'generate_installer', token: 'user-token' }]);
    expect(useChatbotStore.getState().isBotTyping).toBe(true);
    expect(useChatbotStore.getState().botActivity).toBe('generating');
  });

  it('shows processing again for the next message', async () => {
    await ws.generateInstaller();
    transport.receive({ event: 'bot_message', key: 'messages.loginRequired', sendEnabled: false });
    ws.sendMessage('oi');

    expect(useChatbotStore.getState().botActivity).toBe('processing');
  });

  it('sends messages with the user token, in order', async () => {
    ws.sendMessage('proceed');
    ws.sendMessage('android');
    await vi.waitFor(() =>
      expect(transport.sent).toEqual([
        { event: 'user_message', message: 'proceed', token: 'user-token' },
        { event: 'user_message', message: 'android', token: 'user-token' },
      ]),
    );
  });

  it('asks without a token when logged out', async () => {
    token = undefined;
    await ws.generateInstaller();
    expect(transport.sent).toEqual([{ event: 'generate_installer' }]);
  });

  it('puts a download button on the ready message instead of auto-downloading', async () => {
    await ws.generateInstaller();
    transport.receive({ event: 'bot_message', key: 'messages.installerReady' });
    transport.receive({ event: 'installer_ready', url: '/executable/executables/abc' });

    const last = useChatbotStore.getState().messages.at(-1);
    expect(last?.action).toBe('download_installer');
    expect(last?.installerUrl).toBe('/executable/executables/abc');
    expect(useChatbotStore.getState().isBotTyping).toBe(false);
    expect(last?.message).toBe('Instalador gerado! Clique no botão abaixo para baixar.');
  });
});

describe('ChatbotWs send state', () => {
  let transport: FakeTransport;

  beforeEach(() => {
    useChatbotStore.getState().resetChatbot();
    transport = new FakeTransport();
    new ChatbotWs(useChatbotStore, useChatbotParamsStore, 'ws://test', () => transport).connect();
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

describe('ChatbotWs params', () => {
  let transport: FakeTransport;

  beforeEach(() => {
    useChatbotStore.getState().resetChatbot();
    transport = new FakeTransport();
    new ChatbotWs(useChatbotStore, useChatbotParamsStore, 'ws://test', () => transport).connect();
  });

  it('stores the params without touching the typing state', () => {
    const params = {
      os: 'Android',
      version: '14',
      privateDns: null,
      privateDnsHost: null,
      allowedApps: null,
      installOs: null,
      appVersion: null,
      blockRawIp: null,
      blockedTerms: null,
    };
    useChatbotStore.getState().setBotTyping(true);

    transport.receive({ event: 'params', params });

    const state = useChatbotStore.getState();
    expect(useChatbotParamsStore.getState().params).toEqual(params);
    expect(state.isBotTyping).toBe(true);
    expect(state.messages).toEqual([]);
  });
});

describe('ChatbotWs blocked terms', () => {
  let transport: FakeTransport;
  let ws: ChatbotWs;

  beforeEach(() => {
    useChatbotStore.getState().resetChatbot();
    transport = new FakeTransport();
    ws = new ChatbotWs(useChatbotStore, useChatbotParamsStore, 'ws://test', () => transport);
    ws.connect();
  });

  const askForTerms = () => {
    transport.receive({ event: 'bot_message', key: 'messages.collectBlockedTerms' });
    transport.receive({ event: 'open_blocked_terms' });
  };

  it('puts the button on the bot question instead of opening the modal', () => {
    askForTerms();

    const state = useChatbotStore.getState();
    expect(state.isBlockedTermsRequested).toBe(true);
    expect(state.isBlockedTermsModalOpen).toBe(false);
    expect(state.messages.at(-1)?.action).toBe('add_blocked_terms');
  });

  it('sends the words and ends the request', () => {
    askForTerms();
    useChatbotStore.getState().openBlockedTermsModal();

    expect(ws.sendBlockedTerms(['semi', 'bokup'])).toBe(true);

    expect(transport.sent).toEqual([{ event: 'blocked_terms', terms: ['semi', 'bokup'] }]);
    const state = useChatbotStore.getState();
    expect(state.isBlockedTermsModalOpen).toBe(false);
    expect(state.isBlockedTermsRequested).toBe(false);
    expect(state.isBotTyping).toBe(true);
  });
});

describe('ChatbotWs app schedules', () => {
  let transport: FakeTransport;
  let ws: ChatbotWs;

  beforeEach(() => {
    useChatbotStore.getState().resetChatbot();
    transport = new FakeTransport();
    ws = new ChatbotWs(useChatbotStore, useChatbotParamsStore, 'ws://test', () => transport);
    ws.connect();
  });

  const askForSchedules = () => {
    transport.receive({ event: 'bot_message', key: 'messages.askAppSchedules' });
    transport.receive({ event: 'open_app_schedules' });
  };

  it('puts the button on the bot question instead of opening the modal', () => {
    askForSchedules();

    const state = useChatbotStore.getState();
    expect(state.isAppSchedulesRequested).toBe(true);
    expect(state.isAppSchedulesModalOpen).toBe(false);
    expect(state.messages.at(-1)?.action).toBe('set_app_schedules');
  });

  it('sends the schedules and ends the request', () => {
    askForSchedules();
    useChatbotStore.getState().openAppSchedulesModal();
    const schedules = { 'com.whatsapp': { mon: [{ start: '08:00', end: '12:00' }] } };

    expect(ws.sendAppSchedules(schedules)).toBe(true);

    expect(transport.sent).toEqual([{ event: 'app_schedules', schedules }]);
    const state = useChatbotStore.getState();
    expect(state.isAppSchedulesModalOpen).toBe(false);
    expect(state.isAppSchedulesRequested).toBe(false);
    expect(state.isBotTyping).toBe(true);
  });
});

describe('translateBotText noted params', () => {
  it('shows what the bot read from free text, one line each', () => {
    const text = translateBotText({
      key: 'messages.noted',
      params: { noted: { os: 'iOS', privateDnsHost: 'dns.google', blockRawIp: false, blockedTerms: [] } },
    });
    expect(text).toBe('Anotei:\n  Sistema: iOS\n  DNS privado: dns.google\n  Bloquear IP direto: não\n  Palavras bloqueadas: nenhuma');
  });
});

describe('ChatbotWs saved params', () => {
  const PARAMS = {
    os: 'Android', version: '14', privateDns: false, privateDnsHost: null, allowedApps: ['com.whatsapp'],
    installOs: 'Linux', appVersion: '1.0.0', blockRawIp: false, blockedTerms: [],
  };
  let transport: FakeTransport;
  let ws: ChatbotWs;

  beforeEach(() => {
    localStorage.clear();
    useChatbotParamsStore.setState({ params: null, savedParams: null });
    useChatbotStore.getState().resetChatbot();
    transport = new FakeTransport();
    ws = new ChatbotWs(useChatbotStore, useChatbotParamsStore, 'ws://test', () => transport);
    ws.connect();
  });

  it('keeps the params of a finished conversation, in the store and localStorage', () => {
    transport.receive({ event: 'params', params: { ...PARAMS, appVersion: null } });
    expect(JSON.parse(localStorage.getItem('chatbot.params')!).state).toEqual({ savedParams: null });

    transport.receive({ event: 'bot_message', key: 'messages.done', sendEnabled: false });
    transport.receive({ event: 'offer_restart' });
    transport.receive({ event: 'params', params: PARAMS });

    // Only the kept params are persisted, not the conversation's.
    expect(JSON.parse(localStorage.getItem('chatbot.params')!).state).toEqual({ savedParams: PARAMS });
    expect(useChatbotParamsStore.getState().savedParams).toEqual(PARAMS);
    // A new conversation keeps them, to offer them again.
    ws.restart();
    expect(useChatbotParamsStore.getState().savedParams).toEqual(PARAMS);
  });

  it('sends the kept params on connecting and after a restart', () => {
    useChatbotParamsStore.setState({ savedParams: PARAMS });
    transport.onopen?.({} as Event);
    expect(transport.sent).toEqual([{ event: 'saved_params', params: PARAMS }]);

    ws.restart();
    expect(transport.sent.slice(1)).toEqual([{ event: 'restart' }, { event: 'saved_params', params: PARAMS }]);
  });

  it('sends nothing without kept params', () => {
    transport.onopen?.({} as Event);
    expect(transport.sent).toEqual([]);
  });
});

