var express = require('express');
var proxy = require('express-http-proxy');
var app = express();
var os = require('os');
 
app.all('*', proxy('https://node-consist-app.cfapps.io/', {
    decorateRequest: function(proxyReq, originalReq) {
        
        console.log("originalReq url ", originalReq.url);
        console.log("proxyReq headers ", proxyReq.headers);
        originalReq.headers['Added-Proxy-2'] = 'express-http-proxy-2';
        proxyReq.headers['Added-Proxy'] = 'express-http-proxy';
        console.log("originalReq headers ", originalReq.headers);
        return proxyReq;
    }
}));
 
app.listen(process.env.PORT || 3000);