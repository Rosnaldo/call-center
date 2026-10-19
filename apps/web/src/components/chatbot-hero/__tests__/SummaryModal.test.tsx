import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SummaryModal } from '../SummaryModal.tsx';
import { useChatbotParamsStore, useChatbotStore } from '../../../states/stores.ts';

const EMPTY = {
  os: null,
  version: null,
  privateDns: null,
  privateDnsHost: null,
  allowedApps: null,
  installOs: null,
  appVersion: null,
  blockRawIp: null,
  blockedTerms: null,
};

describe('SummaryModal', () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => {
      useChatbotParamsStore.setState({ params: null, savedParams: null });
      useChatbotStore.getState().resetChatbot();
    });
  });

  it('shows the kept params until the conversation collects its own', () => {
    act(() => {
      useChatbotParamsStore.setState({ savedParams: { ...EMPTY, os: 'iOS', version: '17.4' } });
      useChatbotParamsStore.getState().setParams(EMPTY);
      useChatbotStore.getState().openSummaryModal();
    });
    render(<SummaryModal />);
    expect(screen.getByText('iOS')).toBeTruthy();
    expect(screen.getByText('17.4')).toBeTruthy();

    act(() => useChatbotParamsStore.getState().setParams({ ...EMPTY, os: 'Android' }));
    expect(screen.getByText('Android')).toBeTruthy();
    expect(screen.queryByText('17.4')).toBeNull();
  });

  it('renders only while the store has it open', () => {
    render(<SummaryModal />);
    expect(screen.queryByRole('dialog')).toBeNull();

    act(() => useChatbotStore.getState().openSummaryModal());
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('marks the params not answered yet', () => {
    act(() => {
      useChatbotParamsStore.getState().setParams({ ...EMPTY, os: 'Android' });
      useChatbotStore.getState().openSummaryModal();
    });
    render(<SummaryModal />);

    expect(screen.getByText('Android')).toBeTruthy();
    expect(screen.getAllByText('a definir')).toHaveLength(7);
  });

  it('shows the answered params with the allowed apps by name', () => {
    act(() => {
      const store = useChatbotStore.getState();
      store.startAppSearch('spotify');
      store.setAppSearchResults({
        term: 'spotify',
        apps: [{ id: 'com.spotify.music', name: 'Spotify', iconUrl: 'https://example.test/s.png' }],
        failed: false,
      });
      useChatbotParamsStore.getState().setParams({
        os: 'Android',
        version: '14',
        privateDns: true,
        privateDnsHost: 'dns.adguard.com',
        allowedApps: ['com.whatsapp', 'com.spotify.music', 'com.example.unknown'],
        installOs: 'Linux',
        appVersion: '1.2.0',
        blockRawIp: true,
        blockedTerms: ['semi', 'bokup'],
      });
      store.openSummaryModal();
    });
    render(<SummaryModal />);

    expect(screen.getByText('dns.adguard.com')).toBeTruthy();
    // The lists open on click.
    expect(screen.queryByText('WhatsApp')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Apps permitidos (3)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Palavras bloqueadas (2)' }));
    expect(screen.getByText('WhatsApp')).toBeTruthy();
    expect(screen.getByText('Spotify')).toBeTruthy();
    expect(screen.getByText('com.example.unknown')).toBeTruthy();
    expect(screen.getByText('Linux')).toBeTruthy();
    expect(screen.getByText('1.2.0')).toBeTruthy();
    expect(screen.getByText('semi, bokup')).toBeTruthy();
    expect(screen.queryByText('a definir')).toBeNull();
  });

  it('closes on the close button', () => {
    act(() => useChatbotStore.getState().openSummaryModal());
    render(<SummaryModal />);

    fireEvent.click(screen.getByLabelText('Fechar'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('SummaryModal app schedules', () => {
  beforeEach(() =>
    act(() => {
      useChatbotParamsStore.setState({ params: null, savedParams: null });
      useChatbotStore.getState().resetChatbot();
    }),
  );

  const show = (appSchedules: unknown) => {
    act(() => {
      useChatbotParamsStore.getState().setParams({ ...EMPTY, os: 'Android', allowedApps: ['com.whatsapp', 'com.example.unknown'], appSchedules } as never);
      useChatbotStore.getState().openSummaryModal();
    });
    render(<SummaryModal />);
    fireEvent.click(screen.getByRole('button', { name: /^Horários dos apps/ }));
  };
  const weekday = [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '18:00' }];

  it('describes each app, grouping the days with the same ranges', () => {
    show({
      'com.whatsapp': { mon: weekday, tue: weekday, wed: weekday, thu: weekday, fri: weekday, sat: [{ start: '10:00', end: '11:00' }] },
      'com.example.unknown': Object.fromEntries(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((day) => [day, [{ start: '18:00', end: '21:00' }]])),
    });

    expect(screen.getByRole('button', { name: 'Horários dos apps (2)' }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('WhatsApp')).toBeTruthy();
    expect(screen.getByText('Seg, Ter, Qua, Qui, Sex: 08:00–12:00, 14:00–18:00')).toBeTruthy();
    expect(screen.getByText('Sáb: 10:00–11:00')).toBeTruthy();
    expect(screen.getByText('Dom: bloqueado o dia todo')).toBeTruthy();
    expect(screen.getByText('com.example.unknown')).toBeTruthy();
    expect(screen.getByText('Todos os dias: 18:00–21:00')).toBeTruthy();
  });

  it('says when no app is restricted, or one is blocked all week', () => {
    show({});
    expect(screen.getByText('sem restrição')).toBeTruthy();
  });

  it('says an app with no day open is blocked all week', () => {
    show({ 'com.whatsapp': {} });
    expect(screen.getByText('bloqueado a semana toda')).toBeTruthy();
  });
});

describe('SummaryModal collapsible lists', () => {
  beforeEach(() =>
    act(() => {
      useChatbotParamsStore.setState({ params: null, savedParams: null });
      useChatbotStore.getState().resetChatbot();
    }),
  );

  it('opens and closes a list, and reads "pending" without opening before it is answered', () => {
    act(() => {
      useChatbotParamsStore.getState().setParams({ ...EMPTY, blockedTerms: ['semi'] });
      useChatbotStore.getState().openSummaryModal();
    });
    render(<SummaryModal />);

    const terms = screen.getByRole('button', { name: 'Palavras bloqueadas (1)' });
    fireEvent.click(terms);
    expect(screen.getByText('semi')).toBeTruthy();
    fireEvent.click(terms);
    expect(screen.queryByText('semi')).toBeNull();

    expect(screen.queryByRole('button', { name: /^Apps permitidos/ })).toBeNull();
    expect(screen.getByText('Apps permitidos')).toBeTruthy();
  });
});
