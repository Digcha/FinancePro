# QA Test Plan 005 – Industrial Mode

## 1. Authentication Tests

- Login with valid super admin works.
- Login with invalid password fails with friendly error.
- First login with mustChangePassword redirects to password change.
- Logout clears session.
- Unauthenticated user is redirected to login.

## 2. Authorization Tests

- SUPER_ADMIN can access /admin.
- ACCOUNTANT cannot access /admin.
- TENANT_ADMIN cannot see other tenants.
- VIEWER cannot upload invoices.
- REVIEWER cannot create users.
- ACCOUNTANT cannot change license settings.

## 3. Tenant Isolation Tests

- Tenant A user cannot open Tenant B invoice by URL.
- Tenant A user cannot download Tenant B original file.
- Tenant A user cannot see Tenant B export records.
- Tenant A user cannot query Tenant B vendors.
- Super Admin access to tenant data creates audit log.

## 4. License Tests

- If maxUsers reached, creating another user is blocked.
- If monthly invoice limit reached, upload is blocked with user-friendly message.
- If storage limit reached, upload is blocked.
- If AI budget reached, analysis is blocked or requires admin override.

## 5. Upload/Storage Tests

- Upload PDF as Tenant A stores under uploads/tenants/{tenantSlug}/...
- Upload JPG/PNG stores correctly.
- Invalid file type rejected.
- Large file rejected.
- Original file is not placed in public directory.
- Protected file API checks permission.

## 6. Document Viewer Tests

- PDF opens in viewer.
- Image opens in viewer.
- Open original works only for authorized user.
- Download original works only for authorized user.
- Missing file displays friendly error.
- No fake page preview is shown when original exists.

## 7. Invoice Workflow Tests

- Uploaded invoice starts with uploaded/analyzing or review_required.
- Review required when critical field missing.
- Corrected field updates finalValue and audit log.
- Invoice cannot be exported before review/freigabe.
- Approved invoice becomes export_ready.
- Rejected invoice cannot be exported.

## 8. AI Tests

- Without OPENAI_API_KEY app runs in Mock mode.
- With OPENAI_API_KEY app uses GPT-4o-mini from env.
- AI errors do not crash app.
- JSON parse errors become review_required.
- Low confidence fields are marked.
- 0,00 USt with reason is not hard error.
- Multi-page invoice final sum is taken from summary page.

## 9. Accountant Usability Tests

A non-technical user should be able to:
- login
- upload invoice
- open inbox
- understand which invoice needs work
- open invoice
- see original document
- correct a field
- approve/request approval
- export/download

No standard user screen should expose:
- stacktraces
- raw JSON
- Zod errors
- provider class names
- database IDs unless needed for support

## 10. Final Commands

Codex must run and fix all errors:

npm run db:generate
npm run db:push
npm run db:seed
npm run typecheck
npm run lint
npm run test
npm run build
