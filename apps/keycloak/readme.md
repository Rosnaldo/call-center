docker cp my-themes keycloak:/opt/keycloak/themes/

docker compose restart keycloak

## keycloak admin portal
http://localhost:8080/admin

## keycloak login
http://localhost:8080/realms/poc/protocol/openid-connect/auth?client_id=login&redirect_uri=http://localhost:8080&response_type=code&scope=openid
