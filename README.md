# Taube

Taube is a pigeon in German. This comes from the idea that we use carrier pigeons to transfer our data.

Replaces cotes communication layer with http. This has been inspired by cote as a migration path, but will branch out and diverge from the core cote system.
Taube aims to leverage existing tooling as much as possible such as DNS and service discovery from an external provider as well as leverage existing transfer protocols that are well supported and maintained.

## Introduction

Taube is a drop in replacement for cote. Without configuration it functions as a wrapper to cote and keeps using cote for communication. It also sets up http Responders, which means the service using Taube can be targeted by Taube Requesters.

In order to activate HTTP for all Taube Reqesters in a service you need to provide `TAUBE_HTTP_ENABLED=true`.

## Requesters and Responders

```
const taube = require('@cloud/taube')

const requester = new taube.Requester({
  key: 'users',
  uri: 'http://localhost'
})

const responder = new coteHttp.Responder({ key: 'users' })
responder.on('get users', async() => {})

const res = await requester.send({ type: 'get users' })
```

In order to enable HTTP you need to provide a resolvable `uri` parameter in the options passed to Requesters. It needs to include `http` or `https` without a `/` at the end.

In docker-compose the `uri` would be the service name. In Kubernetes the name of the service (if in the same namespace) or the [full dns](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/) (if not in the same namespace).

Responders need no extra configuration.

In order to enable HTTP set the environment variable `TAUBE_HTTP_ENABLED=true`.

Taube Requesters and Responders support `key` (default to the key `default`) but not `namespace` and `respondsTo`.

## Migrate from cote

The folllowing is a proposed migration path:

1. Replace all `require('cote')` with `require('@cloud/taube')`
2. Make sure your tests pass
3. Pick a service
4. Make sure it has a resolvable dns (e.g. add a Kubernetes service to it)
5. Add the environment variable TAUBE_HTTP_ENABLED=true to the service
6. Make sure your tests pass
7. Go to 3 until no more services

## Environment variables

| Variable        | Default           | Description  |
| ------------- |:-------------:| -----:|
| TAUBE_HTTP_ENABLED | undefined | If set Taube will use HTTP instead of cote (axion) |
| TAUBE_HTTP_PORT    | 4321      |   Port of http server |
| TAUBE_HTTP_DEBUG   | undefined      | Adds debugging information to Taube (e.g. Boolean usedHttp to requesters send() responses)  |
| TAUBE_UNIT_TESTS | undefined | If set all requesters default their uri to http://localhost |

## Writing unit tests

taube auto detects running in `NODE_ENV=test` and overwrites all requesters with `uri` = `http://localhost`. This means all Responders can easily be mocked. See `test/unit-test.test.js` for an example. It also uses a random port then which ensures that all Requesters and Responders in a process can only contact each other.

You can also force this by setting `TAUBE_UNIT_TESTS`

## @infrastructure/observability

@infrastructure/observability can be used to get readiness checks for the taube http server.

```
const observability = require('@infrastructure/observability')

observability.monitoring.addReadinessCheck(taube.monitoring.readinessCheck)
```

## TODOS

- Sockend: Ignores respondsTo and namespace currently.
