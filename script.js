document.addEventListener('DOMContentLoaded', () => {
    const MAX_DAYS = 15;
    const INITIAL_STATE = {
        day: 1,
        knowledge: 3, stress: 20, energy: 60, money: 600,
        focus: 20, mental: 30, luck: 5,
        shiroImage: 'shiro.png',
        shiroHappyImage: 'shiro.png',
        shiroSadImage: 'shiro.png',
        logMessage: 'しろちゃんの予備試験への道が始まる…。合格は絶望的だ。',
        inventory: [],
        permanentBuffs: {},
        activeEffects: {},
        insultOnlineCount: 0,
        pachinkoCount: 0,
        soaplandUsedCount: 0,
        studyActionCount: 0 
    };

    const ITEMS = {
        'energy_drink_law': {
            name: '法力エナジードリンク改', price: 750, type: 'consumable_active',
            description: '使用: 体力+30、集中力+15。ただしストレス+8。',
            use: (gameState, logHelper) => {
                gameState.energy += 22; logHelper.add(`体力が${formatChange(30)}。`);
                gameState.focus += 10; logHelper.add(`集中力が${formatChange(15)}。`);
                gameState.stress += 12; logHelper.add(`代償としてストレスが${formatChange(8, "negative")}。`);
                return true;
            }
        },
        'luxury_soapland': {
            name: '行きつけのソープ',
            price: 65000,
            type: 'consumable_active',
            description: '究極の癒やし。使用すると勉強ストレスが0になり、集中力が最大まで回復する。人生を賭ける価値はあるか…？活動資金もごっそり減る。',
            use: (gameState, logHelper) => {
                gameState.stress = 0;
                logHelper.add(`勉強ストレスが完全に消え去った…！`); // formatChange(0)だと表示が微妙なので直接メッセージ
                gameState.focus = 100; // 集中力の最大値を100と仮定 (clamp関数で100に丸められます)
                logHelper.add(`集中力が最大までみなぎってきた！`);
                gameState.soaplandUsedCount++;

                // 暗黙のコストとして、運や精神力が少し下がるなどのペナルティも考えられますが、
                // 今回は指示された効果のみを実装します。
                // 例: gameState.luck -= 10;
                // 例: gameState.mental -= 15;
                // LogHelper.add(`しかし、何か大切なものを失った気がする…。`);

                // 高価なサービスなので、お金が追加で減る演出もアリです（今回は価格に含めています）
                // gameState.money -= 10000; // 例：追加料金
                // LogHelper.add(`最高級のサービスには追加料金が必要だった…。活動資金がさらに減少。`);


                showThought("全てを忘れてリフレッシュした…！", 2500, 'success'); // 専用の感想
                return true; // 使用成功
            }
        },
        'best_exercise_book': {
            name: 'Sランク過去問集', price: 7500, type: 'permanent',
            description: '所有中、「演習をする」際の法律知識獲得量が常に20%上昇し、集中力消費が10%軽減。',
            permanentEffect: { exerciseKnowledgeBoost: 0.20, exerciseFocusSave: 0.10 }
        },
        'intensive_lecture_ticket': {
            name: '短期集中講座受講証', price: 3000, type: 'consumable_active',
            description: '使用: 法律知識+9、集中力+15、精神力+12。ストレス+10。次回「基本書を読む」または「演習をする」の効率1.4倍(1日限定)。',
            use: (gameState, logHelper) => {
                gameState.knowledge += 9; logHelper.add(`法律知識が${formatChange(9)}。`);
                gameState.focus += 15; logHelper.add(`集中力が${formatChange(15)}。`);
                gameState.mental += 12; logHelper.add(`精神力が${formatChange(12)}。`);
                gameState.stress += 10; logHelper.add(`講座の負荷でストレスが${formatChange(10, "negative")}。`);
                const boostTarget = Math.random() < 0.5 ? 'studyTextbookBoost' : 'studyExerciseBoost';
                const targetName = boostTarget === 'studyTextbookBoost' ? '基本書研究' : '演習';
                gameState.activeEffects[boostTarget] = { duration: 2, value: 1.4, displayName: `集中講座(${targetName})` };
                logHelper.add(formatMessage(`集中講座(${targetName})効果`, "item") + "を得た！");
                return true;
            }
        },
        'counseling_ticket': {
            name: 'カウンセリング予約券', price: 1800, type: 'consumable_active',
            description: '使用: 精神力+35、ストレス-40。心の専門家は頼りになる。',
            use: (gameState, logHelper) => {
                gameState.mental += 35; logHelper.add(`精神力が${formatChange(35)}。`);
                gameState.stress -= 40; logHelper.add(`勉強ストレスが${formatChange(-40)}。`);
                return true;
            }
        },
        'noise_cancelling_earphones': {
            name: '高級ノイズキャンセリングイヤホン', price: 5000, type: 'permanent',
            description: '所有中、勉強時の集中力低下を40%抑制。ストレスの自然増加をわずかに軽減。',
            permanentEffect: { focusRetentionBoost: 0.40, dailyStressResist: 1 }
        }
    };


    const RANDOM_EVENTS = [
        {
            name: "オプチャで大炎上",
            message: "不用意な発言がオプチャで拡散し大炎上！精神的に大ダメージ…もう何もしたくない。",
            effect: (gs) => {
                gs.knowledge = Math.round(gs.knowledge * 0.6); gs.stress = Math.min(100, gs.stress + 50);
                gs.energy = Math.round(gs.energy * 0.5); gs.focus = Math.round(gs.focus * 0.4);
                gs.mental = Math.round(gs.mental * 0.3); gs.luck = Math.max(0, gs.luck - 20);
            }
        },
        {
            name: "にゃまからの暴言",
            message: "突然、にゃまが現れて心無い言葉を浴びせられた…心が折れそうだ。",
            effect: (gs) => {
                gs.knowledge = Math.round(gs.knowledge * 0.4); gs.stress = Math.min(100, gs.stress + 40);
                gs.energy = Math.round(gs.energy * 0.4); gs.focus = Math.round(gs.focus * 0.35);
                gs.mental = Math.round(gs.mental * 0.4); gs.luck = Math.max(0, gs.luck - 15);
            }
        },
        {
            name: "親に見られたくない場面",
            message: "自室で㊙️㊙️をしていたら、親に一番見られたくない場面を目撃されてしまった…最悪だ。",
            effect: (gs) => {
                gs.stress = Math.min(100, gs.stress + 55); gs.energy = Math.round(gs.energy * 0.45);
                gs.focus = Math.round(gs.focus * 0.4); gs.mental = Math.round(gs.mental * 0.3);
            }
        },
        {
            name: "親に将来を心配される",
            message: "親から「28歳にもなって将来どうするの？」と真剣に心配されてしまった…答えに窮し、気分が重い。",
            effect: (gs) => {
                gs.stress = Math.min(100, gs.stress + 35); gs.mental = Math.max(0, gs.mental - 25);
                gs.focus = Math.max(0, gs.focus - 20);
            }
        },
        {
            name: "体調不良",
            message: "原因不明の体調不良に見舞われた。今日は何もできそうにない…。",
            effect: (gs) => {
                gs.energy = Math.max(5, gs.energy - 55); gs.focus = Math.max(5, gs.focus - 40); gs.stress = Math.min(100, gs.stress + 30);
                gs.activeEffects['bad_condition'] = { duration: 3, displayName: '体調不良', value: 0.3 };
            }
        },
        {
            name: "大谷選手の活躍",
            message: "ニュースで大谷選手が特大ホームランを打ったのを見た！なんだか元気が出てきた！勉強しなきゃ..",
            effect: (gs) => {
                gs.knowledge = Math.round(gs.knowledge * 1.02); gs.stress = Math.max(0, gs.stress - 6);
                gs.energy = Math.round(gs.energy * 1.05); gs.focus = Math.round(gs.focus * 1.05);
                gs.mental = Math.round(gs.mental * 1.05); gs.luck = Math.min(100, gs.luck + 7);
            }
        },
        {
            name: "有名な学者の解説動画を発見！",
            message: "ネットで有名な学者の予備試験対策動画を偶然見つけた！これは役立ちそうだ！",
            effect: (gs) => { gs.knowledge += getRandomInt(1,3); gs.focus += getRandomInt(4,9); gs.stress -= 4;}
        },
        {
            name: "真実を言われ落ち込む…",
            message: "にゃまに「予備試験なんて夢見すぎ笑」と言われてしまった。もうダメかもしれない…。",
            effect: (gs) => { gs.mental -= getRandomInt(20,30); gs.stress += getRandomInt(25,35); gs.focus -= getRandomInt(14,20); gs.knowledge -=getRandomInt(0,1);}
        },
        {
            name: "択一の基準点上昇の噂",
            message: "SNSで「今年の択一基準点は大幅上昇する」というデマが流れているのを見てしまった…。不安だ。",
            effect: (gs) => { gs.stress += getRandomInt(15,25); gs.focus -= getRandomInt(8,14); gs.mental -=getRandomInt(5,10);}
        }
    ];
    const RANDOM_EVENT_CHANCE = 0.07;

    let gameState = JSON.parse(JSON.stringify(INITIAL_STATE));

    const dayDisplay = document.getElementById('day-display');
    const knowledgeDisplay = document.getElementById('knowledge-display');
    const stressDisplay = document.getElementById('stress-display');
    const energyDisplay = document.getElementById('energy-display');
    const moneyDisplayHeaderValue = document.getElementById('money-display-header-value');
    const focusDisplay = document.getElementById('focus-display');
    const mentalDisplay = document.getElementById('mental-display');
    const luckDisplay = document.getElementById('luck-display');

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
    const fictionEndingElem = document.getElementById('fiction-ending');
    const fictionNoticeElem = fictionEndingElem.querySelector('.fiction-notice-body');
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
            if (['knowledge', 'stress', 'energy', 'focus', 'mental', 'luck'].includes(key)) {
                let maxVal = 100;
                if (key === 'knowledge') maxVal = 150;
                if (key === 'energy' && gameState.permanentBuffs.maxEnergyBoost) maxVal += gameState.permanentBuffs.maxEnergyBoost;
                gameState[key] = clamp(gameState[key], 0, maxVal);
            }
        });
        gameState.money = Math.max(0, gameState.money);

        dayDisplay.textContent = gameState.day;
        moneyDisplayHeaderValue.textContent = Math.round(gameState.money);

        const paramsToUpdate = {
            knowledge: knowledgeDisplay, stress: stressDisplay, energy: energyDisplay,
            focus: focusDisplay, mental: mentalDisplay, luck: luckDisplay
        };

        for (const key in paramsToUpdate) {
            if (paramsToUpdate[key]) {
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
            showThought(itemDef ? "活動資金が足りない…" : "そんなアイテムは無い。", 1800, 'failure');
            return;
        }
        if (itemDef.type === 'permanent' && gameState.inventory.find(invItem => invItem.id === itemId)) {
            showThought("そのアイテムは既に購入済みだ。", 1800, 'neutral');
            return;
        }

        gameState.money -= itemDef.price;
        LogHelper.clear();
        LogHelper.add(`--- アイテム購入 ---`);
        LogHelper.add(`${formatMessage(itemDef.name, "item")}を${itemDef.price}円で購入した。`);

        if (itemDef.type === 'permanent') {
            if (itemDef.permanentEffect) {
                for (const effectKey in itemDef.permanentEffect) {
                    if (effectKey === 'luck') {
                        gameState.luck = Math.min(100, gameState.luck + itemDef.permanentEffect.luck);
                    } else {
                        gameState.permanentBuffs[effectKey] = (gameState.permanentBuffs[effectKey] || 0) + itemDef.permanentEffect[effectKey];
                    }
                }
                LogHelper.add(`${formatMessage(itemDef.name, "item")}の永続効果が発揮された。`);
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
        showThought(`${itemDef.name}を手に入れた！`, 1800, 'success');
        updateUI();
        populateShop();
    }

    function useItem(itemId, itemElement) {
        const itemIndex = gameState.inventory.findIndex(invItem => invItem.id === itemId && invItem.quantity > 0);
        if (itemIndex === -1) {
            showThought("そのアイテムは持っていないか、もう無い。", 1800, 'failure');
            return;
        }

        const itemDef = ITEMS[itemId];
        if (!itemDef || itemDef.type !== 'consumable_active' || !itemDef.use) {
            showThought("このアイテムは使用できないようだ。", 1800, 'failure');
            return;
        }
        if (gameState.energy < 5 && itemId !== 'energy_drink_law') {
             showThought("体力が無さすぎてアイテムを使えない…。", 2000, 'failure');
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
            showThought(`${itemDef.name}を使用した！`, 1800, 'success');
        } else {
            LogHelper.add(`${formatMessage(itemDef.name, "item")}の使用に失敗した…。`);
            showThought("うまく使えなかったようだ…。", 1800, 'failure');
        }
        
        LogHelper.publish();
        updateUI();
    }

    function applyEffects(effects, loggerCallback) {
        for (const param in effects) {
            const change = effects[param];
            const oldValue = gameState[param];
            gameState[param] += change;
            gameState[param] = clamp(gameState[param], 0, (param === 'knowledge' ? 150 : 100) + (param === 'energy' && gameState.permanentBuffs.maxEnergyBoost ? gameState.permanentBuffs.maxEnergyBoost : 0) );
            if(loggerCallback) loggerCallback(param, gameState[param] - oldValue);
        }
    }

    function paramName(paramKey) {
        const names = { knowledge: '法律知識', stress: '勉強ストレス', energy: '体力', money: '活動資金', focus: '集中力', mental: '精神力', luck: '合格運' };
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
                effectExpiredMessage += `<br>${formatMessage(gameState.activeEffects[effectKey].displayName, "item")}の効果期間が終了した。`;
                delete gameState.activeEffects[effectKey];
            }
        }
        if (effectExpiredMessage) LogHelper.addRaw(effectExpiredMessage);
    }

    function triggerRandomEvent() {
        eventNotificationArea.style.display = 'none';
        if (Math.random() < RANDOM_EVENT_CHANCE) {
            const event = RANDOM_EVENTS[getRandomInt(0, RANDOM_EVENTS.length - 1)];
            eventMessageElem.innerHTML = `<strong>イベント発生！</strong> ${event.message}`;
            eventNotificationArea.style.display = 'block';
            event.effect(gameState);
            LogHelper.addRaw(`<hr><strong>ランダムイベント: ${event.name}</strong><br>${event.message}`);
            showThought(`「${event.name}」発生！`, 2800, 'neutral');
            setTimeout(() => {
            }, 4500);
            return true;
        }
        return false;
    }

    function calculateChange(base, positiveFactors = [], negativeFactors = [], baseMultiplier = 1.0, isEnergyCostCalculation = false) {
        let multiplier = baseMultiplier;
        if (isEnergyCostCalculation && gameState.permanentBuffs.energyConsumptionModifier) {
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

    function studyTextbook() {
        gameState.studyActionCount++;
        LogHelper.add("<strong><i class='fas fa-book-open'></i> 基本書を読み込み、必死に知識を詰め込んだ。</strong>");
        let knowledgeGainBase = getRandom(3, 4); 
        
        let knowledgeMultiplier = 1.0;
        if (gameState.activeEffects.studyTextbookBoost && gameState.activeEffects.studyTextbookBoost.duration > 0) {
            knowledgeMultiplier *= gameState.activeEffects.studyTextbookBoost.value;
            LogHelper.add(`${formatMessage(gameState.activeEffects.studyTextbookBoost.displayName, "item")}により、学習効率が上がっている！`);
        }

        let kGain = calculateChange(knowledgeGainBase,
            [{paramState: gameState.focus, value: 0.85}, {paramState: gameState.mental, value: 0.25}],
            [{paramState: gameState.stress, value: 0.85}, {paramState: 100 - gameState.energy, value: 0.75}],
            knowledgeMultiplier
        );
        kGain = Math.max(0, Math.round(kGain));
        gameState.knowledge += kGain;
        LogHelper.add(kGain > 0 ? `法律知識が${formatChange(kGain)}。` : `全く頭に入らなかった…。`);

        gameState.energy -= Math.round(calculateChange(30, [], [], 1.0, true));
        gameState.stress += Math.round(calculateChange(15, [{paramState: 100 - gameState.mental, value: 0.65}]));
        
        let focusDrain = getRandomInt(22, 32);
        if (gameState.permanentBuffs.focusRetentionBoost) {
            focusDrain *= (1 - gameState.permanentBuffs.focusRetentionBoost);
        }
        gameState.focus -= Math.round(focusDrain);
        gameState.mental -= getRandomInt(4,8);

        if(gameState.energy < 10) showThought("もう限界だ…何も考えられない。", 1800, 'failure');
        else if(gameState.focus < 5) showThought("目がかすむ…", 1800, 'failure');
    }
    
    function doExercise(){
        gameState.studyActionCount++;
        LogHelper.add("<strong><i class='fas fa-pencil-ruler'></i> 過去問・演習書と格闘した。</strong>");
        let knowledgeGainBase = getRandom(2, 5); 
        
        let knowledgeMultiplier = 1.0;
        if (gameState.permanentBuffs.exerciseKnowledgeBoost) {
            knowledgeMultiplier += gameState.permanentBuffs.exerciseKnowledgeBoost;
        }
         if (gameState.activeEffects.studyExerciseBoost && gameState.activeEffects.studyExerciseBoost.duration > 0) {
            knowledgeMultiplier *= gameState.activeEffects.studyExerciseBoost.value;
            LogHelper.add(`${formatMessage(gameState.activeEffects.studyExerciseBoost.displayName, "item")}により、演習効率が上がっている！`);
        }

        let kGain = calculateChange(knowledgeGainBase,
            [{paramState: gameState.focus, value: 0.9}, {paramState: gameState.knowledge, value: 0.10}], 
            [{paramState: gameState.stress, value: 0.75}, {paramState: 100 - gameState.energy, value: 0.75}],
            knowledgeMultiplier
        );
        kGain = Math.max(0, Math.round(kGain));
        gameState.knowledge += kGain;
        LogHelper.add(kGain > 0 ? `実践的な法律知識が${formatChange(kGain)}向上した。` : `問題が全く解けず、何も得られなかった…。`);

        let focusConsumption = getRandomInt(28, 40);
        if (gameState.permanentBuffs.exerciseFocusSave) {
            focusConsumption *= (1 - gameState.permanentBuffs.exerciseFocusSave);
        }
        gameState.focus -= Math.round(focusConsumption);
        gameState.energy -= Math.round(calculateChange(38, [], [], 1.0, true));
        gameState.stress += Math.round(calculateChange(20, [{paramState: 100 - gameState.mental, value: 0.55}]));
        gameState.mental -= getRandomInt(6,12);

        if(gameState.focus < 5) showThought("頭が完全に停止した…", 1800, 'failure');
    }

    function work() {
        LogHelper.add("<strong><i class='fas fa-briefcase'></i> 生活費のため、短期バイトに励んだ。</strong>");
        if (gameState.energy < 45) {
            LogHelper.add(formatMessage("疲労が酷く、ほとんど仕事にならなかった…。", "negative"));
            showThought("体が…重い…", 1800, 'failure');
            gameState.money += getRandomInt(150, 350);
            gameState.energy -= getRandomInt(38, 48);
        } else {
            let earningsBase = getRandom(800, 1500);
            let earnings = calculateChange(earningsBase, [{paramState: gameState.focus, value:0.03}]);
            earnings = Math.round(earnings);

            gameState.money += earnings;
            LogHelper.add(`働いて ${formatMessage("+" + earnings, "positive")}円の活動資金を得た。`);
            showThought("これで少しはマシになるか…。", 1800, 'neutral');
        }
        gameState.energy -= Math.round(calculateChange(55, [], [], 1.0, true));
        gameState.stress += getRandomInt(14, 24);
        gameState.focus -= getRandomInt(12,18);
        gameState.mental -= getRandomInt(2,4);
    }
    
    function playVideoGames() {
        LogHelper.add("<strong><i class='fas fa-gamepad'></i> スマホゲームで息抜きをした。</strong>");
        if (gameState.energy < 25) {
            LogHelper.add(formatMessage("疲れていてゲームを楽しむ余裕もなかった…。", "negative"));
            gameState.energy -= 12;
            showThought("ただただ虚無感が募る…。", 1800, 'failure');
        } else {
            let stressRelief = getRandom(8, 18);
            stressRelief *= (1 + (gameState.mental / 350));

            gameState.stress -= Math.round(stressRelief);
            LogHelper.add(`勉強ストレスが${formatChange(-Math.round(stressRelief))}！一瞬だけ現実を忘れられた。`);

            gameState.energy -= Math.round(calculateChange(32, [], [], 1.0, true));
            gameState.focus -= getRandomInt(12, 20);
            gameState.knowledge -= getRandomInt(2, 5);
            gameState.mental += getRandomInt(0,1);
            showThought("これで良かったのだろうか…。", 2000, 'neutral');
        }
    }

    function insultOnline() {
        gameState.insultOnlineCount++;
        LogHelper.add("<strong><i class='fas fa-comments-dollar'></i> オプチャで他人を激しく罵倒した。</strong>");
        const targets = ["にゃま", "なんく", "ささみ"];
        const target = targets[getRandomInt(0, targets.length - 1)];
        
        gameState.energy -= getRandomInt(6,14);

        if (Math.random() < 0.5) {
            let stressRelief = getRandom(30, 50);
            gameState.stress -= Math.round(stressRelief);
            let mentalBoost = getRandomInt(6, 12);
            gameState.mental += mentalBoost;
            let focusBoost = getRandomInt(4, 9);
            gameState.focus += focusBoost;
            gameState.luck -= getRandomInt(18, 28);

            LogHelper.add(`オプチャで${target}を完膚なきまでに言い負かした！気分爽快だ！勉強ストレスが${formatChange(-Math.round(stressRelief))}、精神力が${formatChange(mentalBoost)}、集中力が${formatChange(focusBoost)}。`);
            LogHelper.add(`しかし、このような行為は合格運を著しく下げるだろう(${formatChange(getRandomInt(-10,-2), "negative")})。`);
            showThought("一瞬だけスッキリした…！", 2000, 'success');
        } else {
            let stressIncrease = getRandomInt(20, 30);
            gameState.stress += stressIncrease;
            let mentalDamage = getRandomInt(25, 35);
            gameState.mental -= mentalDamage;
            gameState.luck -= getRandomInt(10,16);
            gameState.focus -= getRandomInt(12,20);

            LogHelper.add(`オプチャで${target}への悪態は不発に終わり、逆に言い返されてしまった…。勉強ストレスが${formatChange(stressIncrease,"negative")}、精神力が${formatChange(-mentalDamage,"negative")}。`);
            LogHelper.add(`集中力も散漫になり(${formatChange(getRandomInt(-20,-12),"negative")})、合格運も下がった(${formatChange(getRandomInt(-15,-10),"negative")})。`);
            showThought("最悪だ…余計に疲れた…。", 2200, 'failure');
        }
    }
    
    function pachinko() {
        gameState.pachinkoCount++;
        LogHelper.add("<strong><i class='fas fa-dice-five'></i> 誘惑に負け、パチンコに手を出してしまった…。</strong>");
        let cost = Math.min(gameState.money, Math.max(1000, Math.round(gameState.money * 0.20)));

        if (gameState.money < 1000) {
            LogHelper.add(formatMessage("活動資金が1000円未満では、遊ぶことすら許されない。", "negative"));
            showThought("娯楽は金持ちの道楽か…。", 1800, 'failure');
            gameState.stress += 8;
        } else {
            gameState.money -= cost;
            LogHelper.add(`${cost}円を握りしめ、一攫千金を夢見た。`);
            gameState.energy -= Math.round(calculateChange(25, [], [], 1.0, true));
            
            let winChance = 0.15 + (gameState.luck / 450) - (gameState.stress / 550) + (gameState.mental / 650);
            winChance = clamp(winChance, 0.01, 0.30);

            if (Math.random() < winChance) {
                const winningsMultiplier = getRandom(1.0,6.0)+getRandom(1.0,6.0);
                const winnings = Math.round(cost * winningsMultiplier);
                gameState.money += winnings;
                LogHelper.add(`信じられない幸運！ ${formatMessage("+" + winnings, "positive")}円獲得！`);
                gameState.stress -= getRandomInt(15, 25);
                gameState.mental += getRandomInt(7, 13);
                gameState.luck += getRandomInt(1,2);
                showThought("今日だけはツイてる！", 1800, 'success');
            } else {
                LogHelper.add(formatMessage("やはり現実は厳しかった…参加費を全て失った。", "negative"));
                gameState.stress += getRandomInt(22, 32);
                gameState.mental -= getRandomInt(15, 22);
                gameState.luck -= getRandomInt(3,7);
                showThought("時間と活動資金の無駄だった…。", 2000, 'failure');
            }
        }
    }

    function sleep() {
        LogHelper.add("<strong><i class='fas fa-bed'></i> 翌日のために、質の高い睡眠を心がけた。</strong>");
        let energyGainBase = getRandom(25, 50);
        let energyGain = calculateChange(energyGainBase, [{paramState: (100-gameState.stress), value: 0.12}], [{paramState: gameState.stress, value: 0.55}]);
        
        let stressReliefBase = getRandom(6, 16);
        let stressRelief = calculateChange(stressReliefBase, [{paramState: gameState.mental, value: 0.45}]);

        gameState.energy += Math.round(energyGain);
        gameState.stress -= Math.round(stressRelief);
        LogHelper.add(`体力が回復し(${formatChange(energyGain)})、勉強ストレスも軽減された(${formatChange(-stressRelief)})。`);

        let rhythmLikeEffectOnFocusMental = (gameState.permanentBuffs.rhythmImprovementBoost || 1.0) * getRandomInt(1, 5); // rhythm param removed
        gameState.focus = Math.max(15, gameState.focus + Math.round(rhythmLikeEffectOnFocusMental * 0.8));
        gameState.mental = Math.min(100, gameState.mental + Math.round(rhythmLikeEffectOnFocusMental * 0.5));
        
        showThought("少しは回復しただろうか…。", 1800, 'neutral');
    }

    function endDay() {
        const currentDay = gameState.day;
        gameState.day++;
        LogHelper.clear();
        applyActiveEffectsEndOfDay();

        let dailyStressMod = gameState.permanentBuffs.dailyStressResist || 0;
        gameState.stress += getRandomInt(2, 5) - dailyStressMod;
        gameState.mental -= getRandomInt(1,4);
        gameState.energy -= getRandomInt(1,3);
        gameState.focus -= getRandomInt(2,5);
        
        if(gameState.permanentBuffs.dailyLuckIncrease) {
            gameState.luck += gameState.permanentBuffs.dailyLuckIncrease;
            LogHelper.addRaw(`<br>${formatMessage("お守り","item")}から微かな加護を感じる(合格運${formatChange(gameState.permanentBuffs.dailyLuckIncrease, "positive")})。`);
        } else {
            gameState.luck += getRandomInt(-4,-1); // Luck significantly decreases
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
            let nextDayMessage = `<br><br>--- ${gameState.day}日目 ---<br>今日も一日が始まる…。予備試験まであと${MAX_DAYS - gameState.day + 1}日。`;
            
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
        fictionEndingElem.style.display = 'none';
        examResultModal.classList.add('show');
        LogHelper.clear();
        LogHelper.add("<strong><i class='fas fa-scroll'></i> 運命の予備試験、結果発表の時…</strong><br>これまでの全ての努力と選択が、今、審判される。");
        LogHelper.publish();
        updateUI();

        setTimeout(() => {
            let internalScore = gameState.knowledge * 2.6;
            internalScore += gameState.mental * 1.2;
            internalScore += gameState.focus * 1.0;
            internalScore += gameState.luck * 0.7;
            internalScore -= gameState.stress * 1.5;
            internalScore += gameState.energy * 0.35;

            internalScore = Math.max(0, Math.round(internalScore));
            const passThreshold = 230;

            let resultMessageText = "";
            let resultTitleText = "";
            let passed = false;

            if (internalScore >= passThreshold) {
                if (gameState.luck > 90 && gameState.mental > 88 && internalScore > passThreshold * 1.01) {
                    passed = true;
                } else if (internalScore > passThreshold * 1.02 && (gameState.luck > 70 || gameState.mental > 78) && Math.random() < 0.6) {
                    passed = true;
                } else if (Math.random() < (0.10 + (gameState.luck - 80) / 150 + (gameState.mental - 80)/200) ) {
                    passed = true;
                }
            } else {
                 if (internalScore > passThreshold * 0.93 && gameState.luck > 96 && gameState.mental > 92 && Math.random() < 0.05) {
                    passed = true;
                 } else {
                    passed = false;
                 }
            }

            examShiroImageElem.src = passed ? (gameState.shiroHappyImage || INITIAL_STATE.shiroImage) : (gameState.shiroSadImage || INITIAL_STATE.shiroImage);
            examResultTitle.style.color = passed ? 'var(--success-color)' : 'var(--danger-color)';

            if (passed) {
                resultTitleText = "予備試験 合格！";
                if (internalScore > passThreshold * 1.10) {
                    resultMessageText = `<strong>信じられない！まさに奇跡！超高得点で予備試験に合格です！</strong><br>絶望的な挑戦を乗り越え、しろちゃんは不可能を可能にしました！<br>この輝かしい成果は、語り継がれるべき伝説となるでしょう！`;
                } else {
                    resultMessageText = `<strong>おめでとうございます！血と汗と涙、そして僅かな幸運の全てが実り、見事予備試験に合格です！</strong><br>想像を絶する厳しい道のりの果てに、ついに栄光を掴みました。<br>しろちゃんの未来に、ようやく確かな光が射しました！`;
                }
                fictionNoticeElem.innerHTML = `―――だが、これはあくまでゲームの中のしろちゃんの輝かしい未来。<br>現実世界のしろちゃんは、この瞬間も自室のベッドの上で<br>「もう何もしたくない…」と呟きながら、怠惰な時間を満喫しているのであった…！<br>めでたし、めでたし？`;
                fictionEndingElem.style.display = 'block';
            } else { // 不合格だった場合の処理
                fictionEndingElem.style.display = 'none'; // まずフィクション演出を非表示に
                examResultTitle.style.color = 'var(--danger-color)'; // 不合格なので赤文字に設定

                if (gameState.soaplandUsedCount > 0) { // 性病エンド (最優先)
                    resultTitleText = "予備試験 不合格…そして絶望の診断";
                    resultMessageText = `<strong>予備試験に落ちた上、あの時の刹那的な快楽が仇となったのか、体に深刻な異変が…。</strong><br>震える手で開いた診断結果は無情にも性病を告げていた。治療には莫大な費用と時間がかかり、勉強どころではなくなってしまった。人生とは、あまりにも皮肉だ。`;
                    examShiroImageElem.src = gameState.shiroSadImage || INITIAL_STATE.shiroImage;
                } else if (gameState.insultOnlineCount >= MAX_DAYS / 5) { // 逮捕エンド
                    resultTitleText = "予備試験 不合格…そして逮捕";
                    resultMessageText = `<strong>予備試験にも落ち、度重なるネットでの誹謗中傷が仇となった…。</strong><br>ある日、玄関のチャイムが鳴り、ドアを開けるとそこには警察官が立っていた。<br>「しろちゃん、ちょっと署まで来てもらおうか」…人生、詰んだ。`;
                    examShiroImageElem.src = gameState.shiroSadImage || INITIAL_STATE.shiroImage;
                } else if (gameState.pachinkoCount >= MAX_DAYS / 5) { // 借金地獄エンド
                    resultTitleText = "予備試験 不合格…そして借金地獄";
                    resultMessageText = `<strong>予備試験にも落ち、パチンコで作った借金は雪だるま式に膨れ上がった。</strong><br>取り立ての電話は鳴り止まず、もはやまともな生活は送れない。<br>しろちゃんの人生は自殺してしまった…。`;
                    examShiroImageElem.src = gameState.shiroSadImage || INITIAL_STATE.shiroImage;
                } else if (gameState.studyActionCount >= 9) { // 地頭お疲れエンド
                    resultTitleText = "予備試験 不合格…努力の果てに";
                    resultMessageText = `<strong>予備試験不合格。あれだけ勉強したのに、結果は非情だった…。</strong><br>もしかしたら、自分には根本的にこの道は向いていなかったのかもしれない。努力だけでは越えられない壁を痛感し、しろちゃんは静かにペンを置いた。`;
                    examShiroImageElem.src = gameState.shiroSadImage || INITIAL_STATE.shiroImage;
                } else { // 上記いずれにも該当しない通常の不合格
                    resultTitleText = "予備試験 不合格…";
                    if (internalScore < passThreshold * 0.6) {
                        resultMessageText = `<strong>残念ながら、夢は完全に潰えました…。</strong><br>あまりにも厳しい現実は、無情にもしろちゃんを打ちのめしました。この絶望から立ち直ることはできるのでしょうか…。`;
                    } else if (internalScore < passThreshold * 0.88) {
                        resultMessageText = `<strong>あと一歩、本当にあと一歩でしたが、不合格です。</strong><br>これ以上ないほど悔しい結果です。しかし、この壮絶な挑戦で何かを掴んだと信じたい…。`;
                    } else {
                        resultMessageText = `<strong>本当に、本当に、あと僅かの差で不合格となりました…。</strong><br>天はしろちゃんに味方しませんでした。合格の光は、指の間からこぼれ落ちてしまいました。`;
                    }
                }
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
            case 'study_textbook': studyTextbook(); break;
            case 'do_exercise': doExercise(); break;
            case 'insult_online': insultOnline(); break;
            case 'work': work(); break;
            case 'pachinko': pachinko(); break;
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
        gameState = JSON.parse(JSON.stringify(INITIAL_STATE)); // Deep copy
        gameState.insultOnlineCount = 0; // Ensure counters are reset
        gameState.pachinkoCount = 0;
        gameState.soaplandUsedCount = 0; // <--- 追加
        gameState.studyActionCount = 0;
        shiroImageElem.src = gameState.shiroImage;
        eventNotificationArea.style.display = 'none';
        examResultModal.classList.remove('show');
        fictionEndingElem.style.display = 'none';
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

    console.log("しろちゃん 予備試験ガチモード - 起動");
    updateUI();
    enableActions();
});
