import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/utils/supabase/server";

const openaiApiKey = process.env.OPENAI_API_KEY;

// Only initialize OpenAI if key exists and isn't placeholder
const openai = openaiApiKey && !openaiApiKey.includes("your_")
  ? new OpenAI({ apiKey: openaiApiKey })
  : null;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify premium status
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .single();

    if (!profile?.is_premium) {
      return NextResponse.json({ error: "Premium required" }, { status: 403 });
    }

    const body = await request.json();
    const { financialData } = body;

    if (!financialData) {
      return NextResponse.json({ error: "Financial data required" }, { status: 400 });
    }

    // If OpenAI isn't configured, return fallback insights
    if (!openai) {
      console.log("OpenAI not configured, using fallback insights");
      const fallbackInsights = generateFallbackInsights(financialData);
      return NextResponse.json({ 
        insights: fallbackInsights,
        source: "fallback",
        message: "AI insights temporarily using local analysis. Add OPENAI_API_KEY for advanced insights."
      });
    }

    const prompt = `Based on this financial data, generate 4 concise, personalized financial insights with actionable advice.

Financial Summary:
- Budget: ₱${financialData.budget}
- Total Spent: ₱${financialData.total_spent}
- Percentage Used: ${financialData.percent_used}%
- Daily Average: ₱${financialData.daily_average}
- Projected Days Remaining: ${financialData.projected_days_remaining}
- Top Spending Category: ${financialData.top_category}
- Risk Level: ${financialData.risk_level}

Format each insight as a JSON object with:
- icon: one of ["trend", "lightbulb", "alert", "check", "warning"]
- title: max 5 words
- description: 1-2 sentences, specific and actionable
- type: one of ["tip", "warning", "alert", "success"]

Return ONLY a JSON array of 4 insights. Example:
[
  {"icon": "trend", "title": "Spending Pattern", "description": "Your dining expenses are 23% higher than last month. Set a weekly restaurant limit.", "type": "warning"}
]`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a smart, direct, and helpful financial advisor. Provide concise, actionable insights based on spending data."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error("No content received from OpenAI");
      }

      // Parse the JSON response
      let insights;
      try {
        // Extract JSON from potential markdown code blocks
        const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\[([\s\S]*)\]/);
        const jsonString = jsonMatch ? jsonMatch[0] : content;
        insights = JSON.parse(jsonString);
      } catch {
        // If parsing fails, create fallback insights
        insights = generateFallbackInsights(financialData);
      }

      return NextResponse.json({ insights, source: "ai" });
    } catch (openaiError) {
      console.error("OpenAI API error:", openaiError);
      // Return fallback insights instead of failing
      const fallbackInsights = generateFallbackInsights(financialData);
      return NextResponse.json({ 
        insights: fallbackInsights,
        source: "fallback",
        message: "Using local analysis. AI service temporarily unavailable."
      });
    }
  } catch (error) {
    console.error("AI Insights error:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}

function generateFallbackInsights(data: {
  budget: number;
  total_spent: number;
  percent_used: number;
  daily_average: number;
  projected_days_remaining: number;
  top_category: string;
  risk_level: string;
}) {
  const insights = [];
  
  if (data.risk_level === "high") {
    insights.push({
      icon: "alert",
      title: "Budget Critical",
      description: `You've used ${data.percent_used}% of your budget. Cut non-essential spending immediately.`,
      type: "alert"
    });
  } else if (data.risk_level === "moderate") {
    insights.push({
      icon: "warning",
      title: "Budget Warning",
      description: `You're at ${data.percent_used}% budget usage. Slow down spending to stay on track.`,
      type: "warning"
    });
  } else {
    insights.push({
      icon: "check",
      title: "Budget Healthy",
      description: `Great job! Only ${data.percent_used}% used. You're well within your budget.`,
      type: "success"
    });
  }

  insights.push({
    icon: "trend",
    title: "Daily Spending",
    description: `Your daily average is ₱${data.daily_average}. At this rate, budget runs out in ${data.projected_days_remaining} days.`,
    type: data.projected_days_remaining < 7 ? "warning" : "tip"
  });

  insights.push({
    icon: "lightbulb",
    title: "Top Category Focus",
    description: `${data.top_category} is your biggest expense. Review these transactions for savings opportunities.`,
    type: "tip"
  });

  insights.push({
    icon: "trend",
    title: "Savings Potential",
    description: data.percent_used < 50 
      ? `You're on track to save ₱${data.budget - data.total_spent} this period. Keep it up!`
      : `Reduce discretionary spending to avoid exceeding your ₱${data.budget} budget.`,
    type: data.percent_used < 50 ? "success" : "warning"
  });

  return insights;
}
