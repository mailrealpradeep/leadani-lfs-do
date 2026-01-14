import { storage } from "./storage";
import { db } from "./db";
import { leads, lead_updates } from "@shared/schema";
import { eq, desc, and, isNull } from "drizzle-orm";

const MINIMUM_FOLLOWUPS = 3;

export type AIRatingCategory = 'New' | 'Hot' | 'Warm' | 'Neutral' | 'Cold' | 'Poor';

export interface AIRatingDetails {
  engagement_score: number;
  sentiment_score: number;
  progression_score: number;
  followup_count: number;
  key_signals: string[];
  last_remarks: string[];
}

export interface AIRatingResult {
  rating: AIRatingCategory;
  score: number;
  summary: string;
  details: AIRatingDetails;
}

interface LeadUpdateData {
  id: string;
  remark: string | null;
  update_on: string | null;
  update_via: string | null;
  created_at: Date;
}

function scoreToCategory(score: number): AIRatingCategory {
  if (score >= 4.5) return 'Hot';
  if (score >= 3.5) return 'Warm';
  if (score >= 2.5) return 'Neutral';
  if (score >= 1.5) return 'Cold';
  return 'Poor';
}

export async function getLeadFollowupCount(leadId: string): Promise<number> {
  const updates = await db
    .select({ id: lead_updates.id })
    .from(lead_updates)
    .where(eq(lead_updates.lead_id, leadId));
  return updates.length;
}

export async function getLeadUpdates(leadId: string): Promise<LeadUpdateData[]> {
  const updates = await db
    .select({
      id: lead_updates.id,
      remark: lead_updates.remark,
      update_on: lead_updates.update_on,
      update_via: lead_updates.update_via,
      created_at: lead_updates.created_at,
    })
    .from(lead_updates)
    .where(eq(lead_updates.lead_id, leadId))
    .orderBy(desc(lead_updates.created_at));
  return updates;
}

export async function calculateAIRating(
  leadId: string,
  customFields: Record<string, any>,
  apiKey: string
): Promise<AIRatingResult | null> {
  const followupCount = await getLeadFollowupCount(leadId);
  
  if (followupCount < MINIMUM_FOLLOWUPS) {
    return null;
  }

  const updates = await getLeadUpdates(leadId);
  const remarks = updates
    .filter(u => u.remark && u.remark.trim() !== '' && u.remark !== '....' && u.remark !== '...')
    .map(u => u.remark!)
    .slice(0, 10);

  if (remarks.length === 0) {
    return {
      rating: 'Neutral',
      score: 2.5,
      summary: 'No meaningful remarks to analyze',
      details: {
        engagement_score: 2.5,
        sentiment_score: 2.5,
        progression_score: 2.5,
        followup_count: followupCount,
        key_signals: ['No remarks available'],
        last_remarks: [],
      },
    };
  }

  const leadStatus = customFields?.lead_status || 'Unknown';
  const visitStatus = customFields?.visit_status || 'Unknown';

  const systemPrompt = `You are a lead quality analyst for a construction/real estate CRM. Analyze the followup remarks and lead data to determine lead quality.

Remarks may be in Odia, Hindi, or English. Understand the intent regardless of language.

POSITIVE signals (higher score):
- Customer discussing requirements (sqft, budget, timeline)
- Scheduling visits or meetings
- Asking for estimates/quotes
- Expressing interest in services
- Agreeing to follow-up calls

NEGATIVE signals (lower score):
- Not receiving calls repeatedly
- Phone switched off consistently
- Customer saying "not interested"
- Customer cutting calls
- No response over long period

Current Lead Status: ${leadStatus}
Visit Status: ${visitStatus}

Respond ONLY with valid JSON in this exact format:
{
  "score": <number 1-5>,
  "summary": "<brief summary in English, max 100 chars>",
  "engagement_score": <1-5>,
  "sentiment_score": <1-5>,
  "progression_score": <1-5>,
  "key_signals": ["<signal 1>", "<signal 2>", "<signal 3>"]
}`;

  const userPrompt = `Analyze these ${remarks.length} followup remarks (most recent first):

${remarks.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Rate this lead's quality from 1 (poor) to 5 (hot).`;

  try {
    const response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sarvam-m',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.error('Sarvam API error:', response.status, await response.text());
      return getFallbackRating(remarks, followupCount, customFields);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || '';

    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      const score = Math.max(1, Math.min(5, Number(parsed.score) || 2.5));
      
      return {
        rating: scoreToCategory(score),
        score,
        summary: String(parsed.summary || 'Analysis complete').slice(0, 100),
        details: {
          engagement_score: Math.max(1, Math.min(5, Number(parsed.engagement_score) || score)),
          sentiment_score: Math.max(1, Math.min(5, Number(parsed.sentiment_score) || score)),
          progression_score: Math.max(1, Math.min(5, Number(parsed.progression_score) || score)),
          followup_count: followupCount,
          key_signals: Array.isArray(parsed.key_signals) 
            ? parsed.key_signals.slice(0, 5).map(String) 
            : [],
          last_remarks: remarks.slice(0, 3),
        },
      };
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, aiContent);
      return getFallbackRating(remarks, followupCount, customFields);
    }
  } catch (error) {
    console.error('AI rating API error:', error);
    return getFallbackRating(remarks, followupCount, customFields);
  }
}

