export type UserRole = 'customer' | 'attendant';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  tokens?: number;
}
