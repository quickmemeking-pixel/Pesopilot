"use client";

import { useState, useEffect } from "react";
import { getSpendingOverTime, type SpendingData } from "@/app/api/budget";
import { formatPeso } from "@/utils/currency";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";

interface SpendingLineChartProps {
  days?: number;
}

export default function SpendingLineChart({ days = 30 }: SpendingLineChartProps) {
  const [data, setData] = useState<SpendingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(days);

  useEffect(() => {
    loadData();
  }, [timeRange]);

  async function loadData() {
    const spendingData = await getSpendingOverTime(timeRange);
    setData(spendingData);
    setLoading(false);
  }

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  };

  // Calculate total spending for the period
  const totalSpent = data.reduce((sum, item) => sum + item.amount, 0);

  // Find max daily spending
  const maxDailySpent = Math.max(...data.map((item) => item.amount), 0);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-4">
          <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Spending Over Time
          </h3>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-4">
          <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Spending Over Time
          </h3>
        </div>
        <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <p>No spending data available</p>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {formatDate(label || "")}
          </p>
          <p className="font-medium text-gray-900 dark:text-white">
            {formatPeso(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Spending Over Time
          </h3>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Spent</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatPeso(totalSpent)}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Max Daily</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatPeso(maxDailySpent)}
          </p>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
              minTickGap={30}
              stroke="#6b7280"
            />
            <YAxis
              tickFormatter={(value) => `₱${value}`}
              tick={{ fontSize: 10 }}
              stroke="#6b7280"
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: "#3B82F6" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
