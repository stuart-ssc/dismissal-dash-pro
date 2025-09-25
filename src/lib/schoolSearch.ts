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
function scoreSchool(school: any, queryWords: string[], fullQuery: string): number {
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

  if (!fullQuery) return 0;

  // Exact and starts-with boosts (kept inside scoring as a fallback)
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
  const completeness = words.length > 0 ? matchedWords / words.length : 0;
  if (words.length > 1 && matchedWords < Math.min(2, words.length) && !containsBigram) {
    return 0;
  }

  return totalScore;
}

/**
 * Enhanced school search with deterministic exact-first matching + canonical buckets
 */
export function enhancedSchoolSearch(schools: any[], query: string, maxResults: number = 15): SchoolSearchResult[] {
  const normalize = (s: string) => (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Canonicalize by stripping common suffixes like "school", "elementary", "middle", etc.
  const canonicalize = (s: string) => {
    const n = normalize(s);
    // remove common trailing descriptors
    const SUFFIXES = [
      ' junior high school',' jr high school',' junior high',' jr high',
      ' elementary school',' middle school',' high school',' primary school',' secondary school',
      ' elementary sch',' elem',' es',' ms',' hs',
      ' elementary',' middle',' high',' academy',' school'
    ];
    let out = n;
    for (const suf of SUFFIXES) {
      if (out.endsWith(suf)) {
        out = out.slice(0, -suf.length).trim();
        break; // strip only one to avoid over-trimming
      }
    }
    return out;
  };

  if (!query?.trim()) return [];
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) return [];

  const rawWords = trimmedQuery.split(/\s+/).filter(Boolean);
  const queryWords = rawWords.map((w) => normalize(w)).filter(Boolean);
  const fullQuery = normalize(rawWords.join(' '));
  const queryCanon = canonicalize(fullQuery);
  if (queryWords.length === 0) return [];

  // Progressive result limiting based on query length
  let dynamicMaxResults = maxResults;
  if (trimmedQuery.length >= 12) dynamicMaxResults = Math.min(5, maxResults);
  else if (trimmedQuery.length >= 6) dynamicMaxResults = Math.min(8, maxResults);
  else dynamicMaxResults = Math.min(12, maxResults);

  const withNorm = schools.map((s) => ({
    ...s,
    _nameNorm: normalize(s.school_name || ''),
    _nameCanon: canonicalize(s.school_name || ''),
  }));

  // Unconditional exact normalized match short-circuit
  const exactNorm = withNorm.filter((s) => s._nameNorm === fullQuery);
  if (exactNorm.length) {
    const out = exactNorm
      .sort((a, b) => (a.school_name || '').localeCompare(b.school_name || ''))
      .slice(0, dynamicMaxResults)
      .map((s) => ({ id: s.id, school_name: s.school_name, city: s.city, state: s.state, score: 1200 }));
    console.debug?.('[schoolSearch] exact-norm', { query: fullQuery, count: out.length });
    return out as SchoolSearchResult[];
  }

  // Tie-breakers
  const byTieBreakers = (a: any, b: any) => {
    const lenA = Math.abs((a._nameNorm || '').length - fullQuery.length);
    const lenB = Math.abs((b._nameNorm || '').length - fullQuery.length);
    if (lenA !== lenB) return lenA - lenB;
    return (a.school_name || '').localeCompare(b.school_name || '');
  };
  const byTieBreakersCanon = (a: any, b: any) => {
    const lenA = Math.abs((a._nameCanon || '').length - queryCanon.length);
    const lenB = Math.abs((b._nameCanon || '').length - queryCanon.length);
    if (lenA !== lenB) return lenA - lenB;
    return (a.school_name || '').localeCompare(b.school_name || '');
  };

  // Canonical buckets come first to catch naming variants
  const exactCanon = withNorm.filter((s) => s._nameCanon === queryCanon);
  if (exactCanon.length) {
    const out = exactCanon
      .sort(byTieBreakersCanon)
      .slice(0, dynamicMaxResults)
      .map((s) => ({ id: s.id, school_name: s.school_name, city: s.city, state: s.state, score: 1100 }));
    console.debug?.('[schoolSearch] exact-canon', { query: queryCanon, count: out.length });
    return out as SchoolSearchResult[];
  }

  const startsCanon = withNorm.filter((s) => s._nameCanon.startsWith(queryCanon) && s._nameCanon !== queryCanon);
  if (startsCanon.length) {
    const out = startsCanon
      .sort(byTieBreakersCanon)
      .slice(0, dynamicMaxResults)
      .map((s) => ({ id: s.id, school_name: s.school_name, city: s.city, state: s.state, score: 400 }));
    console.debug?.('[schoolSearch] starts-canon', { query: queryCanon, count: out.length });
    return out as SchoolSearchResult[];
  }

  const containsCanon = withNorm.filter((s) => s._nameCanon.includes(queryCanon) && s._nameCanon !== queryCanon);
  if (containsCanon.length) {
    const out = containsCanon
      .sort(byTieBreakersCanon)
      .slice(0, dynamicMaxResults)
      .map((s) => ({ id: s.id, school_name: s.school_name, city: s.city, state: s.state, score: 300 }));
    console.debug?.('[schoolSearch] contains-canon', { query: queryCanon, count: out.length });
    return out as SchoolSearchResult[];
  }

  // Original deterministic buckets on full normalized string
  const exact = withNorm.filter((s) => s._nameNorm === fullQuery);
  const starts = withNorm.filter((s) => s._nameNorm.startsWith(fullQuery) && s._nameNorm !== fullQuery);
  const phrase = withNorm.filter((s) => s._nameNorm.includes(fullQuery) && !s._nameNorm.startsWith(fullQuery) && s._nameNorm !== fullQuery);

  if (exact.length) {
    const out = exact.sort(byTieBreakers).slice(0, dynamicMaxResults).map((s) => ({ id: s.id, school_name: s.school_name, city: s.city, state: s.state, score: 1000 }));
    console.debug?.('[schoolSearch] exact match', { query: fullQuery, count: out.length });
    return out as SchoolSearchResult[];
  }

  if (starts.length) {
    const out = starts.sort(byTieBreakers).slice(0, dynamicMaxResults).map((s) => ({ id: s.id, school_name: s.school_name, city: s.city, state: s.state, score: 300 }));
    console.debug?.('[schoolSearch] starts-with', { query: fullQuery, count: out.length });
    return out as SchoolSearchResult[];
  }

  if (phrase.length) {
    const out = phrase.sort(byTieBreakers).slice(0, dynamicMaxResults).map((s) => ({ id: s.id, school_name: s.school_name, city: s.city, state: s.state, score: 200 }));
    console.debug?.('[schoolSearch] phrase-contains', { query: fullQuery, count: out.length });
    return out as SchoolSearchResult[];
  }

  // Short query starts-with for 1-2 chars (prevents noise)
  if (fullQuery.length >= 1 && fullQuery.length <= 2) {
    const shortStarts = withNorm.filter((s) => 
      s._nameNorm.startsWith(fullQuery) || s._nameCanon.startsWith(queryCanon)
    );
    if (shortStarts.length) {
      const out = shortStarts
        .sort(byTieBreakersCanon)
        .slice(0, dynamicMaxResults)
        .map((s) => ({ id: s.id, school_name: s.school_name, city: s.city, state: s.state, score: 500 }));
      console.debug?.('[schoolSearch] short-starts', { query: fullQuery, count: out.length });
      return out as SchoolSearchResult[];
    }
  }

  // Multi-token AND matching across name/city/state
  const STOPWORDS = new Set([
    'school','elementary','middle','high','academy','the','of','and','for','public','charter','magnet'
  ]);
  const sigWords = fullQuery.split(' ').filter((w) => w.length >= 2 && !STOPWORDS.has(w));
  if (sigWords.length > 0) {
    const tokensAllPresent = withNorm.filter((s) => {
      const nameCanon = s._nameCanon || '';
      const nameNorm = s._nameNorm || '';
      const cityNorm = normalize(s.city || '');
      const stateNorm = normalize(s.state || '');
      return sigWords.every((w) =>
        nameCanon.includes(w) || nameNorm.includes(w) || cityNorm.includes(w) || stateNorm.includes(w)
      );
    });
    if (tokensAllPresent.length) {
      const out = tokensAllPresent
        .sort(byTieBreakersCanon)
        .slice(0, dynamicMaxResults)
        .map((s) => ({ id: s.id, school_name: s.school_name, city: s.city, state: s.state, score: 350 }));
      console.debug?.('[schoolSearch] tokens-all-present', { query: fullQuery, count: out.length });
      return out as SchoolSearchResult[];
    }
  }

  // Scored fallback
  const scored = withNorm
    .map((s) => ({
      ...s,
      score: scoreSchool(s, queryWords, fullQuery),
    }))
    .filter((s) => s.score >= 10)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return byTieBreakers(a, b);
    })
    .slice(0, dynamicMaxResults)
    .map((s) => ({ id: s.id, school_name: s.school_name, city: s.city, state: s.state, score: s.score }));

  if (scored.length) {
    console.debug?.('[schoolSearch] scored', { query: fullQuery, count: scored.length });
    return scored as SchoolSearchResult[];
  }

  // Final safety net: simple contains on the full phrase
  const contains = withNorm.filter((s) => s._nameNorm.includes(fullQuery))
    .sort(byTieBreakers)
    .slice(0, dynamicMaxResults)
    .map((s) => ({ id: s.id, school_name: s.school_name, city: s.city, state: s.state, score: 50 }));

  console.debug?.('[schoolSearch] contains-fallback', { query: fullQuery, count: contains.length });
  return contains as SchoolSearchResult[];
}