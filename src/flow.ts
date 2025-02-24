/******************
 * Hardcoded URLs *
 ******************/

import chalk from "chalk"
import { UMAClient } from "./client"
import { randomUUID } from 'crypto';

const resourceServer = "http://localhost:5656/"
const policyAPI = "http://localhost:3000/ruben/settings/policies/"

const terms = {
    solid: {
      umaServer: 'http://www.w3.org/ns/solid/terms#umaServer',
      viewIndex: 'http://www.w3.org/ns/solid/terms#viewIndex',
      entry: 'http://www.w3.org/ns/solid/terms#entry',
      filter: 'http://www.w3.org/ns/solid/terms#filter',
      location: 'http://www.w3.org/ns/solid/terms#location',
    },
    filters: {
      bday: 'http://localhost:3000/catalog/public/filters/bday',
      age: 'http://localhost:3000/catalog/public/filters/age',
    },
    views: {
      bday: 'http://localhost:3000/ruben/private/derived/bday',
      age: 'http://localhost:3000/ruben/private/derived/age',
    },
    resources: {
      smartwatch: 'http://localhost:3000/ruben/medical/smartwatch.ttl',
      external: 'http://localhost:5656/smartdevice.txt'
    },
    agents: {
      ruben: 'http://localhost:3000/ruben/profile/card#me',
      alice: 'http://localhost:3000/alice/profile/card#me',
      vendor: 'http://localhost:3000/demo/public/vendor',
      present: 'http://localhost:3000/demo/public/bday-app',
    },
    scopes: {
      read: 'urn:example:css:modes:read',
    }
}


function log(...args) { console.log(...args) }

