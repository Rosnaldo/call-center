import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { AllowedAppsModal } from '../AllowedAppsModal.tsx';
import { useChatbotStore } from '../../../states/stores.ts';

const openWithResults = (term: string, apps: { id: string; name: string; iconUrl: string }[]) =>
  act(() => {
    const store = useChatbotStore.getState();
    store.startAppSearch(term);
    store.setAppSearchResults({ term, apps, failed: false });
  });

describe('AllowedAppsModal', () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => useChatbotStore.getState().resetChatbot());
  });

  it('renders only while the store has it open', () => {
    render(<AllowedAppsModal onSubmit={vi.fn()} onSearch={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();

    act(() => useChatbotStore.getState().openAllowedAppsModal());
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('submits the checked app ids in checklist order', () => {
    const onSubmit = vi.fn(() => true);
    act(() => useChatbotStore.getState().openAllowedAppsModal());
    render(<AllowedAppsModal onSubmit={onSubmit} onSearch={vi.fn()} />);

    fireEvent.click(screen.getByText('YouTube'));
    fireEvent.click(screen.getByText('WhatsApp'));
    fireEvent.click(screen.getByText('Enviar'));

    expect(onSubmit).toHaveBeenCalledWith(['com.whatsapp', 'com.google.android.youtube']);
  });

  it('closes on cancel without submitting', () => {
    const onSubmit = vi.fn();
    act(() => useChatbotStore.getState().openAllowedAppsModal());
    render(<AllowedAppsModal onSubmit={onSubmit} onSearch={vi.fn()} />);

    fireEvent.click(screen.getByText('Cancelar'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(useChatbotStore.getState().isAllowedAppsModalOpen).toBe(false);
  });

  it('searches after typing stops', () => {
    vi.useFakeTimers();
    try {
      const onSearch = vi.fn();
      act(() => useChatbotStore.getState().openAllowedAppsModal());
      render(<AllowedAppsModal onSubmit={vi.fn()} onSearch={onSearch} />);
      onSearch.mockClear(); // the empty search on mount

      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'spo' } });
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'spot' } });
      act(() => vi.advanceTimersByTime(300));

      expect(onSearch.mock.calls).toEqual([['spot']]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps an app picked from a search after the search is cleared', () => {
    const onSubmit = vi.fn(() => true);
    act(() => useChatbotStore.getState().openAllowedAppsModal());
    render(<AllowedAppsModal onSubmit={onSubmit} onSearch={vi.fn()} />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'duolingo' } });
    openWithResults('duolingo', [{ id: 'com.duolingo', name: 'Duolingo', iconUrl: 'https://example.test/d.png' }]);
    expect(screen.queryByText('WhatsApp')).toBeNull(); // results replace the fixed list
    fireEvent.click(screen.getByText('Duolingo'));

    fireEvent.click(screen.getByLabelText('Limpar busca'));
    fireEvent.click(screen.getByText('WhatsApp'));
    expect(screen.getByText('Duolingo')).toBeTruthy();
    fireEvent.click(screen.getByText('Enviar'));

    expect(onSubmit).toHaveBeenCalledWith(['com.whatsapp', 'com.duolingo']);
  });

  it('tells when the search is unavailable', () => {
    act(() => useChatbotStore.getState().openAllowedAppsModal());
    render(<AllowedAppsModal onSubmit={vi.fn()} onSearch={vi.fn()} />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'spotify' } });
    act(() => {
      useChatbotStore.getState().startAppSearch('spotify');
      useChatbotStore.getState().setAppSearchResults({ term: 'spotify', apps: [], failed: true });
    });

    expect(screen.getByRole('status').textContent).toMatch(/indisponível/);
  });

  it('groups the default apps by category', () => {
    act(() => useChatbotStore.getState().openAllowedAppsModal());
    render(<AllowedAppsModal onSubmit={vi.fn()} onSearch={vi.fn()} />);

    const messaging = screen.getByRole('region', { name: 'Mensagens' });
    expect(within(messaging).getByText('WhatsApp')).toBeTruthy();
    expect(within(messaging).queryByText('Netflix')).toBeNull();
    expect(within(screen.getByRole('region', { name: 'Entretenimento' })).getByText('Netflix')).toBeTruthy();
  });

  it('checks and unchecks a whole category', () => {
    const onSubmit = vi.fn(() => true);
    act(() => useChatbotStore.getState().openAllowedAppsModal());
    render(<AllowedAppsModal onSubmit={onSubmit} onSearch={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Marcar Mensagens'));
    fireEvent.click(screen.getByText('Enviar'));
    expect(onSubmit).toHaveBeenLastCalledWith(['com.whatsapp', 'com.facebook.orca', 'org.telegram.messenger']);

    fireEvent.click(screen.getByLabelText('Desmarcar Mensagens'));
    fireEvent.click(screen.getByText('Enviar'));
    expect(onSubmit).toHaveBeenLastCalledWith([]);
  });

  it('saves the sent list and starts the next checklist with it checked', () => {
    act(() => useChatbotStore.getState().openAllowedAppsModal());
    openWithResults('spotify', [{ id: 'com.spotify.music', name: 'Spotify', iconUrl: 'https://example.test/s.png' }]);
    const { unmount } = render(<AllowedAppsModal onSubmit={() => true} onSearch={vi.fn()} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'spotify' } });
    fireEvent.click(screen.getByText('Spotify'));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    fireEvent.click(screen.getByText('WhatsApp'));
    fireEvent.click(screen.getByText('Enviar'));
    unmount();

    const onSubmit = vi.fn(() => true);
    act(() => useChatbotStore.getState().openAllowedAppsModal());
    render(<AllowedAppsModal onSubmit={onSubmit} onSearch={vi.fn()} />);
    expect(screen.getByText('Spotify')).toBeTruthy();
    fireEvent.click(screen.getByText('Enviar'));
    expect(onSubmit).toHaveBeenCalledWith(['com.whatsapp', 'com.spotify.music']);
  });

  it('keeps the saved list when the new one could not be sent', () => {
    localStorage.setItem('chatbot.allowedApps', JSON.stringify([{ id: 'com.whatsapp', name: 'WhatsApp', iconUrl: '' }]));
    act(() => useChatbotStore.getState().openAllowedAppsModal());
    render(<AllowedAppsModal onSubmit={() => false} onSearch={vi.fn()} />);

    fireEvent.click(screen.getByText('WhatsApp'));
    fireEvent.click(screen.getByText('Enviar'));

    expect(JSON.parse(localStorage.getItem('chatbot.allowedApps')!)).toEqual([{ id: 'com.whatsapp', name: 'WhatsApp', iconUrl: '' }]);
  });

  it('ignores a corrupt saved list', () => {
    localStorage.setItem('chatbot.allowedApps', '{not json');
    const onSubmit = vi.fn(() => true);
    act(() => useChatbotStore.getState().openAllowedAppsModal());
    render(<AllowedAppsModal onSubmit={onSubmit} onSearch={vi.fn()} />);

    fireEvent.click(screen.getByText('Enviar'));
    expect(onSubmit).toHaveBeenCalledWith([]);
  });
});
