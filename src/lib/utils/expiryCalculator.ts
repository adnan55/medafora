export type ExpiryUrgency = "EXPIRED" | "CRITICAL" | "WARNING" | "SAFE";

export interface ExpiryStatus {
  urgency: ExpiryUrgency;
  daysRemaining: number;
  label: string;
  badgeColor: string; // Tailwind class
}

export function calculateExpiryStatus(expiryDateStr: string): ExpiryStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDateStr);
  if (isNaN(expiry.getTime())) {
    return {
      urgency: "SAFE",
      daysRemaining: 0,
      label: "Unknown Expiry",
      badgeColor: "bg-gray-100 text-gray-800 border-gray-300",
    };
  }
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      urgency: "EXPIRED",
      daysRemaining,
      label: `Expired ${Math.abs(daysRemaining)} days ago`,
      badgeColor: "bg-red-100 text-red-800 border-red-300",
    };
  }

  if (daysRemaining <= 15) {
    return {
      urgency: "CRITICAL",
      daysRemaining,
      label: `Expires in ${daysRemaining} days!`,
      badgeColor: "bg-orange-100 text-orange-800 border-orange-300",
    };
  }

  if (daysRemaining <= 45) {
    return {
      urgency: "WARNING",
      daysRemaining,
      label: `Expiring soon (${daysRemaining} days)`,
      badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
    };
  }

  return {
    urgency: "SAFE",
    daysRemaining,
    label: `Valid (${daysRemaining} days left)`,
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
  };
}
