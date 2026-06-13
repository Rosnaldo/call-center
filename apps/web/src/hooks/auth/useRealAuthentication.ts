/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useKeycloak } from '@/src/providers/auth-provider';

export function useRealAuthentication() {
	const { isAuthenticated, login, logout } = useKeycloak();

	return {
		isAuthenticated,
		login,
		logout,
	};
}
