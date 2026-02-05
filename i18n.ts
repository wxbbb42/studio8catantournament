export type Language = 'en' | 'zh';

export const translations = {
    en: {
        // Landing page
        title1: 'STUDIO 8',
        title2: 'CATAN TOURNAMENT',
        subtitle: 'Trade wood for sheep, build the longest road, and claim the crown. The annual designer board game battle begins soon.',
        registerNow: 'Register Now',
        registrationClosed: 'Registration Closed',
        viewTournamentMap: 'View Tournament Map',
        waitingForBrackets: 'Waiting for organizer to publish brackets...',
        registeredSettlers: 'Registered Settlers',
        loading: 'Loading tournament data...',

        // Signup form
        joinTheIsland: 'Join the Island',
        yourName: 'Your Name',
        alias: 'Alias',
        favoriteResource: 'Favorite Resource',
        generatingPersona: 'Generating Persona...',
        confirmRegistration: 'Confirm Registration',
        registrationFailed: 'Failed to register. Alias might already be taken.',

        // Resources
        brick: 'brick',
        wood: 'wood',
        sheep: 'sheep',
        wheat: 'wheat',
        ore: 'ore',

        // Admin panel
        organizerDashboard: 'Organizer Dashboard',
        exitDashboard: 'Exit Dashboard',
        tournamentControls: 'Tournament Controls',
        registrationDeadline: 'Registration Deadline',
        status: 'Status',
        statusOpen: 'OPEN',
        statusClosed: 'CLOSED',
        reopenRegistration: 'Re-open Registration',
        closeRegistrationEarly: 'Close Registration Early',
        generateBrackets: 'Generate Brackets & Start',
        resetAllData: 'Reset All Data (Danger)',
        liveStats: 'Live Stats',
        participants: 'Participants',
        tablesNeeded: 'Tables Needed',
        resourceDistribution: 'Resource Distribution',
        manageParticipants: 'Manage Participants',
        noParticipants: 'No participants registered yet.',
        removeParticipant: 'Remove Participant',
        invalidOrganizerKey: 'Invalid Organizer Key',
        bracketsGenerated: 'Tournament Brackets Generated!',
        confirmReset: 'Are you sure? This deletes all data.',
        confirmDelete: 'Are you sure you want to delete this participant? This cannot be undone.',

        // Tarot cards
        generateMissingCards: 'Generate Missing Tarot Cards',
        regenerateCard: 'Regenerate Card',
        generatingCards: 'Generating cards...',
        cardsGenerated: 'cards generated',
        noMissingCards: 'All participants have tarot cards!',
        clickToView: 'Click to view card',
        close: 'Close',

        // Tournament map
        tournamentMap: 'Tournament Map',
        findYourTable: 'Find your table, Settler. May the dice be in your favor.',
        backHome: 'Back Home',
        table: 'Table',
        qualifiesWinner: 'Qualifies 1 Winner',
        settler: 'Settler',

        // Nav
        adminPanel: 'Admin Panel',
        key: 'Key',

        // Language
        switchLang: '中文',
    },
    zh: {
        // Landing page
        title1: 'STUDIO 8',
        title2: '卡坦岛锦标赛',
        subtitle: '用木材换羊毛，建造最长的道路，夺取王冠。年度桌游大战即将开始。',
        registerNow: '立即报名',
        registrationClosed: '报名已截止',
        viewTournamentMap: '查看比赛分组',
        waitingForBrackets: '等待组织者发布分组...',
        registeredSettlers: '已报名选手',
        loading: '正在加载比赛数据...',

        // Signup form
        joinTheIsland: '加入岛屿',
        yourName: '你的名字',
        alias: '昵称',
        favoriteResource: '最喜欢的资源',
        generatingPersona: '生成角色中...',
        confirmRegistration: '确认报名',
        registrationFailed: '报名失败，昵称可能已被使用。',

        // Resources
        brick: '砖块',
        wood: '木材',
        sheep: '羊毛',
        wheat: '小麦',
        ore: '矿石',

        // Admin panel
        organizerDashboard: '组织者控制台',
        exitDashboard: '退出控制台',
        tournamentControls: '比赛控制',
        registrationDeadline: '报名截止时间',
        status: '状态',
        statusOpen: '开放',
        statusClosed: '关闭',
        reopenRegistration: '重新开放报名',
        closeRegistrationEarly: '提前关闭报名',
        generateBrackets: '生成分组并开始',
        resetAllData: '重置所有数据（危险）',
        liveStats: '实时统计',
        participants: '参赛者',
        tablesNeeded: '需要桌数',
        resourceDistribution: '资源分布',
        manageParticipants: '管理参赛者',
        noParticipants: '暂无参赛者报名。',
        removeParticipant: '移除参赛者',
        invalidOrganizerKey: '组织者密钥无效',
        bracketsGenerated: '比赛分组已生成！',
        confirmReset: '确定吗？这将删除所有数据。',
        confirmDelete: '确定要删除这位参赛者吗？此操作无法撤销。',

        // Tarot cards
        generateMissingCards: '生成缺失的塔罗牌',
        regenerateCard: '重新生成卡牌',
        generatingCards: '正在生成...',
        cardsGenerated: '张卡牌已生成',
        noMissingCards: '所有参赛者都有塔罗牌了！',
        clickToView: '点击查看卡牌',
        close: '关闭',

        // Tournament map
        tournamentMap: '比赛分组',
        findYourTable: '找到你的桌位，开拓者。愿骰子眷顾你。',
        backHome: '返回首页',
        table: '桌',
        qualifiesWinner: '晋级1名获胜者',
        settler: '开拓者',

        // Nav
        adminPanel: '管理面板',
        key: '密钥',

        // Language
        switchLang: 'EN',
    }
} as const;

export type TranslationKey = keyof typeof translations.en;

export const getResourceName = (resource: string, lang: Language): string => {
    const resourceMap: Record<string, TranslationKey> = {
        brick: 'brick',
        wood: 'wood',
        sheep: 'sheep',
        wheat: 'wheat',
        ore: 'ore',
    };
    return translations[lang][resourceMap[resource] || 'brick'];
};
