/**
 * Encryption Utilities
 * 
 * Provides AES encryption and decryption functions for securing sensitive data
 * such as Tally API credentials. Uses crypto-js library with AES-256 encryption.
 * 
 * Requirements: 3.2, 17.1, 17.3
 */

const CryptoJS = require('crypto-js');

/**
 * Get the encryption key from environment variables
 * @throws {Error} If ENCRYPTION_KEY is not set in environment
 * @returns {string} The encryption key
 */
const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set. Please configure it in your .env file.');
  }
  
  return key;
};

/**
 * Encrypt a string using AES encryption
 * 
 * @param {string} plaintext - The text to encrypt
 * @returns {string} The encrypted ciphertext as a string
 * @throws {Error} If encryption fails or ENCRYPTION_KEY is not set
 * 
 * @example
 * const encrypted = encrypt(JSON.stringify({ username: 'admin', password: 'secret' }));
 */
const encrypt = (plaintext) => {
  if (typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a string');
  }
  
  if (!plaintext) {
    throw new Error('Cannot encrypt empty string');
  }
  
  const key = getEncryptionKey();
  const ciphertext = CryptoJS.AES.encrypt(plaintext, key).toString();
  
  return ciphertext;
};

/**
 * Decrypt an AES encrypted string
 * 
 * @param {string} ciphertext - The encrypted text to decrypt
 * @returns {string} The decrypted plaintext
 * @throws {Error} If decryption fails or ENCRYPTION_KEY is not set
 * 
 * @example
 * const decrypted = decrypt(encryptedCredentials);
 * const credentials = JSON.parse(decrypted);
 */
const decrypt = (ciphertext) => {
  if (typeof ciphertext !== 'string') {
    throw new Error('Ciphertext must be a string');
  }
  
  if (!ciphertext) {
    throw new Error('Cannot decrypt empty string');
  }
  
  const key = getEncryptionKey();
  const bytes = CryptoJS.AES.decrypt(ciphertext, key);
  const plaintext = bytes.toString(CryptoJS.enc.Utf8);
  
  if (!plaintext) {
    throw new Error('Decryption failed - invalid ciphertext or incorrect encryption key');
  }
  
  return plaintext;
};

/**
 * Encrypt Tally credentials object
 * 
 * @param {Object} credentials - The credentials object to encrypt
 * @param {string} credentials.username - Tally username
 * @param {string} credentials.password - Tally password
 * @returns {string} Encrypted credentials as a string
 * 
 * @example
 * const encrypted = encryptCredentials({ username: 'admin', password: 'secret123' });
 */
const encryptCredentials = (credentials) => {
  if (!credentials || typeof credentials !== 'object') {
    throw new Error('Credentials must be an object');
  }
  
  const credentialsJson = JSON.stringify(credentials);
  return encrypt(credentialsJson);
};

/**
 * Decrypt Tally credentials string
 * 
 * @param {string} encryptedCredentials - The encrypted credentials string
 * @returns {Object} The decrypted credentials object
 * 
 * @example
 * const credentials = decryptCredentials(encryptedString);
 * console.log(credentials.username, credentials.password);
 */
const decryptCredentials = (encryptedCredentials) => {
  const decryptedJson = decrypt(encryptedCredentials);
  
  try {
    return JSON.parse(decryptedJson);
  } catch (error) {
    throw new Error('Failed to parse decrypted credentials - data may be corrupted');
  }
};

module.exports = {
  encrypt,
  decrypt,
  encryptCredentials,
  decryptCredentials
};
