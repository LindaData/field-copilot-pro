# HVAC Company Website and Systems Review

Date reviewed: 2026-06-30

## Scope

This review looks at public HVAC company websites and publicly marketed field-service systems. It does not claim to know a contractor's private dispatch, CRM, payment, review, or accounting stack unless that information is visible on public pages. The goal is to guide the Field Copilot prototype toward realistic owner workflows without adding paid AI, AWS, embeddings, OCR, or live integrations.

## Representative HVAC Company Websites

| Company | Website | Publicly visible systems and patterns | Product implication |
| --- | --- | --- | --- |
| One Hour Heating & Air Conditioning | https://www.onehourheatandair.com/ | National/local routing, schedule appointment CTA, emergency repair positioning, financing, membership/service-plan messaging, reviews | Preserve lead source, urgency, service area, and plan context on jobs. |
| Aire Serv | https://www.aireserv.com/ | Online scheduling, local franchise routing, residential/commercial service pages, maintenance-plan messaging, coupons, education | Track customer segment, appointment source, and plan eligibility separately. |
| Service Experts | https://www.serviceexperts.com/ | Schedule service, memberships/programs, financing, replacement/repair funnels, education, service areas | Approval and report flows should anticipate financing and replacement handoffs. |
| ARS/Rescue Rooter | https://www.ars.com/ | Schedule service, emergency service, financing, coupons, multiple trade categories, local pages | Keep job type, trade, and promotional context separate from diagnosis. |
| Horizon Services | https://www.horizonservices.com/ | Book online, call-now CTA, service-area pages, coupons, financing, reviews, guarantees | Owner dashboard should expose marketing source and service-area context. |
| Goettl Air Conditioning & Plumbing | https://www.goettl.com/ | Schedule service, regional routing, promotional offers, maintenance messaging, strong brand/trust positioning | Technician notes should roll up into customer-safe explanations. |

## Public Field-Service Platform Signals

| Platform | Website | Publicly marketed capabilities | Field Copilot implication |
| --- | --- | --- | --- |
| ServiceTitan | https://www.servicetitan.com/industries/hvac-software | Call booking/CRM, scheduling, dispatch, mobile workflows, customer communication, estimates, invoices, payments, reporting, inventory | Field Copilot should prepare clean handoff boundaries instead of replacing dispatch. |
| Housecall Pro | https://www.housecallpro.com/hvac-software/ | Online booking, scheduling, dispatch, customer notifications, estimates, invoices, payments, review/marketing tools, mobile app | Keep review capture, customer communication, and technical documentation as separate records. |
| Jobber | https://getjobber.com/ | Requests, quotes, scheduling, invoicing, payments, client communication, client hub positioning | Future integrations need customer-facing status and document sharing controls. |
| FieldEdge | https://www.fieldedge.com/ | Dispatch, service agreements, customer history, mobile field service, invoices, reporting | Service agreements and equipment history should be first-class context. |

## Common Patterns

- Online booking and call intake are central. Field Copilot should preserve lead source, urgency, service area, and contact preference.
- Memberships, maintenance plans, financing, discounts, and replacement programs are common. These should inform owner review and customer approval, but not contaminate technical diagnosis.
- Review requests, SMS/email updates, arrival notifications, and approval messages are part of the customer experience. The prototype should model a communication timeline before live messaging integrations are added.
- Public websites are strong on trust signals: guarantees, reviews, awards, service areas, coupons, and local pages.
- Technical quality still depends on manufacturer documentation. Marketing pages are useful for business context, not for verified repair instructions.

## Product Adjustment Made

The owner section now includes a Market Systems page at `/app/owner/market-systems`. It shows:

- representative HVAC company websites,
- public website systems and customer-facing workflows,
- common field-service platform capabilities,
- recommended Field Copilot boundaries and future integration priorities.

This is intentionally a research and planning surface, not a live integration.

## Recommended Next Steps

1. Add a non-production "lead source" field to demo jobs.
2. Add service-plan and financing context to customer approval demos.
3. Add a customer communication timeline model before integrating SMS/email.
4. Create integration specs for dispatch, CRM, payment, review, and document systems.
5. Continue using manufacturer PDFs and product libraries as the trusted source for equipment guidance.
