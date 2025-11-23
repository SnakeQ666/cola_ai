// 生成加密密钥的脚本

import crypto from 'crypto';

console.log('\n🔐 生成 API Key 加密密钥\n');
console.log('将以下内容添加到你的 .env 文件中：\n');

const key = crypto.randomBytes(32).toString('base64').slice(0, 32);

console.log(`ENCRYPTION_KEY="${key}"`);
console.log('\n⚠️  请妥善保管此密钥，丢失后将无法解密已保存的 API Key！\n');

