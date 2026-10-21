export function currencyFractionDigits(currency) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency })
    .resolvedOptions()
    .maximumFractionDigits
}

export function parsePriceToMinorUnits(value, currency) {
  const fractionDigits = currencyFractionDigits(currency)
  const match = String(value).trim().match(/^(\d+)(?:\.(\d+))?$/)
  if (!match || (match[2]?.length || 0) > fractionDigits) {
    throw new TypeError(`Enter a valid ${currency} price with no more than ${fractionDigits} decimal places.`)
  }

  const fractional = (match[2] || '').padEnd(fractionDigits, '0')
  const minorUnits = BigInt(match[1]) * (10n ** BigInt(fractionDigits))
    + BigInt(fractional || '0')
  if (minorUnits > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new TypeError('Price is too large.')
  }
  return Number(minorUnits)
}

export function minorUnitsToPriceInput(amountMinor, currency) {
  const fractionDigits = currencyFractionDigits(currency)
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new TypeError('Price must be a non-negative integer in minor currency units.')
  }
  if (fractionDigits === 0) return String(amountMinor)

  const digits = String(amountMinor).padStart(fractionDigits + 1, '0')
  const whole = digits.slice(0, -fractionDigits)
  const fraction = digits.slice(-fractionDigits)
  return `${whole}.${fraction}`
}

export function formatPlanPrice(amountMinor, currency) {
  if (!Number.isSafeInteger(amountMinor) || typeof currency !== 'string') {
    return 'Price unavailable'
  }
  try {
    const fractionDigits = currencyFractionDigits(currency)
    return new Intl.NumberFormat(undefined, { style: 'currency', currency })
      .format(amountMinor / (10 ** fractionDigits))
  } catch {
    return `${amountMinor} ${currency}`
  }
}
