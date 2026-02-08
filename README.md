# 年会抽奖系统

基于 Tauri + React + Three.js 的 3D 年会抽奖应用。

## 使用说明

### 重要：导入顺序

**必须先导入头像图片，再导入 JSON 数据文件！**

如果顺序错误，3D 球上的头像将无法正常显示。

### 1. 准备头像图片

1. 将所有员工头像图片放入一个文件夹，命名为 `avatars`
2. 支持的图片格式：`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp`
3. 建议图片尺寸：正方形，200x200 像素以上
4. 记录每个头像文件名与员工姓名的对应关系

文件夹结构示例：
```
avatars/
├── 101.jpg
├── 102.jpg
├── 103.jpg
└── ...
```

### 2. 准备 JSON 数据文件

创建 `lottery.json` 文件，格式如下：

```json
{
  "employees": [
    {
      "name": "张三",
      "avatar": "101.jpg"
    },
    {
      "name": "李四",
      "avatar": "102.jpg"
    },
    {
      "name": "王五",
      "avatar": "103.jpg"
    },
    {
      "name": "赵六"
    }
  ],
  "prizes": [
    {
      "level": "lucky",
      "name": "幸运奖",
      "count": 5,
      "prize": "精美礼品一份"
    },
    {
      "level": "third",
      "name": "三等奖",
      "count": 3,
      "prize": "蓝牙耳机"
    },
    {
      "level": "second",
      "name": "二等奖",
      "count": 2,
      "prize": "智能手表"
    },
    {
      "level": "first",
      "name": "一等奖",
      "count": 1,
      "prize": "平板电脑"
    },
    {
      "level": "special",
      "name": "特等奖",
      "count": 1,
      "prize": "iPhone 16 Pro"
    }
  ]
}
```

**字段说明：**

- `employees`: 员工列表
  - `name`: 员工姓名（必填）
  - `avatar`: 头像文件名，对应 avatars 文件夹中的图片（可选）

- `prizes`: 奖品列表
  - `level`: 奖品级别标识（如：lucky, third, second, first, special）
  - `name`: 奖品名称（必填）
  - `count`: 中奖人数（必填）
  - `prize`: 奖品内容描述（必填）

### 3. 导入数据到应用

1. 打开抽奖应用
2. 点击右上角 **头像图标**，选择头像文件夹导入
3. 点击右上角 **导入图标**，选择 `lottery.json` 文件导入
4. 确认数据导入成功后，即可开始抽奖

### 快捷键

- **空格键**: 开始/停止抽奖

## 系统要求

- **macOS**: macOS 10.15 或更高版本（支持 Intel 和 Apple Silicon）
- **Windows**: Windows 10 或更高版本

## 技术栈

- Tauri 1.x
- React 19
- TypeScript
- Three.js / React Three Fiber
- Vite

## 开发运行

```bash
# 安装依赖
npm install

# 开发模式
npm run tauri:dev

# 构建应用
npm run tauri:build
```

## 注意事项

1. 头像文件名必须与 JSON 中的 `avatar` 字段完全匹配（包括扩展名）
2. 导入头像后不要移动或删除原图片文件
3. 建议使用 `.jpg` 或 `.png` 格式以获得最佳兼容性
4. 单个 JSON 文件大小建议不超过 10MB
