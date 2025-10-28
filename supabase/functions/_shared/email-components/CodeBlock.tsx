import * as React from 'npm:react@18.3.1';
import { styles } from './styles.ts';

interface CodeBlockProps {
  children: string;
}

export const CodeBlock = ({ children }: CodeBlockProps) => (
  <code style={styles.code}>{children}</code>
);

export default CodeBlock;
