import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { useIncomingCallStore } from '../../stores.ts';
import * as incomingCallsService from '../../../services/api/incoming-calls.ts';

const ATTENDANT_ID = 'att-send-incoming-call-test-1';
const CUSTOMER_ID = 'cust-send-incoming-call-test-1';

afterEach(() => {
  vi.restoreAllMocks();
});

// Business validation (tokens, attendant status, customer/attendant identity)
// lives in IAM's /incoming-calls/send controller now, not here — see
// apps/iam/tests/controller/incoming_call/send.test.ts for that coverage.
describe('sendIncomingCall action', () => {
  beforeEach(() => {
    vi.spyOn(incomingCallsService, 'sendIncomingCall').mockResolvedValue(undefined);
  });

  it('POST /incoming-calls/send é chamado com customerId e attendantId corretos', async () => {
    await useIncomingCallStore.getState().sendIncomingCall(CUSTOMER_ID, ATTENDANT_ID);

    expect(incomingCallsService.sendIncomingCall).toHaveBeenCalledWith(CUSTOMER_ID, ATTENDANT_ID);
  });

  it('não chama o serviço quando customerId está ausente', async () => {
    await useIncomingCallStore.getState().sendIncomingCall(undefined, ATTENDANT_ID);

    expect(incomingCallsService.sendIncomingCall).not.toHaveBeenCalled();
  });

  it('não chama o serviço quando attendantId está ausente', async () => {
    await useIncomingCallStore.getState().sendIncomingCall(CUSTOMER_ID, null);

    expect(incomingCallsService.sendIncomingCall).not.toHaveBeenCalled();
  });
});
