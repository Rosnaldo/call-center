import { useNavigate } from "react-router-dom";
import { useAuthentication } from "../hooks/auth/useAuthentication";
import { useEffect } from "react";
import { SimulationLogin } from "../components/login/SimulationLogin";
import properties from '../properties';

export function LoginPage() {
    const { login, isAuthenticated } = useAuthentication();
    const navigate = useNavigate();
    const { isSimulation } = properties;

    useEffect(() => {
        if (isSimulation) return;

        const redirectToKeycloak = !isAuthenticated;
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