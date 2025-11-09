/**
 * Fuzzy Matching Utility for Infinite Campus Integration
 * Matches students and teachers from IC to existing DismissalPro records
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface MatchResult {
  confidence: number; // 0.00 to 1.00
  criteria: string;
  existingRecordId: string | null;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Calculate similarity score (0 to 1) based on Levenshtein distance
 */
function similarityScore(str1: string, str2: string): number {
  const distance = levenshteinDistance(
    str1.toLowerCase().trim(),
    str2.toLowerCase().trim()
  );
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

/**
 * Normalize name for comparison (remove special chars, extra spaces, etc.)
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find matching student in DismissalPro database
 */
export async function findStudentMatch(
  supabaseClient: SupabaseClient,
  schoolId: number,
  icStudent: {
    sourcedId: string;
    givenName: string;
    familyName: string;
    grade?: string;
    identifier?: string;
  }
): Promise<MatchResult> {
  // 1. Check for existing ic_external_id match (100% confidence)
  const { data: existingByIcId } = await supabaseClient
    .from('students')
    .select('id')
    .eq('ic_external_id', icStudent.sourcedId)
    .eq('school_id', schoolId)
    .maybeSingle();

  if (existingByIcId) {
    return {
      confidence: 1.0,
      criteria: 'ic_external_id',
      existingRecordId: existingByIcId.id,
    };
  }

  // 2. Check for exact name + grade match (95% confidence)
  const icGrade = icStudent.grade ? parseInt(icStudent.grade, 10) : null;
  
  if (icGrade !== null) {
    const { data: exactNameGrade } = await supabaseClient
      .from('students')
      .select('id, first_name, last_name')
      .eq('school_id', schoolId)
      .eq('first_name', icStudent.givenName)
      .eq('last_name', icStudent.familyName)
      .eq('grade_level', icGrade)
      .is('ic_external_id', null)
      .maybeSingle();

    if (exactNameGrade) {
      return {
        confidence: 0.95,
        criteria: 'exact_name_grade',
        existingRecordId: exactNameGrade.id,
      };
    }
  }

  // 3. Fuzzy name matching (variable confidence based on similarity)
  const { data: allStudents } = await supabaseClient
    .from('students')
    .select('id, first_name, last_name, grade_level')
    .eq('school_id', schoolId)
    .is('ic_external_id', null)
    .eq('archived', false);

  if (!allStudents || allStudents.length === 0) {
    return {
      confidence: 0,
      criteria: 'no_match',
      existingRecordId: null,
    };
  }

  let bestMatch: MatchResult = {
    confidence: 0,
    criteria: 'no_match',
    existingRecordId: null,
  };

  const icFullName = normalizeName(`${icStudent.givenName} ${icStudent.familyName}`);

  for (const student of allStudents) {
    const dbFullName = normalizeName(`${student.first_name} ${student.last_name}`);
    const nameSimilarity = similarityScore(icFullName, dbFullName);

    // Boost confidence if grade matches
    const gradeMatch = icGrade !== null && student.grade_level === icGrade;
    const adjustedConfidence = gradeMatch ? nameSimilarity * 1.1 : nameSimilarity;

    if (adjustedConfidence > bestMatch.confidence) {
      bestMatch = {
        confidence: Math.min(adjustedConfidence, 0.9), // Cap at 0.9 for fuzzy matches
        criteria: gradeMatch ? 'fuzzy_name_grade' : 'fuzzy_name',
        existingRecordId: student.id,
      };
    }
  }

  return bestMatch;
}

/**
 * Find matching teacher in DismissalPro database
 */
export async function findTeacherMatch(
  supabaseClient: SupabaseClient,
  schoolId: number,
  icTeacher: {
    sourcedId: string;
    givenName: string;
    familyName: string;
    email?: string;
  }
): Promise<MatchResult> {
  // 1. Check for existing ic_external_id match (100% confidence)
  const { data: existingByIcId } = await supabaseClient
    .from('teachers')
    .select('id')
    .eq('ic_external_id', icTeacher.sourcedId)
    .eq('school_id', schoolId)
    .maybeSingle();

  if (existingByIcId) {
    return {
      confidence: 1.0,
      criteria: 'ic_external_id',
      existingRecordId: existingByIcId.id,
    };
  }

  // 2. Check for exact email match (100% confidence if email exists)
  if (icTeacher.email) {
    const { data: existingByEmail } = await supabaseClient
      .from('teachers')
      .select('id, email')
      .eq('school_id', schoolId)
      .ilike('email', icTeacher.email)
      .is('ic_external_id', null)
      .maybeSingle();

    if (existingByEmail) {
      return {
        confidence: 1.0,
        criteria: 'exact_email',
        existingRecordId: existingByEmail.id,
      };
    }
  }

  // 3. Check for exact name match (95% confidence)
  const { data: exactName } = await supabaseClient
    .from('teachers')
    .select('id')
    .eq('school_id', schoolId)
    .eq('first_name', icTeacher.givenName)
    .eq('last_name', icTeacher.familyName)
    .is('ic_external_id', null)
    .maybeSingle();

  if (exactName) {
    return {
      confidence: 0.95,
      criteria: 'exact_name',
      existingRecordId: exactName.id,
    };
  }

  // 4. Fuzzy name matching
  const { data: allTeachers } = await supabaseClient
    .from('teachers')
    .select('id, first_name, last_name')
    .eq('school_id', schoolId)
    .is('ic_external_id', null)
    .eq('archived', false);

  if (!allTeachers || allTeachers.length === 0) {
    return {
      confidence: 0,
      criteria: 'no_match',
      existingRecordId: null,
    };
  }

  let bestMatch: MatchResult = {
    confidence: 0,
    criteria: 'no_match',
    existingRecordId: null,
  };

  const icFullName = normalizeName(`${icTeacher.givenName} ${icTeacher.familyName}`);

  for (const teacher of allTeachers) {
    const dbFullName = normalizeName(`${teacher.first_name} ${teacher.last_name}`);
    const nameSimilarity = similarityScore(icFullName, dbFullName);

    if (nameSimilarity > bestMatch.confidence) {
      bestMatch = {
        confidence: Math.min(nameSimilarity, 0.85), // Cap at 0.85 for fuzzy teacher matches
        criteria: 'fuzzy_name',
        existingRecordId: teacher.id,
      };
    }
  }

  return bestMatch;
}
