# Future admin

There is no admin web app. `GET /v1/admin/audit-logs` is the only admin route, and it requires the demo admin role.

A later admin surface would need:

- A real admin identity, not the development header
- A queue for reports that does not treat the report body as public
- Companion suspend and relist, with an audit row
- A view of booking state and the unavailable payment row
- Verification that stays inside the vendor's hosted flow, so raw identity documents are not downloaded into the admin browser
- Payout and refund exception handling after a processor exists
- No button that marks a check-in as monitored until an actual monitoring service exists

Those screens are out of scope for this skeleton.
