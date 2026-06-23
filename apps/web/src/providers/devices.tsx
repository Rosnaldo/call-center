import { createContext, useContext } from "react";
import { useConfigDevices } from "../hooks/useConfigDevices";

type DevicesContextValue = ReturnType<typeof useConfigDevices>;

const DevicesContext = createContext<DevicesContextValue | null>(null);

export function DevicesProvider({ children }: { children: React.ReactNode }) {
  const devices = useConfigDevices();
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
