/**
 * 阿里云OSS工具库
 * 用于文件上传、下载和管理
 */

import OSS from 'ali-oss';

// OSS客户端配置
const getOSSClient = () => {
  return new OSS({
    region: process.env.OSS_REGION || 'oss-cn-hangzhou',
    accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
    bucket: process.env.OSS_BUCKET!,
  });
};

/**
 * 上传文件到OSS
 * @param file 文件对象
 * @param path 存储路径
 * @returns 文件URL
 */
export async function uploadFileToOSS(
  // 兼容 Node 运行时：支持 Buffer 或带有 arrayBuffer() 的对象（如 FormData 中的文件）
  file: Buffer | { arrayBuffer: () => Promise<ArrayBuffer> },
  path: string
): Promise<{ url: string; key: string }> {
  const client = getOSSClient();
  
  try {
    let buffer: Buffer;
    // 在 Node 环境不存在全局 File，这里通过是否存在 arrayBuffer 方法来判断
    if (Buffer.isBuffer(file)) {
      buffer = file;
    } else if (file && typeof (file as any).arrayBuffer === 'function') {
      const arrayBuffer = await (file as any).arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      throw new Error('不支持的文件类型');
    }
    
    const result = await client.put(path, buffer);
    
    return {
      url: result.url,
      key: result.name,
    };
  } catch (error) {
    console.error('OSS上传失败:', error);
    throw new Error('文件上传失败');
  }
}

/**
 * 获取文件签名URL（临时访问链接）
 * @param key 文件key
 * @param expires 过期时间（秒）
 * @returns 签名URL
 */
export async function getSignedUrl(
  key: string,
  expires: number = 3600
): Promise<string> {
  const client = getOSSClient();
  
  try {
    const url = client.signatureUrl(key, {
      expires,
      method: 'GET',
    });
    
    return url;
  } catch (error) {
    console.error('获取签名URL失败:', error);
    throw new Error('获取文件链接失败');
  }
}

/**
 * 删除OSS文件
 * @param key 文件key
 */
export async function deleteFileFromOSS(key: string): Promise<void> {
  const client = getOSSClient();
  
  try {
    await client.delete(key);
  } catch (error) {
    console.error('删除文件失败:', error);
    throw new Error('删除文件失败');
  }
}

/**
 * 批量删除文件
 * @param keys 文件key数组
 */
export async function deleteMultipleFiles(keys: string[]): Promise<void> {
  const client = getOSSClient();
  
  try {
    await client.deleteMulti(keys);
  } catch (error) {
    console.error('批量删除文件失败:', error);
    throw new Error('批量删除文件失败');
  }
}

/**
 * 列出指定目录下的文件
 * @param prefix 目录前缀
 * @param maxKeys 最大返回数量
 */
export async function listFiles(
  prefix: string = '',
  maxKeys: number = 100
) {
  const client = getOSSClient();
  
  try {
    const result = await client.list({
      prefix,
      'max-keys': maxKeys,
    });
    
    return result.objects || [];
  } catch (error) {
    console.error('列出文件失败:', error);
    throw new Error('获取文件列表失败');
  }
}

/**
 * 生成上传路径
 * @param userId 用户ID
 * @param filename 文件名
 * @param type 文件类型（dataset/report/avatar等）
 */
export function generateUploadPath(
  userId: string,
  filename: string,
  type: 'dataset' | 'report' | 'avatar' | 'other' = 'other'
): string {
  const timestamp = Date.now();
  const ext = filename.split('.').pop();
  const cleanName = filename.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_.]/g, '');
  
  return `${type}/${userId}/${timestamp}-${cleanName}`;
}

