# Commerce Finance And Assets Implementation Workstreams / 消费金融资产实施工作流

Updated: 2026-05-19

## 1. Workstream A: Shopping And Logistics

- store/platform identity
- order lifecycle
- logistics follow-up
- service-account messaging
- Shopping order notifications into matching Shopping service accounts
- logistics event notifications into matching Logistics service accounts

## 2. Workstream B: Food Delivery

- restaurant/order lifecycle
- delivery exceptions
- service-account pushes
- route context consumption
- order and order-event notifications into the Food Delivery Dispatch service account

## 3. Workstream C: Wallet And Downstream Records

- expense/income ingestion
- ledger cleanup rules
- relationship support records where needed
- order-support relationship facts must remain supporting-only when Shopping or Food Delivery already owns the primary memory

## 4. Workstream D: Assets And Stock

- ownership lifecycle
- stock review cues
- future links into Calendar or Reminders

## 5. Semantic Guardrails

Treat these as bugs:

1. Wallet starts owning shopping or food business state
2. Assets starts acting like a ledger
3. Logistics starts acting like a storefront
4. Stock starts absorbing other financial domains without a clear decision
