// 骰宝记分板
const diceSymbols = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

// 游戏状态
let state = {
    bankerBalance: 500,  // 庄家筹码余额
    playerBalance: 500,  // 闲家筹码余额
    selectedDice: [null, null, null],
    history: [],
    bets: {},        // 存储每个位置的筹码数组，如 { "big": [50, 100, 30], "small": [10] }
    currentChip: 50
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    
    // 检查并修正旧的余额数据
    if (state.bankerBalance === 10000 || state.playerBalance === 10000 || 
        state.bankerBalance === 5000 || state.playerBalance === 5000) {
        state.bankerBalance = 500;
        state.playerBalance = 500;
        saveState();
    }
    
    initDiceSelectors();
    initChipSelector();
    initBetBoxes();
    initGameMode();  // 初始化游戏模式
    updateDisplay();
    syncChipSelection(); // 同步筹码选择状态
});

// 初始化骰子选择器
function initDiceSelectors() {
    for (let i = 1; i <= 3; i++) {
        const selector = document.getElementById(`dice${i}`);
        const group = document.getElementById(`group${i}`);
        const buttons = selector.querySelectorAll('.dice-btn');
        
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                state.selectedDice[i - 1] = parseInt(btn.dataset.value);
                
                // 给分组添加选中状态
                if (group) group.classList.add('has-selection');
                
                updatePreview();
            });
        });
    }
}

// 初始化筹码选择器
function initChipSelector() {
    document.querySelectorAll('.chip-selector .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.chip-selector .chip').forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
            state.currentChip = parseInt(chip.dataset.value);
            saveState(); // 保存选中的筹码
        });
    });
}

// 同步筹码选择状态
function syncChipSelection() {
    // 移除所有选中状态
    document.querySelectorAll('.chip-selector .chip').forEach(c => c.classList.remove('selected'));
    
    // 根据 state.currentChip 设置选中状态
    const selectedChip = document.querySelector(`.chip-selector .chip[data-value="${state.currentChip}"]`);
    if (selectedChip) {
        selectedChip.classList.add('selected');
    } else {
        // 如果找不到对应的筹码，默认选中10
        state.currentChip = 10;
        const defaultChip = document.querySelector('.chip-selector .chip[data-value="10"]');
        if (defaultChip) {
            defaultChip.classList.add('selected');
        }
    }
}

// 初始化押注区域
function initBetBoxes() {
    document.querySelectorAll('.bet-box').forEach(box => {
        const betType = box.dataset.bet;
        let pressTimer = null;
        let isLongPress = false;
        
        // 触摸/鼠标按下开始
        const startPress = (e) => {
            isLongPress = false;
            pressTimer = setTimeout(() => {
                isLongPress = true;
                // 长按：清除该区域所有筹码
                clearBet(betType);
                // 震动反馈（如果支持）
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
                // 视觉反馈
                box.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    box.style.transform = '';
                }, 100);
            }, 500); // 500ms 判定为长按
        };
        
        // 触摸/鼠标抬起
        const endPress = (e) => {
            if (pressTimer) {
                clearTimeout(pressTimer);
            }
            if (!isLongPress) {
                // 短按：添加筹码
                e.preventDefault();
                placeBet(betType, state.currentChip);
            }
            isLongPress = false;
        };
        
        // 触摸/鼠标移出
        const cancelPress = () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
            }
            isLongPress = false;
        };
        
        // 移动端事件
        box.addEventListener('touchstart', startPress, { passive: true });
        box.addEventListener('touchend', endPress);
        box.addEventListener('touchcancel', cancelPress);
        
        // PC端事件
        box.addEventListener('mousedown', startPress);
        box.addEventListener('mouseup', endPress);
        box.addEventListener('mouseleave', cancelPress);
        
        // 禁用右键菜单
        box.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    });
}

// 下注
function placeBet(betType, amount) {
    if (!state.bets[betType]) {
        state.bets[betType] = [];
    }
    
    if (amount > 0) {
        // 检查闲家余额是否足够
        if (state.playerBalance < amount) {
            alert('闲家余额不足！');
            return;
        }
        
        // 添加筹码
        state.bets[betType].push(amount);
        
        // 扣除闲家积分
        state.playerBalance -= amount;
    } else {
        // 移除最后一个筹码并退还积分
        const removedChip = state.bets[betType].pop();
        if (removedChip) {
            state.playerBalance += removedChip;
        }
    }
    
    // 清理空数组
    if (state.bets[betType].length === 0) {
        delete state.bets[betType];
    }
    
    updateBetDisplay();
    updateDisplay();  // 更新余额显示
    saveState();
}

