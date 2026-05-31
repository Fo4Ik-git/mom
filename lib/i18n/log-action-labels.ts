import type { LogEntry } from "@/lib/logger/log-entry";

/** Human-readable labels for `action` keys from audit logs. */
const LABELS: Record<string, { en: string; uk: string }> = {
  "auth.signup": { en: "User registration", uk: "Реєстрація користувача" },
  "auth.signin_check": { en: "Sign-in check", uk: "Перевірка входу" },
  "auth.access_key_validate": {
    en: "Access key validation",
    uk: "Перевірка ключа доступу",
  },
  "auth.oauth_callback": { en: "OAuth sign-in", uk: "Вхід через OAuth" },
  "cron.access_expiry": {
    en: "Scheduled access expiry job",
    uk: "Планове завершення доступу",
  },
  "calculator.view_by_slug": {
    en: "Open calculator by link",
    uk: "Відкриття калькулятора за посиланням",
  },
  "calculator.create": { en: "Create calculator", uk: "Створення калькулятора" },
  "calculator.list": { en: "List calculators", uk: "Список калькуляторів" },
  "calculator.read": { en: "Open calculator", uk: "Перегляд калькулятора" },
  "calculator.update": { en: "Update calculator", uk: "Оновлення калькулятора" },
  "calculator.delete": { en: "Delete calculator", uk: "Видалення калькулятора" },
  "calculator.share.grant": {
    en: "Share calculator (grant)",
    uk: "Надання доступу до калькулятора",
  },
  "calculator.share.revoke": {
    en: "Share calculator (revoke)",
    uk: "Скасування доступу до калькулятора",
  },
  "calculator.share.list": {
    en: "List calculator shares",
    uk: "Список доступів до калькулятора",
  },
  "admin.audit.read": { en: "View application logs", uk: "Перегляд логів" },
  "admin.stats.read": {
    en: "View admin statistics",
    uk: "Перегляд статистики адмінки",
  },
  "admin.settings.read": {
    en: "View admin settings",
    uk: "Перегляд налаштувань",
  },
  "admin.settings.update": {
    en: "Update admin settings",
    uk: "Оновлення налаштувань",
  },
  "admin.access_key.create": {
    en: "Create access key",
    uk: "Створення ключа доступу",
  },
  "admin.access_key.update": {
    en: "Update access key",
    uk: "Оновлення ключа доступу",
  },
  "admin.access_key.delete": {
    en: "Delete access key",
    uk: "Видалення ключа доступу",
  },
  "admin.access_key.list": {
    en: "List access keys",
    uk: "Список ключів доступу",
  },
  "admin.access_expiry.status": {
    en: "Check access expiry status",
    uk: "Статус завершення доступу",
  },
  "admin.access_expiry.run": {
    en: "Run access expiry check",
    uk: "Запуск перевірки доступу",
  },
  "admin.user.create": { en: "Create user", uk: "Створення користувача" },
  "admin.user.update": { en: "Update user", uk: "Оновлення користувача" },
  "admin.user.delete": { en: "Delete user", uk: "Видалення користувача" },
  "admin.user.list": { en: "List users", uk: "Список користувачів" },
  "admin.user.dismiss_issue": {
    en: "Dismiss user issue",
    uk: "Зняття проблеми з користувача",
  },
  "admin.calculator.read": {
    en: "View calculator (admin)",
    uk: "Перегляд калькулятора (адмін)",
  },
  "admin.calculator.list": {
    en: "List calculators (admin)",
    uk: "Список калькуляторів (адмін)",
  },
  "admin.calculator.update": {
    en: "Update calculator (admin)",
    uk: "Оновлення калькулятора (адмін)",
  },
  "admin.calculator.delete": {
    en: "Delete calculator (admin)",
    uk: "Видалення калькулятора (адмін)",
  },
  "admin.calculator.share.grant": {
    en: "Grant calculator share (admin)",
    uk: "Надання доступу (адмін)",
  },
  "admin.calculator.share.revoke": {
    en: "Revoke calculator share (admin)",
    uk: "Скасування доступу (адмін)",
  },
  "admin.calculator.shares.list": {
    en: "List calculator shares (admin)",
    uk: "Список доступів (адмін)",
  },
  "user.quota.read": { en: "View AI quota", uk: "Перегляд квоти AI" },
};

const SEGMENT_UK: Record<string, string> = {
  admin: "Адмін",
  auth: "Авторизація",
  calculator: "Калькулятор",
  cron: "Cron",
  user: "Користувач",
  create: "створення",
  update: "оновлення",
  delete: "видалення",
  read: "перегляд",
  list: "список",
  grant: "надання",
  revoke: "скасування",
  share: "доступ",
  signup: "реєстрація",
  stats: "статистика",
  settings: "налаштування",
};

const SEGMENT_EN: Record<string, string> = {
  admin: "Admin",
  auth: "Auth",
  calculator: "Calculator",
  cron: "Cron",
  user: "User",
  create: "create",
  update: "update",
  delete: "delete",
  read: "view",
  list: "list",
  grant: "grant",
  revoke: "revoke",
  share: "share",
  signup: "signup",
  stats: "statistics",
  settings: "settings",
};

function humanizeAction(action: string, locale: string): string {
  const uk = locale.startsWith("uk");
  const map = uk ? SEGMENT_UK : SEGMENT_EN;
  const parts = action.split(/[._]/).filter(Boolean);
  if (parts.length === 0) {
    return action;
  }
  return parts
    .map((part, i) => {
      const known = map[part];
      if (known) {
        return i === 0 && uk ? known : known;
      }
      return part.replace(/_/g, " ");
    })
    .join(uk ? " · " : " · ");
}

export function getLogActionLabel(action: string, locale: string): string {
  const row = LABELS[action];
  if (row) {
    return locale.startsWith("uk") ? row.uk : row.en;
  }
  return humanizeAction(action, locale);
}

export function formatLogEntryTitle(
  entry: Pick<LogEntry, "action" | "event" | "msg" | "http_method" | "path">,
  locale: string,
): { primary: string; secondary?: string } {
  if (entry.action) {
    const primary = getLogActionLabel(entry.action, locale);
    const secondary =
      entry.http_method && entry.path
        ? `${entry.http_method} ${entry.path}`
        : entry.action;
    return {
      primary,
      secondary: secondary !== primary ? secondary : undefined,
    };
  }
  if (entry.event) {
    return { primary: entry.event };
  }
  return { primary: entry.msg ?? "—" };
}
