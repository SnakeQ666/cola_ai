// 生成加密密钥的脚本

import crypto from 'crypto';

process.stdout.write('\n🔐 生成 API Key 加密密钥\n');
process.stdout.write('将以下内容添加到你的 .env 文件中：\n');

const key = crypto.randomBytes(32).toString('base64').slice(0, 32);

process.stdout.write(`ENCRYPTION_KEY="${key}"\n`);
process.stdout.write('\n⚠️  请妥善保管此密钥，丢失后将无法解密已保存的 API Key！\n');

