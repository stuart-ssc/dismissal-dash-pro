import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

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
  <Html>
    <Head />
    <Preview>Confirm your email address change for Dismissal Pro</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={logoContainer}>
          <Heading style={h1}>Confirm Email Change</Heading>
        </div>
        
        <Text style={text}>
          You're receiving this email because you (or an administrator) requested to change the email address associated with your Dismissal Pro account.
        </Text>
        
        <Text style={text}>
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
              ...button,
              border: 'none',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Confirm Email Change
          </Button>
        </form>
        
        <Text style={text}>
          Or copy and paste this verification code in the application:
        </Text>
        <code style={code}>{token}</code>
        
        <Text style={footerText}>
          This link will expire in 24 hours. If you didn't request this email change, please contact your school administrator immediately.
        </Text>
        
        <Text style={securityNote}>
          🔒 <strong>Important:</strong> After confirming, you'll need to use this new email address to sign in to your account.
        </Text>
        
        <Text style={footer}>
          Best regards,
          <br />
          The Dismissal Pro Team
        </Text>
      </Container>
    </Body>
  </Html>
);

export default EmailChangeEmail;

const main = {
  backgroundColor: '#f3f4f6',
  padding: '40px 20px',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px',
  borderRadius: '8px',
  maxWidth: '600px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
};

const logoContainer = {
  background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
  padding: '30px',
  textAlign: 'center' as const,
  borderRadius: '8px 8px 0 0',
  marginBottom: '30px',
};

const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: '600',
  margin: '0',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 20px',
};

const button = {
  backgroundColor: '#3B82F6',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600',
  padding: '14px 40px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  margin: '20px 0',
};

const code = {
  display: 'inline-block',
  padding: '16px',
  width: '100%',
  backgroundColor: '#f4f4f4',
  borderRadius: '5px',
  border: '1px solid #eee',
  color: '#333',
  fontSize: '18px',
  textAlign: 'center' as const,
  fontFamily: 'monospace',
  margin: '10px 0 20px',
};

const footerText = {
  color: '#6B7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '20px 0',
};

const securityNote = {
  color: '#2563EB',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '20px 0',
  padding: '15px',
  backgroundColor: '#EFF6FF',
  borderRadius: '6px',
  borderLeft: '4px solid #2563EB',
};

const footer = {
  color: '#6B7280',
  fontSize: '14px',
  lineHeight: '20px',
  marginTop: '30px',
  paddingTop: '20px',
  borderTop: '1px solid #E5E7EB',
};
