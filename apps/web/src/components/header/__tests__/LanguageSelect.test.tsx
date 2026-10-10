import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import i18n from '../../../i18n.ts';
import { LanguageSelect } from '../LanguageSelect.tsx';

describe('LanguageSelect', () => {
  const initial = i18n.language;
  afterEach(async () => {
    localStorage.clear();
    await act(() => i18n.changeLanguage(initial));
  });

  it('opens the menu with the current language selected', async () => {
    await act(() => i18n.changeLanguage('pt'));
    render(<LanguageSelect />);
    expect(screen.queryByRole('listbox')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Idioma' }));

    expect(screen.getByRole('option', { selected: true }).textContent).toContain('Português');
  });

  it('switches the language, saves it and closes the menu', async () => {
    await act(() => i18n.changeLanguage('pt'));
    render(<LanguageSelect />);
    fireEvent.click(screen.getByRole('button', { name: 'Idioma' }));

    act(() => {
      fireEvent.click(screen.getByText('English'));
    });

    expect(i18n.language).toBe('en');
    expect(localStorage.getItem('lang')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getByRole('button', { name: 'Language' })).toBeTruthy();
  });

  it('closes on Escape and on a click outside', async () => {
    render(<LanguageSelect />);
    const trigger = screen.getByRole('button', { name: /Idioma|Language/ });

    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();

    fireEvent.click(trigger);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
