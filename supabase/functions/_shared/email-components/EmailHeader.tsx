import { Heading, Img } from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';
import { styles } from './styles.ts';

interface EmailHeaderProps {
  title: string;
  showLogo?: boolean;
  logoVariant?: 'full' | 'mark';
}

export const EmailHeader = ({ 
  title, 
  showLogo = true,
  logoVariant = 'full' 
}: EmailHeaderProps) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://lwbmtirzntexaxdlhgsk.supabase.co';
  const logoUrl = logoVariant === 'full'
    ? `${supabaseUrl}/storage/v1/object/public/school-logos/email-assets/dismissalpro-logo.png`
    : `${supabaseUrl}/storage/v1/object/public/school-logos/email-assets/dismissalpro-mark.png`;
  
  return (
    <div style={styles.logoContainer}>
      {showLogo && (
        <Img 
          src={logoUrl}
          alt="DismissalPro Logo"
          style={{
            maxWidth: logoVariant === 'full' ? '250px' : '60px',
            height: 'auto',
            marginBottom: '20px',
            display: 'block',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        />
      )}
      <Heading style={styles.h1}>{title}</Heading>
    </div>
  );
};

export default EmailHeader;
