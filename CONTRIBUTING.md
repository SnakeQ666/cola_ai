# 贡献指南

感谢您对AI数据分析平台的关注！我们欢迎所有形式的贡献。

## 🤝 如何贡献

### 报告Bug

如果您发现了Bug，请：

1. 确认该问题尚未被报告
2. 创建一个Issue，包含：
   - 清晰的标题和描述
   - 复现步骤
   - 期望行为和实际行为
   - 截图（如适用）
   - 环境信息（浏览器、操作系统等）

### 提出新功能

如果您有功能建议：

1. 创建一个Issue，描述：
   - 功能的使用场景
   - 期望的行为
   - 可能的实现方案

### 提交代码

1. **Fork项目**

2. **创建特性分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **编写代码**
   - 遵循现有代码风格
   - 添加必要的注释
   - 确保代码通过lint检查

4. **提交更改**
   ```bash
   git add .
   git commit -m "feat: add your feature"
   ```

   提交信息格式：
   - `feat:` 新功能
   - `fix:` Bug修复
   - `docs:` 文档更新
   - `style:` 代码格式调整
   - `refactor:` 代码重构
   - `test:` 测试相关
   - `chore:` 构建/工具相关

5. **推送到Fork的仓库**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **创建Pull Request**
   - 清晰描述更改内容
   - 关联相关Issue
   - 等待代码审查

## 📝 代码规范

### TypeScript

- 使用TypeScript编写所有代码
- 为函数和组件添加类型注解
- 避免使用`any`类型

### React组件

```tsx
// ✅ 好的示例
interface ButtonProps {
  text: string
  onClick: () => void
}

export function Button({ text, onClick }: ButtonProps) {
  return <button onClick={onClick}>{text}</button>
}

// ❌ 不好的示例
export function Button(props: any) {
  return <button onClick={props.onClick}>{props.text}</button>
}
```

### 文件命名

- 组件: `PascalCase.tsx` (例: `DataTable.tsx`)
- 工具函数: `camelCase.ts` (例: `formatDate.ts`)
- 常量: `UPPER_SNAKE_CASE.ts` (例: `API_CONFIG.ts`)

### 组件结构

```tsx
// 1. 导入
import { useState } from 'react'
import { Button } from '@/components/ui/button'

// 2. 类型定义
interface Props {
  // ...
}

// 3. 组件
export function Component({ ...props }: Props) {
  // 4. Hooks
  const [state, setState] = useState()
  
  // 5. 事件处理
  const handleClick = () => {
    // ...
  }
  
  // 6. 渲染
  return (
    <div>
      {/* ... */}
    </div>
  )
}
```

## 🧪 测试

在提交PR之前，请确保：

- [ ] 代码通过TypeScript类型检查
- [ ] 代码通过ESLint检查
- [ ] 在PC端和移动端测试过
- [ ] 功能正常工作

```bash
# 类型检查
npm run type-check

# Lint检查
npm run lint

# 构建测试
npm run build
```

## 📚 文档

- 为新功能添加文档
- 更新README（如需要）
- 添加代码注释（特别是复杂逻辑）

## 🙏 行为准则

- 尊重所有贡献者
- 欢迎新手，耐心解答问题
- 建设性地讨论问题
- 保持专业和友好

## 💡 需要帮助？

如有任何问题，可以：
- 创建Issue提问
- 查看现有文档
- 联系维护者

再次感谢您的贡献！🎉

