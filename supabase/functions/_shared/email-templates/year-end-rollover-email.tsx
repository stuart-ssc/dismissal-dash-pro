import { Text } from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';
import { EmailLayout } from '../email-components/EmailLayout.tsx';
import { EmailHeader } from '../email-components/EmailHeader.tsx';
import { EmailFooter } from '../email-components/EmailFooter.tsx';
import { EmailButton } from '../email-components/EmailButton.tsx';
import { styles } from '../email-components/styles.ts';

interface YearEndRolloverEmailProps {
  schoolName: string;
  oldSessionName: string;
  newSessionName: string;
  newSessionStartDate: string;
  newSessionEndDate: string;
  appUrl: string;
  completedBy: string;
  completedAt: string;
}

export const YearEndRolloverEmail = ({
  schoolName,
  oldSessionName,
  newSessionName,
  newSessionStartDate,
  newSessionEndDate,
  appUrl,
  completedBy,
  completedAt,
}: YearEndRolloverEmailProps) => (
  <EmailLayout preview={`${schoolName} - New Academic Year Activated: ${newSessionName}`}>
    <EmailHeader title="🎓 New Academic Year Activated" showLogo={true} logoVariant="full" />
    
    <Text style={styles.text}>
      The year-end rollover has been completed for <strong>{schoolName}</strong>.
    </Text>
    
    <Text style={styles.text}>
      The new academic year is now active and ready for use:
    </Text>
    
    <div style={styles.infoBox}>
      <Text style={styles.infoText}>
        <strong>Previous Year:</strong> {oldSessionName} (Archived)
      </Text>
      <Text style={styles.infoText}>
        <strong>New Academic Year:</strong> {newSessionName}
      </Text>
      <Text style={styles.infoText}>
        <strong>Start Date:</strong> {newSessionStartDate}
      </Text>
      <Text style={styles.infoText}>
        <strong>End Date:</strong> {newSessionEndDate}
      </Text>
    </div>
    
    <Text style={styles.text}>
      <strong>Next Steps:</strong>
    </Text>
    
    <ul style={styles.list}>
      <li style={styles.listItem}>Review and update your class rosters</li>
      <li style={styles.listItem}>Verify teacher assignments</li>
      <li style={styles.listItem}>Update dismissal plans for the new year</li>
      <li style={styles.listItem}>Create new special use groups as needed</li>
    </ul>
    
    <EmailButton href={`${appUrl}/dashboard`}>
      Go to Dashboard
    </EmailButton>
    
    <Text style={styles.footerText}>
      Rollover completed by {completedBy} on {completedAt}
    </Text>
    
    <EmailFooter />
  </EmailLayout>
);

export default YearEndRolloverEmail;
