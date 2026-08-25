/** UI string catalog — FR/AR/EN, Morocco-first (§18). Default: fr. */
export type Locale = 'fr' | 'ar' | 'en';
export type LocalizedString = Record<Locale, string>;
export type LocalizedNav = Record<Locale, string[]>;

export const UI_STRINGS = {
  MAIN_NAV: {
    fr: ['Brief du jour', "Aujourd'hui", 'Briefs', 'Réservations', 'Calendrier', 'Flotte', 'Clients', 'Contrats', 'Positions', 'Terrain (PWA)', 'Caisse & finances', 'Rapports', 'Alertes'],
    ar: ['البرef', 'اليوم', 'الBriefs', 'الحجوزات', 'التقويم', 'الأسطول', 'العملاء', 'العقود', 'المواقع', 'الأرض (PWA)', 'المالية والتقارير', 'التنبيهات'],
    en: ['Brief of the day', 'Today', 'Briefs', 'Reservations', 'Calendar', 'Fleet', 'Customers', 'Contracts', 'Map', 'Field (PWA)', 'Cash & finance', 'Reports', 'Alerts'],
  } satisfies LocalizedNav,
  COMMAND_CENTER: {
    fr: 'Centre de commandement', ar: 'مركز القيادة', en: 'Command Center',
  } satisfies LocalizedString,
  LOGIN: {
    fr: 'Connexion', ar: 'تسجيل الدخول', en: 'Login',
  } satisfies LocalizedString,
  SHELL: {
    fr: 'locaOS', ar: 'locaOS', en: 'locaOS',
  } satisfies LocalizedString,
  ACTION: {
    fr: 'Action', ar: 'إجراء', en: 'Action',
  } satisfies LocalizedString,
  CLOSE_SESSION: {
    fr: 'Clôture de session', ar: 'إغلاق الجلسة', en: 'Close Session',
  } satisfies LocalizedString,
  ERROR: {
    fr: 'Erreur', ar: 'خطأ', en: 'Error',
  } satisfies LocalizedString,
  LOGGED_IN: {
    fr: 'Connecté en tant que', ar: 'متصل كما', en: 'Logged in as',
  } satisfies LocalizedString,
  DARK: {
    fr: 'Sombre', ar: 'داكن', en: 'Dark',
  } satisfies LocalizedString,
  COMFORTABLE: {
    fr: 'Confortable', ar: 'مريح', en: 'Comfortable',
  } satisfies LocalizedString,
  DETAILED: {
    fr: 'Détail', ar: 'تفصيلي', en: 'Detailed',
  } satisfies LocalizedString,
} as const;

export const FLEET_STRINGS = {
  fr: { title: 'Flotte', vehicles: 'véhicules', loading: 'Chargement de la flotte…', plate: 'Immatriculation', model: 'Modèle', category: 'Catégorie', status: 'Statut', mileage: 'Kilométrage', fuel: 'Carburant', emptyTitle: 'Aucun véhicule', emptyDescription: 'Aucun véhicule dans la flotte' },
  ar: { title: 'الأسطول', vehicles: 'سيارات', loading: 'جارٍ تحميل الأسطول…', plate: 'رقم التسجيل', model: 'الطراز', category: 'الفئة', status: 'الحالة', mileage: 'الكيلومترات', fuel: 'الوقود', emptyTitle: 'لا توجد سيارات', emptyDescription: 'لا توجد سيارات في الأسطول' },
  en: { title: 'Fleet', vehicles: 'vehicles', loading: 'Loading fleet…', plate: 'Registration', model: 'Model', category: 'Category', status: 'Status', mileage: 'Mileage', fuel: 'Fuel', emptyTitle: 'No vehicles', emptyDescription: 'There are no vehicles in the fleet' },
} as const;

export const FOCUS_STRINGS = {
  fr: { title: 'Mode Focus', question: 'Que faire maintenant ?', pickups: "départ(s) aujourd'hui", returns: "retour(s) aujourd'hui", noPickups: 'Aucun départ programmé.', noReturns: 'Aucun retour programmé.', priorities: 'Prioritaires', overdueTasks: 'tâche(s) en retard', unresolvedBlockers: 'blocage(s) non résolu(s)', inspectionsPending: 'Inspection(s) en attente', contractActions: 'action(s) contrat', noContractActions: 'Aucune action contrat immédiate.', ready: 'Prêt', blockers: 'blocage(s)', inspected: 'Inspecté', inspectionPending: 'Inspection à faire', contract: 'Contrat', print: 'Imprimer', prepareContract: 'Préparer le contrat', inspectVehicle: 'Inspecter le véhicule', loading: 'Chargement du mode Focus…', error: 'Impossible de charger le mode Focus.' },
  ar: { title: 'وضع التركيز', question: 'ماذا يجب أن أفعل الآن؟', pickups: 'مغادرة اليوم', returns: 'عودة اليوم', noPickups: 'لا توجد مغادرات مجدولة.', noReturns: 'لا توجد عودات مجدولة.', priorities: 'الأولويات', overdueTasks: 'مهمة متأخرة', unresolvedBlockers: 'عوائق غير محلولة', inspectionsPending: 'فحوصات معلقة', contractActions: 'إجراء تعاقدي', noContractActions: 'لا توجد إجراءات تعاقدية فورية.', ready: 'جاهز', blockers: 'عائق', inspected: 'تم الفحص', inspectionPending: 'الفحص مطلوب', contract: 'العقد', print: 'طباعة', prepareContract: 'تحضير العقد', inspectVehicle: 'فحص السيارة', loading: 'جارٍ تحميل وضع التركيز…', error: 'تعذر تحميل وضع التركيز.' },
  en: { title: 'Focus Mode', question: 'What do I need to do now?', pickups: 'pickup(s) today', returns: 'return(s) today', noPickups: 'No pickups scheduled.', noReturns: 'No returns scheduled.', priorities: 'Priorities', overdueTasks: 'overdue task(s)', unresolvedBlockers: 'unresolved blocker(s)', inspectionsPending: 'inspection(s) pending', contractActions: 'contract action(s)', noContractActions: 'No immediate contract actions.', ready: 'Ready', blockers: 'blocker(s)', inspected: 'Inspected', inspectionPending: 'Inspection needed', contract: 'Contract', print: 'Print', prepareContract: 'Prepare contract', inspectVehicle: 'Inspect vehicle', loading: 'Loading Focus Mode…', error: 'Unable to load Focus Mode.' },
} as const;
