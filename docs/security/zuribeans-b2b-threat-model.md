# ZuriBeans B2B threat model

Gate 15 treats tenant, organisation, membership and role as separate server-side checks. Client-supplied organisation or role claims are never authoritative.

| Threat                   | Control                                                    | Automated evidence          |
| ------------------------ | ---------------------------------------------------------- | --------------------------- |
| Cross-tenant IDOR        | Tenant identity must match the protected resource          | `b2b-threat-model.test.ts`  |
| Cross-organisation IDOR  | Active membership must belong to the resource organisation | `b2b-threat-model.test.ts`  |
| Role escalation          | Required role is evaluated from durable membership context | `b2b-threat-model.test.ts`  |
| Revoked/suspended access | Only `ACTIVE` membership is accepted                       | B2B policy and threat tests |
| Context spoofing         | Authenticated principal must match resolved principal      | `b2b-threat-model.test.ts`  |
| Credential leakage       | Sensitive keys are rejected from canonical event data      | `b2b-threat-model.test.ts`  |

The checks fail closed and deliberately do not reveal whether a foreign resource exists. Database query filters must still include tenant and organisation predicates; authorization after an unscoped query is not an acceptable substitute. Logs and events contain references and correlation IDs, never access tokens, payment credentials or secrets.
