/**
 * OneRoster API Client
 * Implements OAuth2 Client Credentials Flow for OneRoster 1.1 and 1.2
 */

export interface OneRosterConfig {
  hostUrl: string;
  clientKey: string;
  clientSecret: string;
  tokenUrl: string;
  version: '1.1' | '1.2';
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
    const credentials = btoa(`${this.config.clientKey}:${this.config.clientSecret}`);
    
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
   * Auto-detect OneRoster version by checking API endpoints
   */
  static async detectVersion(
    hostUrl: string,
    clientKey: string,
    clientSecret: string,
    tokenUrl: string
  ): Promise<'1.1' | '1.2'> {
    const client = new OneRosterClient({
      hostUrl,
      clientKey,
      clientSecret,
      tokenUrl,
      version: '1.2', // Try 1.2 first
    });

    try {
      await client.authenticate();
      
      // Try to fetch orgs with 1.2 endpoint
      const response = await fetch(`${hostUrl}/ims/oneroster/v1p2/orgs?limit=1`, {
        headers: {
          'Authorization': `Bearer ${client.accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        return '1.2';
      }
      
      // Fall back to 1.1
      return '1.1';
    } catch (error) {
      console.error('Version detection error:', error);
      return '1.1'; // Default to 1.1
    }
  }

  /**
   * Make a paginated API request
   */
  private async paginate<T>(endpoint: string, params: Record<string, string> = {}): Promise<T[]> {
    await this.ensureAuthenticated();

    const versionPath = this.config.version === '1.2' ? 'v1p2' : 'v1p1';
    const baseUrl = `${this.config.hostUrl}/ims/oneroster/${versionPath}`;
    
    let allResults: T[] = [];
    let offset = 0;
    const limit = 100; // OneRoster standard page size
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

  /**
   * Fetch organizations
   */
  async getOrgs(): Promise<OneRosterOrg[]> {
    return this.paginate<OneRosterOrg>('orgs');
  }

  /**
   * Fetch schools
   */
  async getSchools(): Promise<OneRosterSchool[]> {
    return this.paginate<OneRosterSchool>('schools');
  }

  /**
   * Fetch academic sessions
   */
  async getAcademicSessions(): Promise<OneRosterAcademicSession[]> {
    return this.paginate<OneRosterAcademicSession>('academicSessions');
  }

  /**
   * Fetch courses
   */
  async getCourses(): Promise<any[]> {
    return this.paginate('courses');
  }

  /**
   * Fetch classes
   */
  async getClasses(): Promise<OneRosterClass[]> {
    return this.paginate<OneRosterClass>('classes');
  }

  /**
   * Fetch users with optional role filter
   */
  async getUsers(role?: 'student' | 'teacher'): Promise<OneRosterUser[]> {
    const params = role ? { filter: `role='${role}'` } : {};
    return this.paginate<OneRosterUser>('users', params);
  }

  /**
   * Fetch enrollments for a specific class
   */
  async getEnrollments(classId?: string): Promise<OneRosterEnrollment[]> {
    if (classId) {
      return this.paginate<OneRosterEnrollment>(`classes/${classId}/enrollments`);
    }
    return this.paginate<OneRosterEnrollment>('enrollments');
  }

  /**
   * Test connection by fetching a small amount of data
   */
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
