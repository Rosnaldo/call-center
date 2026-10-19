import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AppSchedulesModal } from '../AppSchedulesModal.tsx';
import { useChatbotParamsStore, useChatbotStore } from '../../../states/stores.ts';

const PARAMS = {
  os: 'Android', version: '14', privateDns: false, privateDnsHost: null, allowedApps: ['com.whatsapp', 'com.example.unknown'],
  installOs: 'Linux', appVersion: '1.0.0', blockRawIp: false, blockedTerms: [],
};
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const everyDay = (start: string, end: string) => Object.fromEntries(DAYS.map((day) => [day, [{ start, end }]]));

const open = () => act(() => useChatbotStore.getState().openAppSchedulesModal());
const cell = (day: string, slot: number) => screen.getByTestId(`slot-${day}-${slot}`);
// Presses on the first cell, moves over the others and releases.
const drag = (from: [string, number], ...over: [string, number][]) => {
  fireEvent.pointerDown(cell(...from));
  for (const target of over) fireEvent.pointerEnter(cell(...target));
  fireEvent.pointerUp(window);
};

describe('AppSchedulesModal', () => {
  beforeEach(() =>
    act(() => {
      useChatbotParamsStore.setState({ params: PARAMS, savedParams: null });
      useChatbotStore.getState().resetChatbot();
    }),
  );

  it('renders only while the store has it open', () => {
    render(<AppSchedulesModal onSubmit={vi.fn(() => true)} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    open();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('lists the allowed apps, unrestricted by default', () => {
    const onSubmit = vi.fn(() => true);
    open();
    render(<AppSchedulesModal onSubmit={onSubmit} />);

    expect(screen.getByText('WhatsApp')).toBeTruthy();
    expect(screen.getByText('com.example.unknown')).toBeTruthy();
    expect(screen.getAllByText('Sempre disponível')).toHaveLength(2);

    fireEvent.click(screen.getByText('Salvar'));
    expect(onSubmit).toHaveBeenCalledWith({});
  });

  it('clears dragged cells, starting on an allowed one, and allows them back', () => {
    const onSubmit = vi.fn(() => true);
    open();
    render(<AppSchedulesModal onSubmit={onSubmit} />);
    // Restricting starts every day at 08:00-20:00 (slots 16-39).
    fireEvent.click(screen.getByLabelText('Restringir horários'));
    fireEvent.click(screen.getByRole('tab', { name: 'Por dia da semana' }));

    // Monday 12:00-14:00 cleared.
    drag(['mon', 24], ['mon', 25], ['mon', 27]);
    // Monday 21:00-22:30 allowed.
    drag(['mon', 42], ['mon', 44]);
    fireEvent.click(screen.getByText('Salvar'));

    expect(onSubmit).toHaveBeenCalledWith({
      'com.whatsapp': {
        ...everyDay('08:00', '20:00'),
        mon: [
          { start: '08:00', end: '12:00' },
          { start: '14:00', end: '20:00' },
          { start: '21:00', end: '22:30' },
        ],
      },
    });
  });

  it('drags a rectangle across days', () => {
    const onSubmit = vi.fn(() => true);
    open();
    render(<AppSchedulesModal onSubmit={onSubmit} />);
    fireEvent.click(screen.getByLabelText('Restringir horários'));
    fireEvent.click(screen.getByRole('tab', { name: 'Por dia da semana' }));
    fireEvent.click(screen.getByText('Limpar tudo'));

    // Tuesday to Thursday, 18:00-19:30, dragged from the bottom-right corner.
    drag(['thu', 38], ['wed', 37], ['tue', 36]);
    fireEvent.click(screen.getByText('Salvar'));

    const range = [{ start: '18:00', end: '19:30' }];
    expect(onSubmit).toHaveBeenCalledWith({ 'com.whatsapp': { tue: range, wed: range, thu: range } });
  });

  it('shows what a drag will do while dragging', () => {
    open();
    render(<AppSchedulesModal onSubmit={vi.fn(() => true)} />);
    fireEvent.click(screen.getByLabelText('Restringir horários'));
    fireEvent.click(screen.getByRole('tab', { name: 'Por dia da semana' }));

    fireEvent.pointerDown(cell('sat', 2));
    fireEvent.pointerEnter(cell('sun', 5));
    expect(screen.getByText('Dom–Sáb 01:00–03:00: liberar')).toBeTruthy();
    fireEvent.pointerUp(window);
    expect(screen.queryByText('Dom–Sáb 01:00–03:00: liberar')).toBeNull();
  });

  it('opens on "per day" when every day is the same, applying a drag to every day', () => {
    const onSubmit = vi.fn(() => true);
    open();
    render(<AppSchedulesModal onSubmit={onSubmit} />);
    fireEvent.click(screen.getByLabelText('Restringir horários'));

    expect(screen.getByRole('tab', { name: 'Por dia' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByTestId('slot-mon-0')).toBeNull();
    // Every day 12:00-13:00 cleared.
    drag(['daily', 24], ['daily', 25]);
    fireEvent.click(screen.getByText('Salvar'));

    const ranges = [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '20:00' }];
    expect(onSubmit).toHaveBeenCalledWith({ 'com.whatsapp': Object.fromEntries(DAYS.map((day) => [day, ranges])) });
  });

  it('opens on "per day of the week" when days differ, and warns that "per day" makes them equal', () => {
    act(() =>
      useChatbotParamsStore.setState({
        params: { ...PARAMS, appSchedules: { 'com.whatsapp': { mon: [{ start: '08:00', end: '09:00' }], sat: [{ start: '10:00', end: '11:00' }] } } },
      }),
    );
    const onSubmit = vi.fn(() => true);
    open();
    render(<AppSchedulesModal onSubmit={onSubmit} />);

    expect(screen.getByRole('tab', { name: 'Por dia da semana' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: 'Por dia' }));
    expect(screen.getByText(/editar aqui deixa todos iguais/)).toBeTruthy();
    // Shows Monday's, the first day with ranges; a drag gives it to every day.
    drag(['daily', 18], ['daily', 19]);
    fireEvent.click(screen.getByText('Salvar'));

    const ranges = [{ start: '08:00', end: '10:00' }];
    expect(onSubmit).toHaveBeenCalledWith({ 'com.whatsapp': Object.fromEntries(DAYS.map((day) => [day, ranges])) });
  });

  it('allows the whole week at once', () => {
    const onSubmit = vi.fn(() => true);
    open();
    render(<AppSchedulesModal onSubmit={onSubmit} />);
    fireEvent.click(screen.getByLabelText('Restringir horários'));
    fireEvent.click(screen.getByText('Liberar tudo'));
    fireEvent.click(screen.getByText('Salvar'));
    expect(onSubmit).toHaveBeenCalledWith({ 'com.whatsapp': everyDay('00:00', '23:59') });
  });

  it('starts from the schedules given so far, rounded to the grid, for apps still allowed', () => {
    act(() =>
      useChatbotParamsStore.setState({
        params: {
          ...PARAMS,
          appSchedules: { 'com.whatsapp': { sat: [{ start: '10:10', end: '11:00' }] }, 'com.gone': everyDay('08:00', '09:00') },
        },
      }),
    );
    const onSubmit = vi.fn(() => true);
    open();
    render(<AppSchedulesModal onSubmit={onSubmit} />);

    expect(screen.getByText('Restrito · 1 dia liberado')).toBeTruthy();
    expect(screen.getByText('10:30–11:00')).toBeTruthy();
    fireEvent.click(screen.getByText('Salvar'));
    expect(onSubmit).toHaveBeenCalledWith({ 'com.whatsapp': { sat: [{ start: '10:30', end: '11:00' }] } });
  });
});
