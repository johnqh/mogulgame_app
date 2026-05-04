import { LocalizedLink as SharedLocalizedLink } from '@sudobility/components';
import { isLanguageSupported } from '../../config/constants';
import type { ComponentProps } from 'react';

type Props = Omit<
  ComponentProps<typeof SharedLocalizedLink>,
  'isLanguageSupported' | 'defaultLanguage'
>;

/**
 * Thin wrapper around the shared `LocalizedLink` that pre-fills the
 * language validation function and default language so consumers only
 * need to provide `to` and optional styling props.
 */
export default function LocalizedLink(props: Props) {
  return (
    <SharedLocalizedLink
      {...props}
      isLanguageSupported={isLanguageSupported}
      defaultLanguage="en"
    />
  );
}
