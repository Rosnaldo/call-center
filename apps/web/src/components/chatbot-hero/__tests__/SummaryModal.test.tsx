import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SummaryModal } from '../SummaryModal.tsx';
import { useChatbotStore } from '../../../states/stores.ts';

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
      useChatbotStore.setState({ savedParams: null });
      useChatbotStore.getState().resetChatbot();
    });
  });

  it('shows the kept params until the conversation collects its own', () => {
    act(() => {
      useChatbotStore.setState({ savedParams: { ...EMPTY, os: 'iOS', version: '17.4' } });
      useChatbotStore.getState().setParams(EMPTY);
      useChatbotStore.getState().openSummaryModal();
    });
    render(<SummaryModal />);
    expect(screen.getByText('iOS')).toBeTruthy();
    expect(screen.getByText('17.4')).toBeTruthy();

    act(() => useChatbotStore.getState().setParams({ ...EMPTY, os: 'Android' }));
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
      useChatbotStore.getState().setParams({ ...EMPTY, os: 'Android' });
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
      store.setParams({
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
