The registry (registro.com.br) delegates DNS authority to the Hostinger nameservers (DNS servers operated by Hostinger).

```
ns1.hostinger.com
ns2.hostinger.com
```

In the Hostinger DNS panel, we create DNS A records that associate the domain with the server's IP address.

Ex: 
| Type | Name/Host             | Value            |
| ---- | --------------------- | ---------------- |
| A    | `@`                   | `177.131.75.180` |
| A    | `nanithefuck.com`     | `177.131.75.180` |


- Certbot ACME challenge:
- Registry: Registro.br
- DNS/hosting provider: Hostinger
- Web server: Nginx
- CA: Let’s Encrypt
- ACME client: Certbot

The command:
`certbot certonly --nginx -d domain.com.br`

- runs the ACME challenge (/.well-known/acme-challenge)
- generates a private/public key pair
- creates a CSR (Certificate Signing Request)
- obtains a signed certificate from the CA

domain-key.pem → private key

domain.pem → signed certificate containing:
- the public key
- the domain name
- issuer information
- validity dates
- the CA digital signature


This challenge validates who controls the domain. The command must be executed inside the Hostinger VM/container where Nginx is listening on ports 80 and 443.

The port 80 redirects http requests to https.
The port 443 makes TLS handshake for encryption and validation.

The private key remains stored on the private server. The private key is used to prove the server's identity.
