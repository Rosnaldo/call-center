import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BlockedTermsModal } from '../BlockedTermsModal.tsx';
import { useChatbotParamsStore, useChatbotStore } from '../../../states/stores.ts';

const open = () => act(() => useChatbotStore.getState().openBlockedTermsModal());
const typeWord = (word: string) => {
  const input = screen.getByLabelText('Nova palavra proibida');
  fireEvent.change(input, { target: { value: word } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

describe('BlockedTermsModal', () => {
  beforeEach(() =>
    act(() => {
      useChatbotParamsStore.setState({ params: null, savedParams: null });
      useChatbotStore.getState().resetChatbot();
    }),
  );

  it('starts with the kept words, or the conversation ones once given', () => {
    const empty = {
      os: null, version: null, privateDns: null, privateDnsHost: null, allowedApps: null,
      installOs: null, appVersion: null, blockRawIp: null, blockedTerms: null,
    };
    useChatbotParamsStore.setState({ savedParams: { ...empty, blockedTerms: ['cassino', 'bet'] } });
    open();
    const { unmount } = render(<BlockedTermsModal onSubmit={vi.fn(() => true)} />);
    expect(screen.getByText('cassino')).toBeTruthy();
    expect(screen.getByText('bet')).toBeTruthy();
    unmount();

    act(() => useChatbotParamsStore.getState().setParams({ ...empty, blockedTerms: ['poker'] }));
    render(<BlockedTermsModal onSubmit={vi.fn(() => true)} />);
    expect(screen.getByText('poker')).toBeTruthy();
    expect(screen.queryByText('cassino')).toBeNull();
  });

  it('renders only while the store has it open', () => {
    render(<BlockedTermsModal onSubmit={vi.fn(() => true)} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    open();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('adds words as tags and submits them lowercased and deduplicated', () => {
    const onSubmit = vi.fn(() => true);
    open();
    render(<BlockedTermsModal onSubmit={onSubmit} />);

    typeWord('Semi');
    typeWord('bokup');
    typeWord('semi'); // duplicate (case-insensitive) is ignored
    fireEvent.click(screen.getByText('Salvar'));

    expect(onSubmit).toHaveBeenCalledWith(['semi', 'bokup']);
  });

  it('rejects an invalid word and can remove a tag', () => {
    const onSubmit = vi.fn(() => true);
    open();
    render(<BlockedTermsModal onSubmit={onSubmit} />);

    typeWord('a'); // too short
    expect(screen.getByRole('alert')).toBeTruthy();

    typeWord('semi');
    fireEvent.click(screen.getByLabelText('Remover semi'));
    fireEvent.click(screen.getByText('Salvar'));

    expect(onSubmit).toHaveBeenCalledWith([]);
  });

  it('folds in a word still typed when saving', () => {
    const onSubmit = vi.fn(() => true);
    open();
    render(<BlockedTermsModal onSubmit={onSubmit} />);

    const input = screen.getByLabelText('Nova palavra proibida');
    fireEvent.change(input, { target: { value: 'pending' } });
    fireEvent.click(screen.getByText('Salvar'));

    expect(onSubmit).toHaveBeenCalledWith(['pending']);
  });
});
