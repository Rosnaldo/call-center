import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BoardMessage } from '../BoardMessage.tsx';
import { useChatbotStore } from '../../../states/stores.ts';

const askForApps = () =>
  act(() => {
    useChatbotStore.getState().addMessage({ autor: 'bot', message: 'Which apps are allowed?' });
    useChatbotStore.getState().requestAllowedApps();
  });

describe('BoardMessage allowed apps button', () => {
  beforeEach(() => act(() => useChatbotStore.getState().resetChatbot()));

  it('opens the modal from the bot question', () => {
    render(<BoardMessage />);
    askForApps();

    fireEvent.click(screen.getByRole('button', { name: /Selecionar apps/ }));

    expect(useChatbotStore.getState().isAllowedAppsModalOpen).toBe(true);
  });

  it('stays available after the modal is cancelled', () => {
    render(<BoardMessage />);
    askForApps();
    act(() => {
      useChatbotStore.getState().openAllowedAppsModal();
      useChatbotStore.getState().closeAllowedAppsModal();
    });

    expect(screen.getByRole('button', { name: /Selecionar apps/ })).toBeTruthy();
  });

  it('goes away once the list is sent', () => {
    render(<BoardMessage />);
    askForApps();
    act(() => useChatbotStore.getState().fulfillAllowedAppsRequest());

    expect(screen.queryByRole('button', { name: /Selecionar apps/ })).toBeNull();
  });
});

describe('BoardMessage restart button', () => {
  beforeEach(() => act(() => useChatbotStore.getState().resetChatbot()));

  it('generates again from the final message', () => {
    const onRestart = vi.fn();
    render(<BoardMessage onRestart={onRestart} />);
    act(() => {
      useChatbotStore.getState().addMessage({ autor: 'bot', message: 'Thanks! Collected params' });
      useChatbotStore.getState().offerRestart();
    });

    fireEvent.click(screen.getByRole('button', { name: /Resetar/ }));

    expect(onRestart).toHaveBeenCalledOnce();
  });

  it('offers the installer next to it', () => {
    const onGenerateInstaller = vi.fn();
    render(<BoardMessage onRestart={vi.fn()} onGenerateInstaller={onGenerateInstaller} />);
    act(() => {
      useChatbotStore.getState().addMessage({ autor: 'bot', message: 'Thanks! Collected params' });
      useChatbotStore.getState().offerRestart();
    });

    fireEvent.click(screen.getByRole('button', { name: /Gerar instalador/ }));

    expect(onGenerateInstaller).toHaveBeenCalledOnce();
  });
});

describe('BoardMessage choice buttons', () => {
  beforeEach(() => act(() => useChatbotStore.getState().resetChatbot()));

  it('answers the bot question', () => {
    const onAnswer = vi.fn();
    render(<BoardMessage onAnswer={onAnswer} />);
    act(() => {
      useChatbotStore.getState().addMessage({ autor: 'bot', message: 'Are you using a private DNS? (yes/no)' });
      useChatbotStore.getState().requestChoice([{ label: 'Sim', value: 'sim' }, { label: 'Não', value: 'não' }]);
    });

    fireEvent.click(screen.getByRole('button', { name: /Não/ }));

    expect(onAnswer).toHaveBeenCalledWith({ label: 'Não', value: 'não' });
  });
});

describe('BoardMessage language', () => {
  beforeEach(() => act(() => useChatbotStore.getState().resetChatbot()));

  it('translates bot messages and clicked answers again when the language changes', async () => {
    const { default: i18n } = await import('../../../i18n.ts');
    const initial = i18n.language;
    await act(() => i18n.changeLanguage('pt'));
    act(() => {
      const store = useChatbotStore.getState();
      store.addMessage({ autor: 'bot', message: 'Você usa DNS privado?', text: { key: 'messages.askDns' } });
      store.requestChoice([
        { label: 'Sim', value: 'yes', key: 'choices.yes' },
        { label: 'Não', value: 'no', key: 'choices.no' },
      ]);
      store.addMessage({ autor: 'user', message: 'Sim', text: { key: 'choices.yes' } });
      store.addMessage({ autor: 'user', message: 'meu texto' });
    });
    render(<BoardMessage onAnswer={vi.fn()} />);
    expect(screen.getByText('Você usa DNS privado?')).toBeTruthy();

    await act(() => i18n.changeLanguage('en'));

    expect(screen.getByText('Are you using a private DNS?')).toBeTruthy();
    expect(screen.getAllByText('Yes')).toHaveLength(2); // the button and the clicked answer
    expect(screen.getByRole('button', { name: 'No' })).toBeTruthy();
    expect(screen.getByText('meu texto')).toBeTruthy(); // typed text stays as typed

    await act(() => i18n.changeLanguage(initial));
  });
});
