import { ArrowUpRight } from 'lucide-react'

export default function TrainerCard({ trainer }) {
  const name = trainer.displayName || 'Trainer'
  const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const specialization = Array.isArray(trainer.specializations) ? trainer.specializations.join(' · ') : ''
  const experience = Number.isInteger(trainer.experienceYears) ? `${trainer.experienceYears} years coaching experience` : null

  return <article className="trainer-card">
    <div className="trainer-art trainer-ember" aria-hidden="true"><span>{initials}</span><i /></div>
    <div className="trainer-card-copy"><div><p className="eyebrow">{specialization || 'COACHING'}</p><h3>{name}</h3></div><ArrowUpRight size={19} />{trainer.bio && <p>{trainer.bio}</p>}{experience && <span className="trainer-experience">{experience}</span>}</div>
  </article>
}
