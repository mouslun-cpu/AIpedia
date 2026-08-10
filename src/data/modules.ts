// 知識點註冊表 — 這是整個平台的「內容目錄」單一來源。
// 新增一個知識點時：在這裡加一筆，並在 App.tsx 掛上對應 route。
// 只有列在這裡的知識點才會出現在首頁並可進入。

export type Difficulty = '入門' | '進階' | '深入' | '實戰'

/** 平台分成兩大分頁：判別式 AI（傳統機器學習）與生成式 AI。 */
export type Track = 'discriminative' | 'generative'

export interface ModuleMeta {
  /** 網址 slug，例如 /topic/how-machines-learn */
  slug: string
  /** 卡片與頁面標題 */
  title: string
  /** 一句話說明 */
  summary: string
  /** 分類（首頁分組用，對應課綱的層）*/
  category: Category
  /** 屬於哪個分頁 */
  track: Track
  /** 難度標示 */
  difficulty: Difficulty
  /** 卡片用的 emoji 圖示 */
  icon: string
}

// 課綱分層 —— 陣列順序 = 首頁由上而下的顯示順序
export const CATEGORIES = [
  '建立直覺',
  '監督式學習：回歸',
  '監督式學習：分類',
  '集成學習',
  '非監督式學習',
  '神經網路',
  '強化學習',
  '模型評估與調校',
  // 生成式 AI 分組：入門 → LLM 怎麼煉成的 → 駕馭 LLM（實際應用工程）→ 應用與限制 → 生成圖片
  '生成式入門',
  'LLM 是怎麼煉成的',
  '駕馭 LLM',
  'LLM 的應用與限制',
  '生成圖片',
] as const
export type Category = (typeof CATEGORIES)[number]

export const TRACK_INFO: Record<Track, { label: string; icon: string; tagline: string }> = {
  discriminative: {
    label: '判別式 AI',
    icon: '🧭',
    tagline: '分類、預測、找規律——教機器判斷「這是什麼」',
  },
  generative: {
    label: '生成式 AI',
    icon: '✨',
    tagline: '學會分布、無中生有——教機器「創造新東西」',
  },
}

