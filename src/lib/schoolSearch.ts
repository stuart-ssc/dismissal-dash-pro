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
  
  let totalScore = 0;
  let matchedWords = 0;
  
  for (const word of queryWords) {
    const wordLower = word.toLowerCase();
    let bestScore = 0;
    
    // Exact word matches get highest score
    if (schoolName.includes(wordLower)) {
      bestScore = Math.max(bestScore, 1.0);
    }
    if (city.includes(wordLower)) {
      bestScore = Math.max(bestScore, 0.8);
    }
    if (state.includes(wordLower)) {
      bestScore = Math.max(bestScore, 0.6);
    }
    
    // Fuzzy matching for typos
    const schoolWords = schoolName.split(/\s+/);
    for (const schoolWord of schoolWords) {
      if (schoolWord.length > 2 && wordLower.length > 2) {
        const similarity = calculateSimilarity(wordLower, schoolWord);
        if (similarity > 0.7) {
          bestScore = Math.max(bestScore, similarity * 0.9);
        }
      }
    }
    
    // Partial word matching
    for (const schoolWord of schoolWords) {
      if (schoolWord.startsWith(wordLower) || wordLower.startsWith(schoolWord)) {
        bestScore = Math.max(bestScore, 0.7);
      }
    }
    
    if (bestScore > 0) {
      matchedWords++;
      totalScore += bestScore;
    }
  }
  
  // Bonus for matching all words
  const completenessBonus = queryWords.length > 0 ? matchedWords / queryWords.length : 0;
  
  // Bonus for exact school name match
  const exactMatch = schoolName === queryWords.join(' ').toLowerCase() ? 0.5 : 0;
  
  return totalScore + (completenessBonus * 0.5) + exactMatch;
}

/**
 * Enhanced school search with multi-word support and fuzzy matching
 */
export function enhancedSchoolSearch(schools: any[], query: string, maxResults: number = 50): SchoolSearchResult[] {
  if (!query.trim()) {
    return schools.slice(0, maxResults).map(school => ({
      ...school,
      score: 0
    }));
  }
  
  // Split query into words and filter out empty strings
  const queryWords = query.trim().split(/\s+/).filter(word => word.length > 0);
  
  if (queryWords.length === 0) {
    return schools.slice(0, maxResults).map(school => ({
      ...school,
      score: 0
    }));
  }
  
  // Score all schools
  const scoredSchools = schools
    .map(school => ({
      ...school,
      score: scoreSchool(school, queryWords)
    }))
    .filter(school => school.score > 0) // Only include schools with some match
    .sort((a, b) => b.score - a.score) // Sort by score descending
    .slice(0, maxResults);
  
  return scoredSchools;
}