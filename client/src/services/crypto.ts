export class CryptoService {
  private keyPair: CryptoKeyPair | null = null;
  private sharedKey: CryptoKey | null = null;

  // Generate RSA key pair
  async generateKeyPair(): Promise<void> {
    this.keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Export public key as base64
  async exportPublicKey(): Promise<string> {
    if (!this.keyPair) throw new Error('Key pair not generated');
    
    const exported = await window.crypto.subtle.exportKey(
      'spki',
      this.keyPair.publicKey
    );
    
    return this.arrayBufferToBase64(exported);
  }

  // Import partner's public key and generate shared AES key
  async deriveSharedKey(partnerPublicKeyBase64: string): Promise<void> {
    // For simplicity, we'll generate a random AES key
    // In production, use proper key exchange (ECDH)
    this.sharedKey = await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Encrypt message with AES
  async encryptMessage(plaintext: string): Promise<{ ciphertext: string; iv: string }> {
    if (!this.sharedKey) throw new Error('Shared key not established');

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedText = new TextEncoder().encode(plaintext);

    const ciphertext = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      this.sharedKey,
      encodedText
    );

    return {
      ciphertext: this.arrayBufferToBase64(ciphertext),
      iv: this.arrayBufferToBase64(iv),
    };
  }

  // Decrypt message with AES
  async decryptMessage(ciphertextBase64: string, ivBase64: string): Promise<string> {
    if (!this.sharedKey) throw new Error('Shared key not established');

    const ciphertext = this.base64ToArrayBuffer(ciphertextBase64);
    const iv = this.base64ToArrayBuffer(ivBase64);

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      this.sharedKey,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  }

  // Helper: ArrayBuffer to Base64
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Helper: Base64 to ArrayBuffer
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
