// What the support-admin dashboard shows (lot 11), shared by the server
// loader and the view. Amounts are whole FCFA; dates are ISO strings.

export interface AdminPayment {
  id: string;
  shopName: string;
  offer: string;
  amount: number;
  /** `saspay` for a payment, `manual` for a pass granted by hand. */
  provider: string;
  at: string;
}

export interface AdminDashboard {
  month: string;
  revenue: {
    /** Collected in the month. */
    total: number;
    last30Days: number;
    byPass: { offer: string; count: number; amount: number }[];
    /** The month's payments, newest first (50 at most). */
    payments: AdminPayment[];
  };
  /** Monthly recurring revenue now: each running paid pass brought to 30 days. */
  mrr: number;
  churn: { atStart: number; churned: number; rate: number | null };
  cac: { spend: number | null; payers: number; value: number | null };
  shops: {
    total: number;
    /** A pass in force: trial or paid, grace included. */
    active: number;
    byPlan: Record<string, number>;
    /** Among the active shops; `NONE` when the shop never said. */
    byType: Record<string, number>;
    byChannel: Record<string, number>;
  };
  campaigns: { running: number; drafts: number; finished: number; archived: number };
  users: { total: number; suspended: number };
}
