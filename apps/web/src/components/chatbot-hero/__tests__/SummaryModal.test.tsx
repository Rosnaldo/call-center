import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SummaryModal } from '../SummaryModal.tsx';
import { useChatbotStore } from '../../../states/stores.ts';

const EMPTY = { os: null, version: null, privateDns: null, privateDnsHost: null, allowedApps: null, installOs: null };

describe('SummaryModal', () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => useChatbotStore.getState().resetChatbot());
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
    expect(screen.getAllByText('a definir')).toHaveLength(4);
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
      });
      store.openSummaryModal();
    });
    render(<SummaryModal />);

    expect(screen.getByText('dns.adguard.com')).toBeTruthy();
    expect(screen.getByText('WhatsApp')).toBeTruthy();
    expect(screen.getByText('Spotify')).toBeTruthy();
    expect(screen.getByText('com.example.unknown')).toBeTruthy();
    expect(screen.getByText('Linux')).toBeTruthy();
    expect(screen.queryByText('a definir')).toBeNull();
  });

  it('closes on the close button', () => {
    act(() => useChatbotStore.getState().openSummaryModal());
    render(<SummaryModal />);

    fireEvent.click(screen.getByLabelText('Fechar'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