// 清除单个区域的筹码
function clearBet(betType) {
    if (state.bets[betType]) {
        // 退还所有筹码的积分
        const totalBet = state.bets[betType].reduce((sum, chip) => sum + chip, 0);
        state.playerBalance += totalBet;
        
        delete state.bets[betType];
        updateBetDisplay();
        updateDisplay();  // 更新余额显示
        saveState();
    }
}

// 清除所有下注
function clearAllBets() {
    // 退还所有筹码的积分
    let totalBet = 0;
    Object.keys(state.bets).forEach(betType => {
        const betAmount = state.bets[betType].reduce((sum, chip) => sum + chip, 0);
        totalBet += betAmount;
    });
    state.playerBalance += totalBet;
    
    state.bets = {};
    updateBetDisplay();
    updateDisplay();  // 更新余额显示
    saveState();
}

// 格式化筹码金额显示
function formatChipAmount(amount) {
    if (amount >= 1000) {
        return (amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1) + 'K';
    }
    return amount;
}

// 更新下注显示
function updateBetDisplay() {
    // 更新每个押注区域的筹码显示
    document.querySelectorAll('.bet-box').forEach(box => {
        const betType = box.dataset.bet;
        const chips = state.bets[betType] || [];
        let chipStack = box.querySelector('.chip-stack');
        
        // 如果没有筹码容器，创建一个
        if (!chipStack) {
            chipStack = document.createElement('div');
            chipStack.className = 'chip-stack';
            box.appendChild(chipStack);
        }
        
        // 清空现有筹码
        chipStack.innerHTML = '';
        
        if (chips.length > 0) {
            box.classList.add('has-bet');
            
            // 最多显示5个筹码，多余的堆叠
            const displayChips = chips.slice(-5);
            
            displayChips.forEach(chipValue => {
                const chip = document.createElement('div');
                chip.className = `chip-item chip-${chipValue}`;
                chip.textContent = chipValue >= 1000 ? '1K' : chipValue;
                chipStack.appendChild(chip);
            });
            
            // 显示总金额
            const total = chips.reduce((sum, val) => sum + val, 0);
            const totalDiv = document.createElement('div');
            totalDiv.className = 'chip-total';
            totalDiv.textContent = formatChipAmount(total);
            chipStack.appendChild(totalDiv);
        } else {
            box.classList.remove('has-bet');
        }
    });
    
    // 更新总下注金额
    let totalBet = 0;
    Object.values(state.bets).forEach(chips => {
        if (Array.isArray(chips)) {
            totalBet += chips.reduce((sum, val) => sum + val, 0);
        }
    });
    document.getElementById('totalBetDisplay').textContent = totalBet;
}

// 更新预览
function updatePreview() {
    const previewDice = document.getElementById('previewDice');
    const previewTotal = document.getElementById('previewTotal');
    const previewType = document.getElementById('previewType');
    
    const dice = state.selectedDice;
    
    const dieElements = previewDice.querySelectorAll('.preview-die');
    dice.forEach((value, index) => {
        dieElements[index].textContent = value !== null ? diceSymbols[value - 1] : '?';
    });
    
    if (dice.every(d => d !== null)) {
        const total = dice.reduce((a, b) => a + b, 0);
        const isTriple = dice[0] === dice[1] && dice[1] === dice[2];
        
        previewTotal.textContent = total;
        
        let typeText = isTriple ? '围骰! ' : '';
        typeText += total >= 11 ? '大' : '小';
        typeText += ' / ';
        typeText += total % 2 === 1 ? '单' : '双';
        
        previewType.textContent = typeText;
        document.getElementById('confirmBtn').disabled = false;
    } else {
        previewTotal.textContent = '-';
        previewType.textContent = '-';
        document.getElementById('confirmBtn').disabled = true;
    }
}

