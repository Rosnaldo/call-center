import { describe, it, expect, beforeEach } from 'vitest';
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
