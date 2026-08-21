import { LANGS, LANG_META, type Lang } from '../types'
import { useStore } from '../store/store'

/** Sélecteur de langue d'affichage du site public. */
export function LanguagePicker({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useStore()
  return (
    <label className={compact ? 'row gap-xs' : 'field'}>
      {!compact && <span>Langue</span>}
      <span className="sr-only">Langue d’affichage</span>
      <select
        className="select"
        style={compact ? { width: 'auto', maxWidth: 128, padding: '.4rem .5rem', borderRadius: 999, minHeight: 38 } : undefined}
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
      >
        {LANGS.map((l) => (
          <option key={l} value={l}>{LANG_META[l].flag} {LANG_META[l].native}</option>
        ))}
      </select>
    </label>
  )
}
