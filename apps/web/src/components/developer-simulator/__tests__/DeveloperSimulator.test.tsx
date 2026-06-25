import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeveloperSimulator } from '../DeveloperSimulator.tsx';
import { useCallStore, useOnlineUsersStore, useCurrentUserStore } from '../../../states/stores.ts';
import { buildCall, buildOnlineUserState } from '../../../__tests__/builders.ts';
import { CallState } from '@/src/states/call/state.ts';

vi.mock('../../../states/stores.ts', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useCallStore: vi.fn(),
    useOnlineUsersStore: vi.fn(),
    useCurrentUserStore: vi.fn(),
  };
});

// Mock clipboard
const mockClipboard = {
  writeText: vi.fn().mockImplementation(() => Promise.resolve()),
};
Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  writable: true,
});


describe('DeveloperSimulator Component Unit Tests', () => {
  const mockUsers = [
    buildOnlineUserState({ id: 'cust-1', name: 'Jane Customer', role: 'customer', tokens: 15 }),
    buildOnlineUserState({ id: 'att-1', role: 'attendant' }),
  ];

  const mockcall = buildCall({
    id: 'call-1',
    customerId: 'cust-1',
    attendantId: 'att-1',
  });

  const defaultProps = {

    onAddTokens: vi.fn(),
    onSimulateIncomingCall: vi.fn(),
  };

  // Wires up useCallStore (call) and useOnlineUsersStore (users) mocks
  const setupStores = (overrides: { currentUser?: any; users?: any[]; call?: CallState | null } = {}) => {
    const currentUser = overrides.currentUser ?? { id: 'cust-1', name: 'Jane Customer', role: 'customer' };
    const users = overrides.users ?? mockUsers;
    const call = overrides.call !== undefined ? overrides.call : mockcall;

    (useCallStore as any).mockImplementation((selector: any) =>
      selector({ call })
    );
    (useOnlineUsersStore as any).mockImplementation((selector: any) =>
      selector({ users })
    );
    (useCurrentUserStore as any).mockImplementation((selector: any) =>
      selector({ currentUser })
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupStores();
  });

  it('renders Developer Simulator header details when open', () => {
    render(<DeveloperSimulator {...defaultProps} />);
    expect(screen.getByText('Developer Simulator')).toBeDefined();
    expect(screen.getByText('Sandbox')).toBeDefined();
    expect(screen.getByText('Simular Comportamentos')).toBeDefined();
  });

  it('can collapse and expand the simulator panel body', () => {
    render(<DeveloperSimulator {...defaultProps} />);
    
    // Default open
    expect(screen.queryByText('Simular Comportamentos')).not.toBeNull();

    // Click collapse
    const collapseBtn = screen.getByText('Collapse');
    fireEvent.click(collapseBtn);

    // Should hide the content
    expect(screen.queryByText('Simular Comportamentos')).toBeNull();

    // Click expand
    const expandBtn = screen.getByText('Expand');
    fireEvent.click(expandBtn);

    expect(screen.queryByText('Simular Comportamentos')).not.toBeNull();
  });

  it('shows incoming customer call simulation only for logged in attendants', () => {
    // Current user as customer
    const { rerender } = render(<DeveloperSimulator {...defaultProps} />);
    expect(screen.queryByText('Simular Chamada de Cliente')).toBeNull();

    // Change current user to attendant
    setupStores({ currentUser: { id: 'att-1', name: 'Dr. Attendant', role: 'attendant' } });

    rerender(<DeveloperSimulator {...defaultProps} />);
    expect(screen.queryByText('Simular Chamada de Cliente')).not.toBeNull();
  });

  it('disables simulate incoming call option when attendant already has an active nested call', () => {
    setupStores({ currentUser: { id: 'att-1', name: 'Dr. Attendant', role: 'attendant' } });

    render(<DeveloperSimulator {...defaultProps} />);
    expect(screen.getByText('Você já possui uma chamada ativa ou em escala de resposta.')).toBeDefined();
    expect(screen.queryByText('Simular Chamada Recebida 📞')).toBeNull();
  });

  it('allows simulator incoming call triggers when attendant has no call', () => {
    setupStores({
      currentUser: { id: 'att-not-busy', name: 'Dr. Empty', role: 'attendant' },
      call: null,
    });

    render(<DeveloperSimulator {...defaultProps} />);

    const simCallBtn = screen.getByText('Simular Chamada Recebida 📞');
    expect(simCallBtn).toBeDefined();

    fireEvent.click(simCallBtn);
    expect(defaultProps.onSimulateIncomingCall).toHaveBeenCalledWith('att-not-busy');
  });

  it('injects tokens for online customer items using button handlers', () => {
    render(<DeveloperSimulator {...defaultProps} />);
    
    expect(screen.getAllByText('Jane Customer').length).toBeGreaterThan(0);
    expect(screen.getByText('Saldo: 15 tokens')).toBeDefined();

    const add10Btn = screen.getByText('+10');
    const add50Btn = screen.getByText('+50');
    const add100Btn = screen.getByText('+100');

    fireEvent.click(add10Btn);
    expect(defaultProps.onAddTokens).toHaveBeenCalledWith('cust-1', 10);

    fireEvent.click(add50Btn);
    expect(defaultProps.onAddTokens).toHaveBeenCalledWith('cust-1', 50);

    fireEvent.click(add100Btn);
    expect(defaultProps.onAddTokens).toHaveBeenCalledWith('cust-1', 100);
  });

});
