import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AttendantList } from '../AttendantList.tsx';
import type { OnlineUserState } from '../../../states/shared/online-users/state.ts';

const attendant = (over: Partial<OnlineUserState> = {}): OnlineUserState => ({
  id: 'a1',
  slug: '',
  name: 'Ana Lima',
  role: 'attendant',
  status: 'idle',
  ...over,
});

describe('AttendantList for visitors', () => {
  it('asks to log in instead of calling', () => {
    const onLoginToCall = vi.fn();
    render(
      <AttendantList users={[attendant()]} currentUser={null} call={null} onCompleteCall={vi.fn()} onLoginToCall={onLoginToCall} />,
    );

    expect(screen.getByText('Ana Lima')).toBeTruthy();
    expect(screen.queryByText('Chamar')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Entrar para ligar/ }));

    expect(onLoginToCall).toHaveBeenCalledOnce();
  });

  it('keeps the reconnecting state disabled', () => {
    render(
      <AttendantList
        users={[attendant({ status: 'disconnecting' })]}
        currentUser={null}
        call={null}
        onCompleteCall={vi.fn()}
        onLoginToCall={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /Entrar para ligar/ })).toBeNull();
  });

  it('shows no customers', () => {
    render(
      <AttendantList
        users={[attendant(), attendant({ id: 'c1', name: 'Carlos Cliente', role: 'customer' })]}
        currentUser={null}
        call={null}
        onCompleteCall={vi.fn()}
        onLoginToCall={vi.fn()}
      />,
    );
    expect(screen.queryByText('Carlos Cliente')).toBeNull();
  });
});
