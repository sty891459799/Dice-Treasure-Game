const fs = require('fs');
const path = require('path');
const { minify } = require('html-minifier-terser');

const sourceDir = __dirname;
const distDir = path.join(__dirname, 'dist');
const outputFile = path.join(distDir, 'index-standalone.min.html');

// 确保 dist 目录存在
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

async function build() {
  try {
    console.log('📦 开始构建单文件版本...');
    
    // 读取源文件
    const htmlPath = path.join(sourceDir, 'index.html');
    const cssPath = path.join(sourceDir, 'styles.css');
    const scriptPath = path.join(sourceDir, 'script.js');
    const diceHelperPath = path.join(sourceDir, 'dice-helper.js');
    
    console.log('📖 读取源文件...');
    let html = fs.readFileSync(htmlPath, 'utf8');
    const css = fs.readFileSync(cssPath, 'utf8');
    const script = fs.readFileSync(scriptPath, 'utf8');
    const diceHelper = fs.readFileSync(diceHelperPath, 'utf8');
    
    // 替换 CSS 链接为内联样式
    console.log('🔗 内联 CSS...');
    html = html.replace(
      /<link\s+rel="stylesheet"\s+href="styles\.css">/i,
      `<style>${css}</style>`
    );
    
    // 替换 JavaScript 文件为内联脚本
    console.log('🔗 内联 JavaScript...');
    // 先替换 dice-helper.js（在 script.js 之前）
    html = html.replace(
      /<script\s+src="dice-helper\.js"><\/script>/i,
      `<script>${diceHelper}</script>`
    );
    // 再替换 script.js
    html = html.replace(
      /<script\s+src="script\.js"><\/script>/i,
      `<script>${script}</script>`
    );
    
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
    console.log('🗜️  压缩文件...');
    const minified = await minify(html, minifyOptions);
    
    // 写入压缩后的文件
    fs.writeFileSync(outputFile, minified, 'utf8');
    
    // 显示文件大小
    const minifiedSize = fs.statSync(outputFile).size;
    const originalSize = 
      fs.statSync(htmlPath).size +
      fs.statSync(cssPath).size +
      fs.statSync(scriptPath).size +
      fs.statSync(diceHelperPath).size;
    
    const reduction = ((1 - minifiedSize / originalSize) * 100).toFixed(2);
    
    console.log('✅ 构建完成！');
    console.log(`输出文件: ${outputFile}`);
    console.log(`原始总大小: ${(originalSize / 1024).toFixed(2)} KB`);
    console.log(`压缩后大小: ${(minifiedSize / 1024).toFixed(2)} KB`);
    console.log(`压缩率: ${reduction}%`);
    console.log('\n🎉 文件已准备好，可以直接在浏览器中打开！');
    
  } catch (error) {
    console.error('❌ 构建失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

build();

