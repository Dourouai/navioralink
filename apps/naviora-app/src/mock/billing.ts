import { getPlanPriceByName } from "@/lib/pricing";

export const currentPlan = {
  name: "Plus",
  billingCycle: "monthly" as const,
  price: getPlanPriceByName("Plus"),
  currency: "USD",
  renewalDate: "2026-04-17T00:00:00.000Z",
  paymentMethod: "Visa •••• 2048",
  usage: {
    entries: { used: 214, limit: 1000 },
    aiConversations: { used: 84, limit: 2000 },
    monthlyVisits: { used: 12840, limit: 300000 },
    storageMb: { used: 420, limit: 5120 },
  },
};

export const billingHistory = [
  {
    id: "INV-2026-0317",
    issuedAt: "2026-03-17T09:00:00.000Z",
    amount: getPlanPriceByName("Plus"),
    currency: "USD",
    status: "paid" as const,
  },
  {
    id: "INV-2026-0217",
    issuedAt: "2026-02-17T09:00:00.000Z",
    amount: getPlanPriceByName("Plus"),
    currency: "USD",
    status: "paid" as const,
  },
  {
    id: "INV-2026-0117",
    issuedAt: "2026-01-17T09:00:00.000Z",
    amount: getPlanPriceByName("Plus"),
    currency: "USD",
    status: "paid" as const,
  },
];
