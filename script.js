// 骰宝记分板
const diceSymbols = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

// 玩家颜色配置
const PLAYER_COLORS = [
    { id: 1, name: '闲家1', color: '#f44336', chipColor: '#e53935', lightColor: '#ef5350' },  // 红色
    { id: 2, name: '闲家2', color: '#2196F3', chipColor: '#1976D2', lightColor: '#42A5F5' },  // 蓝色
    { id: 3, name: '闲家3', color: '#4CAF50', chipColor: '#388E3C', lightColor: '#66BB6A' },  // 绿色
    { id: 4, name: '闲家4', color: '#FFC107', chipColor: '#FFA000', lightColor: '#FFCA28' },  // 黄色
    { id: 5, name: '闲家5', color: '#9C27B0', chipColor: '#7B1FA2', lightColor: '#AB47BC' },  // 紫色
    { id: 6, name: '闲家6', color: '#FF5722', chipColor: '#E64A19', lightColor: '#FF7043' }   // 橙色
];

// 游戏状态
let state = {
    gameMode: 'single',  // 'single' 或 'multi'
    playerCount: 1,      // 单人模式=1，多人模式=2-6
    bankerBalance: 500,  // 庄家筹码余额
    
    // 单人模式数据
    playerBalance: 500,  // 闲家筹码余额
    
    // 多人模式数据
    players: [],         // 多个玩家的数据 [{ id, name, balance, color, currentChip }]
    currentPlayerId: null, // 当前选中的玩家ID
    
    selectedDice: [null, null, null],
    history: [],
    bets: {},        // 单人: { "big": [50, 100], "small": [10] }
                     // 多人: { "big": [{playerId: 1, amount: 50}, {playerId: 2, amount: 100}] }
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
        if (state.gameMode === 'single') {
            // 单人模式逻辑
            if (state.playerBalance < amount) {
                alert('闲家余额不足！');
                return;
            }
            
            state.bets[betType].push(amount);
            state.playerBalance -= amount;
        } else {
            // 多人模式逻辑
            const currentPlayer = state.players.find(p => p.id === state.currentPlayerId);
            if (!currentPlayer) {
                alert('请先选择一个玩家！');
                return;
            }
            
            if (currentPlayer.balance < amount) {
                alert(`${currentPlayer.name}余额不足！`);
                return;
            }
            
            // 记录玩家ID和金额
            state.bets[betType].push({
                playerId: currentPlayer.id,
                amount: amount,
                color: currentPlayer.color,
                chipColor: currentPlayer.chipColor
            });
            
            // 扣除该玩家积分
            currentPlayer.balance -= amount;
            document.getElementById(`player${currentPlayer.id}Balance`).textContent = currentPlayer.balance;
        }
    } else {
        // 移除最后一个筹码并退还积分
        if (state.gameMode === 'single') {
            const removedChip = state.bets[betType].pop();
            if (removedChip) {
                state.playerBalance += removedChip;
            }
        } else {
            const removedChip = state.bets[betType].pop();
            if (removedChip) {
                const player = state.players.find(p => p.id === removedChip.playerId);
                if (player) {
                    player.balance += removedChip.amount;
                    document.getElementById(`player${player.id}Balance`).textContent = player.balance;
                }
            }
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
        if (state.gameMode === 'single') {
            // 单人模式：退还所有筹码的积分
            const totalBet = state.bets[betType].reduce((sum, chip) => sum + chip, 0);
            state.playerBalance += totalBet;
        } else {
            // 多人模式：退还每个玩家的筹码
            state.bets[betType].forEach(chipData => {
                const player = state.players.find(p => p.id === chipData.playerId);
                if (player) {
                    player.balance += chipData.amount;
                    document.getElementById(`player${player.id}Balance`).textContent = player.balance;
                }
            });
        }
        
        delete state.bets[betType];
        updateBetDisplay();
        updateDisplay();  // 更新余额显示
        saveState();
    }
}

