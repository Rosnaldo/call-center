import { useCallStore, useCallViewStore, useChatStore, useIncomingCallStore, useTimerStore } from './stores.ts';

// Clears every store that reflects "currently in a call" so a stale call
// can't survive a disconnect, logout, or tab close and reappear when the
// user comes back — see init-ws.ts (ws.onclose), useLogout.ts, and
// App.tsx (beforeunload).
export function resetCallState(): void {
  useTimerStore.getState().reset();
  useCallViewStore.getState().resetCallViewState();
  useCallStore.setState({ call: null });
  useIncomingCallStore.setState({ incomingCall: null });
  useChatStore.getState().resetChat();
}
