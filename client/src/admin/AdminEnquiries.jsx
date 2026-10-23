import { useEffect, useMemo, useState } from 'react'
import { Check, Eye, Mail, MessageSquare, Phone, Trash2, X } from 'lucide-react'
import { enquiries } from '../services/firestore/index.js'
import './AdminEnquiries.css'

const STATUS_LABELS = {
  new: 'New',
  in_review: 'In review',
  resolved: 'Resolved',
}

function formatDate(value) {
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : null
  if (!date || Number.isNaN(date.valueOf())) return null
  return {
    iso: date.toISOString(),
    label: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date),
  }
}

function displayText(value, fallback = '—') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function emailHref(email, subject) {
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return null
  return `mailto:${email.trim()}?subject=${encodeURIComponent(`Re: ${subject || 'FitZone enquiry'}`)}`
}

function phoneHref(phone) {
  if (typeof phone !== 'string') return null
  const value = phone.trim()
  const digits = value.replace(/\D/g, '')
  if (!/^\+?[\d\s().-]+$/.test(value) || digits.length < 7 || digits.length > 15) return null
  return `tel:${value.replace(/[^\d+]/g, '')}`
}

export default function AdminEnquiries() {
  const [state, setState] = useState({ loading: true, data: null, empty: false, error: null })
  const [search, setSearch] = useState('')
  const [busyAction, setBusyAction] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [openEnquiry, setOpenEnquiry] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  useEffect(() => {
    let active = true
    let unsubscribe = () => {}
    try {
      unsubscribe = enquiries.watchEnquiriesForAdmin((next) => {
        if (active) setState(next)
      }) || unsubscribe
    } catch (error) {
      setState({ loading: false, data: null, empty: false, error })
    }
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const allEnquiries = state.data || []
  const visibleEnquiries = useMemo(() => [...allEnquiries].filter((item) => (
    `${item.name || ''} ${item.email || ''} ${item.phone || ''} ${item.subject || ''} ${item.message || ''} ${item.status || ''}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  )), [allEnquiries, search])

  async function performAction(item, action, operation, successText) {
    if (busyAction) return
    setBusyAction({ id: item.id, action })
    setFeedback(null)
    try {
      await operation()
      setFeedback({ type: 'success', text: successText })
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'The enquiry could not be updated.' })
    } finally {
      setBusyAction(null)
    }
  }

  function updateReadState(item) {
    const isRead = item.isRead === true
    return performAction(
      item,
      'read',
      () => enquiries.updateEnquiryReadStatusForAdmin(item.id, !isRead),
      isRead ? 'Enquiry marked unread.' : 'Enquiry marked read.',
    )
  }

  function updateStatus(item, status) {
    if (!STATUS_LABELS[status] || status === item.status) return
    return performAction(
      item,
      'status',
      () => enquiries.updateEnquiryStatusForAdmin(item.id, status),
      `Status changed to ${STATUS_LABELS[status]}.`,
    )
  }

  async function confirmDelete() {
    const item = pendingDelete
    if (!item || busyAction) return
    setBusyAction({ id: item.id, action: 'delete' })
    setFeedback(null)
    try {
      await enquiries.deleteEnquiryForAdmin(item.id)
      setPendingDelete(null)
      setOpenEnquiry((current) => current?.id === item.id ? null : current)
      setFeedback({ type: 'success', text: 'Enquiry deleted.' })
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'The enquiry could not be deleted.' })
    } finally {
      setBusyAction(null)
    }
  }

  return <div className="admin-enquiries-page">
    <div className="dash-heading">
      <div>
        <p className="eyebrow">ADMIN WORKSPACE</p>
        <h2>Enquiries</h2>
        <p>Review messages submitted through the FitZone contact form.</p>
      </div>
    </div>

    <div className="admin-toolbar admin-enquiries-toolbar">
      <label className="search-label">Search enquiries
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, contact, subject, or message..."
        />
      </label>
    </div>

    {feedback && <p className={`form-feedback ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.text}</p>}

    <section className="panel admin-enquiries-panel" aria-labelledby="admin-enquiries-list-title">
      <div className="panel-heading">
        <div>
          <h3 id="admin-enquiries-list-title">Contact messages</h3>
          <p>{state.loading ? 'Loading enquiries' : `${visibleEnquiries.length} ${visibleEnquiries.length === 1 ? 'message' : 'messages'}`}</p>
        </div>
        <MessageSquare size={20} aria-hidden="true" />
      </div>

      {state.loading ? <p className="member-data-message" role="status">Loading enquiries…</p>
        : state.error ? <p className="member-data-message error" role="alert">{state.error.message || 'Enquiries could not be loaded.'}</p>
          : state.empty ? <p className="member-data-message">No enquiries have been submitted.</p>
            : visibleEnquiries.length === 0 ? <p className="member-data-message">No enquiries match this search.</p>
              : <div className="admin-enquiry-list">
                {visibleEnquiries.map((item) => {
                  const isRead = item.isRead === true
                  const date = formatDate(item.createdAt)
                  const email = displayText(item.email)
                  const phone = displayText(item.phone)
                  const subject = displayText(item.subject, 'No subject')
                  const actionBusy = busyAction?.id === item.id
                  const mailLink = emailHref(item.email, subject)
                  const callLink = phoneHref(item.phone)

                  return <article className={`admin-enquiry-card${isRead ? '' : ' is-unread'}`} key={item.id}>
                    <div className="admin-enquiry-card-top">
                      <div className="admin-enquiry-sender">
                        <h4>{displayText(item.name, 'Unnamed sender')}</h4>
                        <span className={`admin-enquiry-read-state${isRead ? ' read' : ' unread'}`}>
                          <span aria-hidden="true" />{isRead ? 'Read' : 'Unread'}
                        </span>
                      </div>
                      <span className={`admin-enquiry-status status-${STATUS_LABELS[item.status] ? item.status : 'unknown'}`}>
                        {STATUS_LABELS[item.status] || 'Unknown status'}
                      </span>
                    </div>

                    <div className="admin-enquiry-meta">
                      <p><Mail size={15} aria-hidden="true" />{mailLink ? <a href={mailLink}>{email}</a> : email}</p>
                      <p><Phone size={15} aria-hidden="true" />{callLink ? <a href={callLink}>{phone}</a> : phone}</p>
                      <p className="admin-enquiry-subject"><strong>Subject</strong><span>{subject}</span></p>
                      <p className="admin-enquiry-date"><strong>Submitted</strong>{date
                        ? <time dateTime={date.iso}>{date.label}</time>
                        : <span>Date unavailable</span>}</p>
                    </div>

                    <p className="admin-enquiry-preview">{displayText(item.message, 'No message content.')}</p>

                    <div className="admin-enquiry-controls">
                      <label className="admin-enquiry-status-control">Workflow status
                        <select
                          value={STATUS_LABELS[item.status] ? item.status : ''}
                          onChange={(event) => updateStatus(item, event.target.value)}
                          disabled={Boolean(busyAction)}
                          aria-label={`Workflow status for ${displayText(item.name, 'unnamed sender')}`}
                        >
                          {!STATUS_LABELS[item.status] && <option value="">Unknown status</option>}
                          {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </label>
                      <div className="admin-enquiry-actions">
                        <button className="table-action" type="button" onClick={() => setOpenEnquiry(item)}>
                          <Eye size={15} aria-hidden="true" /> View message
                        </button>
                        <button className="table-action" type="button" onClick={() => updateReadState(item)} disabled={Boolean(busyAction)} aria-busy={actionBusy && busyAction.action === 'read'}>
                          <Check size={15} aria-hidden="true" /> {actionBusy && busyAction.action === 'read' ? 'Saving…' : isRead ? 'Mark unread' : 'Mark read'}
                        </button>
                        {mailLink && <a className="table-action" href={mailLink}><Mail size={15} aria-hidden="true" /> Reply by email</a>}
                        {callLink && <a className="table-action" href={callLink}><Phone size={15} aria-hidden="true" /> Call</a>}
                        <button className="table-action delete" type="button" onClick={() => setPendingDelete(item)} disabled={Boolean(busyAction)}>
                          <Trash2 size={15} aria-hidden="true" /> Delete
                        </button>
                      </div>
                    </div>
                  </article>
                })}
              </div>}
    </section>

    {openEnquiry && <div className="admin-enquiries-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) setOpenEnquiry(null)
    }}>
      <section className="admin-enquiries-dialog" role="dialog" aria-modal="true" aria-labelledby="enquiry-detail-title">
        <div className="admin-enquiries-dialog-heading">
          <div><p className="eyebrow">FULL MESSAGE</p><h3 id="enquiry-detail-title">{displayText(openEnquiry.subject, 'No subject')}</h3></div>
          <button className="icon-button" type="button" onClick={() => setOpenEnquiry(null)} aria-label="Close message"><X size={19} /></button>
        </div>
        <div className="admin-enquiries-dialog-meta">
          <p><strong>From</strong><span>{displayText(openEnquiry.name, 'Unnamed sender')}</span></p>
          <p><strong>Email</strong><span>{displayText(openEnquiry.email)}</span></p>
          <p><strong>Phone</strong><span>{displayText(openEnquiry.phone)}</span></p>
          <p><strong>Submitted</strong><span>{formatDate(openEnquiry.createdAt)?.label || 'Date unavailable'}</span></p>
          <p><strong>Workflow</strong><span>{STATUS_LABELS[openEnquiry.status] || 'Unknown status'}</span></p>
          <p><strong>Read state</strong><span>{openEnquiry.isRead === true ? 'Read' : 'Unread'}</span></p>
        </div>
        <div className="admin-enquiries-message-body">{displayText(openEnquiry.message, 'No message content.')}</div>
        <div className="admin-enquiries-dialog-actions">
          {emailHref(openEnquiry.email, displayText(openEnquiry.subject, 'FitZone enquiry')) && <a className="button button-primary" href={emailHref(openEnquiry.email, displayText(openEnquiry.subject, 'FitZone enquiry'))}><Mail size={16} /> Reply by email</a>}
          {phoneHref(openEnquiry.phone) && <a className="button button-outline" href={phoneHref(openEnquiry.phone)}><Phone size={16} /> Call</a>}
          <button className="button button-outline" type="button" onClick={() => setOpenEnquiry(null)}>Close</button>
        </div>
      </section>
    </div>}

    {pendingDelete && <div className="admin-enquiries-overlay" role="presentation">
      <section className="admin-enquiries-dialog admin-enquiries-confirm" role="alertdialog" aria-modal="true" aria-labelledby="enquiry-delete-title" aria-describedby="enquiry-delete-description">
        <h3 id="enquiry-delete-title">Delete this enquiry?</h3>
        <p id="enquiry-delete-description">The message from {displayText(pendingDelete.name, 'this sender')} will be permanently removed.</p>
        <div className="admin-enquiries-dialog-actions">
          <button className="button button-outline" type="button" onClick={() => setPendingDelete(null)} disabled={Boolean(busyAction)}>Cancel</button>
          <button className="button button-danger" type="button" onClick={confirmDelete} disabled={Boolean(busyAction)} aria-busy={busyAction?.action === 'delete'}>
            {busyAction?.action === 'delete' ? 'Deleting…' : 'Confirm delete'}
          </button>
        </div>
      </section>
    </div>}
  </div>
}
