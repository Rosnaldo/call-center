import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmCloseCallModal } from '../../ConfirmCloseCallModal.tsx';
import { BillingCalculationModal } from '../../BillingCalculationModal.tsx';
import { BillingSummaryModal } from '../../BillingSummaryModal.tsx';
import { MediaSettingsModal } from '../../MediaSettingsModal.tsx';
import { buildCall, buildOnlineUserState } from '../../../../__tests__/builders.ts';
import { useBillingStore } from '../../../../states/stores.ts';

vi.mock('../../../../hooks/useDevices.ts', () => ({ useDevices: vi.fn() }));
vi.mock('../../../../hooks/useMediaTest.ts', () => ({ useMediaTest: vi.fn() }));

import { useDevices } from '../../../../hooks/useDevices.ts';
import { useMediaTest } from '../../../../hooks/useMediaTest.ts';

const defaultDevicesMock = {
  cameras: [{ deviceId: 'cam-1', label: 'FaceTime HD Camera' }],
  microphones: [{ deviceId: 'mic-1', label: 'Built-in Microphone' }],
  speakers: [{ deviceId: 'spk-1', label: 'Built-in Speaker' }],
  selectedCamera: 'cam-1',
  selectedMicrophone: 'mic-1',
  selectedSpeaker: 'spk-1',
  setSelectedCamera: vi.fn(),
  setSelectedMicrophone: vi.fn(),
  setSelectedSpeaker: vi.fn(),
};

const defaultMediaTestMock = {
  videoRef: { current: null },
  micLevel: 0,
  startTest: vi.fn(),
  stopTest: vi.fn(),
};

