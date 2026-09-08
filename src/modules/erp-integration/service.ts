import { MedusaService } from "@medusajs/framework/utils"
import ErpEntityMapping from "./models/erp-entity-mapping"
import ErpProjection from "./models/erp-projection"
import ErpReconciliation from "./models/erp-reconciliation"
import FinancialStatusProjection from "./models/financial-status-projection"
class ErpIntegrationModuleService extends MedusaService({
  ErpEntityMapping,
  ErpProjection,
  ErpReconciliation,
  FinancialStatusProjection,
}) {}
export default ErpIntegrationModuleService
