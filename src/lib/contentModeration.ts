/**
 * Content Moderation System
 * Multi-layer: profanity filter, PII detection, spam detection
 * Namibian context-aware with server-side DB integration
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Client-side banned words for instant pre-check ──

const BANNED_WORDS = [
  'fuck', 'shit', 'cunt', 'bitch', 'asshole',
  'poes', 'doos', 'naai',  // Afrikaans profanity
  'kaffir', 'hotnot', 'coolie',  // Hate speech
];

const FLAGGED_WORDS = [
  'kill', 'murder', 'rape', 'assault', 'bomb', 'gun', 'weapon',
  'drugs', 'cocaine', 'heroin', 'meth',
];

const SPAM_KEYWORDS = [
  'click here', 'buy now', 'limited time', 'act now',
  'free money', 'get rich', 'work from home',
  'enlarge', 'weight loss', 'miracle',
];

// ── Types ──

export interface ModerationResult {
  approved: boolean;
  action: 'allow' | 'flag' | 'block';
  reason?: string;
  flaggedWords?: string[];
  confidence: number;
}

// ── Layer 1: Text moderation — profanity and flagged words ──

export function moderateText(content: string): ModerationResult {
  const lowerContent = content.toLowerCase();

  // Check for blocked words
  const foundBlocked = BANNED_WORDS.filter(w => lowerContent.includes(w.toLowerCase()));
  if (foundBlocked.length > 0) {
    return {
      approved: false,
      action: 'block',
      reason: 'Content contains inappropriate language',
      flaggedWords: foundBlocked,
      confidence: 0.95,
    };
  }

  // Check for masked profanity
  if (detectMaskedProfanity(content)) {
    return {
      approved: false,
      action: 'block',
      reason: 'Attempted to bypass content filter',
      confidence: 0.8,
    };
  }

  // Check flagged words — send to review
  const foundFlagged = FLAGGED_WORDS.filter(w => lowerContent.includes(w.toLowerCase()));
  if (foundFlagged.length > 0) {
    return {
      approved: false,
      action: 'flag',
      reason: 'Contains potentially concerning content',
      flaggedWords: foundFlagged,
      confidence: 0.7,
    };
  }

  return { approved: true, action: 'allow', confidence: 1.0 };
}

function detectMaskedProfanity(content: string): boolean {
  const patterns = [
    /f[\*u@#]{1,2}k/i,
    /sh[\*i1!]{1,2}t/i,
    /b[\*i1!]{1,2}tch/i,
    /d[\*a@]{1,2}mn/i,
    /f\s*u\s*c\s*k/i,
    /s\s*h\s*i\s*t/i,
    /[a@]ssh[o0]le/i,
  ];
  return patterns.some((pattern) => pattern.test(content));
}

// ── Layer 2: Personal Information Detection (Namibian context) ──

export function detectPersonalInfo(content: string): {
  hasPII: boolean;
  types: string[];
  redacted: string;
} {
  const types: string[] = [];
  let redacted = content;

  // Namibian phone numbers (+264 or 0)
  const phoneRegex = /(\+264|0)\s?\d{2}\s?\d{3}\s?\d{4}/g;
  if (phoneRegex.test(content)) {
    types.push('phone_number');
    redacted = redacted.replace(/(\+264|0)\s?\d{2}\s?\d{3}\s?\d{4}/g, '[PHONE REMOVED]');
  }

  // Email addresses
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  if (emailRegex.test(content)) {
    types.push('email');
    redacted = redacted.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL REMOVED]');
  }

  // Namibian ID numbers (11 digits)
  const idRegex = /\b\d{11}\b/g;
  if (idRegex.test(content)) {
    types.push('id_number');
    redacted = redacted.replace(/\b\d{11}\b/g, '[ID REMOVED]');
  }

  // Physical addresses
  const addressKeywords = ['street', 'str', 'avenue', 'ave', 'road', 'rd', 'plot', 'erf'];
  const hasAddress = addressKeywords.some(
    (keyword) => content.toLowerCase().includes(keyword) && /\d+/.test(content)
  );
  if (hasAddress) {
    types.push('possible_address');
  }

  // URLs
  if (/(https?:\/\/[^\s]+)/g.test(content)) {
    types.push('external_link');
    redacted = redacted.replace(/(https?:\/\/[^\s]+)/g, '[LINK REMOVED]');
  }

  return { hasPII: types.length > 0, types, redacted };
}

// ── Layer 3: Spam Detection ──

export function detectSpamPatterns(content: string): {
  isSpam: boolean;
  patterns: string[];
  confidence: number;
} {
  const patterns: string[] = [];

  // All caps (>70%)
  if (content.length > 10) {
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.7) {
      patterns.push('excessive_caps');
    }
  }

  // Excessive punctuation
  const punctuationCount = (content.match(/[!?]{2,}/g) || []).length;
  if (punctuationCount > 3) {
    patterns.push('excessive_punctuation');
  }

  // Repeated characters
  if (/(.)\1{4,}/.test(content)) {
    patterns.push('repeated_characters');
  }

  // Too many emojis
  const emojiCount = (content.match(/[\u{1F600}-\u{1F64F}]/gu) || []).length;
  if (emojiCount > 10) {
    patterns.push('excessive_emojis');
  }

  // Marketing/spam keywords
  const lowerContent = content.toLowerCase();
  const hasSpam = SPAM_KEYWORDS.some(kw => lowerContent.includes(kw));
  if (hasSpam) {
    patterns.push('spam_keywords');
  }

  // Multiple links
  const linkCount = (content.match(/(https?:\/\/|www\.)[^\s]+/gi) || []).length;
  if (linkCount > 2) {
    patterns.push('multiple_links');
  }

  const isSpam = patterns.length >= 2;
  const confidence = Math.min(patterns.length * 0.3, 1.0);

  return { isSpam, patterns, confidence };
}

// ── Combined content check — use before submitting posts/comments/incidents ──

export function checkContent(
  content: string,
  contentType: 'post' | 'comment' | 'incident'
): {
  approved: boolean;
  action: 'allow' | 'flag' | 'block';
  reason?: string;
  redacted?: string;
  requiresReview: boolean;
} {
  // 1. Basic validation
  if (!content || content.trim().length === 0) {
    return { approved: false, action: 'block', reason: 'Content cannot be empty', requiresReview: false };
  }
  if (content.length > 5000) {
    return { approved: false, action: 'block', reason: 'Content too long (max 5000 characters)', requiresReview: false };
  }

  // 2. Check profanity
  const profanityCheck = moderateText(content);
  if (profanityCheck.action === 'block') {
    return { approved: false, action: 'block', reason: profanityCheck.reason, requiresReview: false };
  }

  // 3. Check for personal info
  const piiCheck = detectPersonalInfo(content);
  if (piiCheck.hasPII) {
    if (piiCheck.types.includes('external_link')) {
      return {
        approved: false,
        action: 'flag',
        reason: 'External links are not allowed. Please remove URLs.',
        redacted: piiCheck.redacted,
        requiresReview: true,
      };
    }
    return {
      approved: true,
      action: 'allow',
      reason: 'Personal information was auto-redacted for privacy.',
      redacted: piiCheck.redacted,
      requiresReview: piiCheck.types.length > 2,
    };
  }

  // 4. Check for spam
  const spamCheck = detectSpamPatterns(content);
  if (spamCheck.isSpam) {
    return { approved: false, action: 'block', reason: 'Your message appears to be spam.', requiresReview: false };
  }

  // 5. Flagged words go to review
  if (profanityCheck.action === 'flag') {
    return {
      approved: true,
      action: 'flag',
      reason: 'Your post is being reviewed by moderators.',
      requiresReview: true,
    };
  }

  return { approved: true, action: 'allow', requiresReview: false };
}

// ── Server-side moderation (calls DB function) ──

export async function serverModerateText(
  text: string,
  userId: string
): Promise<{
  passed: boolean;
  blockedWords: string[];
  flaggedWords: string[];
  containsPII: boolean;
  issues: string[];
}> {
  const { data, error } = await supabase.rpc('moderate_text', {
    text_param: text,
    user_id_param: userId,
  });

  if (error) {
    console.error('Server moderation error:', error);
    // Fail closed — block if moderation fails
    return {
      passed: false,
      blockedWords: [],
      flaggedWords: [],
      containsPII: false,
      issues: ['moderation_error'],
    };
  }

  const row = data?.[0];
  return {
    passed: row?.passed ?? false,
    blockedWords: row?.blocked_words ?? [],
    flaggedWords: row?.flagged_words ?? [],
    containsPII: row?.contains_pii ?? false,
    issues: row?.issues ?? [],
  };
}

// ── Flag content for review ──

export async function flagContent(
  contentId: string,
  contentType: 'incident' | 'post' | 'comment' | 'marker',
  reason: string,
  details?: string
): Promise<{ success: boolean }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  try {
    const { error } = await supabase.from('content_flags').insert({
      content_id: contentId,
      content_type: contentType,
      flagger_user_id: user.id,
      flag_reason: reason,
      flag_details: details,
    });

    if (error) throw error;

    toast.success('Content flagged for review. Thank you for helping keep the community safe.');
    return { success: true };
  } catch (error: any) {
    if (error?.code === '23505') {
      toast.info('You have already flagged this content');
    } else {
      toast.error('Failed to flag content');
    }
    return { success: false };
  }
}
