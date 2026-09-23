import HandGlyph from './HandGlyph'

/** Wordmark for the account screens: a drawn peace sign over the highlighted name. */
export default function Logo({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex flex-col items-center mb-8 text-center">
      <HandGlyph raised={['index', 'middle']} className="w-12 text-pen -rotate-6 mb-2" />
      <h1 className="font-marker text-5xl leading-none"><span className="hi">fingle</span></h1>
      {subtitle && <p className="text-pen-soft mt-3">{subtitle}</p>}
    </div>
  )
}
