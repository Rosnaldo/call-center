import { useNavigate } from "react-router-dom";
import { useAuthentication } from "../hooks/auth/useAuthentication";
import { useEffect } from "react";
import { SimulationLogin } from "../components/login/SimulationLogin";

export function LoginPage() {
    const { login, isAuthenticated } = useAuthentication();
    const navigate = useNavigate();
    const isSimulation = (import.meta as any).env?.VITE_ENV === 'simulation';

    useEffect(() => {
        if (isSimulation) return;
        const redirectToKeycloak = !isAuthenticated;

        console.log("LoginPage: isAuthenticated =", isAuthenticated, "redirectToKeycloak =", redirectToKeycloak);
        if (redirectToKeycloak) {
            login(); // 🔁 redirects to Keycloak
        } else {
            navigate("/painel");
        }
    }, [isAuthenticated, login]);

    if (isSimulation) {
      return <SimulationLogin />;
    }

    return null; // nothing to render
}