/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OnlineUserState } from "./state";

const now = new Date();

export const MOCK_ATTENDANTS: OnlineUserState[] = [
  {
    id: 'att-alex',
    name: 'Alex Mercer',
    slug: 'alex-mercer',
    email: 'alex.mercer@meetqueue.dev',
    role: 'attendant',
    status: 'idle',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'att-samantha',
    name: 'Samantha Cruz',
    slug: 'samantha-cruz',
    email: 'samantha.cruz@meetqueue.dev',
    role: 'attendant',
    status: 'idle',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'att-marcus',
    name: 'Marcus Vance',
    slug: 'marcus-vance',
    email: 'marcus.vance@meetqueue.dev',
    role: 'attendant',
    status: 'idle',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=120',
    createdAt: now,
    updatedAt: now,
  }
];

export const MOCK_CUSTOMERS: OnlineUserState[] = [
  {
    id: 'cust-emily',
    name: 'Emily Blunt',
    slug: 'emily-blunt',
    email: 'emily.blunt@example.com',
    role: 'customer',
    status: 'idle',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=120',
    tokens: 10,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'cust-david',
    name: 'David Miller',
    slug: 'david-miller',
    email: 'david.miller@example.com',
    role: 'customer',
    status: 'idle',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120',
    tokens: 10,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'cust-sophia',
    name: 'Sophia Wang',
    slug: 'sophia-wang',
    email: 'sophia.wang@example.com',
    role: 'customer',
    status: 'idle',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120',
    tokens: 10,
    createdAt: now,
    updatedAt: now,
  }
];

export const MOCK_USERS: OnlineUserState[] = [
  ...MOCK_ATTENDANTS,
  ...MOCK_CUSTOMERS
];
