import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { UserProfilePage } from '../user-profile/ui.tsx';
import { buildOnlineUserState } from '../../__tests__/builders.ts';
import { OnlineUserState } from '@/src/states/online-users/state.ts';

vi.mock('../../components/header/Header.tsx', () => {
  return {
    Header: () => <div data-testid="mock-header">Mock Header</div>,
  };
});

vi.mock('../../hooks/auth/useLogout.ts', () => ({
  useLogout: () => vi.fn(),
}));

vi.mock('../../components/toast.tsx', () => ({
  mytoast: Object.assign(vi.fn(() => 'toast-id'), { dismiss: vi.fn() }),
}));

class MockFileReader {
  onload: any = null;
  result: string | null = null;
  readAsDataURL(file: File) {
    if (file.name === 'error.png') return;
    setTimeout(() => {
      this.result = 'data:image/png;base64,mockedbase64string';
      if (this.onload) {
        this.onload({ target: { result: this.result } } as any);
      }
    }, 10);
  }
}
vi.stubGlobal('FileReader', MockFileReader);

describe('UserProfilePage Class and Interactions Unit Tests', () => {
  const mockUser = buildOnlineUserState({
    id: 'cust-1',
    name: 'John Customer',
    role: 'customer',
    avatarUrl: 'https://avatar/1',
  });

  const mockUsers: OnlineUserState[] = [mockUser];

  const defaultProps = {
    users: mockUsers,
    currentUser: mockUser,
    navigate: vi.fn(),
    fileError: null,
    avatarUrl: mockUser.avatarUrl || null,
    processFile: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a warning if currentUser is not logged in', () => {
    render(<UserProfilePage {...defaultProps} currentUser={null} />);

    expect(screen.getByText('Por favor, faça login para acessar seu perfil.')).toBeDefined();

    const loginButton = screen.getByText('Ir para Login');
    expect(loginButton).toBeDefined();

    fireEvent.click(loginButton);
    expect(defaultProps.navigate).toHaveBeenCalledWith('login');
  });

  it('renders the configuration form correctly with initialized values when the customer user is logged in', () => {
    render(<UserProfilePage {...defaultProps} />);

    expect(screen.getByTestId('mock-header')).toBeDefined();
    expect(screen.getByText('Perfil')).toBeDefined();
    expect(screen.getByText('Voltar para a área de Cliente')).toBeDefined();
    expect(screen.getByText('John Customer')).toBeDefined();
    expect(screen.getByText('Editar')).toBeDefined();
  });

  it('renders correct labels when the attendant user is logged in', () => {
    render(<UserProfilePage {...defaultProps} currentUser={buildOnlineUserState({ role: 'attendant' })} />);

    expect(screen.getByText('Voltar para a área de Agente')).toBeDefined();
  });

  it('updates name input state as values are typed', () => {
    render(<UserProfilePage {...defaultProps} />);

    fireEvent.click(screen.getByText('Editar'));

    const nameInput = screen.getByPlaceholderText('Seu nome visível...') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'New Custom Name' } });
    expect(nameInput.value).toBe('New Custom Name');
  });

  it('does not navigate if name input is cleared and form is submitted', () => {
    render(<UserProfilePage {...defaultProps} />);

    fireEvent.click(screen.getByText('Editar'));

    const nameInput = screen.getByPlaceholderText('Seu nome visível...') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: '   ' } });

    fireEvent.click(screen.getByText('Salvar'));

    expect(defaultProps.navigate).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('Seu nome visível...')).toBeDefined();
  });

  it('navigates back to active portal after saving and the success timeout elapses', () => {
    vi.useFakeTimers();

    render(<UserProfilePage {...defaultProps} />);

    fireEvent.click(screen.getByText('Editar'));

    const nameInput = screen.getByPlaceholderText('Seu nome visível...') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Updated Client' } });

    fireEvent.click(screen.getByText('Salvar'));

    expect(defaultProps.navigate).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(1500); });

    expect(defaultProps.navigate).toHaveBeenCalledWith('customer');

    vi.useRealTimers();
  });

  it('navigates back on clicking Voltar helper', () => {
    const { unmount } = render(<UserProfilePage {...defaultProps} />);

    const backBtn = screen.getByText('Voltar para a área de Cliente');
    fireEvent.click(backBtn);
    expect(defaultProps.navigate).toHaveBeenLastCalledWith('customer');

    unmount();

    render(<UserProfilePage {...defaultProps} currentUser={buildOnlineUserState({ role: 'attendant' })} />);

    const backBtnAttendant = screen.getByText('Voltar para a área de Agente');
    fireEvent.click(backBtnAttendant);
    expect(defaultProps.navigate).toHaveBeenLastCalledWith('attendant');
  });

  it('Cancel button resets editing state without navigating', () => {
    render(<UserProfilePage {...defaultProps} />);

    fireEvent.click(screen.getByText('Editar'));
    expect(screen.getByPlaceholderText('Seu nome visível...')).toBeDefined();

    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByPlaceholderText('Seu nome visível...')).toBeNull();
    expect(defaultProps.navigate).not.toHaveBeenCalled();
  });

  it('calls processFile when a file is selected via the file picker', async () => {
    const { container } = render(<UserProfilePage {...defaultProps} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    const file = new File(['dummy content'], 'profile.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(defaultProps.processFile).toHaveBeenCalledWith(file);
    });
  });

  it('displays error message when fileError prop is set', () => {
    const errorMsg = 'Por favor, selecione uma imagem.';
    render(<UserProfilePage {...defaultProps} fileError={errorMsg} />);

    expect(screen.getByText(errorMsg)).toBeDefined();
  });

  it('handles drag-and-drop operations on the zone correctly', async () => {
    render(<UserProfilePage {...defaultProps} />);

    const dropzone = document.getElementById('avatar-photo-upload-card');
    expect(dropzone).not.toBeNull();

    fireEvent.dragOver(dropzone!);
    expect(dropzone!.className).toContain('border-brand-ochre');

    fireEvent.dragLeave(dropzone!);
    expect(dropzone!.className).not.toContain('border-brand-ochre');

    const file = new File(['dummy content'], 'profile.png', { type: 'image/png' });
    fireEvent.drop(dropzone!, { dataTransfer: { files: [file] } });

    await waitFor(() => {
      expect(defaultProps.processFile).toHaveBeenCalledWith(file);
    });
  });
});
