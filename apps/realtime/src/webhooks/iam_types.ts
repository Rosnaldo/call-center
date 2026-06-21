export interface SendIncomingCallPayload {
    customerId: string;
    attendantId: string;
}

export interface CancelIncomingCallPayload {
    customerId: string;
    attendantId: string;
}

export type IamWebhookBody =
    | { event: 'send_incoming_call'; payload: SendIncomingCallPayload }
    | { event: 'cancel_incoming_call'; payload: CancelIncomingCallPayload };