// 确认开奖结果
function confirmResult() {
    const dice = state.selectedDice;
    
    if (!dice.every(d => d !== null)) {
        alert('请先选择三个骰子的点数！');
        return;
    }
    
    const total = dice.reduce((a, b) => a + b, 0);
    const isTriple = dice[0] === dice[1] && dice[1] === dice[2];
    
    // 计算输赢并更新积分
    calculateWinnings(dice, total, isTriple);
    
    // 添加历史记录
    state.history.unshift({
        dice: [...dice],
        total: total,
        isTriple: isTriple,
        time: new Date().toLocaleTimeString()
    });
    
    if (state.history.length > 20) {
        state.history.pop();
    }
    
    // 高亮中奖区域
    highlightWinningBets(dice, total, isTriple);
    
    // 重置骰子选择
    resetDiceSelection();
    
    // 延迟清除下注（等待闪烁动画结束后再清除）
    setTimeout(() => {
        state.bets = {};
        updateDisplay();
        saveState();
    }, 10000); // 10秒后清除，与闪烁动画时长一致
    
    // 立即更新显示（但不清除筹码）
    updateDisplay();
    saveState();
    
    // 检查游戏是否结束
    checkGameOver();
}

// 高亮中奖区域
function highlightWinningBets(dice, total, isTriple) {
    document.querySelectorAll('.bet-box').forEach(box => {
        box.classList.remove('winning');
    });
    
    const winningBets = [];
    
    if (!isTriple) {
        if (total >= 11 && total <= 17) winningBets.push('big');
        else if (total >= 4 && total <= 10) winningBets.push('small');
        
        if (total % 2 === 1) winningBets.push('odd');
        else winningBets.push('even');
    }
    
    winningBets.push(`total-${total}`);
    
    if (isTriple) {
        winningBets.push(`triple-${dice[0]}`);
        winningBets.push('any-triple');
    }
    
    // 单骰中奖
    const diceCount = {};
    dice.forEach(d => {
        diceCount[d] = (diceCount[d] || 0) + 1;
    });
    Object.keys(diceCount).forEach(d => {
        winningBets.push(`single-${d}`);
    });
    
    // 双骰组合中奖
    const sortedDice = [...dice].sort((a, b) => a - b);
    for (let i = 0; i < sortedDice.length; i++) {
        for (let j = i + 1; j < sortedDice.length; j++) {
            if (sortedDice[i] !== sortedDice[j]) {
                winningBets.push(`double-${sortedDice[i]}-${sortedDice[j]}`);
            }
        }
    }
    
    // 双围中奖（三个骰子中至少有两个相同）
    Object.keys(diceCount).forEach(d => {
        if (diceCount[d] >= 2) {
            winningBets.push(`pair-${d}`);
        }
    });
    
    winningBets.forEach(bet => {
        const box = document.querySelector(`[data-bet="${bet}"]`);
        if (box) box.classList.add('winning');
    });
    
    setTimeout(() => {
        document.querySelectorAll('.bet-box').forEach(box => {
            box.classList.remove('winning');
        });
    }, 10000); // 10秒闪烁时长
}

