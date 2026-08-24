/** UI string catalog — FR/AR/EN, Morocco-first (§18). Default: fr. */
type Strings<T extends string> = Record<T, { fr: string | string[]; ar: string | string[]; en: string | string[] }>;

export const UI_STRINGS: Strings<'MAIN_NAV' | 'COMMAND_CENTER' | 'LOGIN' | 'SHELL' | 'ACTION' | 'CLOSE_SESSION' | 'ERROR' | 'LOGGED_IN' | 'DARK' | 'COMFORTABLE' | 'DETAILED'> = {
  MAIN_NAV: {
    fr: ['Brief du jour', "Aujourd'hui", 'Briefs', 'Réservations', 'Calendrier', 'Flotte', 'Clients', 'Contrats', 'Positions', 'Terrain (PWA)', 'Caisse & finances', 'Rapports', 'Alertes'],
    ar: ['البرef', 'اليوم', 'الBriefs', 'الحجوزات', 'التقويم', 'الأسطول', 'العملاء', 'العقود', 'المواقع', 'الأرض (PWA)', 'المالية والتقارير', 'التنبيهات'],
    en: ['Brief of the day', 'Today', 'Briefs', 'Reservations', 'Calendar', 'Fleet', 'Customers', 'Contracts', 'Map', 'Field (PWA)', 'Cash & finance', 'Reports', 'Alerts'],
  },
  COMMAND_CENTER: {
    fr: 'Centre de commandement', ar: 'مركز القيادة', en: 'Command Center',
  },
  LOGIN: {
    fr: 'Connexion', ar: 'تسجيل الدخول', en: 'Login',
  },
  SHELL: {
    fr: 'locaOS', ar: 'locaOS', en: 'locaOS',
  },
  ACTION: {
    fr: 'Action', ar: 'إجراء', en: 'Action',
  },
  CLOSE_SESSION: {
    fr: 'Clôture de session', ar: 'إغلاق الجلسة', en: 'Close Session',
  },
  ERROR: {
    fr: 'Erreur', ar: 'خطأ', en: 'Error',
  },
  LOGGED_IN: {
    fr: 'Connecté en tant que', ar: 'متصل como', en: 'Logged in as',
  },
  DARK: {
    fr: 'Sombre', ar: 'داكن', en: 'Dark',
  },
  COMFORTABLE: {
    fr: 'Confortable', ar: 'مريح', en: 'Comfortable',
  },
  DETAILED: {
    fr: 'Détail', ar: 'تفصيلي', en: 'Detailed',
  },
};

export type { Strings };