import { useMemo, useState } from 'react'
import { ArrowUpRight, CalendarDays, CreditCard, Dumbbell, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import DemoNotice from '../components/DemoNotice.jsx'
import { adminMembers, bookings, enquiries, plans, trainers } from '../services/demoData.js'

const initialRows = { members: adminMembers, plans: plans.map((p) => ({ id: p.id, name: p.name, detail: `${p.period} · $${p.price}`, status: 'Active' })), trainers: trainers.map((t) => ({ id: t.initials, name: t.name, detail: `${t.specialty} · ${t.experience}`, status: 'Active' })), bookings: bookings.map((b) => ({ id: b.id, name: b.className, detail: `${b.date} · ${b.coach}`, status: b.status })), attendance: [], enquiries: enquiries.map((e) => ({ id: e.id, name: e.name, detail: e.subject, status: e.status })), payments: [] }
const configs = {
  members: { title: 'Member management', icon: Users, label: 'member', fields: ['Full name', 'Email address', 'Membership plan'] },
  plans: { title: 'Membership plans', icon: CreditCard, label: 'plan', fields: ['Plan name', 'Duration', 'Sample price'] },
  trainers: { title: 'Trainer management', icon: Dumbbell, label: 'trainer', fields: ['Full name', 'Specialty', 'Experience'] },
  bookings: { title: 'Booking management', icon: CalendarDays, label: 'booking', fields: ['Session', 'Date', 'Coach'] },
  attendance: { title: 'Attendance management', icon: CalendarDays, label: 'record', fields: ['Member', 'Check-in', 'Check-out'] },
  enquiries: { title: 'Enquiry management', icon: Users, label: 'enquiry', fields: ['Name', 'Subject', 'Status'] },
  payments: { title: 'Payments & reporting', icon: CreditCard, label: 'payment record', fields: ['Member', 'Description', 'Sample amount'] },
}

function Heading({ title, subtitle }) { return <div className="dash-heading"><div><p className="eyebrow">ADMIN WORKSPACE / DEMO</p><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></div> }
function AdminTable({ rows, onEdit, onRemove }) { return <div className="data-table-wrap"><table className="data-table"><thead><tr><th>RECORD</th><th>DETAILS</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.id}><td><strong>{row.name}</strong><small>{row.id}</small></td><td>{row.detail || row.email || 'Demo record'}</td><td><span className="status-tag">{row.status || 'Sample'}</span></td><td><div className="table-actions"><button className="table-action" type="button" onClick={() => onEdit(row)} aria-label={`Edit ${row.name}`}>Edit</button><span aria-hidden="true"> · </span><button className="table-action" type="button" onClick={() => onRemove(row)} aria-label={`Remove ${row.name}`}>Remove</button></div></td></tr>) : <tr><td className="table-empty" colSpan="4">No demo records available.</td></tr>}</tbody></table></div> }

