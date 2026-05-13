import type { AppSession, UserRole } from "./session";

const writeRoles: UserRole[] = ["TENANT_ADMIN", "ACCOUNTANT"];
const reviewRoles: UserRole[] = ["TENANT_ADMIN", "ACCOUNTANT", "REVIEWER"];
const approvalRoles: UserRole[] = ["TENANT_ADMIN", "REVIEWER"];
const exportRoles: UserRole[] = ["TENANT_ADMIN", "ACCOUNTANT"];

export function canAccessAdmin(session: AppSession) {
  return session.role === "SUPER_ADMIN";
}

export function canManageTenantUsers(session: Pick<AppSession, "role">) {
  return session.role === "SUPER_ADMIN" || session.role === "TENANT_ADMIN";
}

export function canUploadInvoice(session: Pick<AppSession, "role">) {
  return writeRoles.includes(session.role);
}

export function canReviewInvoice(session: Pick<AppSession, "role">) {
  return reviewRoles.includes(session.role);
}

export function canApproveInvoice(session: Pick<AppSession, "role">) {
  return approvalRoles.includes(session.role);
}

export function canExportInvoice(session: Pick<AppSession, "role">) {
  return exportRoles.includes(session.role);
}

export function canReadTenantData(session: AppSession, tenantId: string) {
  return session.isSuperAdmin || session.tenantId === tenantId;
}
