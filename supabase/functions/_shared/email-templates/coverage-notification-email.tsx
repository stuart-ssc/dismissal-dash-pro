import { Text } from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';
import { EmailLayout } from '../email-components/EmailLayout.tsx';
import { EmailHeader } from '../email-components/EmailHeader.tsx';
import { EmailFooter } from '../email-components/EmailFooter.tsx';
import { styles } from '../email-components/styles.ts';

interface CoverageNotificationProps {
  teacherFirstName: string;
  className: string;
  coverageDates: string;
  notes?: string;
}

// HTML escaping utility to prevent injection
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export const CoverageNotificationEmail = ({
  teacherFirstName,
  className,
  coverageDates,
  notes,
}: CoverageNotificationProps) => {
  const escapedFirstName = escapeHtml(teacherFirstName);
  const escapedClassName = escapeHtml(className);
  const escapedDates = escapeHtml(coverageDates);
  const escapedNotes = notes ? escapeHtml(notes) : '';

  return (
    <EmailLayout preview="Dismissal Coverage Assignment">
      <EmailHeader title="Dismissal Coverage Assignment" showLogo={true} logoVariant="full" />
      
      <Text style={styles.text}>
        Hi {escapedFirstName},
      </Text>
      
      <Text style={styles.text}>
        You have been assigned to cover dismissal for <strong>{escapedClassName}</strong>.
      </Text>
      
      <div style={{
        backgroundColor: '#f3f4f6',
        padding: '16px',
        borderRadius: '8px',
        margin: '20px 0',
      }}>
        <Text style={{ ...styles.text, margin: 0 }}>
          <strong>Date(s):</strong> {escapedDates}
        </Text>
        {escapedNotes && (
          <Text style={{ ...styles.text, margin: '10px 0 0 0' }}>
            <strong>Notes:</strong> {escapedNotes}
          </Text>
        )}
      </div>

      <Text style={styles.text}>
        You'll be able to access this class in Classroom Mode on the day of coverage.
      </Text>
      
      <EmailFooter />
    </EmailLayout>
  );
};

export default CoverageNotificationEmail;
