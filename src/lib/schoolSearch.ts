/**
 * Enhanced school search functionality with fuzzy matching and multi-word support
 */

export interface SchoolSearchResult {
  id: number;
  school_name: string;
  city: string;
  state: string;
  score: number;
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + substitutionCost,
      );
    }
  }
  
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : (maxLength - matrix[str2.length][str1.length]) / maxLength;
}

/**
 * Score a school based on search query match
 */
function scoreSchool(school: any, queryWords: string[]): number {
  const normalize = (s: string) => (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const STOPWORDS = new Set([
    'school','elementary','middle','high','academy','the','of','and','for','public','charter','magnet'
  ]);

  const schoolName = normalize(school.school_name);
  const city = normalize(school.city);
  const state = normalize(school.state);
  const fullQueryRaw = queryWords.join(' ');
  const fullQuery = normalize(fullQueryRaw);

  if (!fullQuery) return 0;

  // Exact and starts-with get decisive boosts
  if (schoolName === fullQuery) {
    return 1000;
  }
  if (schoolName.startsWith(fullQuery)) {
    return 200 + Math.min(50, fullQuery.length);
  }

  // Build significant words (remove stopwords, very short words)
  const words = fullQuery
    .split(' ')
    .filter(w => w.length >= 3 && !STOPWORDS.has(w));

  // If no significant words, fallback to simple contains
  if (words.length === 0) {
    if (schoolName.includes(fullQuery)) {
      return 120 + (fullQuery.length / Math.max(schoolName.length, 1)) * 10;
    }
    return 0;
  }

  // Check adjacent bigram presence for phrase proximity
  const containsBigram = (() => {
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      if (schoolName.includes(bigram)) return true;
    }
    return false;
  })();

  let totalScore = 0;
  let matchedWords = 0;

  const schoolWords = schoolName.split(' ');
  for (const w of words) {
    let best = 0;

    // Direct term presence weights
    if (schoolName.includes(w)) best = Math.max(best, 10);
    if (city.includes(w)) best = Math.max(best, 2);
    if (state.includes(w)) best = Math.max(best, 1);

    // Very strict fuzzy for longer words
    if (w.length > 4) {
      for (const sw of schoolWords) {
        if (sw.length > 4) {
          const similarity = calculateSimilarity(w, sw);
          if (similarity >= 0.9) {
            best = Math.max(best, 6 * similarity);
          }
        }
      }
    }

    if (best > 0) {
      matchedWords++;
      totalScore += best;
    }
  }

  // Phrase proximity bonus
  if (containsBigram) totalScore += 50;

  // Full phrase containment bonus (but less than starts-with)
  if (schoolName.includes(fullQuery)) totalScore += 80;

  // Enforce strong completeness for multi-word queries
  const completeness = matchedWords / words.length;
  if (words.length > 1 && completeness < 0.8 && !containsBigram) {
    return 0;
  }

  return totalScore;
}

/**
 * Enhanced school search with multi-word support and fuzzy matching
 */
export function enhancedSchoolSearch(schools: any[], query: string, maxResults: number = 15): SchoolSearchResult[] {
  const normalize = (s: string) => (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!query.trim()) {
    return [];
  }
  
  const trimmedQuery = query.trim();
  
  // Require minimum 2 characters to start searching
  if (trimmedQuery.length < 2) {
    return [];
  }
  
  // Split query into words and filter out empty strings
  const rawWords = trimmedQuery.split(/\s+/).filter(word => word.length > 0);
  const queryWords = rawWords.map(w => normalize(w)).filter(Boolean);
  const fullQuery = normalize(rawWords.join(' '));
  
  if (queryWords.length === 0) {
    return [];
  }
  
  // Progressive result limiting based on query length
  let dynamicMaxResults = maxResults;
  if (trimmedQuery.length >= 12) {
    dynamicMaxResults = Math.min(5, maxResults); // Very focused results for long queries
  } else if (trimmedQuery.length >= 6) {
    dynamicMaxResults = Math.min(8, maxResults); // Moderate results for medium queries
  } else {
    dynamicMaxResults = Math.min(12, maxResults); // More results for short queries
  }

  // Helper for bigram priority
  const hasBigram = (nameNorm: string, words: string[]) => {
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      if (nameNorm.includes(bigram)) return true;
    }
    return false;
  };
  
  // Score all schools with prioritization and tie-breakers
  const scored = schools
    .map((school) => {
      const nameNorm = normalize(school.school_name);
      const priority = nameNorm === fullQuery
        ? 2
        : (nameNorm.startsWith(fullQuery) ? 1 : (hasBigram(nameNorm, queryWords) ? 0 : -1));
      const score = scoreSchool(school, queryWords);
      return { ...school, score, _priority: priority, _nameNorm: nameNorm } as any;
    })
    .filter((s: any) => s.score >= 10)
    .sort((a: any, b: any) => {
      // Priority: exact > starts-with > others
      if (b._priority !== a._priority) return b._priority - a._priority;
      // Then by score
      if (b.score !== a.score) return b.score - a.score;
      // Then by name length proximity to query
      const lenA = Math.abs(a._nameNorm.length - fullQuery.length);
      const lenB = Math.abs(b._nameNorm.length - fullQuery.length);
      if (lenA !== lenB) return lenA - lenB;
      // Finally alphabetical
      return (a.school_name || '').localeCompare(b.school_name || '');
    })
    .slice(0, dynamicMaxResults)
    .map((s: any) => ({ id: s.id, school_name: s.school_name, city: s.city, state: s.state, score: s.score }));
  
  return scored;
}