/**
 * Encryption utilities for sensitive data storage
 * Uses AES-256-CBC encryption
 */

/**
 * Encrypt sensitive text
 */
export async function encrypt(text: string): Promise<string> {
  const encryptionKey = Deno.env.get('IC_ENCRYPTION_KEY');
  
  if (!encryptionKey) {
    throw new Error('IC_ENCRYPTION_KEY environment variable not set');
  }

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(16));
  
  // Convert key from hex to bytes
  const keyData = new Uint8Array(
    encryptionKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
  );

  // Import key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-CBC', length: 256 },
    false,
    ['encrypt']
  );

  // Encrypt
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv },
    cryptoKey,
    data
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Convert to base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt sensitive text
 */
export async function decrypt(encryptedText: string): Promise<string> {
  const encryptionKey = Deno.env.get('IC_ENCRYPTION_KEY');
  
  if (!encryptionKey) {
    throw new Error('IC_ENCRYPTION_KEY environment variable not set');
  }

  // Decode from base64
  const combined = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));

  // Extract IV and encrypted data
  const iv = combined.slice(0, 16);
  const encrypted = combined.slice(16);

  // Convert key from hex to bytes
  const keyData = new Uint8Array(
    encryptionKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
  );

  // Import key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-CBC', length: 256 },
    false,
    ['decrypt']
  );

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv },
    cryptoKey,
    encrypted
  );

  // Convert to string
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
