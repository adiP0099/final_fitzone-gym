import { useEffect, useMemo, useState } from 'react'
import { CreditCard } from 'lucide-react'
import { payments } from '../services/firestore/index.js'

function usePaymentState() {
  const [state, setState] = useState({ loading: true, data: null, empty: false, error: null })

  useEffect(() => payments.watchAllPaymentsForAdmin(setState), [])

  return state
}

function formatDate(value) {
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : null
  return date && !Number.isNaN(date.valueOf())
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    : '—'
}

function formatAmount(amountMinor, currency) {
  if (!Number.isSafeInteger(amountMinor) || typeof currency !== 'string') return '—'
  try {
    const formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency })
    const decimalPlaces = formatter.resolvedOptions().maximumFractionDigits
    return formatter.format(amountMinor / (10 ** decimalPlaces))
  } catch {
    return '—'
  }
}

export default function AdminPayments() {
  const state = usePaymentState()
  const [search, setSearch] = useState('')
  const allPayments = state.data || []
  const visiblePayments = useMemo(() => [...allPayments].filter((payment) => (
    `${payment.id} ${payment.memberUid || ''} ${payment.membershipId || ''} ${payment.status || ''} ${payment.currency || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )).sort((first, second) => (
    (second.createdAt?.toMillis?.() || 0) - (first.createdAt?.toMillis?.() || 0)
  )), [allPayments, search])

  return <>
    <div className="dash-heading"><div><p className="eyebrow">ADMIN WORKSPACE</p><h2>Payments & reporting</h2><p>Payment records are read-only. Payment processing is not available here.</p></div></div>
    <div className="admin-toolbar">
      <label className="search-label">Search payments<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search member, membership, status..." /></label>
    </div>
    <section className="panel">
      <div className="panel-heading"><div><h3>Payment records</h3><p>{visiblePayments.length} {visiblePayments.length === 1 ? 'record' : 'records'}</p></div><CreditCard size={20} /></div>
      {state.loading ? <p className="member-data-message" role="status">Loading payment records…</p>
        : state.error ? <p className="member-data-message error" role="alert">{state.error.message || 'Payment records could not be loaded.'}</p>
          : state.empty ? <p className="member-data-message">No payment records are available.</p>
            : visiblePayments.length === 0 ? <p className="member-data-message">No payment records match this search.</p>
              : <div className="data-table-wrap"><table className="data-table"><thead><tr><th>RECORDED</th><th>MEMBER UID</th><th>MEMBERSHIP ID</th><th>AMOUNT</th><th>STATUS</th><th>PAYMENT ID</th></tr></thead><tbody>
                {visiblePayments.map((payment) => <tr key={payment.id}>
                  <td>{formatDate(payment.createdAt)}</td>
                  <td>{payment.memberUid || '—'}</td>
                  <td>{payment.membershipId || '—'}</td>
                  <td>{formatAmount(payment.amountMinor, payment.currency)}</td>
                  <td><span className="status-tag">{payment.status || '—'}</span></td>
                  <td>{payment.id}</td>
                </tr>)}
              </tbody></table></div>}
    </section>
  </>
}