// 计算输赢并更新余额
function calculateWinnings(dice, total, isTriple) {
    let bankerWinnings = 0;  // 庄家输赢（正为赢，负为输）
    let playerWinnings = 0;  // 闲家输赢（正为赢，负为输）
    
    // 遍历所有押注
    Object.keys(state.bets).forEach(betKey => {
        const betChips = state.bets[betKey];
        if (!betChips || betChips.length === 0) return;
        
        // 计算总押注金额
        const totalBet = betChips.reduce((sum, chip) => sum + chip, 0);
        
        // 获取赔率
        const betBox = document.querySelector(`[data-bet="${betKey}"]`);
        if (!betBox) return;
        
        const odds = parseFloat(betBox.dataset.odds) || 1;
        
        // 判断是否中奖
        let isWinning = false;
        
        // 大小判断
        if (betKey === 'big' && !isTriple && total >= 11 && total <= 17) isWinning = true;
        if (betKey === 'small' && !isTriple && total >= 4 && total <= 10) isWinning = true;
        
        // 点数判断
        if (betKey.startsWith('total-')) {
            const targetTotal = parseInt(betKey.split('-')[1]);
            if (total === targetTotal) isWinning = true;
        }
        
        // 三围判断
        if (betKey.startsWith('triple-')) {
            const targetNum = parseInt(betKey.split('-')[1]);
            if (isTriple && dice[0] === targetNum) isWinning = true;
        }
        
        // 全围判断
        if (betKey === 'any-triple' && isTriple) isWinning = true;
        
        // 单骰判断
        if (betKey.startsWith('single-')) {
            const targetNum = parseInt(betKey.split('-')[1]);
            const count = dice.filter(d => d === targetNum).length;
            if (count > 0) {
                isWinning = true;
                // 单骰特殊：出现1次赔1倍，但这里统一处理为赔率1
            }
        }
        
        // 双骰组合判断
        if (betKey.startsWith('double-')) {
            const [_, num1, num2] = betKey.split('-').map(Number);
            const sortedDice = [...dice].sort((a, b) => a - b);
            for (let i = 0; i < sortedDice.length; i++) {
                for (let j = i + 1; j < sortedDice.length; j++) {
                    if ((sortedDice[i] === num1 && sortedDice[j] === num2) ||
                        (sortedDice[i] === num2 && sortedDice[j] === num1)) {
                        isWinning = true;
                        break;
                    }
                }
                if (isWinning) break;
            }
        }
        
        // 双围判断
        if (betKey.startsWith('pair-')) {
            const targetNum = parseInt(betKey.split('-')[1]);
            const count = dice.filter(d => d === targetNum).length;
            if (count >= 2) isWinning = true;
        }
        
        // 计算输赢（押注时已经扣除了闲家积分）
        if (isWinning) {
            // 中奖：闲家赢得 押注金额 + 押注金额 × 赔率
            playerWinnings += totalBet + (totalBet * odds);
            bankerWinnings -= totalBet * odds;
        } else {
            // 未中奖：庄家赢得押注金额（闲家已经扣除，不需要再扣）
            bankerWinnings += totalBet;
        }
    });
    
    // 延迟更新余额，等待押注区闪烁结束（10秒后）
    setTimeout(() => {
        // 更新余额
        state.bankerBalance += bankerWinnings;
        state.playerBalance += playerWinnings;
        
        // 确保余额不为负数
        state.bankerBalance = Math.max(0, state.bankerBalance);
        state.playerBalance = Math.max(0, state.playerBalance);
        
        // 先更新显示
        updateDisplay();
        saveState();
        
        // 触发闪烁效果（如果有积分增加）
        if (bankerWinnings > 0) {
            const bankerDisplay = document.getElementById('bankerBalance');
            if (bankerDisplay) {
                bankerDisplay.classList.add('flash-increase');
                setTimeout(() => {
                    bankerDisplay.classList.remove('flash-increase');
                }, 800);
            }
        }
        
        if (playerWinnings > 0) {
            const playerDisplay = document.getElementById('playerBalance');
            if (playerDisplay) {
                playerDisplay.classList.add('flash-increase');
                setTimeout(() => {
                    playerDisplay.classList.remove('flash-increase');
                }, 800);
            }
        }
    }, 10000); // 等待10秒后再加积分
}

// 重置骰子选择
function resetDiceSelection() {
    state.selectedDice = [null, null, null];
    document.querySelectorAll('.dice-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.querySelectorAll('.dice-input-group').forEach(group => {
        group.classList.remove('has-selection');
    });
    updatePreview();
}

// 调整余额
function adjustBalance(type, amount) {
    if (type === 'banker') {
        state.bankerBalance = Math.max(0, state.bankerBalance + amount);
    } else {
        state.playerBalance = Math.max(0, state.playerBalance + amount);
    }
    updateDisplay();
    
    // 如果是增加积分，触发闪烁效果
    if (amount > 0) {
        const displayElement = type === 'banker' 
            ? document.getElementById('bankerBalance')
            : document.getElementById('playerBalance');
        
        if (displayElement) {
            displayElement.classList.add('flash-increase');
            setTimeout(() => {
                displayElement.classList.remove('flash-increase');
            }, 800);
        }
    }
    
    saveState();
    checkGameOver();
}

// 检查游戏是否结束
function checkGameOver() {
    if (state.bankerBalance <= 0) {
        showGameOver('闲家');
    } else if (state.playerBalance <= 0) {
        showGameOver('庄家');
    }
}

