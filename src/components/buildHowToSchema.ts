export interface HowToStep {
  name: string;
  text: string;
}

/**
 * Build a HowTo structured data schema from localized steps.
 *
 * @example
 * ```tsx
 * const howToSchema = buildHowToSchema(
 *   t('howto:home.name'),
 *   t('howto:home.description'),
 *   t('howto:home.steps', { returnObjects: true })
 * );
 * ```
 */
export function buildHowToSchema(
  name: string,
  description: string,
  steps: HowToStep[]
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    step: steps.map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: step.name,
      text: step.text,
    })),
  };
}
