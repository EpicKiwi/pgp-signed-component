import * as pgp from "openpgp"

const TEMPLATE = document.createElement("template");
TEMPLATE.innerHTML = `
<style>
:host {
    display: block;
    border: solid transparent 2px;
    border-radius: 3px;
    padding: 10px;
    font-family: sans-serif;
    margin: 10px 0;

    --pgp-verified-color: #209b01;
    --pgp-unverified-color: #fc3c11;
}

:host(:not(.loaded)) {
    border: none;
    padding: 0;
}

:host(.loaded) #message-container, :host(:not(.loaded)) #signatures-status {
    display: none;
}

:host(.unverified){
    border-color: var(--pgp-unverified-color);
}

:host(.verified){
    border-color: var(--pgp-verified-color);
}

* {
    box-sizing: border-box;
}

a {
    color: inherit;
}

:host(.unverified) #signatures-status{
    color: var(--pgp-unverified-color);
}

:host(.verified) #signatures-status{
    color: var(--pgp-verified-color);
}

#signatures-status {
    padding-top: 10px;
    font-size: 0.9em;
}

#signatures-status * {
    margin: 0;
}

#signatures-status svg {
    display: inline-block;
    height: 1.5em;
    vertical-align: bottom;
}

#message-container {
    margin: 0;
}
</style>

<slot></slot>

<pre id="message-container" ><code><slot name="message"></slot></pre></code>

<div id="signatures-status"></div>
`

const STATUS_TEMPLATE = document.createElement("template")
STATUS_TEMPLATE.innerHTML = `
<p class="verified">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M23,12L20.56,9.22L20.9,5.54L17.29,4.72L15.4,1.54L12,3L8.6,1.54L6.71,4.72L3.1,5.53L3.44,9.21L1,12L3.44,14.78L3.1,18.47L6.71,19.29L8.6,22.47L12,21L15.4,22.46L17.29,19.28L20.9,18.46L20.56,14.78L23,12M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z" fill="currentcolor" /></svg>
    Verified (Signed by <a class="key-identity"></a>)
</p>

<p class="unverified">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M23,12L20.56,9.22L20.9,5.54L17.29,4.72L15.4,1.54L12,3L8.6,1.54L6.71,4.72L3.1,5.53L3.44,9.21L1,12L3.44,14.78L3.1,18.47L6.71,19.29L8.6,22.47L12,21L15.4,22.46L17.29,19.28L20.9,18.46L20.56,14.78L23,12M13,17H11V15H13V17M13,13H11V7H13V13Z" fill="currentcolor" /></svg>
    Unverified (Signature from <code class="key-fingerprint"></code>)
</p>
`

export class PGPSignedElement extends HTMLElement {

    #keySrc:string|undefined = undefined;

    constructor(){
        super();

        this.attachShadow({mode: "open"})
        if(this.shadowRoot)
            this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
        else throw new Error("No shadow root");

        this.update();
    }

    /**
     * Raw message to verify
     */
    get message(): string{
        let messageEl = this.querySelector(`[slot="message"]`)
        if(messageEl) return (messageEl.textContent || "").trim();
        return (this.textContent || "").trim();
    }

    /**
     * Key URL to verify the message against
     */
    get keySrc():string|undefined{
        return this.#keySrc;
    }

    /**
     * Set Key URL
     */
    set keySrc(val:string|undefined){
        this.#keySrc = val;
    }

    /**
     * Load keys
     * @returns Keys loadded from `key-src` attribute
     */
    async getKeys() {
        if(!this.keySrc)
            return [];
        
        let keyUrl = new URL(this.keySrc, this.baseURI);

        let res = await fetch(keyUrl);

        if(!res.ok)
            throw new Error(`Netfork error ${res.status} ${res.statusText}`);

        let type = res.headers.get("Content-Type")

        if(type && (type.startsWith("text") || type.startsWith("application/pgp-keys"))){
            return await pgp.readKeys({
                armoredKeys: await res.text()
            })
        } else {
            return await pgp.readKeys({
                binaryKeys: new Uint8Array(await res.arrayBuffer())
            })
        }
    }

