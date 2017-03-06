var os = require('os');
var HashRing = require('hashring');
var request = require('request');
var http = require('http');
var server = http.createServer(function(req, res) {
    console.log("req. headers" , req.headers);
    var url = req.headers['x-cf-forwarded-url'];
    console.log("Redirecting url , ", url);
    console.log("ENV \n", process.env);
    var ring = new HashRing([
            "6cab216e-49aa-4d8e-844b-72aabb880f4b:0", 
            "6cab216e-49aa-4d8e-844b-72aabb880f4b:1"
        ], 'md5', {
            'max cache size': 10000
        });
    req.headers['X-Cf-App-Instance'] = ring.get(url);
    req.pipe(request(url)).pipe(res);
});
server.listen(process.env.PORT || 3000);