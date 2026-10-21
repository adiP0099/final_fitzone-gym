import { useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { userProfiles } from '../services/firestore/index.js'

function useMemberState() {
  const [state, setState] = useState({ loading: true, data: null, empty: false, error: null })

  useEffect(() => userProfiles.watchAllProfilesForAdmin(setState), [])

  return state
}

function displayValue(value) {
  return typeof value === 'string' && value.trim() ? value : '—'
}

export default function AdminMembers() {
  const state = useMemberState()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const profiles = useMemo(() => [...(state.data || [])].filter((profile) => (
    `${profile.displayName || ''} ${profile.email || ''} ${profile.phone || ''} ${profile.location || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
    && (statusFilter === 'All statuses' || profile.accountStatus === statusFilter)
  )).sort((first, second) => (
    displayValue(first.displayName).localeCompare(displayValue(second.displayName))
  )), [state.data, search, statusFilter])
  const statuses = [...new Set((state.data || []).map((profile) => profile.accountStatus).filter(Boolean))]

  return <>
    <div className="dash-heading"><div><p className="eyebrow">ADMIN WORKSPACE</p><h2>Member management</h2><p>Member profile details are read-only in this view.</p></div></div>
    <div className="admin-toolbar">
      <label className="search-label">Search members<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search member profiles..." /></label>
      <label className="filter-label">Account status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
    </div>
    <section className="panel">
      <div className="panel-heading"><div><h3>Member profiles</h3><p>{profiles.length} {profiles.length === 1 ? 'member' : 'members'}</p></div><Users size={20} /></div>
      {state.loading ? <p className="member-data-message" role="status">Loading member profiles…</p>
        : state.error ? <p className="member-data-message error" role="alert">{state.error.message || 'Member profiles could not be loaded.'}</p>
          : state.empty ? <p className="member-data-message">No member profiles are available.</p>
            : <div className="data-table-wrap"><table className="data-table"><thead><tr><th>NAME</th><th>EMAIL</th><th>PHONE</th><th>LOCATION</th><th>ROLE</th><th>ACCOUNT STATUS</th></tr></thead><tbody>
              {profiles.map((profile) => <tr key={profile.id}>
                <td><strong>{displayValue(profile.displayName)}</strong></td>
                <td>{displayValue(profile.email)}</td>
                <td>{displayValue(profile.phone)}</td>
                <td>{displayValue(profile.location)}</td>
                <td>{displayValue(profile.role)}</td>
                <td>{displayValue(profile.accountStatus)}</td>
              </tr>)}
            </tbody></table></div>}
    </section>
  </>
}
