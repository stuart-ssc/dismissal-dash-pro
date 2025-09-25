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
  const schoolName = school.school_name?.toLowerCase() || '';
  const city = school.city?.toLowerCase() || '';
  const state = school.state?.toLowerCase() || '';
  const fullQuery = queryWords.join(' ').toLowerCase();
  
  let totalScore = 0;
  let matchedWords = 0;
  
  // Check for exact full name match (highest priority)
  if (schoolName === fullQuery) {
    return 10.0; // Extremely high score for exact matches
  }
  
  // Check if school name starts with the query (very high priority)
  if (schoolName.startsWith(fullQuery)) {
    return 8.0;
  }
  
  // Check if query is contained in school name (high priority)
  if (schoolName.includes(fullQuery)) {
    return 6.0 + (fullQuery.length / schoolName.length); // Bonus for longer matches
  }
  
  for (const word of queryWords) {
    const wordLower = word.toLowerCase();
    let bestScore = 0;
    
    // Only process words that are at least 2 characters
    if (wordLower.length < 2) continue;
    
    // Exact word matches get high score
    if (schoolName.includes(wordLower)) {
      bestScore = Math.max(bestScore, 2.0);
    }
    if (city.includes(wordLower)) {
      bestScore = Math.max(bestScore, 1.5);
    }
    if (state.includes(wordLower)) {
      bestScore = Math.max(bestScore, 1.0);
    }
    
    // Stricter fuzzy matching for typos (only very similar words)
    const schoolWords = schoolName.split(/\s+/);
    for (const schoolWord of schoolWords) {
      if (schoolWord.length > 2 && wordLower.length > 2) {
        const similarity = calculateSimilarity(wordLower, schoolWord);
        if (similarity > 0.85) { // Much stricter threshold
          bestScore = Math.max(bestScore, similarity * 1.5);
        }
      }
    }
    
    // Stricter partial word matching (minimum 3 characters)
    if (wordLower.length >= 3) {
      for (const schoolWord of schoolWords) {
        if (schoolWord.startsWith(wordLower) && wordLower.length >= 3) {
          bestScore = Math.max(bestScore, 1.8);
        }
      }
    }
    
    if (bestScore > 0) {
      matchedWords++;
      totalScore += bestScore;
    }
  }
  
  // Require all significant words to match for a valid result
  if (queryWords.length > 1 && matchedWords < queryWords.length) {
    return 0; // Filter out partial matches for multi-word queries
  }
  
  // Bonus for matching all words
  const completenessBonus = queryWords.length > 0 ? (matchedWords / queryWords.length) * 2.0 : 0;
  
  return totalScore + completenessBonus;
}

/**
 * Enhanced school search with multi-word support and fuzzy matching
 */
export function enhancedSchoolSearch(schools: any[], query: string, maxResults: number = 15): SchoolSearchResult[] {
  if (!query.trim()) {
    return [];
  }
  
  const trimmedQuery = query.trim();
  
  // Require minimum 2 characters to start searching
  if (trimmedQuery.length < 2) {
    return [];
  }
  
  // Split query into words and filter out empty strings
  const queryWords = trimmedQuery.split(/\s+/).filter(word => word.length > 0);
  
  if (queryWords.length === 0) {
    return [];
  }
  
  // Progressive result limiting based on query length
  let dynamicMaxResults = maxResults;
  if (trimmedQuery.length >= 10) {
    dynamicMaxResults = Math.min(5, maxResults); // Very focused results for long queries
  } else if (trimmedQuery.length >= 6) {
    dynamicMaxResults = Math.min(8, maxResults); // Moderate results for medium queries
  } else {
    dynamicMaxResults = Math.min(12, maxResults); // More results for short queries
  }
  
  // Score all schools
  const scoredSchools = schools
    .map(school => ({
      ...school,
      score: scoreSchool(school, queryWords)
    }))
    .filter(school => school.score >= 2.0) // Only include schools with meaningful scores
    .sort((a, b) => b.score - a.score) // Sort by score descending
    .slice(0, dynamicMaxResults);
  
  return scoredSchools;
}