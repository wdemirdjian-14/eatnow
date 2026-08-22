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
        // 44 px : en dessous, la cible est plus petite que le doigt et le
        // menu natif se déclenche une fois sur deux.
        style={compact ? { width: 'auto', maxWidth: 150, padding: '.5rem .6rem', borderRadius: 999, minHeight: 44 } : undefined}
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
