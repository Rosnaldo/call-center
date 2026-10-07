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

    fireEvent.click(screen.getByRole('button', { name: /Gerar novamente/ }));

    expect(onRestart).toHaveBeenCalledOnce();
  });

  it('offers the installer next to it', () => {
    render(<BoardMessage onRestart={vi.fn()} />);
    act(() => {
      useChatbotStore.getState().addMessage({ autor: 'bot', message: 'Thanks! Collected params' });
      useChatbotStore.getState().offerRestart();
    });

    expect(screen.getByRole('button', { name: /Gerar instalador/ })).toBeTruthy();
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
