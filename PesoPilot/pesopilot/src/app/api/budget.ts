"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================
// BUDGET API FUNCTIONS
// ============================================

export interface Budget {
  id: string;
  user_id: string;
  amount: number;
  period: "weekly" | "monthly";
  created_at: string;
}

export async function getBudget(): Promise<Budget | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching budget:", error);
    return null;
  }

  return data;
}

export async function setBudget(
  amount: number,
  period: "weekly" | "monthly"
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  // Check if budget already exists
  const { data: existingBudget } = await supabase
    .from("budgets")
    .select("id")
    .eq("user_id", user.id)
    .single();

  let error;
  if (existingBudget) {
    // Update existing budget
    ({ error } = await supabase
      .from("budgets")
      .update({ amount, period })
      .eq("id", existingBudget.id));
  } else {
    // Insert new budget
    ({ error } = await supabase
      .from("budgets")
      .insert({ user_id: user.id, amount, period }));
  }

  if (error) {
    console.error("Error setting budget:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateBudget(
  budgetId: string,
  amount: number,
  period: "weekly" | "monthly"
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("budgets")
    .update({ amount, period })
    .eq("id", budgetId);

  if (error) {
    console.error("Error updating budget:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

// ============================================
// EXPENSE API FUNCTIONS
// ============================================

export interface Expense {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  created_at: string;
}

export interface ExpenseSummary {
  totalSpent: number;
  remaining: number;
  percentageUsed: number;
  expenses: Expense[];
}

export async function addExpense(
  amount: number,
  category: string,
  description: string,
  date: string
): Promise<{ success: boolean; error?: string; expense?: Expense }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      user_id: user.id,
      amount,
      category,
      description,
      date,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding expense:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true, expense: data };
}

export async function getExpenses(
  startDate?: string,
  endDate?: string
): Promise<Expense[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  let query = supabase
    .from("expenses")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (startDate) {
    query = query.gte("date", startDate);
  }

  if (endDate) {
    query = query.lte("date", endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching expenses:", error);
    return [];
  }

  return data || [];
}

export async function deleteExpense(
  expenseId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId);

  if (error) {
    console.error("Error deleting expense:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

// ============================================
// BUDGET CALCULATIONS
// ============================================

export async function getBudgetSummary(): Promise<{
  budget: Budget | null;
  totalSpent: number;
  remaining: number;
  percentageUsed: number;
  expenses: Expense[];
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      budget: null,
      totalSpent: 0,
      remaining: 0,
      percentageUsed: 0,
      expenses: [],
    };
  }

  // Get budget
  const { data: budget } = await supabase
    .from("budgets")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Calculate date range based on budget period
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  if (budget?.period === "weekly") {
    // Start from beginning of current week (Sunday)
    startDate = new Date(now);
    startDate.setDate(now.getDate() - now.getDay());
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
  } else {
    // Monthly - start from beginning of current month
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  // Get expenses for the period
  const { data: expenses } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", startDate.toISOString().split("T")[0])
    .lte("date", endDate.toISOString().split("T")[0])
    .order("date", { ascending: false });

  const expensesList = expenses || [];
  const totalSpent = expensesList.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const budgetAmount = budget ? Number(budget.amount) : 0;
  const remaining = Math.max(0, budgetAmount - totalSpent);
  const percentageUsed = budgetAmount > 0 ? (totalSpent / budgetAmount) * 100 : 0;

  return {
    budget: budget || null,
    totalSpent,
    remaining,
    percentageUsed: Math.min(percentageUsed, 100),
    expenses: expensesList,
  };
}

// ============================================
// CHART DATA API FUNCTIONS
// ============================================

export interface CategoryData {
  name: string;
  value: number;
  color?: string;
}

export interface SpendingData {
  date: string;
  amount: number;
}

export async function getExpensesByCategory(): Promise<CategoryData[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get expenses from current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const { data, error } = await supabase
    .from("expenses")
    .select("category, amount")
    .eq("user_id", user.id)
    .gte("date", startOfMonth.toISOString().split("T")[0])
    .lte("date", endOfMonth.toISOString().split("T")[0]);

  if (error) {
    console.error("Error fetching category data:", error);
    return [];
  }

  // Aggregate by category
  const categoryTotals: Record<string, number> = {};
  data?.forEach((expense) => {
    const category = expense.category;
    categoryTotals[category] = (categoryTotals[category] || 0) + Number(expense.amount);
  });

  // Convert to array and assign colors
  const colors = [
    "#3B82F6", // blue
    "#EF4444", // red
    "#10B981", // green
    "#F59E0B", // yellow
    "#8B5CF6", // purple
    "#EC4899", // pink
    "#06B6D4", // cyan
    "#F97316", // orange
    "#84CC16", // lime
  ];

  return Object.entries(categoryTotals).map(([name, value], index) => ({
    name,
    value,
    color: colors[index % colors.length],
  }));
}

export async function getSpendingOverTime(
  days: number = 30
): Promise<SpendingData[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  const { data, error } = await supabase
    .from("expenses")
    .select("date, amount")
    .eq("user_id", user.id)
    .gte("date", startDate.toISOString().split("T")[0])
    .lte("date", endDate.toISOString().split("T")[0])
    .order("date", { ascending: true });

  if (error) {
    console.error("Error fetching spending data:", error);
    return [];
  }

  // Aggregate by date
  const dailyTotals: Record<string, number> = {};
  data?.forEach((expense) => {
    const date = expense.date;
    dailyTotals[date] = (dailyTotals[date] || 0) + Number(expense.amount);
  });

  // Fill in missing dates with 0
  const result: SpendingData[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split("T")[0];
    result.push({
      date: dateStr,
      amount: dailyTotals[dateStr] || 0,
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return result;
}
