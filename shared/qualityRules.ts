export const qualityRuleDefinitions = [
  {
    id: 'check1',
    label: 'Format & Style - Front Page Title Uppercase',
    definition:
      'Confirm that only the main report title on the front page is written entirely in capital letters.',
    guidance: [
      'Exclude organization/entity names from uppercase enforcement.',
      'Do not change capitalization for organization names',
      'Apply uppercase normalization to the principal report title line only.',
    ],
    toolingHint:
      'Use title-line detection and casing checks while skipping organization/subtitle lines.',
  },
  {
    id: 'check2',
    label: 'Content - Observation Title/Body Overlap',
    definition:
      'Check whether at least 50% of words from a section title appear in that section body/content.',
    guidance: [
      'Preserve observation/section titles; do not rewrite headings for this check.',
      'Fix overlap by revising only body sentence(s) to include key title terms.',
    ],
    toolingHint:
      'Use token overlap (similarity) between title and section body text.',
  },
  {
    id: 'check3',
    label: 'Content - Heavy Jargon',
    definition: 'Detect heavy/jargon language and suggest simpler alternatives.',
    guidance: [
      'Preferred simplifications include:',
      '"on account of the fact that" -> "because"',
      '"In possession of" -> "Have"',
      '"A large number of" -> "Many"',
      '"made a statement saying" -> "stated"',
      '"In the vicinity of" -> "Near"',
      '"admin" -> "administration"',
      '"vs" -> "compared to"',
      '"in order to" -> "to"',
    ],
    toolingHint:
      'Use phrase dictionary lookup and rewrite generation for replacements.',
  },
  {
    id: 'check4',
    label: 'Content - Stop/Bad Words Frequency',
    definition: 'Detect weak words from the configured stop/bad-word set.',
    guidance: [
      '[a bit, a little, a lot, almost, arguably, barely, basically, close to, exactly, fairly, ideate, just, kind of, like, literally, most, nearly, occasionally, often, ponder, practically, quite, really, several, severely, slightly, some, somewhat, sort of, study, surely, think about, think through, truly, usually, few, divers, certain, considerable, handful, numerous, rare, various, countless, crowded, myriad, populous]',
    ],
    toolingHint:
      'Use keyword frequency/counting against the configured word list.',
  },
  {
    id: 'check5',
    label: 'Format & Style - Month Abbreviations',
    definition:
      'Allowed short forms are May, June, and July. Other month abbreviations should be expanded.',
    guidance: ['Jan, Feb, Mar, Apr, Aug, Sept, Oct, Nov, Dec.'],
    toolingHint: 'Use regex-based month abbreviation detection.',
    contributesToAbbreviatedMonthsScore: true,
  },
  {
    id: 'check6',
    label: 'Format & Style - UK Number Formatting',
    definition:
      'Evaluate consistency with UK English number conventions for separators and grouped values.',
    guidance: [
      'Comma for thousands.',
      'Decimal point for decimals.',
      'For numbers ending with k, do not allow decimals in very large grouped values.',
      'For numbers ending with m, comma is allowed as a thousands separator.',
      'For numbers ending with m, allow decimal point only when no thousands comma is present.',
      'No spaces inside numbers.',
      'Examples:',
      'Valid: 1,234 ; 5.34m ; 25m ; 250k',
      'Invalid: 1 234 ; 1.234 (as thousands) ; 1,2m ; 250.5k (when grouped with comma)',
    ],
    toolingHint: 'Use numeric pattern parsing and format validation rules.',
  },
  {
    id: 'check7',
    label: 'Format & Style - Currency Symbol Policy',
    definition:
      'Currency symbols $, ₦, £, Fr. should be written as USD, Naira, GBP, CHF.',
    toolingHint: 'Use symbol detection and canonical text replacement mapping.',
  },
  {
    id: 'check8',
    label: 'Content - UK Spelling',
    definition:
      'Check spelling in section content using UK English and the enchant library with rule-specific exclusions.',
    guidance: [
      'Exclude words consisting only of capital letters (likely abbreviations).',
      "Exclude all-caps words ending with 's' (case-insensitive), e.g., SKUs, CDEs.",
      "Exclude numbers followed by 'k' or 'm' (case-insensitive), including decimals.",
      "Exclude text chunks containing two valid words separated by '/'.",
      'Exclude potential names and surnames (heuristic exclusion).',
      'Exclude numbers followed by measurement units, e.g., 100ml, 1kg.',
      "Exclude 'e.g.' and 'i.e.' patterns.",
      'Treat these as valid dictionary additions: Pepsi-Co, reputational, kCal, megajoule.',
    ],
    toolingHint:
      'Use UK dictionary spell-checking with configurable allow/ignore patterns.',
  },
  {
    id: 'check9',
    label: 'Content - Double/Triple Spaces',
    definition: 'Detect double or triple spaces between words.',
    toolingHint: 'Use whitespace regex detection.',
  },
] as const

export type QualityRuleDefinition = (typeof qualityRuleDefinitions)[number]
export type QualityCheckId = QualityRuleDefinition['id']
