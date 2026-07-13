import React, { Suspense, useEffect } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { useCallQuery } from '../queries/call/query';
import { useCallStore } from '../states/stores';

interface Props {
  userId: string;
}

// Initial bootstrap for call state, mirroring UserListsContainer's flow for
// onlineUsers: GET /calls/get-by-user seeds the store once on mount, then the
// call-events SSE stream (update_call/call_synced — see init-call-events.ts)
// is what actually keeps it in sync afterward.
function CallQueryFetcher({ userId }: Props) {
  const { data: initialCall } = useCallQuery(userId);
  const updateCall = useCallStore((s) => s.updateCall);

  useEffect(() => {
    updateCall(initialCall);
  }, [initialCall]);

  return null;
}

export const CallQuerySync: React.FC<Props> = (props) => {
  return (
    <ErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <CallQueryFetcher {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};
