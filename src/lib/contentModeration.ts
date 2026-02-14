/**
 * Content Moderation System
 * Multi-layer: profanity filter, PII detection, spam detection
 * Namibian context-aware
 */

// Flagged words that send content to review
const FLAGGED_WORDS = [
  'kill', 'murder', 'rape', 'assault', 'bomb', 'gun', 'weapon',
  'drugs', 'cocaine', 'heroin', 'meth',
];

export interface ModerationResult {
  approved: boolean;
  action: 'allow' | 'flag' | 'block';
  reason?: string;
  flaggedWords?: string[];
  confidence: number;
}

/**
 * Layer 1: Text moderation — profanity and flagged words
 */
export function moderateText(content: string): ModerationResult {
  const lowerContent = content.toLowerCase();

  // Check for flagged words — send to review
  const foundFlaggedWords: string[] = [];
  for (const word of FLAGGED_WORDS) {
    if (lowerContent.includes(word.toLowerCase())) {
      foundFlaggedWords.push(word);
    }
  }

  if (foundFlaggedWords.length > 0) {
    return {
      approved: false,
      action: 'flag',
      reason: 'Contains potentially concerning content',
      flaggedWords: foundFlaggedWords,
      confidence: 0.7,
    };
  }

  // Check for masked profanity (f**k, sh1t, etc.)
  if (detectMaskedProfanity(content)) {
    return {
      approved: false,
      action: 'block',
      reason: 'Attempted to bypass content filter',
      confidence: 0.8,
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
  ];
  return patterns.some((pattern) => pattern.test(content));
}

/**
 * Layer 2: Personal Information Detection (Namibian context)
 */
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
    redacted = redacted.replace(phoneRegex, '[PHONE REMOVED]');
  }

  // Email addresses
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  if (emailRegex.test(content)) {
    types.push('email');
    redacted = redacted.replace(emailRegex, '[EMAIL REMOVED]');
  }

  // Namibian ID numbers (11 digits)
  const idRegex = /\b\d{11}\b/g;
  if (idRegex.test(content)) {
    types.push('id_number');
    redacted = redacted.replace(idRegex, '[ID REMOVED]');
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
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  if (urlRegex.test(content)) {
    types.push('external_link');
    redacted = redacted.replace(urlRegex, '[LINK REMOVED]');
  }

  return { hasPII: types.length > 0, types, redacted };
}

/**
 * Layer 3: Spam Detection
 */
export function detectSpamPatterns(content: string): {
  isSpam: boolean;
  patterns: string[];
  confidence: number;
} {
  const patterns: string[] = [];

  // All caps (>70%)
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (capsRatio > 0.7 && content.length > 10) {
    patterns.push('excessive_caps');
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

  // Marketing keywords
  const marketingKeywords = [
    'click here', 'buy now', 'limited time', 'act fast',
    'free money', 'easy cash', 'make money fast', 'work from home',
    'winner', 'congratulations', 'you won', 'claim now',
  ];
  const hasMarketing = marketingKeywords.some((kw) =>
    content.toLowerCase().includes(kw)
  );
  if (hasMarketing) {
    patterns.push('marketing_language');
  }

  const isSpam = patterns.length >= 2;
  const confidence = Math.min(patterns.length * 0.3, 1.0);

  return { isSpam, patterns, confidence };
}

/**
 * Combined content check — use before submitting posts/comments/incidents
 */
export function checkContent(
  content: string,
  contentType: 'post' | 'comment' | 'incident'
): {
  approved: boolean;
  action: 'allow' | 'flag' | 'block';
  reason?: string;
  redacted?: string;
} {
  // 1. Check profanity
  const profanityCheck = moderateText(content);
  if (profanityCheck.action === 'block') {
    return {
      approved: false,
      action: 'block',
      reason: 'Your message contains inappropriate content.',
    };
  }

  // 2. Check for personal info
  const piiCheck = detectPersonalInfo(content);
  if (piiCheck.hasPII) {
    return {
      approved: false,
      action: 'flag',
      reason: 'Your message contains personal information that should be removed for privacy.',
      redacted: piiCheck.redacted,
    };
  }

  // 3. Check for spam
  const spamCheck = detectSpamPatterns(content);
  if (spamCheck.isSpam) {
    return {
      approved: false,
      action: 'block',
      reason: 'Your message appears to be spam.',
    };
  }

  // 4. Flagged words go to review
  if (profanityCheck.action === 'flag') {
    return {
      approved: false,
      action: 'flag',
      reason: 'Your post is being reviewed by moderators.',
    };
  }

  return { approved: true, action: 'allow' };
}
