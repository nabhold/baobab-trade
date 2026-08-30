export type BaobabTradeEnvironment = {
  engineId: string
  controlPlaneBaseUrl?: string
  controlPlaneContextPath?: string
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
  controlPlaneContextPath: requiredInProduction(
    "BAOBAB_CONTROL_PLANE_CONTEXT_PATH",
    process.env.BAOBAB_CONTROL_PLANE_CONTEXT_PATH,
  ),
  erpApiBaseUrl: process.env.BAOBAB_ERP_API_BASE_URL,
  pulseApiBaseUrl: process.env.BAOBAB_PULSE_API_BASE_URL,
  webhookSigningSecret: requiredInProduction(
    "BAOBAB_WEBHOOK_SIGNING_SECRET",
    process.env.BAOBAB_WEBHOOK_SIGNING_SECRET,
  ),
  logLevel: process.env.LOG_LEVEL || "info",
})
