import { useMemo, useState, useSyncExternalStore } from 'react'
import { getCountries, getCountryCallingCode } from 'libphonenumber-js/max'
import { ChevronDown } from 'lucide-react'
import type { CountryCode } from 'libphonenumber-js/max'
import type { Ref } from 'react'
import { InputGroup, InputGroupInput } from '@/components/ui/input-group'
import { useT } from '@/lib/i18n'
import { composePhone, normalizePhone, splitPhone } from '@/lib/phone'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/ui-store'

/** Where customers' numbers usually come from; listed first in the picker. */
const FREQUENT: Array<CountryCode> = [
  'US',
  'MX',
  'GT',
  'SV',
  'HN',
  'NI',
  'CR',
  'PA',
  'CU',
  'DO',
  'PR',
  'CO',
  'VE',
  'EC',
  'PE',
  'ES',
]

const noopSubscribe = () => () => {}

function useCountryOptions(locale: string) {
  // Region names come from the runtime's ICU data, which can differ between
  // the Worker and the browser. Using them only after hydration keeps the
  // server HTML and the first client render identical.
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
  return useMemo(() => {
    const names = hydrated
      ? new Intl.DisplayNames([locale], { type: 'region' })
      : null
    const option = (code: CountryCode) => ({
      code,
      label: `${names?.of(code) ?? code} (+${getCountryCallingCode(code)})`,
    })
    const all = getCountries().map(option)
    if (names) all.sort((a, b) => a.label.localeCompare(b.label, locale))
    return { frequent: FREQUENT.map(option), all }
  }, [hydrated, locale])
}

/**
 * Country picker + number, emitting one string for the form: E.164 once the
 * number parses, otherwise what was typed so validation can say what's wrong.
 * An empty field has no country preselected: the owner picks the number's
 * country on purpose instead of getting a silent +1.
 */
export function PhoneInput({
  id,
  ref,
  value,
  onChange,
  onBlur,
  invalid,
  autoComplete = 'tel-national',
}: {
  id?: string
  ref?: Ref<HTMLInputElement>
  value: string | null | undefined
  onChange: (value: string) => void
  onBlur?: () => void
  invalid?: boolean
  autoComplete?: string
}) {
  const t = useT()
  const options = useCountryOptions(useUiStore((s) => s.locale))
  const current = value ?? ''
  const [state, setState] = useState(() => ({
    ...splitPhone(current),
    emitted: current,
  }))
  // Changed from outside (form reset): re-derive the country and the number.
  if (current !== state.emitted) {
    setState({ ...splitPhone(current), emitted: current })
  }

  const update = (country: CountryCode | undefined, national: string) => {
    const next = composePhone(country, national)
    setState({ country, national, emitted: next })
    if (next !== state.emitted) onChange(next)
  }

  // A complete number is shown the local way, and a pasted "+52…" moves its
  // country into the picker.
  const handleBlur = () => {
    const valid = normalizePhone(composePhone(state.country, state.national))
    if (valid) {
      const parts = splitPhone(valid)
      if (parts.country) update(parts.country, parts.national)
    }
    onBlur?.()
  }

  return (
    <InputGroup>
      <div className="border-input hover:bg-muted/50 relative flex h-full shrink-0 items-center gap-1 rounded-l-md border-r pr-2 pl-3 text-sm">
        <span className={cn(!state.country && 'text-muted-foreground')}>
          {state.country
            ? `${state.country} +${getCountryCallingCode(state.country)}`
            : t.phone.chooseCountry}
        </span>
        <ChevronDown className="text-muted-foreground size-4" />
        {/* Native select (the best picker on phones) laid invisibly over the
            label. Browsers draw the open menu with the select's own colors. */}
        <select
          data-slot="input-group-control"
          aria-label={t.phone.country}
          value={state.country ?? ''}
          onChange={(e) =>
            update(e.target.value as CountryCode, state.national)
          }
          className="bg-popover text-popover-foreground absolute inset-0 cursor-pointer text-base opacity-0"
        >
          <option value="" disabled>
            {t.phone.chooseCountry}
          </option>
          <optgroup label={t.phone.frequent}>
            {options.frequent.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </optgroup>
          <optgroup label={t.phone.allCountries}>
            {options.all.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </optgroup>
        </select>
      </div>
      <InputGroupInput
        id={id}
        ref={ref}
        type="tel"
        inputMode="tel"
        autoComplete={autoComplete}
        value={state.national}
        onChange={(e) => update(state.country, e.target.value)}
        onBlur={handleBlur}
        aria-invalid={invalid}
      />
    </InputGroup>
  )
}
