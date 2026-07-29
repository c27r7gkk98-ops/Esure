ESURE PORTAL — SECURE LOGIN PHASE 1

- Admin password is no longer stored in app.js.
- Login is verified by Firebase Authentication.
- The users/{uid} Firestore document decides whether an account is admin or customer.
- Existing customer/policy data is still stored in this browser during Phase 1.

ADMIN SETUP
The Firebase Authentication user must have a Firestore document at users/{uid} with:
role: admin

CUSTOMER SETUP
A customer Firebase Authentication user must have a Firestore document at users/{uid} with:
role: customer
customerId: the matching customer ID used in the portal data
