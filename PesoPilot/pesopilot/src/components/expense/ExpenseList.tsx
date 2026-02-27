"use client";

import { useState } from "react";
import { deleteExpense, type Expense } from "@/app/api/budget";
import { formatPeso } from "@/utils/currency";
import { Trash2 } from "lucide-react";

interface ExpenseListProps {
  expenses: Expense[];
  onExpenseDeleted?: () => void;
}

export default function ExpenseList({
  expenses,
  onExpenseDeleted,
}: ExpenseListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    setDeletingId(id);
    const result = await deleteExpense(id);

    if (result.success) {
      onExpenseDeleted?.();
    } else {
      alert(result.error || "Failed to delete expense");
    }

    setDeletingId(null);
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>No expenses recorded yet.</p>
        <p className="text-sm mt-1">Add your first expense above!</p>
      </div>
    );
  }

  // Group expenses by date
  const grouped = expenses.reduce((groups, expense) => {
    const date = new Date(expense.date).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(expense);
    return groups;
  }, {} as Record<string, Expense[]>);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Recent Expenses
      </h3>

      {Object.entries(grouped).map(([date, dayExpenses]) => (
        <div key={date} className="space-y-2">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {date}
          </p>

          {dayExpenses.map((expense) => (
            <div
              key={expense.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {expense.category}
                </p>
                {expense.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {expense.description}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-3 ml-4">
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                  -{formatPeso(expense.amount)}
                </span>

                <button
                  onClick={() => handleDelete(expense.id)}
                  disabled={deletingId === expense.id}
                  className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete expense"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
