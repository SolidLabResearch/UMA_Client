

export class UMAClient {
    
    rs: string;
    // Hardcoded for now, it is an LDP interface with public acces where policies can be added through POST with an ODRL policy body.
    policyAPI: string; 

    constructor(resourceServerURL: string, policyAPI: string) { 
        if (!resourceServerURL.endsWith('/')) resourceServerURL += '/'
        this.rs = resourceServerURL;
        this.policyAPI = policyAPI;

    }

    public async loadOIDCClaim() {

        // Load OIDC claim in internal system to negotiate

    }

    public async loadOtherClaims() {

        // Load VCs to negotiate

    }

    public async addPolicy(policy: string): Promise<void> {
        // Upload policy to hardcoded location
        try {
            const res = await fetch(this.policyAPI, { method: "POST", headers: {"Content-type": "text/turtle"}, body: policy })
            if (res.ok) console.log('Policy addded succesfully')
            else throw ("Unknown error")
        } catch (e) {
            console.error(`Policy addition failed: ${e}`)
        }
    }

    public async getResource(): Promise<string> {

        // output policy

        // output resource
        return ""
    }

    public async addResource(resourcePath, body: string): Promise<void> {
        const url = this.rs + resourcePath
        try {
            const res = await fetch(url, { method: "POST", body })
            if (res.ok) console.log('Resource addded succesfully')
            else throw ("Unknown error")
        } catch (e) {
            console.error(`Resource creation failed: ${e}`)
        }
        
    }   
}
