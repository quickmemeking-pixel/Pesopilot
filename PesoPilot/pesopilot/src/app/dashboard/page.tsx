"use client";

import { useState, useEffect, useCallback } from "react";
import { logout } from "../actions";
import { useTheme } from "@/providers/ThemeProvider";
import { getBudgetSummary, type Budget, type Expense } from "@/app/api/budget";
import { getUserProfile } from "@/app/api/premium";
import { formatPeso } from "@/utils/currency";
import BudgetManager from "@/components/budget/BudgetManager";
import ProgressBar from "@/components/budget/ProgressBar";
import AddExpenseForm from "@/components/expense/AddExpenseForm";
import ExpenseList from "@/components/expense/ExpenseList";
import CategoryPieChart from "@/components/charts/CategoryPieChart";
import SpendingLineChart from "@/components/charts/SpendingLineChart";
import { AIInsights } from "@/components/premium/AIInsights";
import {
  Moon,
  Sun,
  LogOut,
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
} from "lucide-react";

export default function DashboardPage() {
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [totalSpent, setTotalSpent] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [percentageUsed, setPercentageUsed] = useState(0);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isPremium, setIsPremium] = useState(false);

  const loadBudgetData = useCallback(async () => {
    setLoading(true);
    const [summary, profile] = await Promise.all([
      getBudgetSummary(),
      getUserProfile(),
    ]);

    setBudget(summary.budget);
    setTotalSpent(summary.totalSpent);
    setRemaining(summary.remaining);
    setPercentageUsed(summary.percentageUsed);
    setExpenses(summary.expenses);
    setIsPremium(profile?.is_premium ?? false);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBudgetData();
  }, [loadBudgetData]);

  function handleExpenseAdded(expense: Expense) {
    setExpenses((prev) => [expense, ...prev]);
    // Recalculate totals
    const newTotal = totalSpent + Number(expense.amount);
    setTotalSpent(newTotal);
    if (budget) {
      const newRemaining = Math.max(0, budget.amount - newTotal);
      const newPercentage = budget.amount > 0 ? (newTotal / budget.amount) * 100 : 0;
      setRemaining(newRemaining);
      setPercentageUsed(Math.min(newPercentage, 100));
    }
    // Refresh full data after a short delay
    setTimeout(loadBudgetData, 500);
  }

  function handleExpenseDeleted() {
    loadBudgetData();
  }

  async function handleLogout(e: React.FormEvent) {
    e.preventDefault();
    await logout();
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Wallet className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-3" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                PesoPilot
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === "light" ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
              </button>

              <form onSubmit={handleLogout}>
                <button
                  type="submit"
                  className="flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Budget Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Budget */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {budget?.period === "weekly" ? "Weekly Budget" : "Monthly Budget"}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {budget ? formatPeso(budget.amount) : "Not set"}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>

              {/* Total Spent */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Total Spent
                    </p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                      {formatPeso(totalSpent)}
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                    <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </div>

              {/* Remaining */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Remaining
                    </p>
                    <p className={`text-2xl font-bold mt-1 ${remaining < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                      {formatPeso(remaining)}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${remaining < 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-green-100 dark:bg-green-900/30"}`}>
                    <PiggyBank className={`h-6 w-6 ${remaining < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`} />
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Budget Usage
                  </p>
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                    <TrendingUp className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
                <ProgressBar percentage={percentageUsed} showLabel={false} />
                <p className={`text-sm font-medium mt-2 ${percentageUsed > 80 ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"}`}>
                  {percentageUsed.toFixed(1)}% used
                </p>
              </div>
            </div>

            {/* Progress Bar Section */}
            {budget && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 mb-8">
                <ProgressBar percentage={percentageUsed} />
                {percentageUsed > 80 && (
                  <p className="mt-3 text-sm text-red-600 dark:text-red-400 font-medium">
                    ⚠️ You&apos;ve used {percentageUsed.toFixed(1)}% of your budget!
                  </p>
                )}
              </div>
            )}

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <CategoryPieChart />
              <SpendingLineChart days={30} />
            </div>

            {/* AI Insights Section */}
            <div className="mb-8">
              <AIInsights isPremium={isPremium} />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Budget & Expense Form */}
              <div className="space-y-6">
                <BudgetManager onBudgetUpdate={loadBudgetData} />
                <AddExpenseForm onExpenseAdded={handleExpenseAdded} />
              </div>

              {/* Right Column - Recent Expenses */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                  <ExpenseList
                    expenses={expenses}
                    onExpenseDeleted={handleExpenseDeleted}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
