import { MedusaService } from "@medusajs/framework/utils"
import CommerceFulfilment from "./models/commerce-fulfilment"
import FulfilmentPolicyBinding from "./models/fulfilment-policy-binding"
import FulfilmentReconciliation from "./models/fulfilment-reconciliation"
import FulfilmentStatusTransition from "./models/fulfilment-status-transition"
class FulfilmentBridgeModuleService extends MedusaService({
  CommerceFulfilment,
  FulfilmentPolicyBinding,
  FulfilmentReconciliation,
  FulfilmentStatusTransition,
}) {}
export default FulfilmentBridgeModuleService
