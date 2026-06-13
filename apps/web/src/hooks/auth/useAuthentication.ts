/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRealAuthentication } from './useRealAuthentication.ts';
import { useSimulateAuthentication } from './useSimulateAuthentication.ts';

export function useAuthentication() {
  const isSimulation = (import.meta as any).env?.VITE_ENV === 'simulation';

  const simulateAuth = useSimulateAuthentication();
  const realAuth = useRealAuthentication();

  return isSimulation ? simulateAuth : realAuth;
}
