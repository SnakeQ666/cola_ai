/**
 * 图表数据处理工具
 */

/**
 * 对数据进行采样，减少图表显示的数据点
 * @param data 原始数据数组
 * @param maxPoints 最大显示点数
 * @returns 采样后的数据数组
 */
export function sampleChartData<T>(data: T[], maxPoints: number = 50): T[] {
  if (data.length <= maxPoints) {
    return data;
  }

  const step = Math.ceil(data.length / maxPoints);
  const sampled: T[] = [];

  for (let i = 0; i < data.length; i += step) {
    sampled.push(data[i]);
  }

  // 确保包含最后一个数据点
  if (sampled[sampled.length - 1] !== data[data.length - 1]) {
    sampled.push(data[data.length - 1]);
  }

  return sampled;
}

/**
 * 格式化时间标签，根据数据量自动调整显示格式
 * @param date 日期对象或字符串
 * @param dataLength 数据总长度
 * @returns 格式化的时间字符串
 */
export function formatTimeLabel(date: Date | string, dataLength: number): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  // 数据点少于 20 个，显示详细时间
  if (dataLength <= 20) {
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // 数据点在 20-50 个，只显示日期和小时
  if (dataLength <= 50) {
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit'
    });
  }

  // 数据点超过 50 个，只显示日期
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * 限制数组长度，只保留最新的 N 条记录
 * @param data 数据数组
 * @param maxLength 最大长度
 * @returns 截取后的数组
 */
export function limitArrayLength<T>(data: T[], maxLength: number): T[] {
  if (data.length <= maxLength) {
    return data;
  }
  
  return data.slice(data.length - maxLength);
}

