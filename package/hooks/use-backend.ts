import { RootAccountData } from "../types"

export async function typedFetch<T = unknown>(input: RequestInfo | URL, init?: RequestInit, keyPair?: KeyPair, signal?: AbortSignal) {
  const reqBody = {
    signal,
    ...(init ?? {})
  }

  if (keyPair) {
    // TODO: implement token exp date check and refresh (without hook, otherwise execution loop will happen)

    reqBody.headers = {
      ...(reqBody.headers ?? {}),
      "Authorization": keyPair.accessToken
    }
  }

  try {
    const res = await fetch(input, reqBody).catch(() => null).then(response => response?.json()).catch((e: any) => {
      throw new Error("Fetch exception", e)
    }) as Promise<T>

    if ((res as never as { statusCode: number }).statusCode) {
      return undefined
    }

    return res as any as T
  } catch (e: any) {
    // Logger.errorFrom("Fetch", e)
    return undefined
  }
}

export class KeyPair {
  constructor(accessToken: string, refreshToken: string) {
    this.updateKeys(accessToken, refreshToken)
  }

  private _accessToken?: string

  public get accessToken() {
    return this._accessToken ?? ""
  }

  private _refreshToken?: string

  public get refreshToken() {
    return this._refreshToken ?? ""
  }

  public updateKeys(accessToken: string, refreshToken: string) {
    if (accessToken.length < refreshToken.length) throw new Error("Invalid tokens provided")

    this._accessToken = accessToken
    this._refreshToken = refreshToken
  }
}

export function requests(backendUrl: string) {
  const sendGetRequest = <T>(path: string, accessToken?: string, signal?: AbortSignal) => {
    return typedFetch<T>(backendUrl + path, {
      method: "GET",
      headers: {
        "Authorization": accessToken ?? ""
      }
    }, undefined, signal)
  }

  const sendPostRequest = <T>(path: string, body: { [key: string]: any }, accessToken?: string, signal?: AbortSignal) => {
    return typedFetch<T>(backendUrl + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": accessToken ?? ""
      },
      body: JSON.stringify(body)
    }, undefined, signal)
  }

  const sendDeleteRequest = <T>(path: string, body: { [key: string]: any }, accessToken?: string, signal?: AbortSignal) => typedFetch<T>(backendUrl + path, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "Authorization": accessToken ?? ""
    },
    body: JSON.stringify(body)
  }, undefined, signal)

  return {
    post: sendPostRequest,
    get: sendGetRequest,
    _delete: sendDeleteRequest
  }
}


export default function useDittoBackend(url: string) {
  const req = requests(url)

  return {
    /**
     * Get message to sign
     * @param walletAddress address of wallet that will sign message
     */
    async getNonce(walletAddress: string) {
      return (await req.get<{
        nonce: string
      }>("/authentication/nonce?walletAddress=" + walletAddress))?.nonce ?? null
    },

    async postInstantEntry(accessToken: string, workflowId: string, txHash: string) {
      return !!(await req.post("/history", {
        workflowId,
        txHash
      }, accessToken))
    },

    /**
     * Request authentication tokens using signature
     *
     * @param signature message signature
     * @param walletAddress address of wallet that signed message
     */
    async verifySignature(signature: string, walletAddress: string) {
      const tokens = await req.post<{
        accessToken: string
        refreshToken: string
        fullUserData: RootAccountData
      }>("/authentication/verify", {
        signature,
        walletAddress
      })

      return tokens ?? null
    },

    /**
     * Update expired access token using refresh token
     *
     * @param keyPair pair of access and refresh tokens
     */
    async refreshToken(keyPair: KeyPair) {
      return (await req.post<{
        accessToken: string
        refreshToken: string
        fullUserData: RootAccountData
      }>("/authentication/refresh", {
        refreshToken: keyPair.refreshToken
      }, keyPair.accessToken)) ?? null
    },

    /**
     * Link deployed vault to Ditto account
     *
     * @param chainId vault chain id
     * @param accountAddress account address that deployed vault
     * @param vaultAddress deployed vault address
     * @param accessToken access token
     */
    async linkVault(chainId: number, accountAddress: string, vaultAddress: string, accessToken: string) {
      return (await req.post("/vault/add-deployed", {
        "chainId": chainId,
        vaultAddress,
        accountAddress
      }, accessToken))
    },

    /**
     * Get full Ditto account data by access token
     *
     * @param accessToken access token
     */
    async getAccountData(accessToken: string) {
      return (await req.get<RootAccountData>("/user/full-data", accessToken))
    },

    async getWhitelistStatus(address: string) {
      return req.get<boolean>("/whitelist/check/" + address)
    },

    async applyReferralCode(code: string, walletAddress: string) {
      return !!(await req.post("/referral/apply", {
        code,
        walletAddress
      }))
    },

    async generateReferralCodes(address: string, amount: string, accessToken: string) {
      return !!(await req.post("/referral", {
        addresses: [address],
        count: parseInt(amount)
      }, accessToken))
    }
  }
}
