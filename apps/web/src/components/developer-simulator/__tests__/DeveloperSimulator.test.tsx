import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeveloperSimulator } from '../DeveloperSimulator.tsx';
import { useCallStore } from '../../../states/call/store.ts';
import { useOnlineUsersStore } from '../../../states/online-users/store.ts';
import { useCurrentUserStore } from '@/src/states/current-user/store.ts';
import { buildCall, buildOnlineUserState } from '../../../__tests__/builders.ts';
import { CallState } from '@/src/states/call/state.ts';

// Mock the call store
vi.mock('../../../states/call/store.ts', () => {
  const store = vi.fn();
  return {
    useCallStore: store,
  };
});

// Mock the user store
vi.mock('../../../states/online-users/store.ts', () => {
  const store = vi.fn();
  return {
    useOnlineUsersStore: store,
  };
});

// Mock the current user store
vi.mock('@/src/states/current-user/store.ts', () => {
  const store = vi.fn();
  return {
    useCurrentUserStore: store,
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

// Mock chime helper
vi.mock('../../../utils/helpers.ts', () => ({
  playNotificationChime: vi.fn(),
}));

describe('DeveloperSimulator Component Unit Tests', () => {
  const mockUsers = [
    buildOnlineUserState({ id: 'cust-1', name: 'Jane Customer', role: 'customer', tokens: 15 }),
    buildOnlineUserState({ id: 'att-1', role: 'attendant' }),
  ];

  const mockcall = buildCall({
    id: 'call-1',
    customerId: 'cust-1',
    attendantId: 'att-1',
    status: 'active',
  });

  const defaultProps = {
    onUpdateCall: vi.fn(),
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

  it('allows simulating internet drop and reconnect behaviors for active calls', () => {
    render(<DeveloperSimulator {...defaultProps} />);
    
    expect(screen.getByText('Instabilidade de Rede (1)')).toBeDefined();
    expect(screen.getByText('🟢 Ativa & Fluindo')).toBeDefined();

    // Disconnect Action
    const disconnectBtn = screen.getByText('Simular Queda de Conexão 🔌');
    fireEvent.click(disconnectBtn);
    expect(defaultProps.onUpdateCall).toHaveBeenCalledWith('call-1', {
      status: 'call-interrupteded'
    });

    // Feed in an interrupted call state to test reconnect simulation
    setupStores({
      call: { ...mockcall, status: 'call-interrupteded' as const },
    });

    render(<DeveloperSimulator {...defaultProps} />);
    expect(screen.getByText('🔌 Conexão Interrompida')).toBeDefined();

    const reconnectBtn = screen.getByText('Simular Retorno do Usuário 📡');
    fireEvent.click(reconnectBtn);
    expect(defaultProps.onUpdateCall).toHaveBeenCalledWith('call-1', {
      status: 'active'
    });
  });

  it('switches JSON viewer board tabs and supports click copies', () => {
    render(<DeveloperSimulator {...defaultProps} />);
    
    const usersTab = screen.getByText('Usuários (2)');
    const fullTab = screen.getByText('Geral Completo');

    // Default tab is 'calls'
    expect(screen.getByText(new RegExp('"id": "call-1"'))).toBeDefined();

    // Switch to Users Tab
    fireEvent.click(usersTab);
    expect(screen.getByText(new RegExp('"name": "Jane Customer"'))).toBeDefined();

    // Switch to Full Tab
    fireEvent.click(fullTab);
    expect(screen.getByText(new RegExp('"call"'))).toBeDefined();

    // Copy Content to clipboard
    const copyBtn = screen.getByText('Copiar JSON');
    fireEvent.click(copyBtn);
    expect(mockClipboard.writeText).toHaveBeenCalled();
    expect(screen.getByText('Copiado!')).toBeDefined();
  });
});
