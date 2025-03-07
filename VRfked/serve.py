from http.server import HTTPServer, SimpleHTTPRequestHandler
import ssl

def run_https_server():
    # Create server
    server_address = ('', 8000)
    httpd = HTTPServer(server_address, SimpleHTTPRequestHandler)
    
    # Create SSL context
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain('cert.pem', 'key.pem')
    
    # Wrap the socket with SSL
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    
    print('Serving HTTPS on port 8000...')
    print('You can access the site at:')
    print('https://your-local-ip:8000')
    httpd.serve_forever()

if __name__ == '__main__':
    run_https_server() 