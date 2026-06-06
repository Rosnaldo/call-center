import type React from "react";
import { Navigate } from "react-router-dom";

const isAuthenticated = (): boolean => false

export function PublicRoute({ children }: { children: React.ReactElement }) {
    if (isAuthenticated()) {
        return <Navigate to="/users" replace />;
    }
    return children;
}
