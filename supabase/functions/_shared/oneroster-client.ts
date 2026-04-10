/**
 * OneRoster API Client
 * Implements OAuth2 Client Credentials Flow for OneRoster 1.1 and 1.2
 * Supports Infinite Campus appName-based URL routing
 */

export interface OneRosterConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  version: '1.1' | '1.2';
  appName?: string;
}

export interface OneRosterOrg {
  sourcedId: string;
  name: string;
  type: string;
  identifier?: string;
}

export interface OneRosterSchool {
  sourcedId: string;
  name: string;
  type: string;
}

export interface OneRosterAcademicSession {
  sourcedId: string;
  title: string;
  type: string;
  startDate: string;
  endDate: string;
  schoolYear: string;
}

export interface OneRosterUser {
  sourcedId: string;
  givenName: string;
  familyName: string;
  email?: string;
  role: string;
  grade?: string;
  identifier?: string;
  enabledUser: boolean;
}

export interface OneRosterClass {
  sourcedId: string;
  title: string;
  classCode?: string;
  classType: string;
  location?: string;
  grade?: string;
  course?: {
    sourcedId: string;
  };
  school?: {
    sourcedId: string;
  };
  terms?: Array<{ sourcedId: string }>;
  metadata?: Record<string, any>;
}

export interface OneRosterEnrollment {
  sourcedId: string;
  role: string;
  primary: boolean;
  user: {
    sourcedId: string;
  };
  class: {
    sourcedId: string;
  };
}

export class OneRosterClient {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private config: OneRosterConfig;

  constructor(config: OneRosterConfig) {
    this.config = config;
  }

  /**
   * Authenticate using OAuth2 Client Credentials Flow
   */
  async authenticate(): Promise<void> {
    const credentials = btoa(`${this.config.clientId}:${this.config.clientSecret}`);
    
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OAuth2 authentication failed: ${response.status} ${error}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000);
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.accessToken || Date.now() >= this.tokenExpiry - 60000) {
      await this.authenticate();
    }
  }

  /**
   * Build the API base URL based on config
   * For IC with appName: {baseUrl}/campus/api/oneroster/{versionPath}/{appName}/ims/oneroster/rostering/{versionPath}
   * Without appName (generic OneRoster): {baseUrl}/ims/oneroster/{versionPath}
   */
  private getApiBaseUrl(): string {
    const versionPath = this.config.version === '1.2' ? 'v1p2' : 'v1p1';
    
    if (this.config.appName) {
      return `${this.config.baseUrl}/campus/api/oneroster/${versionPath}/${this.config.appName}/ims/oneroster/rostering/${versionPath}`;
    }
    
    return `${this.config.baseUrl}/ims/oneroster/${versionPath}`;
  }

  /**
   * Auto-detect OneRoster version by checking API endpoints
   */
  static async detectVersion(
    baseUrl: string,
    clientId: string,
    clientSecret: string,
    tokenUrl: string,
    appName?: string
  ): Promise<'1.1' | '1.2'> {
    // IC with appName always uses v1.2
    if (appName) {
      console.log('appName provided, defaulting to OneRoster v1.2');
      return '1.2';
    }

    const client = new OneRosterClient({
      baseUrl,
      clientId,
      clientSecret,
      tokenUrl,
      version: '1.2',
      appName,
    });

    try {
      await client.authenticate();
      
      const apiBase = client.getApiBaseUrl();
      console.log(`Version detection: trying v1.2 at ${apiBase}/orgs?limit=1`);
      const response = await fetch(`${apiBase}/orgs?limit=1`, {
        headers: {
          'Authorization': `Bearer ${client.accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        return '1.2';
      }
      
      console.log(`v1.2 returned ${response.status}, falling back to v1.1`);
      return '1.1';
    } catch (error) {
      console.error('Version detection error:', error);
      return '1.1';
    }
  }

  /**
   * Make a paginated API request
   */
  private async paginate<T>(endpoint: string, params: Record<string, string> = {}): Promise<T[]> {
    await this.ensureAuthenticated();

    const baseUrl = this.getApiBaseUrl();
    
    let allResults: T[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        ...params,
      });

      const url = `${baseUrl}/${endpoint}?${queryParams}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OneRoster API error (${endpoint}): ${response.status} ${error}`);
      }

      const data = await response.json();
      const results = this.config.version === '1.2' ? data : data[endpoint] || [];
      
      allResults = allResults.concat(results);
      
      hasMore = results.length === limit;
      offset += limit;
    }

    return allResults;
  }

  async getOrgs(): Promise<OneRosterOrg[]> {
    return this.paginate<OneRosterOrg>('orgs');
  }

  async getSchools(): Promise<OneRosterSchool[]> {
    return this.paginate<OneRosterSchool>('schools');
  }

  async getAcademicSessions(): Promise<OneRosterAcademicSession[]> {
    return this.paginate<OneRosterAcademicSession>('academicSessions');
  }

  async getCourses(): Promise<any[]> {
    return this.paginate('courses');
  }

  async getClasses(): Promise<OneRosterClass[]> {
    return this.paginate<OneRosterClass>('classes');
  }

  /**
   * Fetch classes for a specific school
   */
  async getClassesForSchool(schoolSourcedId: string): Promise<OneRosterClass[]> {
    return this.paginate<OneRosterClass>(`schools/${schoolSourcedId}/classes`);
  }

  async getUsers(role?: 'student' | 'teacher'): Promise<OneRosterUser[]> {
    const params = role ? { filter: `role='${role}'` } : {};
    return this.paginate<OneRosterUser>('users', params);
  }

  /**
   * Fetch students for a specific school
   */
  async getStudentsForSchool(schoolSourcedId: string): Promise<OneRosterUser[]> {
    return this.paginate<OneRosterUser>(`schools/${schoolSourcedId}/students`);
  }

  /**
   * Fetch teachers for a specific school
   */
  async getTeachersForSchool(schoolSourcedId: string): Promise<OneRosterUser[]> {
    return this.paginate<OneRosterUser>(`schools/${schoolSourcedId}/teachers`);
  }

  async getEnrollments(classId?: string): Promise<OneRosterEnrollment[]> {
    if (classId) {
      return this.paginate<OneRosterEnrollment>(`classes/${classId}/enrollments`);
    }
    return this.paginate<OneRosterEnrollment>('enrollments');
  }

  async getResources(): Promise<any[]> {
    try {
      return await this.paginate('resources');
    } catch (error) {
      console.log('Resources endpoint not available:', error);
      return [];
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.authenticate();
      await this.paginate('orgs', { limit: '1' });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
