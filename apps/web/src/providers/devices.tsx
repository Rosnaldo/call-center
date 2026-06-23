import { createContext, useContext } from "react";
import { useDevices } from "../hooks/useDevices";

type DevicesContextValue = ReturnType<typeof useDevices>;

const DevicesContext = createContext<DevicesContextValue | null>(null);

export function DevicesProvider({ children }: { children: React.ReactNode }) {
  const devices = useDevices();
  return (
    <DevicesContext.Provider value={devices}>
      {children}
    </DevicesContext.Provider>
  );
}

export function useDevicesContext(): DevicesContextValue {
  const ctx = useContext(DevicesContext);
  if (!ctx) throw new Error("useDevicesContext must be used within DevicesProvider");
  return ctx;
}
