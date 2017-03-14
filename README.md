# Cloud Foundry Node Route Service

To push the application

> cf push

Set required environment variables.

> cf se cf-node-route-service domain run.pivotal.io
> cf se cf-node-route-service username $username
> cf se cf-node-route-service password $password

Create user defined Service

> cf cups cf-node-route-service -p '{"username": "user", "password": "pass", "domain": "run.pivotal.io"}' -r https://cf-node-route-service.cfapps.io

Bind route service

> cf brs cfapps.io cf-node-route-service --hostname node-consist-app

Unbind route service

> cf urs cfapps.io cf-node-route-service --hostname node-consist-app

Delete user defined service

> cf ds cf-node-route-service