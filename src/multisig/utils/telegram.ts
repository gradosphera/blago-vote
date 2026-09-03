interface TelegramWebAppLike {
    ready?: () => void;
    expand?: () => void;
    setHeaderColor?: (color: string) => void;
    setBackgroundColor?: (color: string) => void;
    initData?: string;
    initDataUnsafe?: object;
    colorScheme?: "light" | "dark";
    version?: string;
}

const getWebApp = (): TelegramWebAppLike | null => {
    try {
        const anyWindow = window as any;
        return (anyWindow.Telegram?.WebApp as TelegramWebAppLike) ?? null;
    } catch {
        return null;
    }
};

// Приложение встроено в Telegram Mini Apps, если в URL есть инициализационные
// данные Telegram (#tgWebAppData=...) либо доступен объект WebApp с initData.
// Детекция по хэшу обязательна: вне Telegram объект WebApp может отсутствовать,
// а если подключить официальный SDK-скрипт, он появится и в обычном браузере
// (с пустым initData). По хэшу же можно однозначно понять, что мы в Telegram.
//
// ВАЖНО: это функция, а не константа. SDK Telegram подставляется в window не
// мгновенно (из скрипта-провайдера), и на момент первого импорта его может ещё
// не быть — константа навсегда зафиксировала бы false. Функция же проверяет
// актуальное состояние каждый раз при вызове.
export const isTelegram = (): boolean => {
    try {
        if (typeof window === "undefined") return false;
        if ((window.location.hash || "").includes("tgWebAppData=")) return true;
        const wa = getWebApp();
        return !!(wa && wa.initData);
    } catch {
        return false;
    }
};

// Обратная совместимость: константа для вызовов, где важно проверить до старта.
export const IS_TELEGRAM: boolean = isTelegram();

export const initTelegram = (): void => {
    if (!isTelegram()) return;
    const tg = getWebApp();
    if (!tg || !tg.ready) return;

    tg.ready();
    tg.expand?.();
    try {
        // Согласуем «окружение» Telegram (шапка/фон) с тёмной темой приложения.
        tg.setHeaderColor?.("#1e2337");
        tg.setBackgroundColor?.("#1e2337");
    } catch {
        // игнорируем: методы опциональны в старых версиях
    }
};

// Параметр "startapp" из глубокой ссылки на Mini App:
// https://t.me/<бот>/vote?startapp=<VAL> → initDataUnsafe.start_param === <VAL>.
// Используется ботом для открытия Mini App сразу на странице предложения
// (значение = адрес предложения, см. bot/bot.js webAppProposalLink).
export const getStartParam = (): string | undefined => {
    try {
        const wa = getWebApp();
        const unsafe = (wa?.initDataUnsafe as { start_param?: string } | undefined) ?? {};
        return typeof unsafe.start_param === "string" && unsafe.start_param ? unsafe.start_param : undefined;
    } catch {
        return undefined;
    }
};
