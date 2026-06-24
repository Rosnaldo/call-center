/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRealAuthentication } from './useRealAuthentication.ts';
import { useSimulateAuthentication } from './useSimulateAuthentication.ts';
import properties from '../../properties';

export function useAuthentication() {
  const { isSimulation } = properties;

  const simulateAuth = useSimulateAuthentication();
  const realAuth = useRealAuthentication();

  return isSimulation ? simulateAuth : realAuth;
}