// 清除所有下注
function clearAllBets() {
    if (state.gameMode === 'single') {
        // 单人模式：退还所有筹码的积分
        let totalBet = 0;
        Object.keys(state.bets).forEach(betType => {
            const betAmount = state.bets[betType].reduce((sum, chip) => sum + chip, 0);
            totalBet += betAmount;
        });
        state.playerBalance += totalBet;
    } else {
        // 多人模式：退还每个玩家的筹码
        Object.keys(state.bets).forEach(betType => {
            state.bets[betType].forEach(chipData => {
                const player = state.players.find(p => p.id === chipData.playerId);
                if (player) {
                    player.balance += chipData.amount;
                    document.getElementById(`player${player.id}Balance`).textContent = player.balance;
                }
            });
        });
    }
    
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
            
            if (state.gameMode === 'single') {
                // 单人模式：显示筹码面值
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
                // 多人模式：按玩家分组显示
                const playerGroups = {};
                chips.forEach(chipData => {
                    if (!playerGroups[chipData.playerId]) {
                        playerGroups[chipData.playerId] = {
                            chips: [],
                            total: 0,
                            color: chipData.color,
                            chipColor: chipData.chipColor
                        };
                    }
                    playerGroups[chipData.playerId].chips.push(chipData.amount);
                    playerGroups[chipData.playerId].total += chipData.amount;
                });
                
                // 为每个玩家显示筹码（最多显示3个筹码）
                Object.values(playerGroups).forEach(group => {
                    const displayPlayerChips = group.chips.slice(-3); // 每个玩家最多显示3个筹码
                    
                    displayPlayerChips.forEach(amount => {
                        const chip = document.createElement('div');
                        chip.className = 'chip-item';
                        chip.textContent = amount >= 1000 ? '1K' : amount;
                        chip.style.background = `radial-gradient(circle, ${group.color}, ${group.chipColor})`;
                        chipStack.appendChild(chip);
                    });
                    
                    // 显示该玩家的总额
                    const totalDiv = document.createElement('div');
                    totalDiv.className = 'chip-total';
                    totalDiv.textContent = formatChipAmount(group.total);
                    totalDiv.style.background = '#000';
                    totalDiv.style.borderColor = group.color;
                    totalDiv.style.color = group.color;
                    chipStack.appendChild(totalDiv);
                });
            }
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
    if (state.gameMode === 'single') {
        calculateSingleModeWinnings(dice, total, isTriple);
    } else {
        calculateMultiModeWinnings(dice, total, isTriple);
    }
}

