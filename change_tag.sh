#!/bin/bash
# 目标版本和标签
TARGET_VERSION="3.56.2"
TAG="latest"  # 如果需自定义标签名，修改这里

# 核心目录和插件目录
DIRS=("core" "plugin" "standalone")

# 遍历所有目录
for dir in "${DIRS[@]}"; do
  echo "Processing directory: $dir"
  
  # 递归查找所有子目录（忽略node_modules）
  find "$dir" -maxdepth 1 -type d \( -name "node_modules" -prune \) -o -print | while read -r project_dir; do
    # 跳过根目录自身（避免重复处理）
    if [ "$project_dir" = "$dir" ]; then
      continue
    fi

    # 检查是否是npm项目（包含package.json）
    if [ -f "$project_dir/package.json" ]; then
      echo "Updating npm tag in: $project_dir"

      package_name=$(cd "$project_dir" && node -pe "try { require('./package.json').name } catch(e) {}" 2>/dev/null)
      
      if [ -z "$package_name" ]; then
        echo "错误: $project_dir 中未找到有效的 package.json name 字段"
        continue
      fi
      
      # 进入目录并更新npm标签
      (cd "$project_dir" && npm dist-tag add "$package_name@$TARGET_VERSION" "$TAG")
      
      # 检查命令是否成功
      if [ $? -ne 0 ]; then
        echo "Failed to update tag in $project_dir"
      fi
    fi
  done
done

echo "All done!"