import type { Metadata } from 'next';
import { DICTIONARY, GLOSSARY_CATEGORIES } from '@/lib/financialDictionary';
import { GlossaryClient } from '@/components/glossary/GlossaryClient';

const DESC =
  'מילון פיננסי בעברית פשוטה: מכפיל רווח, בטא, דיבידנד, RSI, שוק שורי ודובי, פיזור סיכונים ועוד עשרות מונחים שכל סוחר חייב להכיר — עם הסברים ברורים ודוגמאות.';

export const metadata: Metadata = {
  title: 'מילון המשקיע — כל מונחי הבורסה בעברית פשוטה',
  description: DESC,
  alternates: { canonical: '/glossary' },
  openGraph: {
    title: 'מילון המשקיע | תשואה',
    description: DESC,
    type: 'website',
  },
};

export default function GlossaryPage() {
  // JSON-LD DefinedTermSet — helps each term surface in Google (the whole
  // point of a Hebrew glossary: organic discovery). Escape "<" so a term
  // string can never break out of the <script> tag.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'מילון המשקיע של תשואה',
    description: DESC,
    hasDefinedTerm: GLOSSARY_CATEGORIES.flatMap(c => c.terms).map(k => ({
      '@type': 'DefinedTerm',
      name: DICTIONARY[k].term,
      description: DICTIONARY[k].text,
      inDefinedTermSet: 'https://tsua-rho.vercel.app/glossary',
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <GlossaryClient />
    </>
  );
}
