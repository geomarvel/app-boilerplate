const bootstrap = require('./src/bootstrap');
const httpShutdown = require('http-shutdown');
const http = require('http');
const config =  require('config')

bootstrap.boot()
.then(app => new Promise((resolve, reject) => {
    const server = httpShutdown(http.createServer(app)); 
    
    server.on('error', reject);
    server.listen(config.port, () => {
        console.log('Server is running on',server.address());
        resolve();
    });

}))
.catch((err) => {
    console.log(err)
});