describe('Modals Rendering and Behavior Unit Tests', () => {

  describe('ConfirmCloseCallModal', () => {
    it('should not render anything when isOpen is false', () => {
      const { container } = render(
        <ConfirmCloseCallModal
          isOpen={false}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render correct elements when isOpen is true for customer', () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      const { container } = render(
        <ConfirmCloseCallModal
          isOpen={true}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );

      expect(screen.getByText('Encerrar Chamada?')).toBeDefined();
      expect(screen.getByText(/Esta ação não pode ser desfeita/i)).toBeDefined();

      const cancelBtn = container.querySelector('#cancel-close-call-btn');
      const confirmBtn = container.querySelector('#confirm-close-call-btn');

      expect(cancelBtn).not.toBeNull();
      expect(confirmBtn).not.toBeNull();

      if (cancelBtn) {
        fireEvent.click(cancelBtn);
        expect(onCancel).toHaveBeenCalledTimes(1);
      }

      if (confirmBtn) {
        fireEvent.click(confirmBtn);
        expect(onConfirm).toHaveBeenCalledTimes(1);
      }
    });

    it('should always show warning message regardless of isAttendant', () => {
      render(
        <ConfirmCloseCallModal
          isOpen={true}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByText('Encerrar Chamada?')).toBeDefined();
      expect(screen.getByText(/Esta ação não pode ser desfeita/i)).toBeDefined();
    });
  });

  describe('BillingCalculationModal', () => {
    it('should return null when isOpen is false', () => {
      const { container } = render(
        <BillingCalculationModal isOpen={false} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render processing text for normal Customer', () => {
      render(<BillingCalculationModal isOpen={true} isAttendant={false} />);
      expect(screen.getByText('Finalizando Atendimento')).toBeDefined();
      expect(screen.getByText('Aguardando cálculo oficial de consumo de tokens...')).toBeDefined();
      expect(screen.getByText('♦ PROCESSANDO VALOR OFICIAL')).toBeDefined();
    });

    it('should render processing text for Attendant', () => {
      render(<BillingCalculationModal isOpen={true} isAttendant={true} />);
      expect(screen.getByText('Finalizando Atendimento')).toBeDefined();
      expect(screen.getByText('Processando resumo e dados consolidados do atendimento...')).toBeDefined();
      expect(screen.getByText('♦ PROCESSANDO ATENDIMENTO')).toBeDefined();
    });
  });

  describe('BillingSummaryModal', () => {
    it('should not render when isOpen is false or completedCallSummary is null', () => {
      const { container: container1 } = render(
        <BillingSummaryModal
          callDurationSeconds={0}
          isOpen={false}
          completedCallSummary={buildCall()}
          currentUser={buildOnlineUserState({ role: 'customer' })}
          onClose={vi.fn()}
        />
      );
      expect(container1.firstChild).toBeNull();

      const { container: container2 } = render(
        <BillingSummaryModal
          callDurationSeconds={0}
          isOpen={true}
          completedCallSummary={null}
          currentUser={buildOnlineUserState({ role: 'customer' })}
          onClose={vi.fn()}
        />
      );
      expect(container2.firstChild).toBeNull();
    });

    it('renders customer billed summaries', () => {
      useBillingStore.setState({ initialTokens: 5 });
      const onClose = vi.fn();
      const { container } = render(
        <BillingSummaryModal
          callDurationSeconds={0}
          isOpen={true}
          completedCallSummary={buildCall({ attendantName: 'Dr. John' })}
          currentUser={buildOnlineUserState({ role: 'customer' })}
          onClose={onClose}
        />
      );

      expect(screen.getByText('Atendimento Finalizado')).toBeDefined();
      expect(screen.getByText(/Sua chamada com/i)).toBeDefined();
      expect(screen.getByText('Dr. John')).toBeDefined();
      expect(screen.getByText('Custo Total')).toBeDefined();
      expect(screen.getByText('Faturado')).toBeDefined();
      expect(screen.getByText('5')).toBeDefined();
      expect(screen.getByText('Tokens')).toBeDefined();
      expect(screen.getByText('00:00')).toBeDefined();

      const okButton = container.querySelector('#close-summary-btn');
      expect(okButton).not.toBeNull();
      if (okButton) {
        fireEvent.click(okButton);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });

    it('renders singular token word when initialTokens is 1', () => {
      useBillingStore.setState({ initialTokens: 1 });
      render(
        <BillingSummaryModal
          callDurationSeconds={0}
          isOpen={true}
          completedCallSummary={buildCall({ attendantName: 'Dr. John' })}
          currentUser={buildOnlineUserState({ role: 'customer' })}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText('1')).toBeDefined();
      expect(screen.getByText('Token')).toBeDefined();
      expect(screen.queryByText('Tokens')).toBeNull();
      expect(screen.getByText('00:00')).toBeDefined();
    });

    it('renders attendant receive summaries', () => {
      useBillingStore.setState({ initialTokens: 5 });
      render(
        <BillingSummaryModal
          callDurationSeconds={0}
          isOpen={true}
          completedCallSummary={buildCall({ customerName: 'Alice Mary' })}
          currentUser={buildOnlineUserState({ role: 'attendant' })}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText(/Seu atendimento com/i)).toBeDefined();
      expect(screen.getByText('Alice Mary')).toBeDefined();
      expect(screen.getByText('Tokens faturados')).toBeDefined();
      expect(screen.getByText('Recebido')).toBeDefined();
    });
  });

  describe('MediaSettingsModal', () => {
    beforeEach(() => {
      vi.mocked(useDevices).mockReturnValue(defaultDevicesMock as any);
      vi.mocked(useMediaTest).mockReturnValue(defaultMediaTestMock as any);
    });

    it('should return null when isOpen is false', () => {
      const { container } = render(<MediaSettingsModal isOpen={false} onClose={vi.fn()} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders correctly with options, controls, and triggers onClose on click', () => {
      const onClose = vi.fn();
      render(<MediaSettingsModal isOpen={true} onClose={onClose} />);

      expect(screen.getByText('Configurações de Áudio e Vídeo')).toBeDefined();
      expect(screen.getByText('FaceTime HD Camera')).toBeDefined();
      expect(screen.getByText('Built-in Microphone')).toBeDefined();
      expect(screen.getByText('Built-in Speaker')).toBeDefined();

      fireEvent.click(screen.getByText('Concluído'));
      expect(onClose).toHaveBeenCalled();
    });

    it('renders list fallback options when no devices detected', () => {
      vi.mocked(useDevices).mockReturnValue({
        ...defaultDevicesMock,
        cameras: [],
        microphones: [],
        speakers: [],
      } as any);

      render(<MediaSettingsModal isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText('Nenhuma câmera detectada')).toBeDefined();
      expect(screen.getByText('Nenhum microfone detectado')).toBeDefined();
      expect(screen.getByText('Dispositivo de áudio padrão')).toBeDefined();
    });

    it('renders camera video element when open', () => {
      const { container } = render(<MediaSettingsModal isOpen={true} onClose={vi.fn()} />);
      expect(container.querySelector('video')).not.toBeNull();
    });

    it('calls startTest with selected devices on open', () => {
      const startTest = vi.fn();
      vi.mocked(useMediaTest).mockReturnValue({ ...defaultMediaTestMock, startTest } as any);

      render(<MediaSettingsModal isOpen={true} onClose={vi.fn()} />);

      expect(startTest).toHaveBeenCalledWith('cam-1', 'mic-1');
    });
  });
});
