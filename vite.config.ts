import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vitejs.dev/config/
export default defineConfig({
  // Подпуть для деплоя на GitVerse (например /blago-vote/).
  // На Vercel/Vite Preview переменная не задана — работает как раньше.
  base: process.env.VITE_BASE || "/",
  plugins: [
    react(),
    tsconfigPaths(),
    // TON-библиотеки (@ton/*, ton, tonweb) используют Node-глобалы (Buffer,
    // process, global). Плагин подставляет их во все чанки — важно для
    // Telegram WebView, где нет Node-окружения.
    nodePolyfills({
      globals: { Buffer: true, global: true, process: true },
    }),
  ],
  server: {
    // Предпрогрев точек входа: Vite заранее трансформирует и кеширует их модули,
    // чтобы при открытии страницы не было водопада из сотен запросов (иначе
    // Chrome может отдать net::ERR_INSUFFICIENT_RESOURCES на один из чанков, а
    // ленивый маршрут останется в Suspense-fallback — «бесконечная загрузка»).
    warmup: {
      clientFiles: [
        "./src/main.tsx",
        "./src/pages/multisig/MultisigPage.tsx",
        "./src/pages/multisig/MultisigList.tsx",
      ],
    },
    watch: {
      usePolling: true,
      interval: 200,
    },
    // Прокси API-запросов к бэкенду для локальной разработки.
    // Без этого `yarn prod` не может получить данные (localhost:3002 не имеет бэкенда).
    // Порядок важен: более специфичные пути (/daos) должны идти до общих (/dao),
    // иначе /dao перехватит /daos и запрос уйдёт на https://api.ton.vote/daos
    // через обработчик /dao → 404.
    proxy: {
      "/api": {
        target: "https://api.ton.vote",
        changeOrigin: true,
        secure: false,
      },
      "/daos": {
        target: "https://api.ton.vote",
        changeOrigin: true,
        secure: false,
      },
      "/dao": {
        target: "https://api.ton.vote",
        changeOrigin: true,
        secure: false,
      },
      "/proposal": {
        target: "https://api.ton.vote",
        changeOrigin: true,
        secure: false,
      },
      "/version": {
        target: "https://api.ton.vote",
        changeOrigin: true,
        secure: false,
      },
      "/maxLt": {
        target: "https://api.ton.vote",
        changeOrigin: true,
        secure: false,
      },
      "/nftHolders": {
        target: "https://api.ton.vote",
        changeOrigin: true,
        secure: false,
      },
      "/operatingValidatorsInfo": {
        target: "https://api.ton.vote",
        changeOrigin: true,
        secure: false,
      },
      "/updateTime": {
        target: "https://api.ton.vote",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  optimizeDeps: {
    // nodePolyfills инжектит шимы (Buffer/global/process) как bare-импорты в
    // зависимости. Шим global не попадал в pre-bundle и отдавался из
    // node_modules по одному файлу, из-за чего Vite мог переоптимизировать
    // зависимости на ходу (504 Outdated Optimize Dep → перезагрузка страницы).
    include: ["vite-plugin-node-polyfills/shims/global"],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Разбиваем крупные вендоры на отдельные чанки: быстрее параллельная
        // загрузка и кеширование в webview Telegram Mini App (при обновлении
        // приложения перекачивается только изменившийся код).
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id))
            return "vendor-react";
          if (/[\\/]node_modules[\\/]@mui[\\/]/.test(id))
            return "vendor-mui";
          // @emotion держим в том же чанке, что и @mui: разделение создаёт
          // циклическую зависимость между чанками и TDZ-ошибку при загрузке.
          if (/[\\/]node_modules[\\/]@emotion[\\/]/.test(id))
            return "vendor-mui";
          if (/[\\/]node_modules[\\/](moment|moment-timezone|dayjs)[\\/]/.test(id))
            return "vendor-dates";
          if (/[\\/]node_modules[\\/](@ton|ton|ton-core|ton-crypto|tonweb|@tonconnect|ton-vote-contracts-sdk)[\\/]/.test(id))
            return "vendor-ton";
          if (/[\\/]node_modules[\\/]@tma\.js[\\/]/.test(id))
            return "vendor-tma";
          if (/[\\/]node_modules[\\/](@tanstack|axios|axios-retry|lodash)[\\/]/.test(id))
            return "vendor-utils";
        },
      },
    },
  },
});