export const MODULES: ModuleMeta[] = [
  // ── 建立直覺 ──
  {
    slug: 'how-machines-learn',
    title: '機器是怎麼學習的？',
    summary: '用三個互動小實驗，看懂監督式、非監督式與強化學習的差別。',
    category: '建立直覺',
    track: 'discriminative',
    difficulty: '入門',
    icon: '🧠',
  },
  {
    slug: 'features-labels',
    title: '特徵與標籤',
    summary: '機器眼中的資料長什麼樣？搞懂它看的「線索」和要猜的「答案」。',
    category: '建立直覺',
    track: 'discriminative',
    difficulty: '入門',
    icon: '🏷️',
  },
  {
    slug: 'train-val-test',
    title: '訓練 / 驗證 / 測試',
    summary: '為什麼資料要分成三份？用課本、模擬考、正式考的比喻一次搞懂。',
    category: '建立直覺',
    track: 'discriminative',
    difficulty: '入門',
    icon: '📚',
  },

  // ── 監督式學習：回歸 ──
  {
    slug: 'linear-regression',
    title: '線性回歸',
    summary: '動手調一條直線，找出最能描述資料趨勢的那一條。',
    category: '監督式學習：回歸',
    track: 'discriminative',
    difficulty: '入門',
    icon: '📉',
  },
  {
    slug: 'polynomial-regression',
    title: '多項式回歸',
    summary: '直線不夠用時，讓線彎起來——一個滑桿看曲線怎麼變。',
    category: '監督式學習：回歸',
    track: 'discriminative',
    difficulty: '入門',
    icon: '〰️',
  },
  {
    slug: 'loss-function',
    title: '損失函數',
    summary: '機器怎麼衡量「畫得好不好」？把誤差變成看得見的方塊面積。',
    category: '監督式學習：回歸',
    track: 'discriminative',
    difficulty: '入門',
    icon: '🎯',
  },
  {
    slug: 'gradient-descent',
    title: '梯度下降',
    summary: '機器怎麼「自己」找到最好的線？看小球一步步滾下山谷。',
    category: '監督式學習：回歸',
    track: 'discriminative',
    difficulty: '進階',
    icon: '⛰️',
  },

  // ── 監督式學習：分類 ──
  {
    slug: 'logistic-regression',
    title: '邏輯回歸',
    summary: '分類的入門：畫一條決策邊界，再用 sigmoid 把距離變成機率。',
    category: '監督式學習：分類',
    track: 'discriminative',
    difficulty: '入門',
    icon: '🪄',
  },
  {
    slug: 'knn',
    title: 'K 最近鄰（KNN）',
    summary: '近朱者赤——拖曳新資料，看它問最近的幾個鄰居該歸哪一類。',
    category: '監督式學習：分類',
    track: 'discriminative',
    difficulty: '入門',
    icon: '👥',
  },
  {
    slug: 'decision-tree',
    title: '決策樹',
    summary: '用一連串是非題把平面切成方塊，看樹怎麼一層層長出來。',
    category: '監督式學習：分類',
    track: 'discriminative',
    difficulty: '進階',
    icon: '🌳',
  },
  {
    slug: 'svm',
    title: 'SVM 支持向量機',
    summary: '拖曳資料點，理解最大間隔、決策邊界與支持向量是什麼。',
    category: '監督式學習：分類',
    track: 'discriminative',
    difficulty: '進階',
    icon: '📐',
  },
  {
    slug: 'naive-bayes',
    title: '樸素貝氏',
    summary: '用機率做垃圾信過濾器，切換關鍵字看判斷即時翻轉。',
    category: '監督式學習：分類',
    track: 'discriminative',
    difficulty: '進階',
    icon: '📮',
  },
  {
    slug: 'svm-stock',
    title: '專題：用 SVM 區分股票漲跌',
    summary: '完整實戰流程——挑線索、訓練、上考場、模擬操盤，親手挖出這檔股票藏的秘密。',
    category: '監督式學習：分類',
    track: 'discriminative',
    difficulty: '實戰',
    icon: '📈',
  },

  // ── 集成學習（分類方法的進階延伸）──
  {
    slug: 'random-forest',
    title: '專題：實作 RF 選股策略',
    summary: '一棵樹會死背，一片森林會賺錢？挑指標、種森林、設投票門檻——親手組裝隨機森林擇時策略。',
    category: '集成學習',
    track: 'discriminative',
    difficulty: '實戰',
    icon: '🌳',
  },
  {
    slug: 'bagging-boosting',
    title: '專題：Bagging vs Boosting 品管廠對決',
    summary: '開兩間工廠打對台——平行受訓 vs 接力特訓，親眼看團隊怎麼被組出來、差在哪裡。',
    category: '集成學習',
    track: 'discriminative',
    difficulty: '實戰',
    icon: '🏭',
  },

  // ── 非監督式學習 ──
  {
    slug: 'kmeans',
    title: 'K-means 分群',
    summary: '幫珍奶控股展店：自己拖分店選址，再跟 K-means 比誰讓客人走得更近。',
    category: '非監督式學習',
    track: 'discriminative',
    difficulty: '入門',
    icon: '🧋',
  },
  {
    slug: 'hierarchical',
    title: '階層式分群',
    summary: '婚宴併桌大作戰：一步步把最熟的賓客併成一桌，開幾桌事後再反悔。',
    category: '非監督式學習',
    track: 'discriminative',
    difficulty: '進階',
    icon: '💒',
  },
  {
    slug: 'pca',
    title: '主成分分析（PCA）',
    summary: '把甜度×熱量壓成一個「罪惡指數」，替全店手搖飲排出罪惡排行榜。',
    category: '非監督式學習',
    track: 'discriminative',
    difficulty: '深入',
    icon: '😈',
  },

  // ── 神經網路 ──
  {
    slug: 'perceptron',
    title: '神經元與感知器',
    summary: '調權重讓一個神經元學會 AND / OR，再看它為什麼永遠解不開 XOR。',
    category: '神經網路',
    track: 'discriminative',
    difficulty: '入門',
    icon: '⚪',
  },
  {
    slug: 'forward-pass',
    title: '前向傳播',
    summary: '兩位審核員接力把關，親眼看訊號一步步往前傳，解開上一課的 XOR 難題。',
    category: '神經網路',
    track: 'discriminative',
    difficulty: '進階',
    icon: '➡️',
  },
  {
    slug: 'backpropagation',
    title: '反向傳播',
    summary: '珍奶配方調不準，回頭一層層究責——鏈式法則的實戰演練。',
    category: '神經網路',
    track: 'discriminative',
    difficulty: '深入',
    icon: '🔄',
  },
  {
    slug: 'activation-functions',
    title: '激活函數',
    summary: '健身教練用四種方式稱讚你的表現，看懂為什麼一定要有「非線性」。',
    category: '神經網路',
    track: 'discriminative',
    difficulty: '入門',
    icon: '📶',
  },
  {
    slug: 'cnn',
    title: 'CNN 卷積神經網路',
    summary: '機器怎麼認出手寫的「7」？把它拆成一橫一撇兩個筆畫，親手擦掉一筆看它認錯。',
    category: '神經網路',
    track: 'discriminative',
    difficulty: '進階',
    icon: '🔍',
  },
  {
    slug: 'rnn',
    title: 'RNN 循環神經網路',
    summary: '一個字一個字讀評論，腦中印象會累積、「不」字會翻轉後文——看懂機器怎麼讀序列。',
    category: '神經網路',
    track: 'discriminative',
    difficulty: '進階',
    icon: '🔁',
  },
  {
    slug: 'lstm',
    title: 'LSTM 長短期記憶',
    summary: '幫 RNN 裝上「記憶閘門」，像抄筆記般記重點、忘廢話——看它記住開頭埋的伏筆。',
    category: '神經網路',
    track: 'discriminative',
    difficulty: '深入',
    icon: '🔐',
  },

  // ── 強化學習 ──
  {
    slug: 'reinforcement-basics',
    title: '強化學習基礎',
    summary: '拉拉看老虎機，體會「試了才知道」，理解探索與利用的取捨。',
    category: '強化學習',
    track: 'discriminative',
    difficulty: '入門',
    icon: '🎰',
  },
  {
    slug: 'q-learning',
    title: 'Q-learning',
    summary: '把格子世界機器人心裡的 Q 表格攤開來看，一步步看數字怎麼被修正。',
    category: '強化學習',
    track: 'discriminative',
    difficulty: '深入',
    icon: '🗺️',
  },

  // ── 模型評估與調校 ──
  {
    slug: 'overfitting',
    title: '欠擬合與過擬合',
    summary: '拖一下複雜度滑桿，親眼看到模型從「學不會」到「死背」的過程。',
    category: '模型評估與調校',
    track: 'discriminative',
    difficulty: '入門',
    icon: '📈',
  },
  {
    slug: 'bias-variance',
    title: '偏差-變異權衡',
    summary: '用射飛鏢看懂兩種錯誤：整團偏掉 vs 散得太開，以及背後的 U 型曲線。',
    category: '模型評估與調校',
    track: 'discriminative',
    difficulty: '進階',
    icon: '🎯',
  },
  {
    slug: 'cross-validation',
    title: '交叉驗證',
    summary: '資料不多時怎麼公平評分？讓每份資料輪流當一次驗證，再取平均。',
    category: '模型評估與調校',
    track: 'discriminative',
    difficulty: '入門',
    icon: '🔁',
  },
  {
    slug: 'regularization',
    title: '正則化',
    summary: '不減複雜度也能治過擬合——加一條「係數不准太大」的規矩讓曲線變平滑。',
    category: '模型評估與調校',
    track: 'discriminative',
    difficulty: '進階',
    icon: '🎚️',
  },
  {
    slug: 'metrics',
    title: '分類評估指標',
    summary: '準確率會騙人。拖門檻看混淆矩陣，搞懂精確率與召回率的取捨。',
    category: '模型評估與調校',
    track: 'discriminative',
    difficulty: '進階',
    icon: '📊',
  },
  {
    slug: 'roc-auc',
    title: 'ROC 曲線與 AUC',
    summary: '一條曲線總結模型在所有門檻下的表現，AUC 就是它的總分。',
    category: '模型評估與調校',
    track: 'discriminative',
    difficulty: '深入',
    icon: '📉',
  },

  // ── 生成式入門 ──
  {
    slug: 'generative-vs-discriminative',
    title: '生成式 vs 判別式',
    summary: '判別式只會畫邊界分類，生成式能真的學會分布、無中生有造出新樣本。',
    category: '生成式入門',
    track: 'generative',
    difficulty: '入門',
    icon: '✨',
  },

  // ── LLM 是怎麼煉成的（大型語言模型的完整流程）──
  {
    slug: 'tokenization',
    title: 'Token 化與文字接龍',
    summary: '看一句話怎麼被切成 token，再親手玩一次「一個字接一個字」的生成過程。',
    category: 'LLM 是怎麼煉成的',
    track: 'generative',
    difficulty: '入門',
    icon: '🔤',
  },
  {
    slug: 'embeddings',
    title: '詞嵌入與語意空間',
    summary: '意思相近的詞會自動聚在一起，甚至能玩「國王−男人+女人=皇后」的向量算術。',
    category: 'LLM 是怎麼煉成的',
    track: 'generative',
    difficulty: '進階',
    icon: '🗺️',
  },
  {
    slug: 'attention',
    title: '自注意力機制',
    summary: '「牠」到底指誰？看模型怎麼靠注意力權重，讓每個字都去參照句中其他字。',
    category: 'LLM 是怎麼煉成的',
    track: 'generative',
    difficulty: '深入',
    icon: '👁️',
  },
  {
    slug: 'transformer',
    title: 'Transformer 架構',
    summary: '一組偵探同時破案：多位讀者各追一種關係、再疊很多層——這就是 ChatGPT 引擎的秘密。',
    category: 'LLM 是怎麼煉成的',
    track: 'generative',
    difficulty: '深入',
    icon: '🤖',
  },
  {
    slug: 'sampling',
    title: '取樣策略：Temperature / Top-p',
    summary: '同一個模型為什麼有時穩重、有時天馬行空？兩個旋鈕決定它怎麼「抽答案」。',
    category: 'LLM 是怎麼煉成的',
    track: 'generative',
    difficulty: '進階',
    icon: '🎲',
  },

  // ── 駕馭 LLM（實際應用工程）──
  {
    slug: 'prompt-engineering',
    title: '提示工程 Prompt Engineering',
    summary: '同一個要求，話講清不清楚，AI 給的東西天差地別——加角色、格式、範例，看回覆怎麼從 😐 變 🤩。',
    category: '駕馭 LLM',
    track: 'generative',
    difficulty: '入門',
    icon: '🗣️',
  },
  {
    slug: 'context-engineering',
    title: '脈絡工程 Context Engineering',
    summary: 'AI 的工作記憶只有一塊小桌子——塞對資料它超神，塞爆了它連你問什麼都忘。動手決定桌上放什麼。',
    category: '駕馭 LLM',
    track: 'generative',
    difficulty: '進階',
    icon: '🪟',
  },
  {
    slug: 'tool-use',
    title: '工具調用 Tool Use',
    summary: 'AI 不會算數學、查不到即時天氣？給它工具（計算機、搜尋、資料庫），看它查了再答——順便搞懂 API／MCP／Skill。',
    category: '駕馭 LLM',
    track: 'generative',
    difficulty: '進階',
    icon: '🛠️',
  },
  {
    slug: 'ai-agent',
    title: 'AI 代理 Agent',
    summary: '給它一個目標、不是一步步指令——看 AI 自己「想→做→看」跑迴圈，一路把訂票任務完成。',
    category: '駕馭 LLM',
    track: 'generative',
    difficulty: '深入',
    icon: '🦾',
  },

  // ── LLM 的應用與限制 ──
  {
    slug: 'rag',
    title: 'RAG 檢索增強生成',
    summary: '遇到沒學過的知識，與其瞎猜，不如讓 AI 先查資料再回答。',
    category: 'LLM 的應用與限制',
    track: 'generative',
    difficulty: '進階',
    icon: '📚',
  },
  {
    slug: 'hallucination',
    title: '幻覺問題',
    summary: 'AI 明明沒把握，講起話來卻一樣自信滿滿——這正是幻覺最難防的原因。',
    category: 'LLM 的應用與限制',
    track: 'generative',
    difficulty: '進階',
    icon: '🌀',
  },

  // ── 生成圖片 ──
  {
    slug: 'diffusion',
    title: '擴散模型生成圖片',
    summary: 'AI 畫圖是怎麼從一團雜訊，一步步「去噪」變成一張圖的？',
    category: '生成圖片',
    track: 'generative',
    difficulty: '深入',
    icon: '🌫️',
  },
  {
    slug: 'gan',
    title: 'GAN 生成對抗網路',
    summary: '生成器造假、判別器抓假，兩個網路互相較勁、一起變強。',
    category: '生成圖片',
    track: 'generative',
    difficulty: '深入',
    icon: '⚔️',
  },
]

export function getModule(slug: string): ModuleMeta | undefined {
  return MODULES.find((m) => m.slug === slug)
}
