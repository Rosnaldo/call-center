/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OnlineUserState } from "./state";

export const MOCK_ATTENDANTS: OnlineUserState[] = [
  {
    id: 'att-alex',
    name: 'Alex Mercer',
    email: 'alex.mercer@meetqueue.dev',
    role: 'attendant',
    status: 'idle',
    isOnline: true,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120'
  },
  {
    id: 'att-samantha',
    name: 'Samantha Cruz',
    email: 'samantha.cruz@meetqueue.dev',
    role: 'attendant',
    status: 'idle',
    isOnline: true,
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120'
  },
  {
    id: 'att-marcus',
    name: 'Marcus Vance',
    email: 'marcus.vance@meetqueue.dev',
    role: 'attendant',
    status: 'idle',
    isOnline: true,
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=120'
  }
];

export const MOCK_CUSTOMERS: OnlineUserState[] = [
  {
    id: 'cust-emily',
    name: 'Emily Blunt',
    email: 'emily.blunt@example.com',
    role: 'customer',
    status: 'idle',
    isOnline: true,
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=120',
    tokens: 10
  },
  {
    id: 'cust-david',
    name: 'David Miller',
    email: 'david.miller@example.com',
    role: 'customer',
    status: 'idle',
    isOnline: true,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120',
    tokens: 10
  },
  {
    id: 'cust-sophia',
    name: 'Sophia Wang',
    email: 'sophia.wang@example.com',
    role: 'customer',
    status: 'idle',
    isOnline: true,
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120',
    tokens: 10
  }
];

export const MOCK_USERS: OnlineUserState[] = [
  ...MOCK_ATTENDANTS,
  ...MOCK_CUSTOMERS
];