async function flow()  {
    const client = new UMAClient(resourceServer, policyAPI) 

    log('=================== UMA prototype flow ======================')

    log("This flow defines the retrieval by a doctor of a patient resource.")
    log(
`Doctor WebID:     ${terms.agents.alice}
Patient WebID:    ${terms.agents.ruben}
Target Resource:  ${terms.resources.external}`)

    // Set policy for adding data

    // todo:: add a policy allowing the user device to write smartwatch data to their pod on behalf of the user!


    // Adding Smart Device Data
    log()
    log('First, the target resource is filled with some medical data')
    const medicalResourcePost = await fetch(terms.resources.external, {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "This is a private resource containing medical data"
    });
    console.log(await medicalResourcePost.text())

//     // Adding Read Policy over data
//     log()
//     log('To protect this data, a policy is added restricting access to a specific healthcare employee for the purpose of bariatric care.');
//     log(chalk.italic(`Note: Policy management is out of scope for POC1, right now they are just served from a public container on the pod.
// additionally, selecting relevant policies is not implemented at the moment, all policies are evaluated, but this is a minor fix in the AS.`))
    

//     const healthcare_patient_policy = `PREFIX dcterms: <http://purl.org/dc/terms/>
//     PREFIX eu-gdpr: <https://w3id.org/dpv/legal/eu/gdpr#>
//     PREFIX oac: <https://w3id.org/oac#>
//     PREFIX odrl: <http://www.w3.org/ns/odrl/2/>
//     PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

//     PREFIX ex: <http://example.org/>

//     <http://example.org/HCPX-request> a odrl:Request ;
//         odrl:uid ex:HCPX-request ;
//         odrl:profile oac: ;
//         dcterms:description "HCP X requests to read Alice's health data for bariatric care.";
//         odrl:permission <http://example.org/HCPX-request-permission> .

//     <http://example.org/HCPX-request-permission> a odrl:Permission ;
//         odrl:action odrl:read ;
//         odrl:target <${terms.resources.external}> ;
//         odrl:assigner <${terms.agents.ruben}> ;
//         odrl:assignee <${terms.agents.alice}> ;
//         odrl:constraint <http://example.org/HCPX-request-permission-purpose> .

//     <http://example.org/HCPX-request-permission-purpose> a odrl:Constraint ;
//         odrl:leftOperand odrl:purpose ; # can also be oac:Purpose, to conform with OAC profile
//         odrl:operator odrl:eq ;
//         odrl:rightOperand ex:bariatric-care .`
    
//     log()   
//     await client.addPolicy(healthcare_patient_policy)

//     log(`The policy assigns read permissions for the personal doctor ${terms.agents.alice} of the patient for the smartwatch resource 
// on the condition of the purpose of the request being "http://example.org/bariatric-care".`)
    
    // Accessing the data

    log()
    log(chalk.bold("The doctor now tries to access the private resource."))

    const res = await fetch(terms.resources.external, {
        method: "GET",
        headers: { "content-type": "application/json" },
    });
    
    const umaHeader = await res.headers.get('WWW-Authenticate')

    log(`First, a resource request is done without authorization that results in a 403 response and accompanying UMA ticket in the WWW-Authenticate header according to the UMA specification:
${umaHeader}`)

    let as_uri = umaHeader?.split('as_uri=')[1].split('"')[1]
    let ticket = umaHeader?.split('ticket=')[1].replace(/"/g, '')

    log('')
    log('Discovered UMA Authorization Server URI:', as_uri)
    as_uri = as_uri?.endsWith('/') ? as_uri : as_uri + "/";

    let as_uma_config = await (await fetch(as_uri+".well-known/uma2-configuration")).json()
    const tokenEndpoint = as_uma_config.token_endpoint

    const smartWatchAccessRequestNoClaimsODRL = {
        "@context": "http://www.w3.org/ns/odrl.jsonld",
        "@type": "Request",
        profile: { "@id": "https://w3id.org/oac#" },
        uid: `http://example.org/HCPX-request/${randomUUID()}`,
        description: "HCP X requests to read Alice's health data for bariatric care.",
        permission: [ {
            "@type": "Permission",
            "uid": `http://example.org/HCPX-request-permission/${randomUUID()}`,
            assigner: terms.agents.ruben,
            assignee: terms.agents.alice,
            action: { "@id": "https://w3id.org/oac#read" },
            target: terms.resources.external,
        } ],
        grant_type: "urn:ietf:params:oauth:grant-type:uma-ticket",
        ticket,
    }


    log()
    log(`To the discovered AS, we now send a request for read permission to the target resource`, smartWatchAccessRequestNoClaimsODRL)

    const doctor_needInfoResponse = await fetch(tokenEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(smartWatchAccessRequestNoClaimsODRL),
    });
    
    if (doctor_needInfoResponse.status !== 403) { log('Access request succeeded without claims...', await doctor_needInfoResponse.text()); throw 0; }

    const { ticket: ticket2, required_claims: doctor_claims } = await doctor_needInfoResponse.json();
    ticket = ticket2
   
    log('') 
    log(`Based on the policy set above, the Authorization Server requests the following claims from the doctor:`);
    doctor_claims.claim_token_format[0].forEach((format: string) => log(`  - ${format}`))
    log(`accompanied by an updated ticket: ${ticket}.`)

    // JWT (HS256; secret: "ceci n'est pas un secret")
    // {
    //   "http://www.w3.org/ns/odrl/2/purpose": "http://example.org/bariatric-care",
    //   "urn:solidlab:uma:claims:types:webid": "http://localhost:3000/alice/profile/card#me",
    //   "https://w3id.org/oac#LegalBasis": "https://w3id.org/dpv/legal/eu/gdpr#A9-2-a"
    // }
    const claim_token = "eyJhbGciOiJIUzI1NiJ9.eyJodHRwOi8vd3d3LnczLm9yZy9ucy9vZHJsLzIvcHVycG9zZSI6Imh0dHA6Ly9leGFtcGxlLm9yZy9iYXJpYXRyaWMtY2FyZSIsInVybjpzb2xpZGxhYjp1bWE6Y2xhaW1zOnR5cGVzOndlYmlkIjoiaHR0cDovL2xvY2FsaG9zdDozMDAwL2FsaWNlL3Byb2ZpbGUvY2FyZCNtZSIsImh0dHBzOi8vdzNpZC5vcmcvb2FjI0xlZ2FsQmFzaXMiOiJodHRwczovL3czaWQub3JnL2Rwdi9sZWdhbC9ldS9nZHByI0E5LTItYSJ9.nT55jaXNDsHgAo_zcRMsbJqcNj4FVdW_-xjcwNam-1M"

    const claims: any = {
        "http://www.w3.org/ns/odrl/2/purpose": "http://example.org/bariatric-care",
        "urn:solidlab:uma:claims:types:webid": terms.agents.alice,
        "https://w3id.org/oac#LegalBasis": "https://w3id.org/dpv/legal/eu/gdpr#A9-2-a"
    }

    log('')
    log(`The doctor's client now gathers the necessary claims (how is out-of-scope for this demo)`, claims)
    log(`and bundles them as an UMA-compliant JWT.`, {
        claim_token: claim_token,
        claim_token_format: "urn:solidlab:uma:claims:formats:jwt"
    })

    const smartWatchAccessRequestODRL = {
        "@context": "http://www.w3.org/ns/odrl.jsonld",
        "@type": "Request",
        profile: { "@id": "https://w3id.org/oac#" },
        uid: `http://example.org/HCPX-request/${randomUUID()}`,
        description: "HCP X requests to read Alice's health data for bariatric care.",
        permission: [ {
            "@type": "Permission",
            "@id": `http://example.org/HCPX-request-permission/${randomUUID()}`,
            target: terms.resources.external,
            action: { "@id": "https://w3id.org/oac#read" },
            assigner: terms.agents.ruben,
            assignee: terms.agents.alice,
            constraint: [
                {
                    "@type": "Constraint",
                    "@id": `http://example.org/HCPX-request-permission-purpose/${randomUUID()}`,
                    leftOperand: "purpose",
                    operator: "eq",
                    rightOperand: { "@id": "http://example.org/bariatric-care" },
                }, {
                    "@type": "Constraint",
                    "@id": `http://example.org/HCPX-request-permission-purpose/${randomUUID()}`,
                    leftOperand: { "@id": "https://w3id.org/oac#LegalBasis" },
                    operator: "eq",
                    rightOperand: {"@id": "https://w3id.org/dpv/legal/eu/gdpr#A9-2-a" },
                }
            ],
        } ],
        // claims: [{
        claim_token: claim_token, 
        claim_token_format: "urn:solidlab:uma:claims:formats:jwt",
        // }],
        // UMA specific fields
        grant_type: "urn:ietf:params:oauth:grant-type:uma-ticket",
        ticket,
    }

    log('')
    log('Together with the UMA grant_type and ticket requirements, these are bundled as an ODRL Request and sent back to the Authorization Server')
    log(JSON.stringify(smartWatchAccessRequestODRL, null, 2))
    
    // log(chalk.italic(`Note: the ODRL Request constraints are not yet evaluated as claims, only the passed claim token is.
    // There are two main points of work here: right now the claim token gathers all claims internally, as only a single token can be passed.
    // This is problematic when claims and OIDC tokens have to be passed. It might be worth looking deeper into ODRL requests to carry these claims instead of an UMA token.`))

    const accessGrantedResponse = await fetch(tokenEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(smartWatchAccessRequestODRL)
    });

    if (accessGrantedResponse.status !== 200) { 
        log('Access request failed despite policy...', JSON.stringify(await accessGrantedResponse.text(), null, 2)); throw 0; 
    }

    const tokenParams = await accessGrantedResponse.json();
    console.log('Token params', tokenParams)
    const access_token = parseJwt(tokenParams.access_token)

    console.log('full access token', JSON.stringify(access_token, null, 2))

    log('')
    log(`The UMA server checks the claims with the relevant policy, and returns the agent an access token with the requested permissions.`, 
        JSON.stringify(access_token.permissions, null, 2));
    
    log(`and the accompanying agreement:`, 
        JSON.stringify(access_token.contract, null, 2));
    
    log('')
    log(chalk.italic(`Future work: at a later stage, this agreements will be signed by both parties to form a binding contract.`))

    const accessWithTokenResponse = await fetch(terms.resources.external, {
        headers: { 'Authorization': `${tokenParams.token_type} ${tokenParams.access_token}` }
    });

    log('')
    log(`Now the doctor can retrieve the resource:`, await accessWithTokenResponse.text());

    if (accessWithTokenResponse.status !== 200) { log(`Access with token failed...`); throw 0; }
    

}

flow()




function parseJwt (token:string) {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
}

  