    /**
     * Normalize inner DOM
     * - Put message in slotted div
     * - Remove all other elements
     */
    normalizeInnerDom(){
        
        let messageEl = this.querySelector(`[slot="message"]`)

        if(!messageEl){
            messageEl = this.appendChild(document.createElement("div"));
            messageEl.slot = "message"
            messageEl.textContent = this.textContent;
        }

        for(let node of Array.from(this.childNodes)){
            if(node != messageEl){
                node.remove();
            }
        }
    }

    /**
     * Update signature verification and template
     */
    async update(){
        this.classList.remove("loaded")
        this.normalizeInnerDom();
        
        const message = await pgp.readCleartextMessage({
            cleartextMessage: this.message
        });
        
        let keys: pgp.Key[] = await this.getKeys();
        
        let verification = await pgp.verify({
            //@ts-ignore
            message,
            verificationKeys: keys
        })

        let signatureElements = await this.renderSignature(verification, keys)
        let isInvalid = !!signatureElements.querySelector(".unverified");

        this.classList.toggle("unverified", isInvalid)
        this.classList.toggle("verified", !isInvalid)

        if(this.shadowRoot){
            let statusEl = this.shadowRoot.getElementById("signatures-status") as HTMLDivElement;
            statusEl.innerHTML = "";
            statusEl.appendChild(signatureElements);
        } else {
            throw new Error("No shadow root")
        }

        if(typeof verification.data == "string"){
            let template = document.createElement("template")
            template.innerHTML = verification.data;
            this.appendChild(template.content.cloneNode(true));
        } else {
            throw new Error("Data is not a string")
        }
        this.classList.add("loaded")
    }

    /**
     * Render a status document fragment for the given verification result
     * @param verification Result of a message verification
     * @returns Status elements resulting of the verification result
     */
    async renderSignature(verification: pgp.VerifyMessageResult, keys: pgp.Key[] = []): Promise<DocumentFragment> {

        let frag = document.createDocumentFragment();

        let [signatures, verifications] = await Promise.all([
            Promise.all(verification.signatures.map(it => it.signature)),
            Promise.allSettled(verification.signatures.map(it => it.verified))
        ])

        let signaturesKey = signatures.map(it => {
            let keyIds = it.getSigningKeyIDs();
            return keys.find(k => !!k.getKeyIDs().find(id => !!keyIds.find(kid => kid.equals(id))))
        })

        let i = 0;
        for(let v of verifications){
            let el:HTMLElement;
            if(v.status == "fulfilled"){
                el = (STATUS_TEMPLATE.content.querySelector(".verified") as HTMLElement).cloneNode(true) as HTMLElement;
            } else {
                el = (STATUS_TEMPLATE.content.querySelector(".unverified") as HTMLElement).cloneNode(true) as HTMLElement;
                el.title = v.reason.message;
            }

            let fingerprint = el.querySelector(".key-fingerprint")
            if(fingerprint){
                let key = signaturesKey[i];
                if(key){
                    fingerprint.textContent = key.getFingerprint().toUpperCase();
                } else {
                    fingerprint.textContent = signatures[i].getSigningKeyIDs().map(it => `[...]${it.toHex().toUpperCase()}`).join(", ")
                }
            }

            let key = signaturesKey[i];
            if(key){
                let identityEl = el.querySelector(".key-identity") as HTMLAnchorElement;
                if(identityEl){
                    let name = key.users[0].userID?.userID || ""
                    let email = key.users[0].userID?.email || ""
                    
                    identityEl.textContent = name;
                    identityEl.title = key.getFingerprint().toUpperCase();
                    if(email)
                        identityEl.href = `mailto:${email}`
                }
            }

            frag.append(el);

            i++;
        }

        return frag;
    }

    static get observedAttributes(){
        return ["key-src"]
    }

    attributeChangedCallback(name, oldVal, newVal){
        switch(name){
            case "key-src":
                this.keySrc = newVal;
        }
    }
}

export const TAGNAME = "pgp-signed";

customElements.define(TAGNAME, PGPSignedElement)