// Every published page. Drives the shared shell (scripts/apply-shell.mjs):
//   nav    - header link marked aria-current (null on / and 404)
//   crumbs - visible path line and BreadcrumbList, root first: [label, href, ldName?].
//            Labels are each page's existing crumb text; ldName keeps the case of an
//            existing BreadcrumbList name.
//   ogCard - Open Graph card rendered by scripts/og-cards.mjs (Task 22)
const root = ['srelens', '/'];
const docs = ['Docs', '/docs/'];
const compare = ['compare', '/compare/', 'Compare'];
const guides = ['SRE guides', '/guides/'];

export const PAGES = [
  { file: 'index.html', nav: null, crumbs: null },
  { file: 'features/index.html', nav: '/features/', crumbs: [root, ['features', '/features/', 'Features']] },
  { file: 'tui/index.html', nav: '/tui/', crumbs: [root, ['tui', '/tui/', 'TUI']], ogCard: 'og-tui.png' },
  { file: 'mcp/index.html', nav: '/mcp/', crumbs: [root, ['mcp', '/mcp/', 'MCP']] },
  { file: 'compare/index.html', nav: '/compare/', crumbs: [root, compare] },
  { file: 'compare/lens/index.html', nav: '/compare/', crumbs: [root, compare, ['lens', '/compare/lens/', 'Lens']] },
  { file: 'compare/headlamp/index.html', nav: '/compare/', crumbs: [root, compare, ['headlamp', '/compare/headlamp/', 'Headlamp']] },
  { file: 'compare/k9s/index.html', nav: '/compare/', crumbs: [root, compare, ['k9s', '/compare/k9s/', 'K9s']] },
  { file: 'compare/freelens/index.html', nav: '/compare/', crumbs: [root, compare, ['freelens', '/compare/freelens/', 'Freelens']] },
  { file: 'compare/aptakube/index.html', nav: '/compare/', crumbs: [root, compare, ['aptakube', '/compare/aptakube/', 'Aptakube']] },
  { file: 'compare/kubernetes-dashboard/index.html', nav: '/compare/', crumbs: [root, compare, ['kubernetes dashboard', '/compare/kubernetes-dashboard/', 'Kubernetes Dashboard']] },
  { file: 'download/index.html', nav: '/download/', crumbs: [root, ['download', '/download/', 'Download']] },
  { file: 'faq/index.html', nav: '/faq/', crumbs: [root, ['faq', '/faq/', 'FAQ']] },
  { file: 'docs/index.html', nav: '/docs/', crumbs: [root, ['Documentation', '/docs/']], ogCard: 'og-docs.png' },
  { file: 'docs/tui/index.html', nav: '/docs/', crumbs: [root, docs, ['Terminal UI (srelens-tui)', '/docs/tui/']], ogCard: 'og-docs-tui.png' },
  { file: 'docs/tui.html', mirrorOf: 'docs/tui/index.html' },
  { file: 'security/index.html', nav: '/docs/', crumbs: [root, docs, ['Security', '/security/']], ogCard: 'og-security.png' },
  { file: 'architecture/index.html', nav: '/docs/', crumbs: [root, docs, ['Architecture', '/architecture/']], ogCard: 'og-architecture.png' },
  { file: 'guides/index.html', nav: '/docs/', crumbs: [root, docs, guides], ogCard: 'og-guides.png' },
  { file: 'guides/crashloopbackoff/index.html', nav: '/docs/', crumbs: [root, guides, ['CrashLoopBackOff', '/guides/crashloopbackoff/']], ogCard: 'og-guides-crashloopbackoff.png' },
  { file: 'guides/oomkilled/index.html', nav: '/docs/', crumbs: [root, guides, ['OOMKilled', '/guides/oomkilled/']], ogCard: 'og-guides-oomkilled.png' },
  { file: 'guides/failed-deployment/index.html', nav: '/docs/', crumbs: [root, guides, ['Failed deployment', '/guides/failed-deployment/']], ogCard: 'og-guides-failed-deployment.png' },
  { file: '404.html', nav: null, crumbs: null },
];

export const page = (file) => PAGES.find((p) => p.file === file);
