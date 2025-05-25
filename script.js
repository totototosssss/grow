document.addEventListener('DOMContentLoaded', () => {
    // Game State
    let gameState = {
        turn: 1,
        maxTurns: 15,
        knowledge: 10,
        stress: 0,     // Max 100
        energy: 100,   // Max 100
        money: 1000,
        shiroImage: 'shiro.png',
        shiroHappyImage: 'shiro_happy.png', // 用意があれば
        shiroSadImage: 'shiro_sad.png',     // 用意があれば
        logMessage: 'しろちゃんを育成しよう！<br>新しい一日が始まったよ。'
    };

    const initialGameState = JSON.parse(JSON.stringify(gameState)); // For restarting

    // UI Elements
    const turnDisplay = document.getElementById('turn-display');
    const knowledgeDisplay = document.getElementById('knowledge-display');
    const stressDisplay = document.getElementById('stress-display');
    const energyDisplay = document.getElementById('energy-display');
    const moneyDisplay = document.getElementById('money-display');
    const shiroImageElem = document.getElementById('shiro-image');
    const logMessageDisplay = document.getElementById('log-message');
    const actionButtons = document.querySelectorAll('.actions-card button');

    // Modal Elements
    const examResultModal = document.getElementById('exam-result-modal');
    const modalCloseButton = document.querySelector('.modal .close-button');
    const examResultTitle = document.getElementById('exam-result-title');
    const examResultMesssage = document.getElementById('exam-result-message');
    const finalScoreDisplay = document.getElementById('final-score-display');
    const restartGameButton = document.getElementById('restart-game-button');
    const examShiroImageElem = document.getElementById('exam-shiro-image');

    // --- UTILITY FUNCTIONS ---
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function formatMessage(text, type = "") {
        if (type === "positive") return `<strong class="positive">${text}</strong>`;
        if (type === "negative") return `<strong class="negative">${text}</strong>`;
        return text;
    }

    function updateUI() {
        // Clamp values before display
        gameState.stress = Math.max(0, Math.min(100, gameState.stress));
        gameState.energy = Math.max(0, Math.min(100, gameState.energy));
        gameState.knowledge = Math.max(0, gameState.knowledge);
        gameState.money = Math.max(0, gameState.money);

        turnDisplay.textContent = `${gameState.turn}`;
        knowledgeDisplay.textContent = gameState.knowledge;
        stressDisplay.textContent = gameState.stress;
        energyDisplay.textContent = gameState.energy;
        moneyDisplay.textContent = gameState.money;
        shiroImageElem.src = gameState.shiroImage;
        logMessageDisplay.innerHTML = gameState.logMessage;

        // Visual feedback for parameters (optional, can be enhanced)
        knowledgeDisplay.parentNode.style.borderColor = gameState.knowledge > 50 ? 'var(--success-color)' : '#dee2e6';
        stressDisplay.parentNode.style.borderColor = gameState.stress > 70 ? 'var(--danger-color)' : (gameState.stress < 30 ? 'var(--success-color)' : '#dee2e6');
        energyDisplay.parentNode.style.borderColor = gameState.energy < 30 ? 'var(--danger-color)' : (gameState.energy > 70 ? 'var(--success-color)' : '#dee2e6');
    }

    // --- ACTION FUNCTIONS ---
    function study() {
        let message = "<strong>勉強をした。</strong><br>";
        if (gameState.energy < 20) {
            message += formatMessage("体力がなくてあまり集中できなかった… ", "negative");
            const knowledgeGain = getRandomInt(1, 4);
            gameState.knowledge += knowledgeGain;
            message += `知識が ${formatMessage(knowledgeGain, "positive")} 上がった。`;
            gameState.energy = Math.max(0, gameState.energy - 10);
            gameState.stress += getRandomInt(2, 6);
        } else {
            const knowledgeGain = getRandomInt(7, 18);
            message += `知識が ${formatMessage(knowledgeGain, "positive")} 上がった！`;
            gameState.knowledge += knowledgeGain;
            gameState.energy -= getRandomInt(15, 25);
            gameState.stress += getRandomInt(3, 8);
        }
        if (gameState.stress > 80) message += `<br>${formatMessage("ストレスが高いようだ...", "negative")}`;
        gameState.logMessage = message;
    }

    function insult() {
        let message = "<strong>人に暴言を浴びせた。</strong><br>";
        const stressRelief = getRandomInt(15, 30);
        message += `ストレスが ${formatMessage(stressRelief, "positive")} 下がった気がする。`;
        gameState.stress -= stressRelief;
        gameState.energy -= getRandomInt(5, 10);
        // gameState.reputation -= getRandomInt(5, 10); // 将来的に評判パラメータを追加する場合
        // message += `<br>しかし、${formatMessage("評判は下がったかもしれない...", "negative")}`;
        gameState.logMessage = message;
    }

    function pachinko() {
        let message = "<strong>パチンコに行った。</strong><br>";
        if (gameState.money < 500) {
            message += formatMessage("お金が足りなくて遊べなかった…", "negative");
        } else {
            gameState.money -= 500;
            message += `500円使った。`;
            gameState.energy -= getRandomInt(10, 20);
            gameState.stress += getRandomInt(5, 15); // Playing itself can be stressful

            const winChance = 0.4; // 40%
            if (Math.random() < winChance) {
                const winnings = getRandomInt(600, 2500);
                gameState.money += winnings;
                message += `<br>大当たり！ ${formatMessage(winnings + "円", "positive")} 勝った！`;
                gameState.stress -= getRandomInt(10, 30);
            } else {
                message += `<br>${formatMessage("残念、負けてしまった…", "negative")}`;
                gameState.stress += getRandomInt(10, 25);
            }
        }
        gameState.logMessage = message;
    }

    function sleep() {
        let message = "<strong>ぐっすり寝た。</strong><br>";
        const energyGain = getRandomInt(40, 70);
        const stressChange = getRandomInt(-15, -5); // Sleep usually reduces stress

        gameState.energy += energyGain;
        gameState.stress += stressChange;

        message += `体力が ${formatMessage(energyGain, "positive")} 回復し、ストレスが ${formatMessage(Math.abs(stressChange), "positive")} 減った。`;
        if (gameState.energy > 100) gameState.energy = 100;
        if (gameState.stress < 0) gameState.stress = 0;

        gameState.logMessage = message;
    }

    function playGameAction() {
        let message = "<strong>ゲームで遊んだ。</strong><br>";
        if (gameState.energy < 15) {
            message += formatMessage("疲れていてあまり楽しめなかった。", "negative");
            gameState.energy = Math.max(0, gameState.energy - 5);
        } else {
            const stressRelief = getRandomInt(15, 30);
            const knowledgeLoss = getRandomInt(1, 4);
            message += `ストレスが ${formatMessage(stressRelief, "positive")} 解消された！`;
            gameState.stress -= stressRelief;
            gameState.energy -= getRandomInt(10, 20);
            if (gameState.knowledge >= knowledgeLoss) {
                 gameState.knowledge -= knowledgeLoss;
                 message += `<br>少し勉強内容を忘れたかも (知識 ${formatMessage("-" + knowledgeLoss, "negative")})。`;
            }
        }
        gameState.logMessage = message;
    }

    function endTurn() {
        gameState.turn++;
        if (gameState.turn > gameState.maxTurns) {
            triggerExam();
        } else {
            gameState.logMessage += `<br><br>次のターンへ。頑張ろう！ (${gameState.maxTurns - gameState.turn + 1}ターン残っています)`;
            updateUI();
            enableActions();
        }
    }

    function triggerExam() {
        disableActions();
        logMessageDisplay.innerHTML = "<strong>試験が始まりました...</strong><br>結果を計算中です。";

        let finalScore = gameState.knowledge;
        finalScore += Math.floor(gameState.energy / 10); // Energy bonus
        finalScore -= Math.floor(gameState.stress / 5);   // Stress penalty
        finalScore = Math.max(0, finalScore);

        const requiredScoreToPass = 80; // 合格に必要なスコア（調整可能）
        let successProbability = 0.1; // Base probability

        //知識に基づく確率計算（例）
        if (gameState.knowledge < 40) successProbability = 0.15;
        else if (gameState.knowledge < 60) successProbability = 0.40;
        else if (gameState.knowledge < 80) successProbability = 0.60;
        else if (gameState.knowledge < 100) successProbability = 0.75;
        else if (gameState.knowledge < 130) successProbability = 0.85;
        else if (gameState.knowledge < 160) successProbability = 0.90;
        else successProbability = 0.95;

        // ストレスと体力による確率補正
        if (gameState.stress > 75) successProbability *= 0.7;
        if (gameState.stress > 90) successProbability *= 0.5;
        if (gameState.energy < 25) successProbability *= 0.8;
        if (gameState.energy < 10) successProbability *= 0.6;

        successProbability = Math.max(0.05, Math.min(0.98, successProbability)); // 確率を5%～98%の範囲に収める

        const examRoll = Math.random();
        let resultMessageText = "";
        let resultTitleText = "";
        let resultShiroImage = gameState.shiroImage; // Default to current

        if (examRoll < successProbability && finalScore >= requiredScoreToPass * 0.9) { //最終スコアも考慮
            resultTitleText = "🎉 合格！ 🎉";
            resultMessageText = `<strong>おめでとうございます！</strong><br>しろちゃんは見事予備試験に合格しました！<br>努力の成果が出ましたね！`;
            examShiroImageElem.src = gameState.shiroHappyImage || gameState.shiroImage; // Happy image if available
            examResultTitle.style.color = 'var(--success-color)';
        } else {
            resultTitleText = "😢 不合格 😢";
            resultMessageText = `<strong>残念ながら、しろちゃんは予備試験に不合格でした。</strong><br>知識 (${gameState.knowledge})、体力 (${gameState.energy})、ストレス (${gameState.stress})のバランスを見直して、もう一度挑戦しましょう。`;
            examShiroImageElem.src = gameState.shiroSadImage || gameState.shiroImage; // Sad image if available
            examResultTitle.style.color = 'var(--danger-color)';
        }

        examResultTitle.textContent = resultTitleText;
        examResultMesssage.innerHTML = resultMessageText;
        finalScoreDisplay.innerHTML = `最終的な評価 (内部スコア): ${finalScore}<br>
                                    (知識: ${gameState.knowledge}, 体力ボーナス: +${Math.floor(gameState.energy / 10)}, ストレス減点: -${Math.floor(gameState.stress / 5)})<br>
                                    合格確率: ${Math.round(successProbability * 100)}% (サイコロ: ${Math.round(examRoll*100)}%)`;

        examResultModal.classList.add('show');
    }

    function handleAction(actionType) {
        disableActions();
        gameState.logMessage = ""; // Clear previous log

        switch (actionType) {
            case 'study': study(); break;
            case 'insult': insult(); break;
            case 'pachinko': pachinko(); break;
            case 'sleep': sleep(); break;
            case 'play_game': playGameAction(); break;
        }
        updateUI(); // Show intermediate changes from action

        // Simulate action time and allow user to read log before next turn
        setTimeout(() => {
            endTurn();
        }, 1200); // 1.2 second delay
    }

    function disableActions() {
        actionButtons.forEach(button => button.disabled = true);
    }
    function enableActions() {
        if (gameState.turn <= gameState.maxTurns) {
             actionButtons.forEach(button => button.disabled = false);
        }
    }

    function resetGame() {
        gameState = JSON.parse(JSON.stringify(initialGameState));
        shiroImageElem.src = gameState.shiroImage;
        examResultModal.classList.remove('show');
        logMessageDisplay.innerHTML = "新しい挑戦が始まります！<br>今度こそ合格を目指そう！";
        updateUI();
        enableActions();
    }

    // Event Listeners
    actionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const action = button.getAttribute('data-action');
            handleAction(action);
        });
    });

    restartGameButton.addEventListener('click', resetGame);
    modalCloseButton.addEventListener('click', () => {
        examResultModal.classList.remove('show');
        // Optionally, if game ended and modal closed without restart, keep actions disabled or redirect.
        // For now, just closes modal. Restart button is the primary way to continue.
        if(gameState.turn > gameState.maxTurns) {
            logMessageDisplay.innerHTML = "試験お疲れ様でした。再度挑戦する場合は「もう一度挑戦する」ボタンを押してください。";
        }
    });

    // Close modal if backdrop is clicked
    examResultModal.addEventListener('click', (event) => {
        if (event.target === examResultModal) {
            examResultModal.classList.remove('show');
            if(gameState.turn > gameState.maxTurns) {
                 logMessageDisplay.innerHTML = "試験お疲れ様でした。再度挑戦する場合は「もう一度挑戦する」ボタンを押してください。";
            }
        }
    });


    // Initial UI setup
    updateUI();
    enableActions();
});
