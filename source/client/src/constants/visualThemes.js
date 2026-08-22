export const DEFAULT_VISUAL_THEME = 'aurora-ledger';

export const visualThemes = [
  {
    id: 'aurora-ledger',
    name: 'Aurora Ledger',
    tagline: 'Fintech premium con acentos violeta y superficies luminosas.',
    preview: ['#f7f5ff', '#ffffff', '#6d5dfc', '#111827'],
  },
  {
    id: 'executive-light',
    name: 'Executive Light',
    tagline: 'Minimalista, claro y sobrio para operación diaria.',
    preview: ['#f6f7f5', '#ffffff', '#f06f36', '#171712'],
  },
  {
    id: 'obsidian-flow',
    name: 'Obsidian Flow',
    tagline: 'Panel oscuro sofisticado con contraste de alto nivel.',
    preview: ['#070b18', '#11172a', '#7c5cff', '#e9ecff'],
  },
  {
    id: 'coral-ledger',
    name: 'Coral Ledger',
    tagline: 'Cálido, editorial y cercano sin perder precisión financiera.',
    preview: ['#fff8f1', '#ffffff', '#e85d3f', '#1c1a17'],
  },
];

export const getVisualTheme = (themeId) => (
  visualThemes.find((theme) => theme.id === themeId) || visualThemes[0]
);