export default function AdminPages({ page }) {
  const [rows, setRows] = useState(initialRows)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All statuses')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [notice, setNotice] = useState('')
  const [pendingRemove, setPendingRemove] = useState(null)
  const counts = useMemo(() => ({
    members: rows.members.length,
    activeMembers: rows.members.filter((row) => row.status === 'Active').length,
    trainers: rows.trainers.length,
    bookings: rows.bookings.length,
  }), [rows])
  if (page === 'overview') return <><Heading title="Good morning, Morgan." subtitle="A snapshot of your FitZone demo workspace."/><div className="admin-stat-grid"><article className="dash-stat"><span><Users size={19}/></span><small>TOTAL MEMBERS</small><strong>{counts.members}</strong><p>Local sample records</p></article><article className="dash-stat"><span><CreditCard size={19}/></span><small>ACTIVE MEMBERSHIPS</small><strong>{counts.activeMembers}</strong><p>Demo data only</p></article><article className="dash-stat"><span><Dumbbell size={19}/></span><small>TRAINERS</small><strong>{counts.trainers}</strong><p>Illustrative roster</p></article><article className="dash-stat"><span><CalendarDays size={19}/></span><small>BOOKINGS</small><strong>{counts.bookings}</strong><p>Local sample records</p></article></div><section className="panel"><div className="panel-heading"><div><h3>Quick access</h3><p>Explore local demo records</p></div></div><div className="quick-links">{Object.entries(configs).map(([key, config]) => <Link to={`/admin/${key}`} key={key}><config.icon size={18}/>{config.title}<ArrowUpRight size={16}/></Link>)}</div></section></>
  const config = configs[page]
  const Icon = config.icon
  const visible = rows[page].filter((row) => `${row.name} ${row.detail} ${row.email}`.toLowerCase().includes(search.toLowerCase()) && (filter === 'All statuses' || row.status === filter))
  const statuses = [...new Set(rows[page].map((row) => row.status).filter(Boolean))]
  const editingRecord = editingId ? rows[page].find((row) => row.id === editingId) : null
  const editingValues = editingRecord ? (editingRecord.detail ? editingRecord.detail.split(' · ') : [editingRecord.email, editingRecord.plan].filter(Boolean)) : []
  if (page === 'enquiries' && editingRecord) editingValues.push(editingRecord.status || '')
  function addRecord(event) { event.preventDefault(); if (!event.currentTarget.reportValidity()) return; const form = new FormData(event.currentTarget); const values = config.fields.map((field) => String(form.get(field) || '').trim()); const detail = values.slice(1).filter(Boolean).join(' · '); if (editingId) { setRows((current) => ({ ...current, [page]: current[page].map((row) => row.id === editingId ? { ...row, name: values[0], detail, status: row.status || 'Sample' } : row) })); setNotice(`${config.label} updated in this page's demo state only.`) } else { const record = { id: `DEMO-${Date.now().toString().slice(-4)}`, name: values[0], detail, status: 'Sample' }; setRows((current) => ({ ...current, [page]: [record, ...current[page]] })); setNotice(`${config.label} added to this page's demo state only.`) } setShowForm(false); setEditingId(null) }
  function removeRecord() { setRows((current) => ({ ...current, [page]: current[page].filter((row) => row.id !== pendingRemove.id) })); setPendingRemove(null); setNotice('Demo record removed locally. No database was changed.') }
  function startEdit(row) { setEditingId(row.id); setShowForm(true); setNotice('') }
  function cancelForm() { setShowForm(false); setEditingId(null) }
  return <><Heading title={config.title} subtitle="All records are fictional demo content. Changes remain local to this page."/>
    {page === 'payments' && <><div className="admin-stat-grid"><article className="dash-stat"><span><CreditCard size={19}/></span><small>SAMPLE PAYMENT RECORDS</small><strong>{rows.payments.length}</strong><p>No real transactions are connected</p></article><article className="dash-stat"><span><ArrowUpRight size={19}/></span><small>PAYMENT PROCESSING</small><strong>—</strong><p>Not connected in this demo</p></article></div><DemoNotice>Reporting is a development preview. Amounts and transactions are not connected to a payment provider.</DemoNotice></>}
    <div className="admin-toolbar"><label className="search-label">Search records<input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${config.label}...`} /></label><label className="filter-label">Status<select value={filter} onChange={(e) => setFilter(e.target.value)}><option>All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>{page !== 'payments' && <button className="button button-primary" type="button" onClick={() => { if (showForm) cancelForm(); else { setEditingId(null); setShowForm(true) } }}>{showForm ? 'Cancel' : `+ Add ${config.label}`}</button>}</div>
    {notice && <p className="form-feedback" role="status">{notice}</p>}
    {showForm && <form key={editingId || 'new-record'} className="panel admin-add-form" onSubmit={addRecord}><h3>{editingId ? 'Edit' : 'Add sample'} {config.label}</h3><div className="form-grid">{config.fields.map((field, index) => <label key={field}>{field}<input name={field} type={field.toLowerCase().includes('email') ? 'email' : 'text'} defaultValue={index === 0 ? editingRecord?.name || '' : editingValues[index - 1] || ''} required maxLength={120} /></label>)}</div><div className="form-actions"><button className="button button-outline" type="button" onClick={cancelForm}>Cancel</button><button className="button button-primary" type="submit">{editingId ? 'Save demo changes' : 'Add demo record'}</button></div><p className="sample-caption">This only updates the current page state; it is not persisted.</p></form>}
    <section className="panel"><div className="panel-heading"><div><h3>{config.title}</h3><p>{visible.length} demo {config.label}{visible.length === 1 ? '' : 's'}</p></div><Icon size={20}/></div><AdminTable rows={visible} onEdit={startEdit} onRemove={setPendingRemove}/></section>
    {pendingRemove && <div className="modal-backdrop" role="presentation"><section className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="remove-title"><h3 id="remove-title">Remove this demo record?</h3><p>This only removes the sample item from this page. It does not affect a database.</p><div className="form-actions"><button className="button button-outline" type="button" onClick={() => setPendingRemove(null)}>Cancel</button><button className="button button-danger" type="button" onClick={removeRecord}>Remove demo row</button></div></section></div>}
  </>
}
