"use client";

import { Crown } from "lucide-react";

interface PremiumBadgeProps {
  size?: "sm" | "md" | "lg";
}

export function PremiumBadge({ size = "md" }: PremiumBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white ${sizeClasses[size]}`}
    >
      <Crown className={size === "sm" ? "w-3 h-3" : size === "lg" ? "w-5 h-5" : "w-4 h-4"} />
      Premium
    </span>
  );
}
