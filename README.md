# UMA Client (Pacsoi project)

This is a standalone client that executes the PACSOI flow.


## Installation

```
git clone git@github.com:SolidLabResearch/UMA_Client.git
cd UMA_Client
npm install
```

## Running the flow

```
npm run flow
```

## Executed flow

* Posting a resource to the RS (unprotected)
* Adding a policy to the AS (unprotected)
* Requesting the resource from the RS and retreving AS link and ticket
* Requesting access token from AS for that ticket
* Negotiating access requirements (this will be expanded upon later)
* Receiving access token (+ ODRL Agreement contract) from AS
* Forwarding access token to RS
* Getting returned resource from RS

## Planned features

- [ ] Adding multi-resource / recursive support for request target
- [ ] Adding negotiation for W3C VCs that are policy requirements
- [ ] Adding signatures to contract