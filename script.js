document.addEventListener('DOMContentLoaded', () => {
    const MAX_DAYS = 15;
    const INITIAL_STATE = {
        day: 1,
        knowledge: 3, stress: 25, energy: 50, money: 600,
        focus: 15, mental: 25, luck: 5, rhythm: 15,
        shiroImage: 'shiro.png',
        shiroHappyImage: 'shiro.png',
        shiroSadImage: 'shiro.png',
        logMessage: 'しろちゃんの過酷な毎日が始まる…。目標達成は絶望的かもしれない。',
        inventory: [],
        permanentBuffs: {},
        activeEffects: {}
    };

    const ITEMS = {
        'energy_drink_ex': {
            name: '栄養ドリンクEX', price: 700, type: 'consumable_active',
            description: '使用すると一時的に体力+20、集中力+8。ただし、ストレスも少し増加(+10)。',
            use: (gameState, logHelper) => {
                gameState.energy += 20; logHelper.add(`体力が${formatChange(20)}。`);
                gameState.focus += 8; logHelper.add(`集中力が${formatChange(8)}。`);
                gameState.stress += 10; logHelper.add(`代償としてストレスが${formatChange(10, "negative")}。`);
                return true;
            }
        },
        'advanced_textbook': {
            name: '最新参考書セット', price: 7000, type: 'permanent',
            description: '所有中、勉強による知識獲得量が常に8%上昇する。高価だが価値はあるか…？',
            permanentEffect: { knowledgeBoostMultiplier: 0.08 }
        },
        'relax_music_data': {
            name: 'ヒーリング音楽データ', price: 900, type: 'consumable_active',
            description: '使用すると音楽の力でストレス-20、メンタル+8。',
            use: (gameState, logHelper) => {
                gameState.stress -= 20; logHelper.add(`ストレスが${formatChange(-20)}。`);
                gameState.mental += 8; logHelper.add(`メンタルが${formatChange(8)}。`);
                return true;
            }
        },
        'time_management_seminar': {
            name: '時間管理セミナー受講券', price: 3500, type: 'permanent',
            description: '受講後、生活リズムが改善しやすくなり(+10%ボーナス)、行動時の体力消費が3%軽減。',
            permanentEffect: { rhythmImprovementBoost: 1.1, energyConsumptionModifier: -0.03 }
        },
        'small_lucky_charm': {
            name: '小さな交通安全お守り', price: 1200, type: 'permanent',
            description: '所有中、運がわずかに上昇する(+5)。本当に気休めかもしれない。',
            permanentEffect: { luck: 5 }
        }
    };

    const RANDOM_EVENTS = [
        {
            name: "オプチャで大炎上",
            message: "不用意な発言がオプチャで拡散し大炎上！精神的に大ダメージ…もう何もしたくない。",
            effect: (gs) => {
                gs.knowledge = Math.round(gs.knowledge * 0.7); gs.stress = Math.min(100, gs.stress + 40);
                gs.energy = Math.round(gs.energy * 0.6); gs.focus = Math.round(gs.focus * 0.5);
                gs.mental = Math.round(gs.mental * 0.4); gs.luck = Math.max(0, gs.luck - 15);
                gs.rhythm = Math.round(gs.rhythm * 0.6);
            }
        },
        {
            name: "にゃまからの暴言",
            message: "突然、にゃまが現れて心無い言葉を浴びせられた…心が折れそうだ。",
            effect: (gs) => {
                gs.knowledge = Math.round(gs.knowledge * 0.5); gs.stress = Math.min(100, gs.stress + 30);
                gs.energy = Math.round(gs.energy * 0.5); gs.focus = Math.round(gs.focus * 0.5);
                gs.mental = Math.round(gs.mental * 0.5); gs.luck = Math.max(0, gs.luck - 10);
                gs.rhythm = Math.round(gs.rhythm * 0.7);
            }
        },
        {
            name: "にゃまからの暴言",
            message: "突然、にゃまが現れて心無い言葉を浴びせられた…心が折れそうだ。",
            effect: (gs) => {
                gs.knowledge = Math.round(gs.knowledge * 0.5); gs.stress = Math.min(100, gs.stress + 30);
                gs.energy = Math.round(gs.energy * 0.5); gs.focus = Math.round(gs.focus * 0.5);
                gs.mental = Math.round(gs.mental * 0.5); gs.luck = Math.max(0, gs.luck - 10);
                gs.rhythm = Math.round(gs.rhythm * 0.7);
            }
        },
        {
            name: "親に見られたくない場面",
            message: "自室で㊙️㊙️していたら、親に一番見られたくない場面を目撃されてしまった…最悪だ。",
            effect: (gs) => {
                gs.stress = Math.min(100, gs.stress + 40); gs.energy = Math.round(gs.energy * 0.6);
                gs.focus = Math.round(gs.focus * 0.6); gs.mental = Math.round(gs.mental * 0.5);
                gs.rhythm = Math.max(0, gs.rhythm - 20);
            }
        },
        {
            name: "親に将来を心配される",
            message: "親から「28歳にもなって将来どうするの？」と真剣に心配されてしまった…答えに窮し、気分が重い。",
            effect: (gs) => {
                gs.stress = Math.min(100, gs.stress + 25); gs.mental = Math.max(0, gs.mental - 15);
                gs.focus = Math.max(0, gs.focus - 10);
            }
        },
        {
            name: "体調不良",
            message: "原因不明の体調不良に見舞われた。今日は何もできそうにない…。",
            effect: (gs) => {
                gs.energy = Math.max(5, gs.energy - 40); gs.focus = Math.max(5, gs.focus - 30); gs.stress = Math.min(100, gs.stress + 20);
                gs.activeEffects['bad_condition'] = { duration: 3, displayName: '体調不良', value: 0.5 };
            }
        },
        {
            name: "大谷選手の活躍",
            message: "ニュースで大谷選手が特大ホームランを打ったのを見た！なんだか元気が出てきた！勉強しなきゃ..",
            effect: (gs) => {
                gs.knowledge = Math.round(gs.knowledge * 1.1); gs.stress = Math.max(0, gs.stress - 10);
                gs.energy = Math.round(gs.energy * 1.2); gs.focus = Math.round(gs.focus * 1.2);
                gs.mental = Math.round(gs.mental * 1.2); gs.luck = Math.min(100, gs.luck + 15);
            }
        },
    ];
    const RANDOM_EVENT_CHANCE = 0.12;

    let gameState = JSON.parse(JSON.stringify(INITIAL_STATE));

    const dayDisplay = document.getElementById('day-display');
    const knowledgeDisplay = document.getElementById('knowledge-display');
    const stressDisplay = document.getElementById('stress-display');
    const energyDisplay = document.getElementById('energy-display');
    const moneyDisplayHeaderValue = document.getElementById('money-display-header-value');
    const focusDisplay = document.getElementById('focus-display');
    const mentalDisplay = document.getElementById('mental-display');
    const luckDisplay = document.getElementById('luck-display');
    const rhythmDisplay = document.getElementById('rhythm-display');

    const shiroImageElem = document.getElementById('shiro-image');
    const shiroThoughtBubble = document.getElementById('shiro-thought-bubble');
    const logMessageDisplay = document.getElementById('log-message');
    const actionButtons = document.querySelectorAll('.action-buttons-list button');
    const inventoryListElem = document.getElementById('inventory-list');

    const eventNotificationArea = document.getElementById('event-notification');
    const eventMessageElem = document.getElementById('event-message');

    const examResultModal = document.getElementById('exam-result-modal');
    const examCalcMsg = document.getElementById('exam-calculation-message');
    const examActualResult = document.getElementById('exam-actual-result');
    const examResultTitle = document.getElementById('exam-result-title');
    const examResultMesssage = document.getElementById('exam-result-message');
    const restartGameButton = document.getElementById('restart-game-button');
    const examShiroImageElem = document.getElementById('exam-shiro-image');

    const itemShopModal = document.getElementById('item-shop-modal');
    const openShopButton = document.getElementById('open-shop-button');
    const shopMoneyDisplay = document.getElementById('shop-money-display');
    const itemShopListElem = document.getElementById('item-shop-list');
    const modalCloseButtons = document.querySelectorAll('.modal .close-button');

    const LogHelper = {
        logs: [],
        add: function(message) { this.logs.push(message); },
        addRaw: function(html) { this.logs.push(html); },
        clear: function() { this.logs = []; },
        publish: function(prepend = "") {
            gameState.logMessage = prepend + this.logs.join('<br>');
            this.clear();
        }
    };

    function getRandom(min, max) { return Math.random() * (max - min) + min; }
    function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

    function showThought(message, duration = 2000, type = 'neutral') {
        shiroThoughtBubble.textContent = message;
        shiroThoughtBubble.className = 'thought-bubble';
        shiroThoughtBubble.classList.add('show');
        if (type === 'success') shiroThoughtBubble.classList.add('success');
        else if (type === 'failure') shiroThoughtBubble.classList.add('failure');
        setTimeout(() => shiroThoughtBubble.classList.remove('show'), duration);
    }

    function flashParamValue(element, change) {
        element.classList.remove('param-value-increased', 'param-value-decreased');
        void element.offsetWidth;
        if (change > 0) element.classList.add('param-value-increased');
        else if (change < 0) element.classList.add('param-value-decreased');
    }
    function flashParamBackground(paramKey, type) {
        const paramElement = document.querySelector(`p[data-param="${paramKey}"]`);
        if (paramElement) {
            paramElement.classList.remove('flash-positive', 'flash-negative');
            void paramElement.offsetWidth;
            paramElement.classList.add(type === 'positive' ? 'flash-positive' : (type === 'negative' ? 'flash-negative' : ''));
            setTimeout(() => {
                 paramElement.classList.remove('flash-positive', 'flash-negative');
            }, 700);
        }
    }

    function updateUI() {
        Object.keys(gameState).forEach(key => {
            if (['knowledge', 'stress', 'energy', 'focus', 'mental', 'luck', 'rhythm'].includes(key)) {
                let maxVal = 100;
                if (key === 'knowledge') maxVal = 200;
                if (key === 'energy' && gameState.permanentBuffs.maxEnergyBoost) maxVal += gameState.permanentBuffs.maxEnergyBoost;
                gameState[key] = clamp(gameState[key], 0, maxVal);
            }
        });
        gameState.money = Math.max(0, gameState.money);

        dayDisplay.textContent = gameState.day;
        moneyDisplayHeaderValue.textContent = Math.round(gameState.money);

        const paramsToUpdate = {
            knowledge: knowledgeDisplay, stress: stressDisplay, energy: energyDisplay,
            focus: focusDisplay, mental: mentalDisplay, luck: luckDisplay, rhythm: rhythmDisplay
        };
        for (const key in paramsToUpdate) {
            const displayElement = paramsToUpdate[key];
            const currentValue = parseFloat(displayElement.textContent);
            const newValue = Math.round(gameState[key]);
            if (currentValue !== newValue && !isNaN(currentValue)) {
                flashParamValue(displayElement, newValue - currentValue);
                const paramDataKey = displayElement.id.replace('-display', '');
                flashParamBackground(paramDataKey, (newValue - currentValue > 0) ? 'positive' : (newValue - currentValue < 0 ? 'negative' : ''));
            }
            displayElement.textContent = newValue;
        }

        shiroImageElem.src = gameState.shiroImage;
        logMessageDisplay.innerHTML = gameState.logMessage;
        logMessageDisplay.scrollTop = logMessageDisplay.scrollHeight;

        inventoryListElem.innerHTML = '';
        const activeItemsInInventory = gameState.inventory.filter(invItem => ITEMS[invItem.id]);
        let hasDisplayableItems = false;

        activeItemsInInventory.forEach(invItem => {
            const itemDef = ITEMS[invItem.id];
            if (!itemDef) return;

            hasDisplayableItems = true;
            const li = document.createElement('li');
            let itemHtml = `<span class="item-name-qty">${itemDef.name}`;
            if (itemDef.type === 'consumable_active') {
                itemHtml += ` <span class="item-quantity">(x${invItem.quantity})</span>`;
            } else if (itemDef.type === 'permanent') {
                itemHtml += ` <span class="item-quantity">(所持中)</span>`;
            }
            itemHtml += `</span>`;

            if (itemDef.type === 'consumable_active') {
                itemHtml += `<button class="use-item-button" data-item-id="${invItem.id}">使用</button>`;
            }
            li.innerHTML = itemHtml;
            inventoryListElem.appendChild(li);
        });

        if (!hasDisplayableItems) {
            inventoryListElem.innerHTML = '<li class="no-items">なし</li>';
        }

        document.querySelectorAll('.use-item-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const itemId = e.target.dataset.itemId;
                const itemElement = e.target.closest('li');
                useItem(itemId, itemElement);
            });
        });
    }

    function populateShop() {
        itemShopListElem.innerHTML = '';
        shopMoneyDisplay.textContent = Math.round(gameState.money);
        for (const id in ITEMS) {
            const item = ITEMS[id];
            const card = document.createElement('div');
            card.className = 'item-card';
            card.innerHTML = `
                <h4><i class="fas fa-star"></i> ${item.name}</h4>
                <p>${item.description}</p>
                <p class="item-price"><i class="fas fa-coins"></i> ${item.price}円</p>
                <button class="buy-item-button" data-item-id="${id}" ${gameState.money < item.price ? 'disabled' : ''}>
                    <i class="fas fa-shopping-cart"></i> 購入
                </button>
            `;
            itemShopListElem.appendChild(card);
        }
        document.querySelectorAll('.buy-item-button').forEach(button => {
            button.addEventListener('click', () => buyItem(button.dataset.itemId));
        });
    }

    function buyItem(itemId) {
        const itemDef = ITEMS[itemId];
        if (!itemDef || gameState.money < itemDef.price) {
            showThought(itemDef ? "お金が足りないようです…" : "そのような商品はありません。", 1800, 'failure');
            return;
        }
        if (itemDef.type === 'permanent' && gameState.inventory.find(invItem => invItem.id === itemId)) {
            showThought("そのアイテムは既に所有しています。", 1800, 'neutral');
            return;
        }

        gameState.money -= itemDef.price;
        LogHelper.clear();
        LogHelper.add(`--- アイテム購入 ---`);
        LogHelper.add(`${formatMessage(itemDef.name, "item")}を${itemDef.price}円で購入しました。`);

        if (itemDef.type === 'permanent') {
            if (itemDef.permanentEffect) {
                for (const effectKey in itemDef.permanentEffect) {
                    gameState.permanentBuffs[effectKey] = (gameState.permanentBuffs[effectKey] || 0) + itemDef.permanentEffect[effectKey];
                    if (effectKey === 'luck') gameState.luck += itemDef.permanentEffect.luck;
                }
                LogHelper.add(`${formatMessage(itemDef.name, "item")}の永続効果を得ました。`);
            }
            const existingItem = gameState.inventory.find(invItem => invItem.id === itemId);
            if (!existingItem) {
                gameState.inventory.push({ id: itemId, name: itemDef.name, quantity: 1 });
            }
        } else {
            const existingItem = gameState.inventory.find(invItem => invItem.id === itemId);
            if (existingItem) {
                existingItem.quantity++;
            } else {
                gameState.inventory.push({ id: itemId, name: itemDef.name, quantity: 1 });
            }
        }
        
        LogHelper.publish();
        showThought(`${itemDef.name}を手に入れました！`, 1800, 'success');
        updateUI();
        populateShop();
    }

    function useItem(itemId, itemElement) {
        const itemIndex = gameState.inventory.findIndex(invItem => invItem.id === itemId && invItem.quantity > 0);
        if (itemIndex === -1) {
            showThought("そのアイテムは持っていないか、もうありません。", 1800, 'failure');
            return;
        }

        const itemDef = ITEMS[itemId];
        if (!itemDef || itemDef.type !== 'consumable_active' || !itemDef.use) {
            showThought("このアイテムは使用できません。", 1800, 'failure');
            return;
        }
        if (gameState.energy < 10 && itemId !== 'energy_drink_ex') {
             showThought("体力が無さすぎてアイテムを使えません…", 2000, 'failure');
             return;
        }

        LogHelper.clear();
        LogHelper.add(`--- アイテム使用 ---`);
        const success = itemDef.use(gameState, LogHelper);

        if (success) {
            gameState.inventory[itemIndex].quantity--;
            if (gameState.inventory[itemIndex].quantity <= 0) {
                gameState.inventory.splice(itemIndex, 1);
            }
            if (itemElement) {
                itemElement.classList.add('item-used-flash');
                setTimeout(() => itemElement.classList.remove('item-used-flash'), 700);
            }
            showThought(`${itemDef.name}を使用しました！`, 1800, 'success');
        } else {
            LogHelper.add(`${formatMessage(itemDef.name, "item")}の使用に失敗しました…`);
            showThought("うまく使えませんでした…", 1800, 'failure');
        }
        
        LogHelper.publish();
        updateUI();
    }

    function applyEffects(effects, loggerCallback) {
        for (const param in effects) {
            const change = effects[param];
            const oldValue = gameState[param];
            gameState[param] += change;
            gameState[param] = clamp(gameState[param], 0, (param === 'knowledge' ? 200 : 100) + (param === 'energy' && gameState.permanentBuffs.maxEnergyBoost ? gameState.permanentBuffs.maxEnergyBoost : 0) );
            if(loggerCallback) loggerCallback(param, gameState[param] - oldValue);
        }
    }

    function paramName(paramKey) {
        const names = { knowledge: '知識', stress: 'ストレス', energy: '体力', money: 'お金', focus: '集中力', mental: 'メンタル', luck: '運', rhythm: '生活リズム' };
        return names[paramKey] || paramKey;
    }
    function formatChange(change, typeOverride = null) {
        const roundedChange = Math.round(change);
        let type = typeOverride;
        if (!type) type = roundedChange >= 0 ? "positive" : "negative";
        const sign = roundedChange >= 0 ? "+" : "";
        return `<strong class="${type}">${sign}${roundedChange}</strong>`;
    }
    function formatMessage(text, type = "") {
        if (type === "item") return `<strong class="item">${text}</strong>`;
        return `<strong class="${type}">${text}</strong>`;
    }
    
    function applyActiveEffectsEndOfDay() {
        let effectExpiredMessage = "";
        for (const effectKey in gameState.activeEffects) {
            gameState.activeEffects[effectKey].duration--;
            if (gameState.activeEffects[effectKey].duration <= 0) {
                effectExpiredMessage += `<br>${formatMessage(gameState.activeEffects[effectKey].displayName, "item")}の効果期間が終了しました。`;
                delete gameState.activeEffects[effectKey];
            }
        }
        if (effectExpiredMessage) LogHelper.addRaw(effectExpiredMessage);
    }

    function triggerRandomEvent() {
        if (Math.random() < RANDOM_EVENT_CHANCE) {
            const event = RANDOM_EVENTS[getRandomInt(0, RANDOM_EVENTS.length - 1)];
            eventMessageElem.innerHTML = `<strong>イベント発生！</strong> ${event.message}`;
            eventNotificationArea.style.display = 'block';
            event.effect(gameState);
            LogHelper.addRaw(`<hr><strong>ランダムイベント: ${event.name}</strong><br>${event.message}`);
            showThought(`「${event.name}」発生！`, 2800, 'neutral');
            setTimeout(() => {
                eventNotificationArea.style.display = 'none';
            }, 4500);
            return true;
        }
        eventNotificationArea.style.display = 'none';
        return false;
    }

    function calculateChange(base, positiveFactors = [], negativeFactors = [], baseMultiplier = 1.0) {
        let multiplier = baseMultiplier;
        if (gameState.permanentBuffs.energyConsumptionModifier && negativeFactors.some(f => f.paramNameForCost === 'energy')) {
            multiplier *= (1 + gameState.permanentBuffs.energyConsumptionModifier);
        }

        positiveFactors.forEach(f => multiplier *= (1 + f.value * (f.paramState / 100)));
        negativeFactors.forEach(f => multiplier *= (1 - f.value * (f.paramState / 100)));
        
        let finalChange = base * Math.max(0.01, multiplier);

        if (gameState.activeEffects.bad_condition && gameState.activeEffects.bad_condition.duration > 0 && (positiveFactors.length > 0 || base > 0) ) {
             finalChange *= gameState.activeEffects.bad_condition.value;
        }
        return finalChange;
    }

    function study() {
        LogHelper.add("<strong><i class='fas fa-pencil-alt'></i> 必死に勉強に取り組んだ。</strong>");
        let knowledgeGainBase = getRandom(2, 6);
        
        let knowledgeMultiplier = 1.0;
        if (gameState.permanentBuffs.knowledgeBoostMultiplier) {
            knowledgeMultiplier += gameState.permanentBuffs.knowledgeBoostMultiplier;
        }

        let kGain = calculateChange(knowledgeGainBase,
            [{paramState: gameState.focus, value: 0.75}, {paramState: gameState.rhythm, value: 0.32}],
            [{paramState: gameState.stress, value: 0.75}, {paramState: 100 - gameState.energy, value: 0.65}],
            knowledgeMultiplier
        );
        kGain = Math.max(0, Math.round(kGain));
        gameState.knowledge += kGain;
        LogHelper.add(kGain > 0 ? `知識が${formatChange(kGain)}。` : `ほとんど頭に入らなかった…。`);

        gameState.energy -= Math.round(calculateChange(25, [], [{paramState: gameState.rhythm, value: 0.4, paramNameForCost: 'energy'}]));
        gameState.stress += Math.round(calculateChange(12, [{paramState: 100 - gameState.mental, value: 0.55}]));
        gameState.focus -= getRandomInt(18, 28);
        gameState.mental -= getRandomInt(2,6);

        if(gameState.energy < 10) showThought("もう限界かもしれない…", 1800, 'failure');
        else if(gameState.focus < 10) showThought("何も考えられない…", 1800, 'failure');
    }

    function work() {
        LogHelper.add("<strong><i class='fas fa-cash-register'></i> 生きるためにアルバイトをした。</strong>");
        if (gameState.energy < 40) {
            LogHelper.add(formatMessage("疲労困憊で、ほとんど仕事にならなかった…", "negative"));
            showThought("体が…重い…", 1800, 'failure');
            gameState.money += getRandomInt(200, 500);
            gameState.energy -= getRandomInt(30, 40);
        } else {
            let earningsBase = getRandom(1000, 1800);
            let earnings = calculateChange(earningsBase, [{paramState: gameState.rhythm, value:0.15}, {paramState: gameState.focus, value:0.05}]);
            earnings = Math.round(earnings);

            gameState.money += earnings;
            LogHelper.add(`働いて ${formatMessage("+" + earnings, "positive")}円稼いだ。`);
            showThought("なんとか食いつなげる…", 1800, 'neutral');
        }
        gameState.energy -= Math.round(calculateChange(45, [], [{paramState:0, paramNameForCost:'energy'}])); // Base cost for energy
        gameState.stress += getRandomInt(10, 20);
        gameState.rhythm -= getRandomInt(4, 9);
        gameState.focus -= getRandomInt(8,14);
    }
    
    function playVideoGames() {
        LogHelper.add("<strong><i class='fas fa-gamepad'></i> 現実逃避してゲームに時間を費やした。</strong>");
        if (gameState.energy < 20) {
            LogHelper.add(formatMessage("疲れていてゲームを楽しむ気力もなかった…", "negative"));
            gameState.energy -= 10;
            showThought("ただただ虚しい…", 1800, 'failure');
        } else {
            let stressRelief = getRandom(12, 22);
            stressRelief *= (1 + (gameState.mental / 250));

            gameState.stress -= Math.round(stressRelief);
            LogHelper.add(`ストレスが${formatChange(-Math.round(stressRelief))}！少しはマシになったか…。`);

            gameState.energy -= Math.round(calculateChange(28, [], [{paramState:0, paramNameForCost:'energy'}]));
            gameState.focus -= getRandomInt(8, 16);
            gameState.knowledge -= getRandomInt(1, 4);
            gameState.rhythm -= getRandomInt(4, 8);
            gameState.mental += getRandomInt(0,3);
            showThought("時間を無駄にしただけかも…", 2000, 'neutral');
        }
    }

    function insultOnline() {
        LogHelper.add("<strong><i class='fas fa-keyboard'></i> オープンチャットで他人を激しく罵倒した。</strong>");
        let stressRelief = getRandom(20, 35);
        gameState.stress -= Math.round(stressRelief);
        LogHelper.add(`一瞬の快感。ストレスが${formatChange(-Math.round(stressRelief))}。`);

        let mentalDamage = getRandomInt(18, 28);
        gameState.mental -= mentalDamage;
        LogHelper.add(`しかし、心は深く傷つき荒んでいく。メンタルが${formatChange(-mentalDamage, "negative")}。`);
        
        gameState.luck -= getRandomInt(7, 12);
        LogHelper.add(`悪態は自らの運気も下げるようだ。運が${formatChange(getRandomInt(-12,-7), "negative")}。`);

        gameState.energy -= getRandomInt(5,10);
        gameState.focus -= getRandomInt(5,10);
        gameState.rhythm -= getRandomInt(2,5);
        showThought("最低なことをしてしまった…", 2200, 'failure');
    }
    
    function rest() {
        LogHelper.add("<strong><i class='fas fa-couch'></i> 少しの間、休憩した。</strong>");
        let energyGain = getRandom(8,18);
        let stressRelief = getRandom(4,12);

        energyGain *= (1 + gameState.rhythm / 300);

        gameState.energy += Math.round(energyGain);
        gameState.stress -= Math.round(stressRelief);
        LogHelper.add(`体力がわずかに回復(${formatChange(energyGain)})、ストレスも少し軽減(${formatChange(-stressRelief)})。`);
        gameState.focus = Math.max(5, gameState.focus - getRandomInt(2,7));
        showThought("ほんの少しだけマシに…。", 1500, 'neutral');
    }

    function sleep() {
        LogHelper.add("<strong><i class='fas fa-bed'></i> 意識を失うように、深く眠った。</strong>");
        let energyGainBase = getRandom(30, 55);
        let energyGain = calculateChange(energyGainBase, [{paramState: gameState.rhythm, value: 0.6}], [{paramState: gameState.stress, value: 0.4}]);
        
        let stressReliefBase = getRandom(10, 22);
        let stressRelief = calculateChange(stressReliefBase, [{paramState: gameState.rhythm, value: 0.5}, {paramState: gameState.mental, value: 0.4}]);

        gameState.energy += Math.round(energyGain);
        gameState.stress -= Math.round(stressRelief);
        LogHelper.add(`生命力が大きく回復し(${formatChange(energyGain)})、業苦もかなり取り除かれた(${formatChange(-stressRelief)})。`);

        let rhythmBoost = (gameState.permanentBuffs.rhythmImprovementBoost || 1.0) * getRandomInt(2, 7);
        gameState.rhythm += Math.round(rhythmBoost);
        gameState.focus = Math.max(20, gameState.focus + getRandomInt(4,12));
        gameState.mental = Math.min(100, gameState.mental + getRandomInt(1,5));
        
        showThought("少しだけ、生き返った気がする…", 1800, 'success');
    }

    function endDay() {
        const currentDay = gameState.day;
        gameState.day++;
        LogHelper.clear();
        applyActiveEffectsEndOfDay();

        gameState.rhythm -= getRandomInt(3, 7);
        gameState.stress += getRandomInt(2, 5);
        gameState.mental -= getRandomInt(0,3);
        
        if(gameState.permanentBuffs.luck && gameState.day % 2 === 0) {
             gameState.luck = Math.min(100, gameState.luck + 1);
             LogHelper.addRaw("<br>お守りが微かに輝いた気がする…(運+1)");
        } else {
            gameState.luck += getRandomInt(-2,0);
        }
        
        let dailySummaryPrepend = "";
        if (LogHelper.logs.length > 0) {
             dailySummaryPrepend = `<br><br>--- ${currentDay}日目の終わりに ---` + LogHelper.logs.join('');
        }
        LogHelper.clear();

        if (gameState.day > MAX_DAYS) {
            triggerExam();
        } else {
            const prevLog = gameState.logMessage;
            LogHelper.publish();
            let nextDayMessage = `<br><br>--- ${gameState.day}日目 ---<br>今日も一日が始まる…。試験まであと${MAX_DAYS - gameState.day + 1}日。`;
            
            const eventHappened = triggerRandomEvent();
            if(eventHappened) {
                nextDayMessage = LogHelper.logs.join("<br>") + nextDayMessage;
                LogHelper.clear();
            }

            gameState.logMessage = prevLog + dailySummaryPrepend + nextDayMessage;
            updateUI();
            enableActions();
        }
    }

    function triggerExam() {
        disableActions();
        examCalcMsg.style.display = 'block';
        examActualResult.style.display = 'none';
        examResultModal.classList.add('show');
        LogHelper.clear();
        LogHelper.add("<strong><i class='fas fa-scroll'></i> 運命の最終試験が開始される…</strong><br>これまでの全てが、今、試される時。");
        LogHelper.publish();
        updateUI();

        setTimeout(() => {
            let internalScore = gameState.knowledge * 2.2;
            internalScore += gameState.mental * 0.9;
            internalScore += gameState.focus * 0.7;
            internalScore += gameState.rhythm * 0.5;
            internalScore += gameState.luck * 0.45;
            internalScore -= gameState.stress * 1.2;
            internalScore += gameState.energy * 0.25;

            internalScore = Math.max(0, Math.round(internalScore));
            const passThreshold = 200;

            let resultMessageText = "";
            let resultTitleText = "";
            let passed = false;

            if (internalScore >= passThreshold) {
                if (gameState.luck > 80 && gameState.mental > 75 && internalScore > passThreshold * 1.03) {
                    passed = true;
                } else if (internalScore > passThreshold * 1.08 && (gameState.luck > 60 || gameState.mental > 65)) {
                    passed = true;
                } else if (Math.random() < (0.35 + (gameState.luck - 60) / 150 + (gameState.mental - 60)/200) ) {
                    passed = true;
                }
            } else {
                 if (internalScore > passThreshold * 0.9 && gameState.luck > 90 && gameState.mental > 85 && Math.random() < 0.2) {
                    passed = true;
                 } else {
                    passed = false;
                 }
            }

            if (passed) {
                resultTitleText = "奇跡の合格！";
                if (internalScore > passThreshold * 1.15) {
                    resultMessageText = `<strong>信じられないほどの高得点で合格です！</strong><br>これはまさに奇跡！絶望的な状況から、しろちゃんは偉業を成し遂げました！<br>その名は語り草となるでしょう！(なお現実は知っての通り...)`;
                } else {
                    resultMessageText = `<strong>おめでとうございます！困難を乗り越え、見事合格です！</strong><br>厳しい道のりでしたが、最後の最後で努力と幸運が実を結びました。<br>しろちゃんの未来に光が射しました！(なお現実は知っての通り...)`;
                }
                examShiroImageElem.src = gameState.shiroHappyImage || INITIAL_STATE.shiroImage;
                examResultTitle.style.color = 'var(--success-color)';
            } else {
                resultTitleText = "当然、力及ばず…";
                 if (internalScore < passThreshold * 0.5) {
                     resultMessageText = `<strong>残念ながら、今回は夢破れました…。</strong><br>あまりにも厳しい現実がしろちゃんを打ちのめしました。しかし、この経験は無駄ではなかったはず…。現実通りですね。`;
                } else if (internalScore < passThreshold * 0.8) {
                    resultMessageText = `<strong>あと一歩、本当にあと一歩でしたが、不合格です。</strong><br>悔やんでも悔やみきれない結果ですが、顔を上げてください。挑戦した勇気は本物です。現実通りですね。`;
                } else {
                    resultMessageText = `<strong>本当に惜しい結果となりました…不合格です。</strong><br>運命のサイコロは非情にも裏を向きました。あと少し何かが違えば…そう思わずにはいられません。現実通りですね。`;
                }
                examShiroImageElem.src = gameState.shiroSadImage || INITIAL_STATE.shiroImage;
                examResultTitle.style.color = 'var(--danger-color)';
            }

            examResultTitle.textContent = resultTitleText;
            examResultMesssage.innerHTML = resultMessageText;
            
            examCalcMsg.style.display = 'none';
            examActualResult.style.display = 'block';
            shiroImageElem.classList.add('shiro-image-changed');
            setTimeout(() => shiroImageElem.classList.remove('shiro-image-changed'), 600);

        }, 2800);
    }

    function handleAction(actionType) {
        if (gameState.energy <= 0 && actionType !== 'sleep') {
            LogHelper.clear();
            LogHelper.add(formatMessage("体力がゼロです…もう何もできません。まずは寝ましょう。", "negative"));
            LogHelper.publish(`--- ${gameState.day}日目の行動 ---<br>`);
            showThought("意識が…遠のく……", 2000, 'failure');
            updateUI();
            return;
        }

        disableActions();
        LogHelper.clear();
        const actionLogPrepend = `--- ${gameState.day}日目の行動 ---<br>`;

        switch (actionType) {
            case 'study': study(); break;
            case 'work': work(); break;
            case 'play_video_games': playVideoGames(); break;
            case 'insult_online': insultOnline(); break;
            case 'rest': rest(); break;
            case 'sleep': sleep(); break;
        }
        LogHelper.publish(actionLogPrepend);
        updateUI();

        setTimeout(() => {
            endDay();
        }, 1100);
    }

    function disableActions() { actionButtons.forEach(button => button.disabled = true); }
    function enableActions() {
        if (gameState.day <= MAX_DAYS) {
             actionButtons.forEach(button => button.disabled = false);
        }
    }

    function resetGame() {
        gameState = JSON.parse(JSON.stringify(INITIAL_STATE));
        shiroImageElem.src = gameState.shiroImage;
        eventNotificationArea.style.display = 'none';
        examResultModal.classList.remove('show');
        LogHelper.clear();
        LogHelper.add("新たな挑戦が始まります。今度こそ、奇跡を起こせるでしょうか…！");
        LogHelper.publish();
        updateUI();
        enableActions();
    }

    actionButtons.forEach(button => {
        button.addEventListener('click', () => handleAction(button.dataset.action));
    });
    restartGameButton.addEventListener('click', resetGame);
    openShopButton.addEventListener('click', () => {
        populateShop();
        itemShopModal.classList.add('show');
    });
    modalCloseButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.dataset.modalId;
            document.getElementById(modalId).classList.remove('show');
            if (modalId === 'exam-result-modal' && gameState.day > MAX_DAYS) {
                LogHelper.clear();
                LogHelper.add("審判は下されました。「もう一度挑戦する」で再開できます。");
                LogHelper.publish();
                updateUI();
            }
        });
    });
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.classList.remove('show');
                 if (modal.id === 'exam-result-modal' && gameState.day > MAX_DAYS) {
                    LogHelper.clear();
                    LogHelper.add("審判は下されました。「もう一度挑戦する」で再開できます。");
                    LogHelper.publish();
                    updateUI();
                }
            }
        });
    });

    console.log("しろちゃん育成チャレンジ EXTREME - 起動");
    updateUI();
    enableActions();
});
