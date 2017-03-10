var os = require('os');
var HashRing = require('hashring');
var request = require('request');
var http = require('http');
var accessToken, tokenType, appId;
var _userName = 'pradeepkumartippa@gmail.com';
var _password = '$Pivotal999';
getAuthenticationToken(function(err, res){
    try {
        if(err){
            console.log("Error", err);
        } else {
            res = JSON.parse(res);
            if (res.access_token) {
                accessToken = res.access_token;
                tokenType = res.token_type;
                console.log("Access token ", accessToken);
            } else{
                console.log("Unable to get access token, response body ", res);
            }   
        }
    } catch(err2) {
        console.log("Error", err2);
        console.log("Response", res);
    }    
});
var server = http.createServer(function(req, res) {
    console.log("req. headers" , req.headers);
    var url = req.headers['x-cf-forwarded-url'];
    console.log("Redirecting url , ", url);
    console.log("ENV \n", process.env);
    tempUrl = url.replace(/(^\w+:|^)\/\//, '');
    var appName = tempUrl.substring(0, tempUrl.indexOf('.'));
    getAllApps(function(err, body){
        if(err){
            res.end('Got Internal Error while getting appId, Error', err);
        }else{
            body = JSON.parse(body);
            console.log("All apps response ", JSON.stringify(body));
            for(var i=0;i<body.resources.length;i++){
                if(body.resources[i].entity.name === appName){
                    console.log("Got the application name.")
                    appId = body.resources[i].metadata.guid;
                    break;
                }
            }
            if(appId){
                getIndexes(appId, function(err, body){
                    if(err){
                        res.end("Got internal error while getting indexes. Error ", err);
                    } else {
                        body = JSON.parse(body);
                        var indexes = [];
                        Object.keys(body).forEach(function(key){
                            if(body[key].state === 'RUNNING'){
                                indexes.push(key);
                            }
                        });
                        var ringIndexes = [];
                        if(indexes.length > 0){
                            indexes.forEach(function(index){
                                ringIndexes.push(appId+':'+index);
                            });
                            var ring = new HashRing(ringIndexes, 'md5', { 'max cache size': 10000 });
                            req.headers['X-Cf-App-Instance'] = ring.get(url);
                            req.pipe(request(url)).pipe(res);
                        }else{
                            res.end("Unable to get indexes of app.");
                        }
                    }
                });
            } else {
                res.end('Unable to get Application ID.')
            }
        }
    });
});
function getData(reqObject, cb) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    request(reqObject, function (err, res, body) {
      return cb(err, body);
    });
}
function getAllApps(cb){
    var path = 'https://api.run.pivotal.io/v2/apps';
    var httpsOptions = {
        uri: path,
        method : 'GET',
        headers : {
            Authorization: tokenType + ' ' +  accessToken,
            Cookie: ''
        }
    };
    getData(httpsOptions, function(err, res){
        cb(err, res);
    });
}

function getIndexes(appId, cb){
    var path = 'https://api.run.pivotal.io/v2/apps/'+appId+'/stats';
    var httpsOptions = {
        uri: path,
        method : 'GET',
        headers : {
            Authorization: tokenType + ' ' +  accessToken,
            Cookie: ''
        }
    };
    getData(httpsOptions, function(err, res){
        cb(err, res);
    });
}
function getAuthenticationToken(cb){
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
        cb(err, res);        
    });
}
server.listen(process.env.PORT || 3000);