// 显示游戏结束动画
function showGameOver(winner) {
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'game-over-overlay';
    
    // 创建内容
    const content = document.createElement('div');
    content.className = 'game-over-content';
    
    content.innerHTML = `
        <div class="winner-text">${winner} 获胜！</div>
        <div class="winner-subtitle">🎉 恭喜 ${winner} 赢得游戏 🎉</div>
        <button class="restart-btn" onclick="restartGame()">重新开始</button>
    `;
    
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    
    // 创建烟花效果
    createFireworks(content);
}

// 创建烟花效果
function createFireworks(container) {
    const overlay = container.closest('.game-over-overlay');
    
    // 创建多波烟花
    for (let wave = 0; wave < 5; wave++) {
        setTimeout(() => {
            // 每波创建多个烟花
            for (let i = 0; i < 80; i++) {
                setTimeout(() => {
                    const firework = document.createElement('div');
                    firework.className = 'firework';
                    
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 150 + Math.random() * 300;
                    const x = Math.cos(angle) * distance;
                    const y = Math.sin(angle) * distance;
                    
                    firework.style.setProperty('--x', `${x}px`);
                    firework.style.setProperty('--y', `${y}px`);
                    
                    // 随机位置爆发
                    const startX = 20 + Math.random() * 60;
                    const startY = 20 + Math.random() * 60;
                    firework.style.left = `${startX}%`;
                    firework.style.top = `${startY}%`;
                    
                    const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f38181', '#95e1d3', '#f3a683', '#f8b500', '#ff3838', '#70a1ff'];
                    firework.style.background = colors[Math.floor(Math.random() * colors.length)];
                    
                    // 随机大小
                    const size = 4 + Math.random() * 6;
                    firework.style.width = `${size}px`;
                    firework.style.height = `${size}px`;
                    
                    // 添加发光效果
                    firework.style.boxShadow = `0 0 ${size * 2}px ${firework.style.background}`;
                    
                    overlay.appendChild(firework);
                    
                    setTimeout(() => firework.remove(), 2000);
                }, i * 15);
            }
        }, wave * 800);
    }
    
    // 添加持续的背景烟花
    const continuousFireworks = setInterval(() => {
        if (!document.querySelector('.game-over-overlay')) {
            clearInterval(continuousFireworks);
            return;
        }
        
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                const firework = document.createElement('div');
                firework.className = 'firework';
                
                const angle = Math.random() * Math.PI * 2;
                const distance = 100 + Math.random() * 250;
                const x = Math.cos(angle) * distance;
                const y = Math.sin(angle) * distance;
                
                firework.style.setProperty('--x', `${x}px`);
                firework.style.setProperty('--y', `${y}px`);
                firework.style.left = `${20 + Math.random() * 60}%`;
                firework.style.top = `${20 + Math.random() * 60}%`;
                
                const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f38181', '#95e1d3', '#f3a683'];
                const color = colors[Math.floor(Math.random() * colors.length)];
                firework.style.background = color;
                
                const size = 4 + Math.random() * 5;
                firework.style.width = `${size}px`;
                firework.style.height = `${size}px`;
                firework.style.boxShadow = `0 0 ${size * 2}px ${color}`;
                
                overlay.appendChild(firework);
                
                setTimeout(() => firework.remove(), 1800);
            }, i * 50);
        }
    }, 1000);
}

// 重新开始游戏
function restartGame() {
    state.bankerBalance = 500;
    state.playerBalance = 500;
    updateDisplay();
    saveState();
    
    // 移除游戏结束遮罩
    const overlay = document.querySelector('.game-over-overlay');
    if (overlay) {
        overlay.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => overlay.remove(), 300);
    }
}

// 添加fadeOut动画
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);

// 重置余额
function resetBalance(type) {
    if (type === 'banker') state.bankerBalance = 500;
    else state.playerBalance = 500;
    updateDisplay();
    saveState();
}

// 清空历史
function clearHistory() {
    if (confirm('确定要清空所有历史记录吗？')) {
        state.history = [];
        updateDisplay();
        saveState();
    }
}

