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


## IN Dev

Install mkcert:  
```
sudo apt install libnss3-tools

curl -JLO https://dl.filippo.io/mkcert/latest?for=linux/amd64
chmod +x mkcert-v*-linux-amd64
sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert

mkcert -install
```

generate certificate:  
```
mkcert free-porn-block.com
```

config nginx:

```
ssl_certificate     /etc/nginx/certs/free-porn-block.com.pem;
ssl_certificate_key /etc/nginx/certs/free-porn-block.com-key.pem;
```

add to local host:  
```
127.0.0.1 free-porn-block.com
```
