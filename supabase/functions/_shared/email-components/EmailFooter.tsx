import { Text } from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';
import { styles } from './styles.ts';

interface EmailFooterProps {
  customText?: string;
}

export const EmailFooter = ({ customText }: EmailFooterProps) => (
  <Text style={styles.footer}>
    {customText || (
      <>
        Best regards,
        <br />
        The Dismissal Pro Team
      </>
    )}
  </Text>
);

export default EmailFooter;
