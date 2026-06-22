export interface SendIncomingCallPayload {
    customerId: string;
    attendantId: string;
    calledBy: string;
}

export interface CancelIncomingCallPayload {
    customerId: string;
    attendantId: string;
}

export interface AcceptCallPayload {
    customerId: string;
    attendantId: string;
}

export type IamWebhookBody =
    | { event: 'incoming_call_sent'; payload: SendIncomingCallPayload }
    | { event: 'incoming_call_cancelled'; payload: CancelIncomingCallPayload }
    | { event: 'call_accepted'; payload: AcceptCallPayload };
