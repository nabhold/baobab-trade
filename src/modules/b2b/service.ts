import { MedusaService } from "@medusajs/framework/utils"
import ApprovalPolicy from "./models/approval-policy"
import B2BOrganisation from "./models/b2b-organisation"
import BuyerMembership from "./models/buyer-membership"
import BuyerRole from "./models/buyer-role"
import CommercialTerms from "./models/commercial-terms"
import CreditTerms from "./models/credit-terms"
import DeliverySite from "./models/delivery-site"
import PurchaseApproval from "./models/purchase-approval"
import PurchaseOrderReference from "./models/purchase-order-reference"
import PurchaseOrderRequirement from "./models/purchase-order-requirement"
import SpendLimit from "./models/spend-limit"
import TaxRegistration from "./models/tax-registration"

class B2BModuleService extends MedusaService({
  ApprovalPolicy,
  B2BOrganisation,
  BuyerMembership,
  BuyerRole,
  CommercialTerms,
  CreditTerms,
  DeliverySite,
  PurchaseApproval,
  PurchaseOrderReference,
  PurchaseOrderRequirement,
  SpendLimit,
  TaxRegistration,
}) {}

export default B2BModuleService
