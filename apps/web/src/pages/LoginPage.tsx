import { useNavigate } from "react-router-dom";
import { useAuthentication } from "../hooks/auth/useAuthentication";
import { useEffect } from "react";

export function LoginPage() {
    const { login, isAuthenticated } = useAuthentication();
    const navigate = useNavigate();

    useEffect(() => {
        const redirectToKeycloak = !isAuthenticated;
        if (redirectToKeycloak) {
            login(); // 🔁 redirects to Keycloak
        } else {
            navigate("/painel");
        }
    }, [isAuthenticated, login]);

    return null; // nothing to render
}
