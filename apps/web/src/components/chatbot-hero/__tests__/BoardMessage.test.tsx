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

describe('BoardMessage summary button', () => {
  beforeEach(() => act(() => useChatbotStore.getState().resetChatbot()));

  it('opens the kept configuration from the offer to reuse it', () => {
    const saved = {
      os: 'iOS', version: '17.4', privateDns: false, privateDnsHost: null, allowedApps: [],
      installOs: 'macOS', appVersion: '1.0.0', blockRawIp: true, blockedTerms: [],
    };
    render(<BoardMessage />);
    act(() => {
      useChatbotStore.getState().addMessage({ autor: 'bot', message: 'Encontrei', text: { key: 'messages.askReuse', params: { saved } } });
    });

    fireEvent.click(screen.getByRole('button', { name: /Resumo/ }));

    expect(useChatbotStore.getState()).toMatchObject({ isSummaryModalOpen: true, summaryParams: saved });
    act(() => useChatbotStore.getState().closeSummaryModal());
    expect(useChatbotStore.getState().summaryParams).toBeNull();
  });

  it('keeps the question after it in the same bot group', () => {
    render(<BoardMessage />);
    act(() => {
      useChatbotStore.getState().addMessage({ autor: 'bot', message: 'Confira o resumo', text: { key: 'messages.confirm' } });
      useChatbotStore.getState().addMessage({ autor: 'bot', message: 'Os dados coletados estão corretos?', text: { key: 'messages.confirmQuestion' } });
    });

    expect(screen.getAllByText('bot')).toHaveLength(1);
  });

  it('opens the summary from the confirmation', () => {
    render(<BoardMessage />);
    act(() => {
      useChatbotStore.getState().addMessage({ autor: 'bot', message: 'Dados coletados', text: { key: 'messages.confirm' } });
      useChatbotStore.getState().addMessage({ autor: 'bot', message: 'Você usa DNS privado?', text: { key: 'messages.askDns' } });
    });

    const buttons = screen.getAllByRole('button', { name: /Resumo/ });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);

    expect(useChatbotStore.getState().isSummaryModalOpen).toBe(true);
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

describe('BoardMessage scrolling', () => {
  beforeEach(() => act(() => useChatbotStore.getState().resetChatbot()));

  // happy-dom has no layout: give the board a size and track scrollTo calls.
  const sized = (scrollTop: number) => {
    const board = screen.getByRole('log');
    Object.defineProperty(board, 'scrollHeight', { configurable: true, value: 1000 });
    Object.defineProperty(board, 'clientHeight', { configurable: true, value: 300 });
    board.scrollTop = scrollTop;
    const scrollTo = vi.fn();
    board.scrollTo = scrollTo as unknown as typeof board.scrollTo;
    fireEvent.scroll(board);
    return { board, scrollTo };
  };
  const botSays = (message: string) => act(() => useChatbotStore.getState().addMessage({ autor: 'bot', message }));

  it('follows new messages while at the end', () => {
    render(<BoardMessage />);
    const { scrollTo } = sized(700);

    botSays('hello');

    expect(scrollTo).toHaveBeenCalledWith({ top: 1000, behavior: 'smooth' });
    expect(screen.queryByText('Novas mensagens')).toBeNull();
  });

  it('leaves a reader where they are and offers a jump to the new messages', () => {
    render(<BoardMessage />);
    const { scrollTo } = sized(100);

    botSays('hello');

    expect(scrollTo).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Novas mensagens/ }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 1000, behavior: 'smooth' });
    expect(screen.queryByText('Novas mensagens')).toBeNull();
  });

  it('hides the jump once the reader scrolls back to the end', () => {
    render(<BoardMessage />);
    const { board } = sized(100);
    botSays('hello');

    board.scrollTop = 690;
    fireEvent.scroll(board);

    expect(screen.queryByText('Novas mensagens')).toBeNull();
  });

  const wheelDown = (board: HTMLElement) => {
    const ev = new WheelEvent('wheel', { deltaY: 40, cancelable: true, bubbles: true });
    board.dispatchEvent(ev);
    return ev;
  };

  it('holds the page when the wheel pushes past the bottom right after scrolling', () => {
    render(<BoardMessage />);
    const board = screen.getByRole('log');
    Object.defineProperty(board, 'scrollHeight', { configurable: true, value: 1000 });
    Object.defineProperty(board, 'clientHeight', { configurable: true, value: 300 });
    board.scrollTop = 700; // at the bottom
    fireEvent.scroll(board); // just moved here

    expect(wheelDown(board).defaultPrevented).toBe(true);
  });

  it('lets the wheel through when the board is not at the bottom', () => {
    render(<BoardMessage />);
    const board = screen.getByRole('log');
    Object.defineProperty(board, 'scrollHeight', { configurable: true, value: 1000 });
    Object.defineProperty(board, 'clientHeight', { configurable: true, value: 300 });
    board.scrollTop = 200; // mid-scroll
    fireEvent.scroll(board);

    expect(wheelDown(board).defaultPrevented).toBe(false);
  });

  it('lets the wheel through at the bottom when no recent scroll', () => {
    render(<BoardMessage />);
    const board = screen.getByRole('log');
    Object.defineProperty(board, 'scrollHeight', { configurable: true, value: 1000 });
    Object.defineProperty(board, 'clientHeight', { configurable: true, value: 300 });
    board.scrollTop = 700; // at the bottom, but no scroll event fired recently

    expect(wheelDown(board).defaultPrevented).toBe(false);
  });
});

describe('BoardMessage grouping', () => {
  beforeEach(() => act(() => useChatbotStore.getState().resetChatbot()));

  it('labels each run of messages from the same author once', () => {
    act(() => {
      const { addMessage } = useChatbotStore.getState();
      addMessage({ autor: 'bot', message: 'one' });
      addMessage({ autor: 'bot', message: 'two' });
      addMessage({ autor: 'user', message: 'three' });
      addMessage({ autor: 'user', message: 'four' });
      addMessage({ autor: 'bot', message: 'five' });
    });
    render(<BoardMessage />);

    expect(screen.getAllByText('bot')).toHaveLength(2);
    expect(screen.getAllByText('você')).toHaveLength(1);
  });
});