// 更新显示
function updateDisplay() {
    document.getElementById('bankerBalance').textContent = state.bankerBalance;
    document.getElementById('playerBalance').textContent = state.playerBalance;
    
    updateBetDisplay();
    
    const historyList = document.getElementById('historyList');
    
    if (state.history.length === 0) {
        historyList.innerHTML = '<div class="empty-history">暂无记录</div>';
        return;
    }
    
    historyList.innerHTML = state.history.map((item, index) => {
        const sizeClass = item.isTriple ? 'triple' : (item.total >= 11 ? 'big' : 'small');
        const sizeText = item.isTriple ? '围' : (item.total >= 11 ? '大' : '小');
        
        return `
            <div class="history-item ${sizeClass}">
                <span class="history-round">#${state.history.length - index}</span>
                <span class="history-dice-nums">${item.dice.join(' ')}</span>
                <span class="history-total">${item.total}</span>
                <span class="history-size">${sizeText}</span>
            </div>
        `;
    }).join('');
}

// 保存状态
function saveState() {
    localStorage.setItem('sicBoState', JSON.stringify(state));
}

// 加载状态
function loadState() {
    const saved = localStorage.getItem('sicBoState');
    if (saved) {
        const loaded = JSON.parse(saved);
        state.bankerBalance = loaded.bankerBalance || 500;
        state.playerBalance = loaded.playerBalance || 500;
        state.history = loaded.history || [];
        state.currentChip = loaded.currentChip || 50;
        
        // 确保 bets 格式正确（数组格式）
        state.bets = {};
        if (loaded.bets) {
            Object.keys(loaded.bets).forEach(key => {
                const val = loaded.bets[key];
                // 如果是数组就直接用，否则转换
                if (Array.isArray(val)) {
                    state.bets[key] = val;
                } else if (typeof val === 'number' && val > 0) {
                    // 旧格式：数字，转换为数组
                    state.bets[key] = [val];
                }
            });
        }
    }
}

// ============ 模式切换功能 ============

let tempGameMode = 'single';  // 临时存储选择的模式
let tempPlayerCount = 2;      // 临时存储选择的玩家数

// 打开模式选择模态框（只在多人模式时打开）
function openModeModal() {
    const currentMode = state.gameMode || 'single';
    
    // 如果当前是单人模式，点击按钮直接切换到多人模式并打开选择框
    if (currentMode === 'single') {
        tempGameMode = 'multi';
        tempPlayerCount = state.playerCount || 2;
        
        const modal = document.getElementById('modeModal');
        modal.classList.add('active');
        updateModeSelection();
    } else {
        // 如果当前是多人模式，点击按钮直接切换回单人模式
        if (confirm('切换到单人模式将清除当前游戏数据，是否继续？')) {
            state.gameMode = 'single';
            state.playerCount = 1;
            
            // 更新图标
            const modeIcon = document.getElementById('modeIcon');
            modeIcon.textContent = '👤';
            
            // 重新加载界面（这里暂时只是提示，后续会实现界面切换）
            alert('已切换到单人模式');
            saveState();
        }
    }
}

// 关闭模态框
function closeModeModal() {
    const modal = document.getElementById('modeModal');
    modal.classList.remove('active');
}

// 设置玩家数量
function setPlayerCount(count) {
    tempPlayerCount = count;
    updateModeSelection();
}

