import { Text } from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';
import { EmailLayout } from '../email-components/EmailLayout.tsx';
import { EmailHeader } from '../email-components/EmailHeader.tsx';
import { EmailFooter } from '../email-components/EmailFooter.tsx';
import { EmailButton } from '../email-components/EmailButton.tsx';
import { CodeBlock } from '../email-components/CodeBlock.tsx';
import { styles } from '../email-components/styles.ts';

interface PasswordResetEmailProps {
  supabaseUrl: string;
  emailActionType: string;
  redirectTo: string;
  tokenHash: string;
  token: string;
}

export const PasswordResetEmail = ({
  token,
  supabaseUrl,
  emailActionType,
  redirectTo,
  tokenHash,
}: PasswordResetEmailProps) => (
  <EmailLayout preview="Reset your Dismissal Pro password">
    <EmailHeader title="Reset Your Password" />
    
    <Text style={styles.text}>
      We received a request to reset the password for your Dismissal Pro account.
    </Text>
    
    <Text style={styles.text}>
      Click the button below to create a new password:
    </Text>
    
    <EmailButton href={`${supabaseUrl}/auth/v1/verify?token=${tokenHash}&type=${emailActionType}&redirect_to=${redirectTo}`}>
      Reset Password
    </EmailButton>
    
    <Text style={styles.text}>
      Or use this reset code:
    </Text>
    <CodeBlock>{token}</CodeBlock>
    
    <Text style={styles.footerText}>
      This link will expire in 1 hour. If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
    </Text>
    
    <Text style={styles.securityNote}>
      🔒 <strong>Security tip:</strong> If you didn't request this reset, someone may be trying to access your account. Please contact your school administrator immediately.
    </Text>
    
    <EmailFooter />
  </EmailLayout>
);

export default PasswordResetEmail;
