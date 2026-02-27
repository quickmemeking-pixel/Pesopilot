"use client";

import { useState, useEffect } from "react";
import { setBudget, getBudget, type Budget } from "@/app/api/budget";
import { formatPeso } from "@/utils/currency";
import { Settings, Check } from "lucide-react";

interface BudgetManagerProps {
  onBudgetUpdate?: () => void;
}

export default function BudgetManager({ onBudgetUpdate }: BudgetManagerProps) {
  const [budget, setBudgetData] = useState<Budget | null>(null);
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<"weekly" | "monthly">("monthly");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadBudget();
  }, []);

  async function loadBudget() {
    setLoading(true);
    const data = await getBudget();
    setBudgetData(data);
    if (data) {
      setAmount(data.amount.toString());
      setPeriod(data.period);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const result = await setBudget(Number(amount), period);

    if (result.success) {
      setMessage("Budget saved successfully!");
      setIsEditing(false);
      await loadBudget();
      onBudgetUpdate?.();
    } else {
      setMessage(result.error || "Failed to save budget");
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  // Show current budget with edit option
  if (budget && !isEditing) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Current Budget
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {period === "weekly" ? "Weekly" : "Monthly"} spending limit
            </p>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        <div className="text-3xl font-bold text-gray-900 dark:text-white">
          {formatPeso(budget.amount)}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          per {budget.period}
        </p>
      </div>
    );
  }

  // Show form for new budget or editing
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {budget ? "Update Budget" : "Set Your Budget"}
      </h3>

      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-md text-sm ${
            message.includes("success")
              ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
              : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
          }`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="amount"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Budget Amount (₱)
          </label>
          <input
            id="amount"
            type="number"
            min="1"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
            placeholder="5000.00"
          />
        </div>

        <div>
          <label
            htmlFor="period"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Budget Period
          </label>
          <select
            id="period"
            value={period}
            onChange={(e) => setPeriod(e.target.value as "weekly" | "monthly")}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              "Saving..."
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                {budget ? "Update" : "Set Budget"}
              </>
            )}
          </button>

          {budget && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setAmount(budget.amount.toString());
                setPeriod(budget.period);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
