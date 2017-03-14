var os = require('os');
var HashRing = require('hashring');
var request = require('request');
var http = require('http');
var URL = require('url');
var accessToken, tokenType, appId, hashRingIndexes, appName, doPolling = true;
var _domain = process.env.domain;
var _userName = process.env.username;
var _password = process.env.password;
var apiUrl = 'https://api.'+_domain;
getAuthenticationToken(true, function(err){
    if(err){
        console.error(err);
    }
});
var server = http.createServer(function(req, res) {
    console.log("req. headers" , req.headers);
    var url = req.headers['x-cf-forwarded-url'];
    console.log("Redirecting url , ", url);
    console.log("ENV \n", process.env);
    if (url) {
        tempUrl = url.replace(/(^\w+:|^)\/\//, '');
        appName = tempUrl.substring(0, tempUrl.indexOf('.'));
        pathName = URL.parse(url).pathname;
        var regex = /^\/api\/(.*)\/(.*)/;
        var apiMatch = pathName.match(regex);
        if(appId){
            if(hashRingIndexes && hashRingIndexes.length > 0){
                if(apiMatch){
                    var ring = new HashRing(hashRingIndexes, 'md5', { 'max cache size': 10000 });
                    setHeaders(req, apiMatch);
                    req.headers['X-Cf-App-Instance'] = ring.get(apiMatch[1].toLowerCase()+ '/' + apiMatch[2]);
                }
                req.pipe(request(url)).pipe(res);
            } else {
                getIndexes(function(err){
                    if(err){
                        console.error("Error: ", err);
                    } else {
                        var ring = new HashRing(hashRingIndexes, 'md5', { 'max cache size': 10000 });
                        setHeaders(req, apiMatch);
                        req.headers['X-Cf-App-Instance'] = ring.get(apiMatch[1].toLowerCase()+ '/' + apiMatch[2]);
                    }
                    req.pipe(request(url)).pipe(res);
                });
            }
        } else {
            getAppId(true, function(err){
                if (err) {
                    console.error("Error: ", err);
                } else {
                    var ring = new HashRing(hashRingIndexes, 'md5', { 'max cache size': 10000 });
                    setHeaders(req, apiMatch);
                    req.headers['X-Cf-App-Instance'] = ring.get(apiMatch[1].toLowerCase()+ '/' + apiMatch[2]);
                }
                req.pipe(request(url)).pipe(res);
            });
        }
    } else {
        res.end("ERROR: Unable to get the URL to redirect to.");
    }
});

function setHeaders(req, apiMatch){
    req.headers['x-evproxy-model-plural'] = apiMatch[1].toLowerCase();
    req.headers['x-evproxy-model-id'] = apiMatch[2];
    req.headers['x-evproxy-hash-key'] = apiMatch[1].toLowerCase()+ '/' + apiMatch[2];
}

function getData(reqObject, cb) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    request(reqObject, function (err, res, body) {
      return cb(err, body);
    });
}
function getAppId(doProceed, cb){
    var path = apiUrl + '/v2/apps';
    var httpsOptions = {
        uri: path,
        method : 'GET',
        headers : {
            Authorization: tokenType + ' ' +  accessToken,
            Cookie: ''
        }
    };
    getData(httpsOptions, function(err, res){
        if(err) {
            cb(err);
        } else {
            body = JSON.parse(res);
            console.log("All apps response ", JSON.stringify(body));
            if(body.code && body.code === 1000){
                getAuthenticationToken(true, function(err){
                    if(err){
                        console.error(err);
                    }
                });
            } else if (body.resources){
                for(var i=0;i<body.resources.length;i++){
                    if(body.resources[i].entity.name === appName){
                        console.log("Got the application name.")
                        appId = body.resources[i].metadata.guid;
                        break;
                    }
                }
                if(appId) {
                    if(doProceed){
                        getIndexes(cb);
                    } else {
                        cb();
                    }
                } else {
                    cb("Unable to get Application GUID.");
                }
            } else {
                cb("Response format is not proper.");
            }
        }
    });
}

function getIndexes(cb){
    var path = apiUrl + '/v2/apps/'+appId+'/stats';
    var httpsOptions = {
        uri: path,
        method : 'GET',
        headers : {
            Authorization: tokenType + ' ' +  accessToken,
            Cookie: ''
        }
    };
    getData(httpsOptions, function(err, res){
        if(err){
            cb(err);
        } else {
            body = JSON.parse(res);
            if(body.code && body.code === 1000){
                getAuthenticationToken(true, function(err){
                    if(err){
                        console.error(err);
                    }
                });
            } else {
                var indexes = [];
                Object.keys(body).forEach(function(key){
                    if(body[key].state === 'RUNNING'){
                        indexes.push(key);
                    }
                });            
                if(indexes.length > 0){
                    hashRingIndexes = [];
                    indexes.forEach(function(index){
                        hashRingIndexes.push(appId+':'+index);
                    });
                    if(doPolling){
                        doPolling = false;
                        startPolling();
                    }
                    cb();
                } else {
                    cb("No running instances of application.")
                }
            }            
        }
    });
}
function getAuthenticationToken(doProceed, cb){
    var path = 'https://login'+_domain+'/oauth/token'

    var method = 'POST';
    var body = {
      'username': _userName,
      'password': _password,
      'client_id': 'cf',
      'grant_type': 'password',
      'response_type': 'token'
    };

    var header = {
      'Accept': 'Application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    };
    var httpsOptions = {
      uri: path,
      method: method,
      form: body,
      headers: header,
      auth: { 'user': 'cf' }
    }
    getData(httpsOptions, function (err, res) {   
        try {
            if(err){
                cb(err);
            } else {
                res = JSON.parse(res);
                if (res.access_token) {
                    accessToken = res.access_token;
                    tokenType = res.token_type;
                    if(doProceed){
                        getAppId(doProceed, cb);
                    } else {
                        cb();
                    }                    
                } else{
                    cb("Unable to get access token, response body " + JSON.stringify(res));
                }   
            }
        } catch(err2) {
            cb(err2);
        }         
    });
}

function startPolling(){
    setInterval(function(){
        getIndexes(function(err){
            console.error(err);
        });
    }, 60000);
}
server.listen(process.env.PORT || 3000);