/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSimulateAuthentication } from './useSimulateAuthentication.ts';
import { useKeycloak } from './useKeycloak.ts';

export function useAuthentication() {
  const isSimulation = (import.meta as any).env?.VITE_ENV !== 'production';

  const simulateAuth = useSimulateAuthentication();
  const keycloakAuth = useKeycloak();

  return isSimulation ? simulateAuth : keycloakAuth;
}
