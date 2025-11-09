import { Text, Section, Hr } from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';
import { EmailLayout } from '../email-components/EmailLayout.tsx';
import { EmailHeader } from '../email-components/EmailHeader.tsx';
import { EmailButton } from '../email-components/EmailButton.tsx';
import { EmailFooter } from '../email-components/EmailFooter.tsx';
import { styles, brandColors } from '../email-components/styles.ts';

interface ICSyncNotificationEmailProps {
  schoolName: string;
  status: 'success' | 'failure';
  statistics: {
    totalStudents: number;
    studentsAdded: number;
    studentsUpdated: number;
    errors: number;
    duration: string;
  };
  errorDetails?: string[];
  syncedAt: string;
  appUrl: string;
}

export const ICSyncNotificationEmail = ({
  schoolName,
  status,
  statistics,
  errorDetails,
  syncedAt,
  appUrl,
}: ICSyncNotificationEmailProps) => {
  const isSuccess = status === 'success';
  
  return (
    <EmailLayout preview={`Infinite Campus sync ${isSuccess ? 'completed successfully' : 'failed'} for ${schoolName}`}>
      <EmailHeader 
        title={isSuccess ? '✓ IC Sync Completed' : '⚠ IC Sync Failed'}
        logoVariant="mark"
      />
      
      <Text style={styles.text}>
        Your Infinite Campus sync for <strong>{schoolName}</strong> has {isSuccess ? 'completed successfully' : 'encountered errors'}.
      </Text>

      <Section style={{
        backgroundColor: isSuccess ? '#f0f9ff' : '#fef2f2',
        border: `1px solid ${isSuccess ? brandColors.info : brandColors.danger}`,
        borderRadius: '8px',
        padding: '16px',
        marginTop: '20px',
        marginBottom: '20px',
      }}>
        <Text style={{ 
          ...styles.text, 
          margin: '0 0 12px 0',
          fontWeight: '600',
          color: isSuccess ? brandColors.info : brandColors.danger,
        }}>
          Sync Statistics
        </Text>
        
        <table style={{ width: '100%', fontSize: '14px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '4px 0', color: brandColors.textSecondary }}>Total Students:</td>
              <td style={{ padding: '4px 0', fontWeight: '600', textAlign: 'right' }}>{statistics.totalStudents}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0', color: brandColors.textSecondary }}>Added:</td>
              <td style={{ padding: '4px 0', fontWeight: '600', textAlign: 'right', color: brandColors.success }}>{statistics.studentsAdded}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0', color: brandColors.textSecondary }}>Updated:</td>
              <td style={{ padding: '4px 0', fontWeight: '600', textAlign: 'right', color: brandColors.primary }}>{statistics.studentsUpdated}</td>
            </tr>
            {statistics.errors > 0 && (
              <tr>
                <td style={{ padding: '4px 0', color: brandColors.textSecondary }}>Errors:</td>
                <td style={{ padding: '4px 0', fontWeight: '600', textAlign: 'right', color: brandColors.danger }}>{statistics.errors}</td>
              </tr>
            )}
            <tr>
              <td style={{ padding: '4px 0', paddingTop: '8px', color: brandColors.textSecondary }}>Duration:</td>
              <td style={{ padding: '4px 0', paddingTop: '8px', fontWeight: '600', textAlign: 'right' }}>{statistics.duration}</td>
            </tr>
          </tbody>
        </table>
        
        <Text style={{ 
          ...styles.text, 
          margin: '12px 0 0 0',
          fontSize: '12px',
          color: brandColors.textSecondary,
        }}>
          Synced at: {syncedAt}
        </Text>
      </Section>

      {errorDetails && errorDetails.length > 0 && (
        <>
          <Hr style={{ borderColor: brandColors.border, margin: '20px 0' }} />
          <Text style={{ 
            ...styles.text, 
            fontWeight: '600',
            color: brandColors.danger,
            marginBottom: '12px',
          }}>
            Error Details:
          </Text>
          <Section style={{
            backgroundColor: '#fef2f2',
            border: `1px solid ${brandColors.danger}`,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
          }}>
            {errorDetails.map((error, index) => (
              <Text key={index} style={{
                ...styles.text,
                fontSize: '13px',
                margin: '4px 0',
                fontFamily: 'monospace',
              }}>
                • {error}
              </Text>
            ))}
          </Section>
        </>
      )}

      <EmailButton href={`${appUrl}/admin/ic-sync-history`}>
        View Sync History
      </EmailButton>

      <Hr style={{ borderColor: brandColors.border, margin: '24px 0' }} />

      <Text style={styles.text}>
        {isSuccess 
          ? 'Your student roster data has been updated with the latest information from Infinite Campus.'
          : 'Please review the errors and contact support if you need assistance resolving sync issues.'
        }
      </Text>

      <EmailFooter customText="Dismissal Pro - Automated IC Sync System" />
    </EmailLayout>
  );
};

export default ICSyncNotificationEmail;
