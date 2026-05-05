export type PlanCode = "free" | "starter" | "premium";

export interface PlanUsage {
  entries: {
    used: number;
    limit: number;
  };
  aiConversations: {
    used: number;
    limit: number;
  };
  monthlyVisits: {
    used: number;
    limit: number;
  };
  storageMb: {
    used: number;
    limit: number;
  };
}

export interface CurrentPlanSnapshot {
  code: PlanCode;
  name: "Free" | "Starter" | "Plus";
  billingCycle: "monthly" | "yearly";
  price: number;
  currency: string;
  renewalDate?: string | null;
  paymentMethod?: string | null;
  accessState?: "normal" | "downgraded";
  downgradedFrom?: Exclude<PlanCode, "free"> | null;
  usage: PlanUsage;
}

export interface BillingHistoryItem {
  id: string;
  issuedAt: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "failed";
}
