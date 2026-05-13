import { prisma } from "@/lib/prisma";

export type UsageType = "invoice_upload" | "ai_analysis" | "storage_mb" | "ai_cost_cents";

export class LicenseLimitError extends Error {
  constructor(
    readonly code: "USER_LIMIT_REACHED" | "INVOICE_LIMIT_REACHED" | "STORAGE_LIMIT_REACHED" | "AI_BUDGET_REACHED",
    message: string
  ) {
    super(message);
    this.name = "LicenseLimitError";
  }
}

function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

function allowedTargets(tenant: { allowedExportTargets: string }) {
  return tenant.allowedExportTargets
    .split(",")
    .map((target) => target.trim())
    .filter(Boolean);
}

export class LicenseService {
  async canCreateUser(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return { allowed: false, code: "TENANT_NOT_FOUND", message: "Firma wurde nicht gefunden." };
    }

    const activeUsers = await prisma.user.count({
      where: {
        tenantId,
        status: "active",
        role: { not: "SUPER_ADMIN" }
      }
    });

    if (activeUsers >= tenant.maxUsers) {
      return {
        allowed: false,
        code: "USER_LIMIT_REACHED",
        message: `Das Seat-Limit dieser Lizenz ist erreicht (${tenant.maxUsers}).`
      };
    }

    return { allowed: true };
  }

  async canUploadInvoice(tenantId: string, additionalBytes = 0) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return { allowed: false, code: "TENANT_NOT_FOUND", message: "Firma wurde nicht gefunden." };
    }

    const usage = await this.getOrCreateUsageRecord(tenantId);
    if (usage.invoicesUploaded >= tenant.maxInvoicesPerMonth) {
      return {
        allowed: false,
        code: "INVOICE_LIMIT_REACHED",
        message: `Das monatliche Rechnungs-Limit ist erreicht (${tenant.maxInvoicesPerMonth}).`
      };
    }

    const additionalMb = additionalBytes / 1024 / 1024;
    if (usage.storageUsedMb + additionalMb > tenant.storageLimitMb) {
      return {
        allowed: false,
        code: "STORAGE_LIMIT_REACHED",
        message: `Das Speicherlimit dieser Firma ist erreicht (${tenant.storageLimitMb} MB).`
      };
    }

    return { allowed: true };
  }

  async canRunAiAnalysis(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return { allowed: false, code: "TENANT_NOT_FOUND", message: "Firma wurde nicht gefunden." };
    }

    if (!tenant.aiMonthlyBudgetCents) {
      return { allowed: true };
    }

    const usage = await this.getOrCreateUsageRecord(tenantId);
    if (usage.estimatedAiCostCents >= tenant.aiMonthlyBudgetCents) {
      return {
        allowed: false,
        code: "AI_BUDGET_REACHED",
        message: "Das monatliche AI-Budget dieser Firma ist erreicht."
      };
    }

    return { allowed: true };
  }

  async recordUsage(tenantId: string, type: UsageType, amount = 1) {
    const period = currentPeriod();
    const data =
      type === "invoice_upload"
        ? { invoicesUploaded: { increment: amount } }
        : type === "ai_analysis"
          ? { aiAnalyses: { increment: amount } }
          : type === "storage_mb"
            ? { storageUsedMb: { increment: amount } }
            : { estimatedAiCostCents: { increment: amount } };

    return prisma.usageRecord.upsert({
      where: { tenantId_period: { tenantId, period } },
      create: {
        tenantId,
        period,
        invoicesUploaded: type === "invoice_upload" ? amount : 0,
        aiAnalyses: type === "ai_analysis" ? amount : 0,
        storageUsedMb: type === "storage_mb" ? amount : 0,
        estimatedAiCostCents: type === "ai_cost_cents" ? amount : 0
      },
      update: data
    });
  }

  async enforceStorageLimit(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const usage = await this.getOrCreateUsageRecord(tenantId);
    if (tenant && usage.storageUsedMb > tenant.storageLimitMb) {
      throw new LicenseLimitError("STORAGE_LIMIT_REACHED", "Das Speicherlimit dieser Firma ist erreicht.");
    }
  }

  async targetAllowed(tenantId: string, target: string) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return false;
    }

    const targets = allowedTargets(tenant);
    return targets.includes(target);
  }

  private async getOrCreateUsageRecord(tenantId: string) {
    const period = currentPeriod();
    return prisma.usageRecord.upsert({
      where: { tenantId_period: { tenantId, period } },
      create: { tenantId, period },
      update: {}
    });
  }
}

export const licenseService = new LicenseService();
