import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getBaobabTradeEnvironment } from "../../baobab/config/environment"

export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  const environment = getBaobabTradeEnvironment()
  const controlPlaneConfigured = Boolean(
    environment.controlPlaneBaseUrl && environment.controlPlaneContextPath,
  )

  if (!controlPlaneConfigured) {
    res.status(503).json({
      status: "not_ready",
      dependencies: { medusa: "configured", control_plane: "not_configured" },
    })
    return
  }

  res.status(200).json({
    status: "ready",
    dependencies: { medusa: "configured", control_plane: "configured" },
  })
}
