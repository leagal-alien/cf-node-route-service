var os = require('os');
var HashRing = require('hashring');
var request = require('request');
var http = require('http');
var accessToken, tokenType, appId, hashRingIndexes, appName;
var apiUrl = 'https://api.run.pivotal.io';
var _userName = 'pradeepkumartippa@gmail.com';
var _password = '$Pivotal999';
getAuthenticationToken(false, function(err){
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
        if(appId){
            if(hashRingIndexes && hashRingIndexes.length > 0){
                var ring = new HashRing(hashRingIndexes, 'md5', { 'max cache size': 10000 });
                req.headers['X-Cf-App-Instance'] = ring.get(url);
                req.pipe(request(url)).pipe(res);
            } else {
                getIndexes(function(err){
                    if(err){
                        console.error("Error: ", err);
                    } else {
                        var ring = new HashRing(hashRingIndexes, 'md5', { 'max cache size': 10000 });
                        req.headers['X-Cf-App-Instance'] = ring.get(url);
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
                    req.headers['X-Cf-App-Instance'] = ring.get(url);
                }
                req.pipe(request(url)).pipe(res);
            });
        }
    } else {
        res.end("ERROR: Unable to get the URL to redirect to.");
    }
});

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
                cb();
            } else {
                cb("No running instances of application.")
            }
        }
    });
}
function getAuthenticationToken(doProceed, cb){
    var path = 'https://login.run.pivotal.io/oauth/token'

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
                    console.log("Access token ", accessToken);
                    if(doProceed){
                        getAppId(doProceed, cb);
                    } else {
                        cb();
                    }
                    
                } else{
                    console.log("Unable to get access token, response body ", res);
                }   
            }
        } catch(err2) {
            cb(err2);
        }         
    });
}
server.listen(process.env.PORT || 3000);