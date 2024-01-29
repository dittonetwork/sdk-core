import { ethers } from "ethers"
import { DittoSDK } from "./main"

export default class AuthenticationModule {
  public _apiKeyPair?: { accessToken: string, refreshToken: string }

  constructor(private readonly parent: DittoSDK) {
  }

  public getAuthenticationNonce() {
    return this.parent.backend.getNonce(this.parent._accountAddress)
  }

  public async verifySignature(signature: string) {
    const retrievedData = await this.parent.backend.verifySignature(signature, this.parent._accountAddress)

    if (!retrievedData) throw new Error("Data not retrieved, possible invalid signature")

    this.parent._rootAccountData = retrievedData.fullUserData
    this._apiKeyPair = {
      accessToken: retrievedData.accessToken,
      refreshToken: retrievedData.refreshToken
    }

    return true
  }

  public async authenticateWithSigner(_signer?: ethers.providers.JsonRpcSigner) {
    const signer = _signer ?? this.parent._options.signer

    if (!signer) throw new Error("No signer provided")

    const address = await signer.getAddress()

    if (address.toLowerCase() !== this.parent._accountAddress.toLowerCase())
      throw new Error("Provider address and SDK address did not match")

    const nonce = await this.getAuthenticationNonce()
    if (!nonce) throw new Error("Invalid nonce returned from backend")

    const signature = await signer.signMessage(nonce)
    return this.verifySignature(signature)
  }
}