// 更新选择状态
function updateModeSelection() {
    // 更新玩家数量按钮
    document.querySelectorAll('.player-count-btn').forEach((btn, index) => {
        const count = index + 2; // 2, 3, 4, 5, 6
        if (count === tempPlayerCount) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

// 确认模式切换（多人模式）
function confirmModeChange() {
    // 保存新模式
    state.gameMode = 'multi';
    state.playerCount = tempPlayerCount;
    
    // 更新图标
    const modeIcon = document.getElementById('modeIcon');
    modeIcon.textContent = '👥';
    
    // TODO: 这里将实现多人模式的界面切换
    alert(`多人模式：${tempPlayerCount}个闲家\n功能开发中...`);
    
    closeModeModal();
    saveState();
}

// 初始化模式（在页面加载时调用）
function initGameMode() {
    state.gameMode = state.gameMode || 'single';
    state.playerCount = state.playerCount || 2;
    
    // 更新图标
    const modeIcon = document.getElementById('modeIcon');
    if (modeIcon) {
        modeIcon.textContent = state.gameMode === 'single' ? '👤' : '👥';
    }
    
    // 初始化拖动功能
    initDraggableButton();
}

// ============ 可拖动悬浮按钮功能 ============

function initDraggableButton() {
    const btn = document.querySelector('.mode-toggle-btn');
    if (!btn) return;
    
    let isDragging = false;
    let startX, startY;
    let currentX, currentY;
    let isExpanded = false;
    let expandTimer = null;
    
    // 恢复保存的位置和侧边
    const savedSide = localStorage.getItem('modeBtnSide') || 'right';
    const savedY = localStorage.getItem('modeBtnY') || '50%';
    
    if (savedSide === 'left') {
        btn.classList.add('left-side');
    }
    btn.style.top = savedY;
    
    // 鼠标事件（仅PC端）
    btn.addEventListener('mousedown', startDrag);
    btn.addEventListener('mouseenter', expandButton);
    btn.addEventListener('mouseleave', collapseButton);
    
    // 触摸事件（移动端）
    let touchStartTime = 0;
    btn.addEventListener('touchstart', (e) => {
        touchStartTime = Date.now();
        expandButton();
        startDrag(e);
    }, { passive: false });
    
    btn.addEventListener('touchend', (e) => {
        const touchDuration = Date.now() - touchStartTime;
        
        // 如果是快速点击（不是拖动），打开模态框
        if (!isDragging && touchDuration < 300) {
            e.preventDefault();
            e.stopPropagation();
            handleButtonClick(e);
        }
    });
    
    // 点击事件（PC端）
    btn.addEventListener('click', handleButtonClick);
    
    function handleButtonClick(e) {
        // 如果刚刚拖动过，不触发点击
        if (isDragging) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        
        // 防止重复触发
        if (e.type === 'touchend') {
            e.preventDefault();
        }
        
        expandButton();
        // 延迟一点再打开模态框，让动画完成
        setTimeout(() => {
            openModeModal();
        }, 150);
    }
    
    function startDrag(e) {
        // 触摸事件不要阻止默认行为，让它可以触发click
        if (e.type === 'mousedown') {
            e.preventDefault();
        }
        
        isDragging = false;
        
        const touch = e.touches ? e.touches[0] : e;
        startX = touch.clientX;
        startY = touch.clientY;
        
        // 获取当前位置
        const rect = btn.getBoundingClientRect();
        currentX = rect.left + rect.width / 2;
        currentY = rect.top + rect.height / 2;
        
        btn.classList.add('dragging');
        expandButton();
        
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('touchmove', onDrag, { passive: false });
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchend', stopDrag);
    }
    
    function onDrag(e) {
        e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;
        
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;
        
        // 如果移动距离超过5px，认为是拖动
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            isDragging = true;
        }
        
        if (isDragging) {
            currentY = currentY + deltaY;
            startY = touch.clientY;
            
            // 限制在屏幕范围内
            const maxY = window.innerHeight - 22.5;
            const minY = 22.5;
            currentY = Math.max(minY, Math.min(maxY, currentY));
            
            btn.style.top = currentY + 'px';
        }
    }
    
    function stopDrag(e) {
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('touchmove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchend', stopDrag);
        
        btn.classList.remove('dragging');
        
        const wasDragging = isDragging;
        
        if (wasDragging) {
            // 吸附到最近的边
            const centerX = window.innerWidth / 2;
            const rect = btn.getBoundingClientRect();
            const btnCenterX = rect.left + rect.width / 2;
            
            if (btnCenterX < centerX) {
                // 吸附到左边
                btn.classList.add('left-side');
                btn.style.right = 'auto';
                localStorage.setItem('modeBtnSide', 'left');
            } else {
                // 吸附到右边
                btn.classList.remove('left-side');
                btn.style.left = 'auto';
                localStorage.setItem('modeBtnSide', 'right');
            }
            
            // 保存Y位置
            localStorage.setItem('modeBtnY', btn.style.top);
            
            // 拖动后收起按钮
            collapseButton();
        }
        
        // 延迟重置拖动标志，确保click事件能正确判断
        setTimeout(() => {
            isDragging = false;
        }, 100);
    }
    
    function expandButton() {
        clearTimeout(expandTimer);
        isExpanded = true;
        btn.classList.add('expanded');
    }
    
    function collapseButton() {
        clearTimeout(expandTimer);
        expandTimer = setTimeout(() => {
            isExpanded = false;
            btn.classList.remove('expanded');
        }, 300);
    }
}
