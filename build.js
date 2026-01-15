const fs = require('fs');
const path = require('path');
const { minify } = require('html-minifier-terser');

const inputFile = path.join(__dirname, 'dist', 'index-standalone.html');
const outputFile = path.join(__dirname, 'dist', 'index-standalone.min.html');

async function build() {
  try {
    console.log('📦 开始压缩 HTML 文件...');
    console.log(`输入文件: ${inputFile}`);
    
    // 读取源文件
    const html = fs.readFileSync(inputFile, 'utf8');
    
    // 压缩选项
    const minifyOptions = {
      collapseWhitespace: true,           // 折叠空白
      removeComments: true,                // 删除注释
      removeRedundantAttributes: true,     // 删除冗余属性
      removeScriptTypeAttributes: true,    // 删除 script type 属性
      removeStyleLinkTypeAttributes: true, // 删除 style/link type 属性
      useShortDoctype: true,              // 使用短 doctype
      minifyCSS: true,                    // 压缩 CSS
      minifyJS: true,                     // 压缩 JavaScript
      removeEmptyAttributes: true,        // 删除空属性
      removeOptionalTags: false,          // 保留可选标签（保持兼容性）
      removeAttributeQuotes: false,       // 保留属性引号（保持兼容性）
      caseSensitive: false,               // 不区分大小写
      keepClosingSlash: false,            // 不保留闭合斜杠
      sortAttributes: false,              // 不排序属性
      sortClassName: false                // 不排序类名
    };
    
    // 压缩 HTML
    const minified = await minify(html, minifyOptions);
    
    // 写入压缩后的文件
    fs.writeFileSync(outputFile, minified, 'utf8');
    
    // 显示文件大小对比
    const originalSize = fs.statSync(inputFile).size;
    const minifiedSize = fs.statSync(outputFile).size;
    const reduction = ((1 - minifiedSize / originalSize) * 100).toFixed(2);
    
    console.log('✅ 压缩完成！');
    console.log(`输出文件: ${outputFile}`);
    console.log(`原始大小: ${(originalSize / 1024).toFixed(2)} KB`);
    console.log(`压缩后大小: ${(minifiedSize / 1024).toFixed(2)} KB`);
    console.log(`压缩率: ${reduction}%`);
    console.log('\n🎉 文件已准备好，可以直接在浏览器中打开！');
    
  } catch (error) {
    console.error('❌ 构建失败:', error.message);
    process.exit(1);
  }
}

build();

