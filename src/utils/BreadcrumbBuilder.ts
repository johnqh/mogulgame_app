import { extractLanguageFromPath, removeLanguageFromPath } from './languageRouting';

export interface BreadcrumbPath {
  title: string;
  path: string;
}

export class BreadcrumbBuilder {
  private static instance: BreadcrumbBuilder;

  private dynamicTitles: Map<string, string> = new Map();
  private listeners: Set<() => void> = new Set();
  private version: number = 0;

  private constructor() {}

  public getVersion(): number {
    return this.version;
  }

  public static getInstance(): BreadcrumbBuilder {
    if (!BreadcrumbBuilder.instance) {
      BreadcrumbBuilder.instance = new BreadcrumbBuilder();
    }
    return BreadcrumbBuilder.instance;
  }

  public setDynamicTitle(path: string, title: string): void {
    const normalizedPath = this.normalizePath(path);
    this.dynamicTitles.set(normalizedPath, title);
    this.notifyListeners();
  }

  public clearDynamicTitle(path: string): void {
    const normalizedPath = this.normalizePath(path);
    this.dynamicTitles.delete(normalizedPath);
    this.notifyListeners();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.version++;
    this.listeners.forEach(listener => listener());
  }

  private normalizePath(path: string): string {
    const pathWithoutLang = removeLanguageFromPath(path);
    let normalized = pathWithoutLang;
    if (normalized !== '/' && normalized.endsWith('/')) {
      normalized = normalized.replace(/\/+$/, '');
    }
    return normalized.toLowerCase();
  }

  private readonly pathTranslationKeys: Record<string, string> = {
    '': 'breadcrumbs.home',
    '/': 'breadcrumbs.home',
    '/docs': 'breadcrumbs.docs',
    '/histories': 'breadcrumbs.histories',
    '/settings': 'breadcrumbs.settings',
    '/sitemap': 'breadcrumbs.sitemap',
    '/login': 'breadcrumbs.login',
    '/privacy': 'breadcrumbs.privacy',
    '/terms': 'breadcrumbs.terms',
  };

  public localizedBreadcrumb(path: string, t: (key: string) => string): string {
    const normalizedPath = this.normalizePath(path);

    const dynamicTitle = this.dynamicTitles.get(normalizedPath);
    if (dynamicTitle) {
      return dynamicTitle;
    }

    const translationKey = this.pathTranslationKeys[normalizedPath];
    if (translationKey) {
      return t(translationKey);
    }

    const segments = normalizedPath.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    if (lastSegment) {
      const segmentKey = `breadcrumbs.${lastSegment}`;
      const translated = t(segmentKey);
      if (translated !== segmentKey) {
        return translated;
      }

      return lastSegment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    return normalizedPath;
  }

  public localizedBreadcrumbs(
    path: string | undefined,
    t: (key: string) => string
  ): BreadcrumbPath[] {
    if (!path) return [];

    let cleanPath = path;
    if (cleanPath !== '/' && cleanPath.endsWith('/')) {
      cleanPath = cleanPath.replace(/\/+$/, '');
    }

    const lang = extractLanguageFromPath(cleanPath);
    const pathWithoutLang = removeLanguageFromPath(cleanPath);

    if (!pathWithoutLang || pathWithoutLang === '/') {
      return [
        {
          title: t('breadcrumbs.home'),
          path: lang ? `/${lang}` : '/',
        },
      ];
    }

    const segments = pathWithoutLang.split('/').filter(Boolean);
    const result: BreadcrumbPath[] = [];

    result.push({
      title: t('breadcrumbs.home'),
      path: lang ? `/${lang}` : '/',
    });

    let currentPath = lang ? `/${lang}` : '';
    for (const segment of segments) {
      currentPath += `/${segment}`;
      const title = this.localizedBreadcrumb(currentPath, t);
      result.push({
        title,
        path: currentPath,
      });
    }

    return result;
  }

  public getLocalizedBreadcrumbItems(path: string, t: (key: string) => string) {
    const breadcrumbs = this.localizedBreadcrumbs(path, t);

    return breadcrumbs.map((breadcrumb, index) => ({
      label: breadcrumb.title,
      href: index === breadcrumbs.length - 1 ? undefined : breadcrumb.path,
      current: index === breadcrumbs.length - 1,
    }));
  }
}
