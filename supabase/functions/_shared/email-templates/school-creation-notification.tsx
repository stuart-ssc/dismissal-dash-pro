import { Text } from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';
import { EmailLayout } from '../email-components/EmailLayout.tsx';
import { EmailHeader } from '../email-components/EmailHeader.tsx';
import { EmailFooter } from '../email-components/EmailFooter.tsx';
import { EmailButton } from '../email-components/EmailButton.tsx';
import { styles } from '../email-components/styles.ts';

interface SchoolCreationNotificationProps {
  schoolName: string;
  city: string;
  state: string;
  streetAddress?: string;
  zipcode?: string;
  county?: string;
  schoolDistrict?: string;
  phoneNumber?: string;
  creatorEmail: string;
  creatorFirstName: string;
  creatorLastName: string;
  creatorRole: string;
  creatorIp: string;
  userAgent: string;
  createdAt: string;
  flagged: boolean;
  flagReasons: string[];
  schoolId: number;
}

export const SchoolCreationNotification = ({
  schoolName,
  city,
  state,
  streetAddress,
  zipcode,
  county,
  schoolDistrict,
  phoneNumber,
  creatorEmail,
  creatorFirstName,
  creatorLastName,
  creatorRole,
  creatorIp,
  userAgent,
  createdAt,
  flagged,
  flagReasons,
  schoolId,
}: SchoolCreationNotificationProps) => (
  <EmailLayout preview={`New School Created: ${schoolName}`}>
    <EmailHeader title="🏫 New School Alert" showLogo={true} logoVariant="mark" />
    
    <Text style={styles.text}>
      A new school has been created in the system and is now available for user signups.
    </Text>

    {/* School Details */}
    <div style={{
      backgroundColor: '#F3F4F6',
      border: '1px solid #E5E7EB',
      padding: '20px',
      borderRadius: '8px',
      margin: '20px 0',
    }}>
      <Text style={{ ...styles.text, margin: '0 0 15px 0', fontWeight: 'bold', fontSize: '16px' }}>
        📍 SCHOOL DETAILS
      </Text>
      <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
        <p style={{ margin: '5px 0' }}>
          <strong>Name:</strong> {schoolName}
        </p>
        <p style={{ margin: '5px 0' }}>
          <strong>Location:</strong> {city}, {state} {zipcode || ''}
        </p>
        {streetAddress && (
          <p style={{ margin: '5px 0' }}>
            <strong>Address:</strong> {streetAddress}
          </p>
        )}
        {county && (
          <p style={{ margin: '5px 0' }}>
            <strong>County:</strong> {county}
          </p>
        )}
        {schoolDistrict && (
          <p style={{ margin: '5px 0' }}>
            <strong>District:</strong> {schoolDistrict}
          </p>
        )}
        {phoneNumber && (
          <p style={{ margin: '5px 0' }}>
            <strong>Phone:</strong> {phoneNumber}
          </p>
        )}
      </div>
    </div>

    {/* Creator Info */}
    <div style={{
      backgroundColor: '#EEF2FF',
      border: '1px solid #C7D2FE',
      padding: '20px',
      borderRadius: '8px',
      margin: '20px 0',
    }}>
      <Text style={{ ...styles.text, margin: '0 0 15px 0', fontWeight: 'bold', fontSize: '16px' }}>
        👤 CREATOR INFO
      </Text>
        <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
          <p style={{ margin: '5px 0' }}>
            <strong>Name:</strong> {creatorFirstName} {creatorLastName}
          </p>
          <p style={{ margin: '5px 0' }}>
            <strong>Email:</strong> {creatorEmail}
          </p>
          <p style={{ margin: '5px 0' }}>
            <strong>Role:</strong> {creatorRole === 'school_admin' ? 'School Administrator' : 'Teacher'}
          </p>
          <p style={{ margin: '5px 0' }}>
            <strong>IP Address:</strong> {creatorIp}
          </p>
          <p style={{ margin: '5px 0' }}>
            <strong>User Agent:</strong> {userAgent}
          </p>
          <p style={{ margin: '5px 0' }}>
            <strong>Created:</strong> {createdAt}
          </p>
        </div>
    </div>

    {/* Flagged Indicators */}
    {flagged && flagReasons.length > 0 && (
      <div style={{
        backgroundColor: '#FEF2F2',
        border: '2px solid #FCA5A5',
        padding: '20px',
        borderRadius: '8px',
        margin: '20px 0',
      }}>
        <Text style={{ ...styles.text, margin: '0 0 15px 0', fontWeight: 'bold', fontSize: '16px', color: '#DC2626' }}>
          ⚠️ AUTO-FLAGGED
        </Text>
        <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#991B1B' }}>
          <p style={{ margin: '5px 0' }}>
            This school was automatically flagged for the following reasons:
          </p>
          <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
            {flagReasons.map((reason, index) => (
              <li key={index} style={{ margin: '5px 0' }}>
                {reason === 'suspicious_name' && '• Suspicious name pattern detected'}
                {reason === 'multiple_from_ip' && '• Multiple schools created from same IP today'}
                {reason === 'suspicious_email_domain' && '• Non-standard email domain'}
              </li>
            ))}
          </ul>
        </div>
      </div>
    )}

    {/* Quick Actions */}
    <div style={{
      backgroundColor: '#F9FAFB',
      border: '1px solid #E5E7EB',
      padding: '20px',
      borderRadius: '8px',
      margin: '20px 0',
      textAlign: 'center',
    }}>
      <Text style={{ ...styles.text, margin: '0 0 20px 0', fontWeight: 'bold', fontSize: '16px' }}>
        QUICK ACTIONS
      </Text>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
        <EmailButton 
          href={`${Deno.env.get('APP_URL') || 'https://dismissalpro.io'}/admin/schools?id=${schoolId}`}
          backgroundColor="#10B981"
        >
          ✓ Approve
        </EmailButton>
        
        <EmailButton 
          href={`${Deno.env.get('APP_URL') || 'https://dismissalpro.io'}/admin/schools?id=${schoolId}&action=deactivate`}
          backgroundColor="#EF4444"
        >
          ✕ Deactivate
        </EmailButton>
        
        <EmailButton 
          href={`${Deno.env.get('APP_URL') || 'https://dismissalpro.io'}/admin/schools?highlight=${schoolId}`}
          backgroundColor="#3B82F6"
        >
          👁 Review
        </EmailButton>
      </div>
    </div>

    <Text style={styles.footerText}>
      This school is <strong>automatically enabled</strong> for user signups. You can deactivate it at any time if needed.
    </Text>
    
    <Text style={styles.footerText}>
      View all unverified schools: <a href={`${Deno.env.get('SUPABASE_URL') || 'https://lwbmtirzntexaxdlhgsk.supabase.co'}/admin/schools?filter=unverified`} style={{ color: '#3B82F6' }}>Admin Dashboard</a>
    </Text>
    
    <EmailFooter customText="This is an automated notification for system administrators." />
  </EmailLayout>
);

export default SchoolCreationNotification;