// 单人模式结算
function calculateSingleModeWinnings(dice, total, isTriple) {
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

// 多人模式结算
function calculateMultiModeWinnings(dice, total, isTriple) {
    let bankerWinnings = 0;
    const playerWinnings = {}; // { playerId: winAmount }
    
    // 初始化每个玩家的输赢
    state.players.forEach(player => {
        playerWinnings[player.id] = 0;
    });
    
    // 遍历所有押注
    Object.keys(state.bets).forEach(betKey => {
        const betChips = state.bets[betKey];
        if (!betChips || betChips.length === 0) return;
        
        // 获取赔率
        const betBox = document.querySelector(`[data-bet="${betKey}"]`);
        if (!betBox) return;
        const odds = parseFloat(betBox.dataset.odds) || 1;
        
        // 判断是否中奖
        const isWinning = checkWinning(betKey, dice, total, isTriple);
        
        // 遍历每个筹码
        betChips.forEach(chipData => {
            const betAmount = chipData.amount;
            
            if (isWinning) {
                // 中奖：玩家赢得 本金 + 奖金
                playerWinnings[chipData.playerId] += betAmount + (betAmount * odds);
                bankerWinnings -= betAmount * odds;
            } else {
                // 未中奖：庄家赢得押注金额
                bankerWinnings += betAmount;
            }
        });
    });
    
    // 延迟更新余额，等待押注区闪烁结束（10秒后）
    setTimeout(() => {
        // 更新庄家余额并触发动画
        if (bankerWinnings !== 0) {
            state.bankerBalance += bankerWinnings;
            const bankerBalanceDisplay = document.getElementById('bankerBalance');
            if (bankerBalanceDisplay) {
                bankerBalanceDisplay.textContent = state.bankerBalance;
                
                // 触发闪烁效果（不管增加还是减少）
                bankerBalanceDisplay.classList.add('flash-increase');
                setTimeout(() => {
                    bankerBalanceDisplay.classList.remove('flash-increase');
                }, 800);
            }
        }
        
        // 更新每个玩家的余额
        state.players.forEach(player => {
            const winAmount = playerWinnings[player.id];
            if (winAmount !== 0) {
                player.balance += winAmount;
                
                const balanceDisplay = document.getElementById(`player${player.id}Balance`);
                if (balanceDisplay) {
                    balanceDisplay.textContent = player.balance;
                    
                    // 触发闪烁效果（不管增加还是减少）
                    balanceDisplay.classList.add('flash-increase');
                    setTimeout(() => {
                        balanceDisplay.classList.remove('flash-increase');
                    }, 800);
                }
            }
        });
        
        // 庄家余额闪烁
        if (bankerWinnings > 0) {
            const bankerDisplay = document.getElementById('bankerBalance');
            if (bankerDisplay) {
                bankerDisplay.textContent = state.bankerBalance;
                bankerDisplay.classList.add('flash-increase');
                setTimeout(() => {
                    bankerDisplay.classList.remove('flash-increase');
                }, 800);
            }
        } else {
            document.getElementById('bankerBalance').textContent = state.bankerBalance;
        }
        
        updateDisplay();
        saveState();
    }, 10000); // 等待10秒后再加积分
}

// 判断是否中奖（提取公共逻辑）
function checkWinning(betKey, dice, total, isTriple) {
    // 大小判断
    if (betKey === 'big' && !isTriple && total >= 11 && total <= 17) return true;
    if (betKey === 'small' && !isTriple && total >= 4 && total <= 10) return true;
    
    // 点数判断
    if (betKey.startsWith('total-')) {
        const targetTotal = parseInt(betKey.split('-')[1]);
        if (total === targetTotal) return true;
    }
    
    // 三围判断
    if (betKey.startsWith('triple-')) {
        const targetNum = parseInt(betKey.split('-')[1]);
        if (isTriple && dice[0] === targetNum) return true;
    }
    
    // 全围判断
    if (betKey === 'any-triple' && isTriple) return true;
    
    // 单骰判断
    if (betKey.startsWith('single-')) {
        const targetNum = parseInt(betKey.split('-')[1]);
        const count = dice.filter(d => d === targetNum).length;
        if (count > 0) return true;
    }
    
    // 双骰组合判断
    if (betKey.startsWith('double-')) {
        const [_, num1, num2] = betKey.split('-').map(Number);
        const sortedDice = [...dice].sort((a, b) => a - b);
        for (let i = 0; i < sortedDice.length; i++) {
            for (let j = i + 1; j < sortedDice.length; j++) {
                if ((sortedDice[i] === num1 && sortedDice[j] === num2) ||
                    (sortedDice[i] === num2 && sortedDice[j] === num1)) {
                    return true;
                }
            }
        }
    }
    
    // 双围判断
    if (betKey.startsWith('pair-')) {
        const targetNum = parseInt(betKey.split('-')[1]);
        const count = dice.filter(d => d === targetNum).length;
        if (count >= 2) return true;
    }
    
    return false;
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
    // 更新单人模式的庄闲余额（只在单人模式显示时更新）
    if (state.gameMode === 'single') {
        const bankerEl = document.getElementById('bankerBalance');
        const playerEl = document.getElementById('playerBalance');
        if (bankerEl) bankerEl.textContent = state.bankerBalance;
        if (playerEl) playerEl.textContent = state.playerBalance;
    } else {
        // 多人模式：更新每个玩家的余额
        const bankerEl = document.getElementById('bankerBalance');
        if (bankerEl) bankerEl.textContent = state.bankerBalance;
        
        state.players.forEach(player => {
            const playerBalanceEl = document.getElementById(`player${player.id}Balance`);
            if (playerBalanceEl) {
                playerBalanceEl.textContent = player.balance;
            }
        });
    }
    
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
        try {
            const loaded = JSON.parse(saved);
            state.bankerBalance = loaded.bankerBalance || 500;
            state.playerBalance = loaded.playerBalance || 500;
            state.history = Array.isArray(loaded.history) ? loaded.history : [];
            state.currentChip = loaded.currentChip || 50;
            
            // 加载游戏模式
            state.gameMode = loaded.gameMode || 'single';
            state.playerCount = loaded.playerCount || 1;
            
            // 确保 players 是一个数组
            if (Array.isArray(loaded.players)) {
                state.players = loaded.players.filter(p => p && typeof p === 'object');
            } else {
                state.players = [];
            }
            
            state.currentPlayerId = loaded.currentPlayerId || (state.players.length > 0 ? state.players[0].id : 1);
            
            // 如果是多人模式但没有玩家数据，初始化
            if (state.gameMode === 'multi' && state.players.length === 0) {
                initializeMultiPlayers(state.playerCount);
            }
            
            // 确保 bets 格式正确（数组格式）
            state.bets = {};
            if (loaded.bets && typeof loaded.bets === 'object') {
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
        } catch (e) {
            console.error('Error loading state:', e);
            // 清除损坏的数据
            localStorage.removeItem('sicBoState');
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
    
    // 初始化多人模式玩家数据
    initializeMultiPlayers(tempPlayerCount);
    
    // 更新图标
    const modeIcon = document.getElementById('modeIcon');
    modeIcon.textContent = '👥';
    
    // 切换界面显示
    switchToMultiMode();
    
    closeModeModal();
    saveState();
}

// 初始化多人模式玩家数据
function initializeMultiPlayers(count) {
    state.players = [];
    const playerCount = Math.min(count, PLAYER_COLORS.length); // 确保不超过颜色配置数量
    
    for (let i = 0; i < playerCount; i++) {
        const colorConfig = PLAYER_COLORS[i];
        if (!colorConfig) {
            console.error(`No color config for player ${i + 1}`);
            continue;
        }
        
        state.players.push({
            id: colorConfig.id,
            name: colorConfig.name,
            balance: 500,
            color: colorConfig.color,
            chipColor: colorConfig.chipColor,
            lightColor: colorConfig.lightColor,
            currentChip: 50
        });
    }
    
    if (state.players.length > 0) {
        state.currentPlayerId = state.players[0].id; // 默认选中第一个玩家
    }
    state.bets = {}; // 清空押注
}

// 切换到多人模式界面
function switchToMultiMode() {
    // 隐藏单人模式元素
    document.querySelectorAll('.single-mode-section').forEach(el => {
        el.style.display = 'none';
    });
    
    // 显示多人模式元素
    const multiSection = document.getElementById('multiPlayersSection');
    multiSection.style.display = 'flex';
    
    // 生成玩家筹码区域UI
    renderMultiPlayersUI();
    
    // 更新显示
    updateDisplay();
}

// 渲染多人模式玩家UI
function renderMultiPlayersUI() {
    const container = document.getElementById('multiPlayersSection');
    if (!container) {
        console.error('multiPlayersSection container not found!');
        return;
    }
    container.innerHTML = '';
    
    if (!state.players || state.players.length === 0) {
        console.error('No players data!');
        return;
    }
    
    state.players.forEach(player => {
        const row = document.createElement('div');
        row.className = 'player-chip-row';
        row.dataset.playerId = player.id;
        row.style.color = player.lightColor;
        
        if (player.id === state.currentPlayerId) {
            row.classList.add('active');
        }
        
        row.innerHTML = `
            <div class="player-info">
                <div class="player-color-indicator" style="background: ${player.color};"></div>
                <span class="player-name">${player.name}</span>
            </div>
            <div class="player-balance" id="player${player.id}Balance">${player.balance}</div>
            <div class="player-chip-selector" id="player${player.id}Chips">
                ${[10, 30, 50, 100, 300, 500].map(value => `
                    <div class="chip ${value === player.currentChip ? 'selected' : ''}" 
                         data-value="${value}"
                         data-player-id="${player.id}"
                         onclick="selectPlayerChip(${player.id}, ${value})"
                         style="background: radial-gradient(circle at 30% 30%, ${player.lightColor}, ${player.chipColor});">
                        ${value}
                    </div>
                `).join('')}
            </div>
            <div class="player-controls">
                <button class="player-control-btn" onclick="adjustPlayerBalance(${player.id}, -100)">-100</button>
                <button class="player-control-btn" onclick="adjustPlayerBalance(${player.id}, 100)">+100</button>
                <button class="player-control-btn" onclick="resetPlayerBalance(${player.id})">重置</button>
            </div>
        `;
        
        // 点击整行选中该玩家
        row.addEventListener('click', (e) => {
            // 如果点击的是筹码或按钮，不触发行选择
            if (!e.target.classList.contains('chip') && 
                !e.target.classList.contains('player-control-btn')) {
                selectPlayer(player.id);
            }
        });
        
        container.appendChild(row);
    });
}

// 选择玩家
function selectPlayer(playerId) {
    state.currentPlayerId = playerId;
    
    // 更新UI
    document.querySelectorAll('.player-chip-row').forEach(row => {
        if (parseInt(row.dataset.playerId) === playerId) {
            row.classList.add('active');
        } else {
            row.classList.remove('active');
        }
    });
}

// 选择玩家的筹码
function selectPlayerChip(playerId, chipValue) {
    const player = state.players.find(p => p.id === playerId);
    if (player) {
        player.currentChip = chipValue;
        
        // 自动选中该玩家
        selectPlayer(playerId);
        
        // 更新该玩家的筹码选择UI
        const chipSelector = document.getElementById(`player${playerId}Chips`);
        chipSelector.querySelectorAll('.chip').forEach(chip => {
            if (parseInt(chip.dataset.value) === chipValue) {
                chip.classList.add('selected');
            } else {
                chip.classList.remove('selected');
            }
        });
        
        saveState();
    }
}

// 调整玩家余额
function adjustPlayerBalance(playerId, amount) {
    const player = state.players.find(p => p.id === playerId);
    if (player) {
        player.balance = Math.max(0, player.balance + amount);
        
        // 更新显示
        document.getElementById(`player${playerId}Balance`).textContent = player.balance;
        
        // 触发闪烁效果
        if (amount > 0) {
            const displayElement = document.getElementById(`player${playerId}Balance`);
            displayElement.classList.add('flash-increase');
            setTimeout(() => {
                displayElement.classList.remove('flash-increase');
            }, 800);
        }
        
        saveState();
        checkGameOver();
    }
}

// 重置玩家余额
function resetPlayerBalance(playerId) {
    const player = state.players.find(p => p.id === playerId);
    if (player) {
        player.balance = 500;
        document.getElementById(`player${playerId}Balance`).textContent = 500;
        saveState();
    }
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
    
    // 如果是多人模式，恢复界面
    if (state.gameMode === 'multi' && state.players && state.players.length > 0) {
        switchToMultiMode();
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
