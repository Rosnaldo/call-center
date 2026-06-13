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
    onLogout: vi.fn(),
    navigate: vi.fn(),
    onUpdateProfile: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a warning if currentUser is not logged in', () => {
    render(<UserProfilePage {...defaultProps} currentUser={null} />);

    expect(screen.getByText('Por favor, conecte-se com um dos usuários de teste no simulador.')).toBeDefined();

    const loginButton = screen.getByText('Ir para Login');
    expect(loginButton).toBeDefined();

    fireEvent.click(loginButton);
    expect(defaultProps.navigate).toHaveBeenCalledWith('login');
  });

  it('renders the configuration form correctly with initialized values when the customer user is logged in', () => {
    render(<UserProfilePage {...defaultProps} />);

    expect(screen.getByTestId('mock-header')).toBeDefined();

    expect(screen.getByText('Profile')).toBeDefined();
    expect(screen.getByText('Voltar para a área de Cliente')).toBeDefined();

    // Name shown as text in view mode
    expect(screen.getByText('John Customer')).toBeDefined();

    // Avatar URL input is always visible
    const urlInput = screen.getByPlaceholderText('https://exemplo.com/suafoto.jpg') as HTMLInputElement;
    expect(urlInput.value).toBe('https://avatar/1');
  });

  it('renders correct labels when the attendant user is logged in', () => {
    render(<UserProfilePage {...defaultProps} currentUser={buildOnlineUserState({ role: 'attendant' })} />);

    expect(screen.getByText('Voltar para a área de Agente')).toBeDefined();
  });

  it('updates input state as values are typed into display name and avatar URL fields', () => {
    render(<UserProfilePage {...defaultProps} />);

    fireEvent.click(screen.getByText('Edit'));

    const nameInput = screen.getByPlaceholderText('Seu nome visível...') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'New Custom Name' } });
    expect(nameInput.value).toBe('New Custom Name');

    const urlInput = screen.getByPlaceholderText('https://exemplo.com/suafoto.jpg') as HTMLInputElement;
    fireEvent.change(urlInput, { target: { value: 'https://new-image.jpg' } });
    expect(urlInput.value).toBe('https://new-image.jpg');
  });

  it('does not invoke onUpdateProfile if name input is cleared and form is submitted', () => {
    render(<UserProfilePage {...defaultProps} />);

    fireEvent.click(screen.getByText('Edit'));

    const nameInput = screen.getByPlaceholderText('Seu nome visível...') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: '   ' } });

    fireEvent.click(screen.getByText('Save'));

    expect(defaultProps.onUpdateProfile).not.toHaveBeenCalled();
  });

  it('triggers onUpdateProfile correctly and navigates back to active portal on successful form submit after timeout', async () => {
    vi.useFakeTimers();

    render(<UserProfilePage {...defaultProps} />);

    fireEvent.click(screen.getByText('Edit'));

    const nameInput = screen.getByPlaceholderText('Seu nome visível...') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Updated Client' } });

    const urlInput = screen.getByPlaceholderText('https://exemplo.com/suafoto.jpg') as HTMLInputElement;
    fireEvent.change(urlInput, { target: { value: 'https://final-avatar.png' } });

    fireEvent.click(screen.getByText('Save'));

    expect(defaultProps.onUpdateProfile).toHaveBeenCalledWith('cust-1', 'Updated Client', 'https://final-avatar.png');

    act(() => {
      vi.advanceTimersByTime(1500);
    });

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

    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByPlaceholderText('Seu nome visível...')).toBeDefined();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByPlaceholderText('Seu nome visível...')).toBeNull();
    expect(defaultProps.navigate).not.toHaveBeenCalled();
  });

  it('handles image file selection via file picker correctly and processes FileReader', async () => {
    const { container } = render(<UserProfilePage {...defaultProps} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    const file = new File(['dummy content'], 'profile.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const imgPreview = screen.getByAltText('John Customer') as HTMLImageElement;

    await waitFor(() => {
      expect(imgPreview.src).toContain('data:image/png;base64,mockedbase64string');
    });
  });

  it('displays error message on selection of an invalid, non-image file type', () => {
    const { container } = render(<UserProfilePage {...defaultProps} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['text content'], 'info.txt', { type: 'text/plain' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText('O arquivo deve ser uma imagem JPG ou PNG.')).toBeDefined();
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
    fireEvent.drop(dropzone!, {
      dataTransfer: { files: [file] },
    });

    const imgPreview = screen.getByAltText('John Customer') as HTMLImageElement;
    await waitFor(() => {
      expect(imgPreview.src).toContain('data:image/png;base64,mockedbase64string');
    });
  });
});
