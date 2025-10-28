import { Text } from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';
import { EmailLayout } from '../_shared/EmailLayout.tsx';
import { EmailHeader } from '../_shared/EmailHeader.tsx';
import { EmailFooter } from '../_shared/EmailFooter.tsx';
import { EmailButton } from '../_shared/EmailButton.tsx';
import { styles, brandColors } from '../_shared/styles.ts';

interface EmailVerificationProps {
  verificationUrl: string;
  requestId: string;
}

export const EmailVerification = ({
  verificationUrl,
  requestId,
}: EmailVerificationProps) => (
  <EmailLayout preview="Verify your email address change">
    <EmailHeader title="Verify Your Email Change" />
    
    <Text style={styles.text}>
      You requested to change your email address. To complete this change, please click the button below to verify your new email address:
    </Text>
    
    <EmailButton href={verificationUrl}>
      Verify Email Change
    </EmailButton>
    
    <div style={{
      backgroundColor: '#FEF3C7',
      border: `1px solid #FDE047`,
      padding: '15px',
      borderRadius: '6px',
      margin: '20px 0',
    }}>
      <Text style={{ ...styles.text, margin: 0, fontSize: '14px', color: '#78350F' }}>
        <strong>⚠️ Security Notice:</strong> This link will expire in 24 hours. If you didn't request this change, 
        please ignore this email or contact your school administrator immediately.
      </Text>
    </div>
    
    <Text style={styles.footerText}>
      Request ID: {requestId}
    </Text>
    
    <EmailFooter />
  </EmailLayout>
);

export default EmailVerification;
