// API Key 加密/解密工具
// 使用 AES-256-CBC 加密算法

import crypto from 'crypto';

// 从环境变量获取加密密钥（必须是32字节）
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-32-byte-key-change-me!';

if (ENCRYPTION_KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be 32 characters long');
}

const IV_LENGTH = 16; // AES 块大小

/**
 * 加密 API Key
 * @param text 明文 API Key
 * @returns 加密后的字符串（格式：iv:encryptedData）
 */
export function encryptApiKey(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // 返回 iv:加密数据 格式
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * 解密 API Key
 * @param encryptedText 加密的字符串（格式：iv:encryptedData）
 * @returns 明文 API Key
 */
export function decryptApiKey(encryptedText: string): string {
  const parts = encryptedText.split(':');
  
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted text format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedData = parts[1];
  
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * 生成一个随机的32字节密钥（用于首次配置）
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64').slice(0, 32);
}

