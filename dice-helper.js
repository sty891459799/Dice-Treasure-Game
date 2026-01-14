// 生成骰子HTML的辅助函数
function createDiceHTML(value) {
    return `<div class="dice" data-value="${value}">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
    </div>`;
}

// 页面加载后替换所有骰子显示
document.addEventListener('DOMContentLoaded', () => {
    // 替换输入区域的骰子按钮
    document.querySelectorAll('.dice-btn').forEach(btn => {
        const value = btn.dataset.value;
        btn.innerHTML = createDiceHTML(value);
    });
    
    // 替换双围
    document.querySelectorAll('.pair-dice').forEach(el => {
        const text = el.textContent.trim();
        const numbers = text.split(' ').filter(n => n);
        if (numbers.length === 2) {
            el.innerHTML = numbers.map(n => createDiceHTML(n)).join('');
        }
    });
    
    // 替换双骰组合
    document.querySelectorAll('.double-dice').forEach(el => {
        const text = el.textContent.trim();
        const numbers = text.split(' ').filter(n => n);
        if (numbers.length === 2) {
            el.innerHTML = numbers.map(n => createDiceHTML(n)).join('');
        }
    });
    
    // 替换三同骰
    document.querySelectorAll('.triple-dice').forEach(el => {
        const text = el.textContent.trim();
        const numbers = text.split(' ').filter(n => n);
        if (numbers.length === 3) {
            el.innerHTML = numbers.map(n => createDiceHTML(n)).join('');
        }
    });
});

