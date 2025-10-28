import { Link } from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';
import { styles } from './styles.ts';

interface EmailButtonProps {
  href: string;
  children: React.ReactNode;
}

export const EmailButton = ({ href, children }: EmailButtonProps) => (
  <Link
    href={href}
    target="_blank"
    style={styles.button}
  >
    {children}
  </Link>
);

export default EmailButton;
