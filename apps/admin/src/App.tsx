import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner"

import UsersPage from "./page/users";
import ProfilePage from "./page/profile";
import NotFound from "./page/not-found";
import Unauthorized from "./page/unauthorized";
import { ProtectedRoute } from "./protected-route";
import LoginPage from "./page/login";
import { AuthProvider } from "./providers/auth-provider";
import { ThemeProvider } from 'next-themes';

export default function App() {
    const queryClient = new QueryClient();
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <ThemeProvider>
                    <Toaster />
                    <BrowserRouter basename={import.meta.env.VITE_BASE_PATH}>
                        <Routes>
                            <Route path="/" element={<Navigate to="/login" replace />} />
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/unauthorized" element={<Unauthorized />} />

                            <Route element={<ProtectedRoute />}>
                                <Route path="/users" element={<UsersPage />} />
                                <Route path="/profile" element={<ProfilePage />} />
                            </Route>

                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </BrowserRouter>
                </ThemeProvider>
            </AuthProvider>
        </QueryClientProvider>
    )
}
