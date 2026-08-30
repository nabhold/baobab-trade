import {
  assertTradeEntitlement,
  isValidOrganisationalContext,
  type BaobabOrganisationalContext,
} from "../contracts/organisational-context"

export interface ControlPlaneClient {
  resolveContext(accessToken: string, correlationId: string): Promise<BaobabOrganisationalContext>
}

export type HttpControlPlaneClientOptions = {
  baseUrl: string
  contextPath: string
  timeoutMs?: number
}

export class HttpControlPlaneClient implements ControlPlaneClient {
  private readonly baseUrl: string
  private readonly contextPath: string
  private readonly timeoutMs: number

  constructor(options: HttpControlPlaneClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "")
    this.contextPath = options.contextPath.startsWith("/")
      ? options.contextPath
      : `/${options.contextPath}`
    this.timeoutMs = options.timeoutMs ?? 3000
  }

  async resolveContext(
    accessToken: string,
    correlationId: string,
  ): Promise<BaobabOrganisationalContext> {
    if (!accessToken.trim()) {
      throw new Error("An access token is required to resolve tenant context")
    }

    const response = await fetch(`${this.baseUrl}${this.contextPath}`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "x-correlation-id": correlationId,
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    })

    if (!response.ok) {
      throw new Error(`Control Plane context resolution failed with status ${response.status}`)
    }

    const candidate: unknown = await response.json()
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      !isValidOrganisationalContext(candidate as Partial<BaobabOrganisationalContext>)
    ) {
      throw new Error("Control Plane returned an invalid organisational context")
    }

    return assertTradeEntitlement(candidate as BaobabOrganisationalContext)
  }
}
