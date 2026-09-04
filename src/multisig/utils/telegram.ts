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

// Извлекает start_param (или другой ключ) из «сырой» строки initData:
// "query_id=...&user=...&start_param=<VAL>&auth_date=..." (может быть URL-encoded).
function parseInitDataParam(initData: string | undefined, key: string): string | undefined {
    if (!initData) return undefined;
    try {
        const params = new URLSearchParams(initData);
        const val = params.get(key);
        return val && val.length ? val : undefined;
    } catch {
        return undefined;
    }
}

// Достаёт сырую строку initData из URL-хэша Mini App: "#tgWebAppData=<urlencoded>".
// Это самый ранний и надёжный источник — он не зависит от момента инъекции SDK.
function getInitDataFromHash(): string | undefined {
    try {
        const hash = window.location.hash || "";
        if (!hash.includes("tgWebAppData=")) return undefined;
        const raw = hash.split("tgWebAppData=")[1] || "";
        return decodeURIComponent(raw);
    } catch {
        return undefined;
    }
}

// Параметр "startapp" из глубокой ссылки на Mini App:
// https://t.me/<бот>/vote?startapp=<VAL> → start_param === <VAL>.
// Используется ботом для открытия Mini App сразу на странице предложения
// (значение = адрес предложения, см. bot/bot.js webAppProposalLink).
//
// Ищем в нескольких источниках, чтобы покрыть разные сценарии запуска
// (url-кнопка в канале/группе/личном чате, прямая ссылка, неровная инъекция SDK):
//   1) window.Telegram.WebApp.initDataUnsafe.start_param
//   2) initData самого SDK
//   3) initData из URL-хэша tgWebAppData (не зависит от SDK).
export const getStartParam = (): string | undefined => {
    try {
        const wa = getWebApp();
        const unsafe = (wa?.initDataUnsafe as { start_param?: string } | undefined) ?? {};
        if (typeof unsafe.start_param === "string" && unsafe.start_param) {
            return unsafe.start_param;
        }
        const sdkInitData = parseInitDataParam(wa?.initData, "start_param");
        if (sdkInitData) return sdkInitData;
        const hashInitData = parseInitDataParam(getInitDataFromHash(), "start_param");
        if (hashInitData) return hashInitData;
        return undefined;
    } catch {
        return undefined;
    }
};
