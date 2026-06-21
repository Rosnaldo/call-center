export interface SendIncomingCallPayload {
    customerId: string;
    attendantId: string;
}

export type IamWebhookBody =
    | { event: 'send_incoming_call'; payload: SendIncomingCallPayload };
