import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CallView, CallViewState } from '../CallView.tsx';
import { buildCall } from '../../../../__tests__/builders.ts';
import { useCurrentUserStore } from '../../../../states/current-user/store.ts';

const makeProps = (extra = {}) => ({
  state: CallViewState.Lobby,
  isScreenSharing: false,
  isVideoOff: false,
  isMuted: false,
  partnerName: '',
  partnerInitials: '',
  setIsMuted: vi.fn(),
  setIsVideoOff: vi.fn(),
  setIsScreenSharing: vi.fn(),
  setIsSettingsOpen: vi.fn(),
  isFullscreen: false,
  toggleFullscreen: vi.fn(),
  handleStartCall: vi.fn(),
  onHangUp: vi.fn(),
  isAttendant: false,
  ...extra,
});

describe('CallView Component - Call Interrupted (Awaiting Return) Unit Tests', () => {
  beforeEach(() => {
    useCurrentUserStore.setState({ currentUser: null });
  });

  it('renders interrupted call panel for attendant users', () => {
    const call = buildCall({
      attendantId: 'att-1',
      customerName: 'John Doe',
      status: 'call-interrupteded',
    });

    useCurrentUserStore.setState({
      currentUser: { id: 'att-1', name: 'Attendant', slug: 'attendant', email: 'attendant@example.com', role: 'attendant', avatarUrl: '', status: 'in-call', },
    });

    render(
      <CallView
        {...makeProps({
          currentCall: call,
          partnerName: 'John Doe',
          partnerInitials: 'JD',
          isAttendant: true,
        })}
      />
    );

    expect(screen.getByText(/Conexão Interrompida/i)).toBeDefined();
    expect(screen.getByText(/Aguardando John Doe retornar à ligação.../i)).toBeDefined();
  });

  it('renders interrupted call panel for customer users', () => {
    const call = buildCall({
      attendantName: 'Dr. Smith',
      status: 'call-interrupteded',
    });

    render(
      <CallView
        {...makeProps({
          currentCall: call,
          partnerName: 'Dr. Smith',
          partnerInitials: 'DS',
          isAttendant: false,
        })}
      />
    );

    expect(screen.getByText(/Conexão Interrompida/i)).toBeDefined();
    expect(screen.getByText(/Aguardando o atendente Dr. Smith retornar.../i)).toBeDefined();
  });

  it('shows "Return" button label when call is interrupted', () => {
    const call = buildCall({ status: 'call-interrupteded' });

    const { container } = render(
      <CallView {...makeProps({ currentCall: call })} />
    );

    const resumeBtn = container.querySelector('#lobby-start-call');
    expect(resumeBtn).not.toBeNull();
    expect(resumeBtn?.textContent).toContain('Return');
  });

  it('calls handleStartCall when customer clicks "Return"', () => {
    const call = buildCall({
      attendantId: 'att-1',
      customerId: 'cust-1',
      status: 'call-interrupteded',
      interruptedAt: Date.now() - 5000,
    });

    useCurrentUserStore.setState({
      currentUser: { id: 'cust-1', name: 'Customer', slug: 'customer', email: 'customer@example.com', role: 'customer', avatarUrl: '', status: 'in-call', },
    });

    const handleStartCall = vi.fn();

    const { container } = render(
      <CallView {...makeProps({ currentCall: call, handleStartCall, isAttendant: false })} />
    );

    const resumeBtn = container.querySelector('#lobby-start-call');
    expect(resumeBtn).not.toBeNull();
    if (resumeBtn) {
      fireEvent.click(resumeBtn);
      expect(handleStartCall).toHaveBeenCalledOnce();
    }
  });

  it('calls handleStartCall when attendant clicks "Return"', () => {
    const call = buildCall({
      attendantId: 'att-1',
      customerId: 'cust-1',
      status: 'call-interrupteded',
      interruptedAt: Date.now() - 5000,
    });

    useCurrentUserStore.setState({
      currentUser: { id: 'att-1', name: 'Attendant', slug: 'attendant', email: 'attendant@example.com', role: 'attendant', avatarUrl: '', status: 'in-call', },
    });

    const handleStartCall = vi.fn();

    const { container } = render(
      <CallView {...makeProps({ currentCall: call, handleStartCall, isAttendant: true })} />
    );

    const resumeBtn = container.querySelector('#lobby-start-call');
    expect(resumeBtn).not.toBeNull();
    if (resumeBtn) {
      fireEvent.click(resumeBtn);
      expect(handleStartCall).toHaveBeenCalledOnce();
    }
  });

  it('does not call handleStartCall with awaiting-answer when resuming interrupted call', () => {
    const call = buildCall({
      customerId: 'cust-1',
      status: 'call-interrupteded',
    });

    useCurrentUserStore.setState({
      currentUser: { id: 'cust-1', name: 'Customer', slug: 'customer', email: 'customer@example.com', role: 'customer', avatarUrl: '', status: 'in-call', },
    });

    const handleStartCall = vi.fn();

    const { container } = render(
      <CallView {...makeProps({ currentCall: call, handleStartCall, isAttendant: false })} />
    );

    const resumeBtn = container.querySelector('#lobby-start-call');
    if (resumeBtn) {
      fireEvent.click(resumeBtn);
      expect(handleStartCall).toHaveBeenCalledOnce();
    }
  });
});
