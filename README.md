# Cloud Foundry Node Route Service

To push the application

> cf push

Create user defined Service

> cf cups cf-node-route-service -p '{"username": "user", "password": "pass", "domain": "run.pivotal.io"}' -r https://cf-node-route-service.cfapps.io

Bind route service

> cf brs cfapps.io cf-node-route-service --hostname node-consist-app

Unbind route service

> cf urs cfapps.io cf-node-route-service --hostname node-consist-app

Delete user defined service

> cf ds cf-node-route-service