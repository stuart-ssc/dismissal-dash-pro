import {
  Button,
  Text,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';
import { EmailLayout } from '../email-components/EmailLayout.tsx';
import { EmailHeader } from '../email-components/EmailHeader.tsx';
import { EmailFooter } from '../email-components/EmailFooter.tsx';
import { CodeBlock } from '../email-components/CodeBlock.tsx';
import { styles } from '../email-components/styles.ts';

interface EmailChangeEmailProps {
  supabaseUrl: string;
  emailActionType: string;
  redirectTo: string;
  tokenHash: string;
  token: string;
}

export const EmailChangeEmail = ({
  token,
  supabaseUrl,
  emailActionType,
  redirectTo,
  tokenHash,
}: EmailChangeEmailProps) => (
  <EmailLayout preview="Confirm your email address change for Dismissal Pro">
    <EmailHeader title="Confirm Email Change" showLogo={true} logoVariant="full" />
    
    <Text style={styles.text}>
      You're receiving this email because you (or an administrator) requested to change the email address associated with your Dismissal Pro account.
    </Text>
    
    <Text style={styles.text}>
      To confirm this change and complete the process, please click the button below:
    </Text>
    
    <form 
      action={`${supabaseUrl}/functions/v1/secure-email-change/verify`}
      method="POST"
      style={{ margin: '20px 0' }}
    >
      <input type="hidden" name="token" value={token} />
      <Button 
        style={{
          ...styles.button,
          border: 'none',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        Confirm Email Change
      </Button>
    </form>
    
    <Text style={styles.text}>
      Or copy and paste this verification code in the application:
    </Text>
    <CodeBlock>{token}</CodeBlock>
    
    <Text style={styles.footerText}>
      This link will expire in 24 hours. If you didn't request this email change, please contact your school administrator immediately.
    </Text>
    
    <Text style={styles.infoNote}>
      🔒 <strong>Important:</strong> After confirming, you'll need to use this new email address to sign in to your account.
    </Text>
    
    <EmailFooter />
  </EmailLayout>
);

export default EmailChangeEmail;
