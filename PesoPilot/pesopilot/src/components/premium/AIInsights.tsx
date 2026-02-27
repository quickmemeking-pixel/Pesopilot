"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, Lock, TrendingUp, Lightbulb, AlertCircle, CheckCircle, RefreshCw, Loader2 } from "lucide-react";
import { UpgradeModal } from "./UpgradeModal";
import { PremiumBadge } from "./PremiumBadge";
import { getBudgetSummary, getExpenses } from "@/app/api/budget";
import { formatPeso } from "@/utils/currency";

interface AIInsightsProps {
  isPremium: boolean;
}

interface FinancialData {
  budget: number;
  total_spent: number;
  percent_used: number;
  daily_average: number;
  projected_days_remaining: number;
  top_category: string;
  risk_level: "low" | "moderate" | "high";
}

interface Insight {
  icon: string;
  title: string;
  description: string;
  type: "tip" | "warning" | "alert" | "success";
}

const CACHE_KEY = "pesopilot_ai_insights";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const iconMap = {
  trend: TrendingUp,
  lightbulb: Lightbulb,
  alert: AlertCircle,
  check: CheckCircle,
  warning: AlertCircle,
};

const riskColors = {
  low: {
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-200 dark:border-green-800",
    text: "text-green-700 dark:text-green-400",
    badge: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  },
  moderate: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-400",
    badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  },
  high: {
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-700 dark:text-red-400",
    badge: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  },
};

export function AIInsights({ isPremium }: AIInsightsProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const calculateFinancialData = useCallback(async (): Promise<FinancialData | null> => {
    const summary = await getBudgetSummary();
    const expenses = await getExpenses();
    
    if (!summary || !expenses) return null;

    const totalSpent = summary.totalSpent || 0;
    const budget = summary.budget?.amount || 0;
    const percentUsed = budget > 0 ? Math.round((totalSpent / budget) * 100) : 0;
    
    // Calculate daily average (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentExpenses = expenses.filter(e => new Date(e.date) >= thirtyDaysAgo);
    const dailyAverage = recentExpenses.length > 0
      ? Math.round(recentExpenses.reduce((sum, e) => sum + e.amount, 0) / 30)
      : 0;
    
    // Projected days remaining
    const projectedDays = dailyAverage > 0 && budget > totalSpent
      ? Math.floor((budget - totalSpent) / dailyAverage)
      : 0;
    
    // Top spending category
    const categoryTotals: Record<string, number> = {};
    expenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });
    const topCategory = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "None";
    
    // Risk level
    let riskLevel: "low" | "moderate" | "high" = "low";
    if (percentUsed > 75) riskLevel = "high";
    else if (percentUsed >= 40) riskLevel = "moderate";

    return {
      budget,
      total_spent: totalSpent,
      percent_used: percentUsed,
      daily_average: dailyAverage,
      projected_days_remaining: projectedDays,
      top_category: topCategory,
      risk_level: riskLevel,
    };
  }, []);

  const generateInsights = useCallback(async (forceRefresh = false) => {
    if (!isPremium) return;
    
    setLoading(true);
    setError(null);

    try {
      // Check cache first
      if (!forceRefresh) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp, insights: cachedInsights } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setFinancialData(data);
            setInsights(cachedInsights);
            setLastUpdated(new Date(timestamp).toLocaleString());
            setLoading(false);
            return;
          }
        }
      }

      // Calculate financial data
      const data = await calculateFinancialData();
      if (!data) {
        setError("No financial data available");
        setLoading(false);
        return;
      }
      setFinancialData(data);

      // Call AI API
      const response = await fetch("/api/ai-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financialData: data }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate insights");
      }

      const result = await response.json();
      setInsights(result.insights);
      
      // Cache results
      const cacheData = {
        data,
        insights: result.insights,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate insights");
    } finally {
      setLoading(false);
    }
  }, [isPremium, calculateFinancialData]);

  useEffect(() => {
    if (isPremium) {
      generateInsights();
    }
  }, [isPremium, generateInsights]);

  const handleClick = () => {
    if (!isPremium) setShowUpgradeModal(true);
  };

  const getIconComponent = (iconName: string) => {
    return iconMap[iconName as keyof typeof iconMap] || Lightbulb;
  };

  if (!isPremium) {
    const sampleInsights = [
      { icon: "trend", title: "Spending Trend Analysis", description: "Your dining expenses have increased 23% compared to last month. Consider setting a restaurant budget.", type: "warning" },
      { icon: "lightbulb", title: "Smart Saving Tip", description: "Based on your spending pattern, you could save ₱2,500/month by reducing impulse purchases.", type: "tip" },
      { icon: "alert", title: "Budget Alert", description: "You're on track to exceed your monthly transportation budget by 15%.", type: "alert" },
    ];

    return (
      <>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Insights</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Smart analysis of your spending</p>
                </div>
              </div>
              <PremiumBadge size="sm" />
            </div>
          </div>
          <div className="p-6">
            <div onClick={handleClick} className="relative cursor-pointer group">
              <div className="space-y-4 filter blur-sm opacity-50">
                {sampleInsights.map((insight, index) => (
                  <div key={index} className="flex gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                      <Lightbulb className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{insight.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{insight.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Lock className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Upgrade to unlock AI insights</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Click to view plans</p>
              </div>
            </div>
          </div>
        </div>
        <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
      </>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Insights</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Advanced financial analysis</p>
            </div>
          </div>
          <button
            onClick={() => generateInsights(true)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
        </div>
      </div>

      {/* Financial Summary Card */}
      {financialData && (
        <div className={`p-4 mx-6 mt-6 rounded-xl border ${riskColors[financialData.risk_level].bg} ${riskColors[financialData.risk_level].border}`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm font-medium ${riskColors[financialData.risk_level].text}`}>Financial Health</span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium uppercase ${riskColors[financialData.risk_level].badge}`}>
              {financialData.risk_level} Risk
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Budget Used</p>
              <p className={`text-lg font-semibold ${riskColors[financialData.risk_level].text}`}>{financialData.percent_used}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Daily Average</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatPeso(financialData.daily_average)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Top Category</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{financialData.top_category}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Days Remaining</p>
              <p className={`text-sm font-medium ${financialData.projected_days_remaining < 7 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
                {financialData.projected_days_remaining} days
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Insights List */}
      <div className="p-6">
        {loading && !insights.length ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => generateInsights(true)}
              className="mt-3 text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, index) => {
              const IconComponent = getIconComponent(insight.icon);
              const typeColors = {
                tip: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
                warning: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
                alert: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
                success: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
              };
              
              return (
                <div
                  key={index}
                  className="flex gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${typeColors[insight.type]}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{insight.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{insight.description}</p>
                  </div>
                </div>
              );
            })}
            {lastUpdated && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center pt-2">
                Last updated: {lastUpdated}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