function getFallbackRating(
  remarks: string[],
  followupCount: number,
  customFields: Record<string, any>
): AIRatingResult {
  const negativePatterns = [
    /not\s*interested/i,
    /nahanti/i,
    /nahnti/i,
    /switch\s*off/i,
    /kati\s*d/i,
    /karibeni/i,
    /nahi/i,
    /rcv.*karu.*nah/i,
    /laguni/i,
  ];

  const positivePatterns = [
    /visit/i,
    /office/i,
    /sqft/i,
    /estimate/i,
    /schedule/i,
    /asibe/i,
    /karibe/i,
    /meeting/i,
    /budget/i,
    /requirement/i,
  ];

  let score = 2.5;
  const signals: string[] = [];

  const leadStatus = customFields?.lead_status?.toLowerCase() || '';
  const visitStatus = customFields?.visit_status?.toLowerCase() || '';

  if (leadStatus.includes('not interested') || leadStatus.includes('lost')) {
    score -= 1.5;
    signals.push('Lead marked not interested');
  } else if (leadStatus.includes('follow up') || leadStatus.includes('contacted')) {
    score += 0.5;
    signals.push('Active follow-up status');
  }

  if (visitStatus.includes('scheduled') || visitStatus.includes('visited')) {
    score += 1;
    signals.push('Visit scheduled/completed');
  }

  const remarksText = remarks.join(' ').toLowerCase();
  let positiveMatches = 0;
  let negativeMatches = 0;

  positivePatterns.forEach(p => {
    if (p.test(remarksText)) positiveMatches++;
  });

  negativePatterns.forEach(p => {
    if (p.test(remarksText)) negativeMatches++;
  });

  if (positiveMatches > negativeMatches) {
    score += Math.min(1, positiveMatches * 0.3);
    signals.push(`${positiveMatches} positive indicators`);
  } else if (negativeMatches > positiveMatches) {
    score -= Math.min(1, negativeMatches * 0.3);
    signals.push(`${negativeMatches} negative indicators`);
  }

  score = Math.max(1, Math.min(5, score));

  return {
    rating: scoreToCategory(score),
    score: Math.round(score * 10) / 10,
    summary: 'Fallback analysis based on patterns',
    details: {
      engagement_score: score,
      sentiment_score: score,
      progression_score: score,
      followup_count: followupCount,
      key_signals: signals.slice(0, 5),
      last_remarks: remarks.slice(0, 3),
    },
  };
}

export async function updateLeadAIRating(
  leadId: string,
  rating: AIRatingResult
): Promise<void> {
  await db
    .update(leads)
    .set({
      ai_rating: rating.rating,
      ai_rating_score: Math.round(rating.score),
      ai_rating_summary: rating.summary,
      ai_rating_details: rating.details,
      ai_rating_updated_at: new Date(),
    })
    .where(eq(leads.id, leadId));
}

export async function calculateAndUpdateLeadRating(
  leadId: string,
  apiKey: string
): Promise<AIRatingResult | null> {
  const lead = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, leadId), isNull(leads.deleted_at)))
    .limit(1);

  if (lead.length === 0) {
    return null;
  }

  const customFields = lead[0].custom_fields || {};
  const result = await calculateAIRating(leadId, customFields, apiKey);

  if (result) {
    await updateLeadAIRating(leadId, result);
  }

  return result;
}

export async function batchCalculateRatings(
  leadIds: string[],
  apiKey: string,
  delayMs: number = 500
): Promise<Map<string, AIRatingResult | null>> {
  const results = new Map<string, AIRatingResult | null>();

  for (const leadId of leadIds) {
    try {
      const result = await calculateAndUpdateLeadRating(leadId, apiKey);
      results.set(leadId, result);
      
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`Error calculating rating for lead ${leadId}:`, error);
      results.set(leadId, null);
    }
  }

  return results;
}
