export interface Call {
  id: string;
  customerId: string;
  customerName: string;
  attendantId: string;
  attendantName: string;
  roomUrl: string;
}

export interface CallParticipantPresence {
  id: string;
  userId: string;
  role: 'customer' | 'attendant';
  joineAt?: Date;
  leftAt?: Date;
  callId: string;
}
