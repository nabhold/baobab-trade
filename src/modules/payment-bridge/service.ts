import { MedusaService } from "@medusajs/framework/utils"
import CommercePayment from "./models/commerce-payment"
import PaymentPolicyBinding from "./models/payment-policy-binding"
import PaymentReconciliation from "./models/payment-reconciliation"
import PaymentStatusTransition from "./models/payment-status-transition"

class PaymentBridgeModuleService extends MedusaService({
  CommercePayment,
  PaymentPolicyBinding,
  PaymentReconciliation,
  PaymentStatusTransition,
}) {}

export default PaymentBridgeModuleService
