export type BaobabTradeEnvironment = {
  engineId: string
  controlPlaneBaseUrl?: string
  controlPlaneContextPath: string
  controlPlaneMarketPathTemplate: string
  controlPlaneProductId: string
  erpApiBaseUrl?: string
  pulseApiBaseUrl?: string
  webhookSigningSecret?: string
  logLevel: string
}

const requiredInProduction = (name: string, value: string | undefined): string | undefined => {
  if (process.env.NODE_ENV === "production" && !value) {
    throw new Error(`${name} must be configured in production`)
  }
  return value
}

export const getBaobabTradeEnvironment = (): BaobabTradeEnvironment => ({
  engineId: process.env.BAOBAB_TRADE_ENGINE_ID || "baobab-trade",
  controlPlaneBaseUrl: requiredInProduction(
    "BAOBAB_CONTROL_PLANE_BASE_URL",
    process.env.BAOBAB_CONTROL_PLANE_BASE_URL,
  ),
  controlPlaneContextPath: process.env.BAOBAB_CONTROL_PLANE_CONTEXT_PATH || "/v1/context/resolve",
  controlPlaneMarketPathTemplate:
    process.env.BAOBAB_CONTROL_PLANE_MARKET_PATH_TEMPLATE || "/v1/markets/{market_id}",
  controlPlaneProductId: process.env.BAOBAB_CONTROL_PLANE_PRODUCT_ID || "baobab-trade",
  erpApiBaseUrl: process.env.BAOBAB_ERP_API_BASE_URL,
  pulseApiBaseUrl: process.env.BAOBAB_PULSE_API_BASE_URL,
  webhookSigningSecret: requiredInProduction(
    "BAOBAB_WEBHOOK_SIGNING_SECRET",
    process.env.BAOBAB_WEBHOOK_SIGNING_SECRET,
  ),
  logLevel: process.env.LOG_LEVEL || "info",
})
