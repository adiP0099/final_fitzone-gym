import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'

export default function TrainerCard({ trainer }) {
  const name = trainer.displayName || 'Trainer'
  const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const specialization = Array.isArray(trainer.specializations) ? trainer.specializations.join(' · ') : ''
  const experience = Number.isInteger(trainer.experienceYears) ? `${trainer.experienceYears} years coaching experience` : null
  const photo = trainer.profileImageUrl || trainer.photoUrl
  const [failedPhoto, setFailedPhoto] = useState(null)
  const showFallback = !photo || failedPhoto === photo

  return <article className="trainer-card">
    <div className="trainer-art trainer-ember">
      {showFallback ? (
        <span aria-hidden="true">{initials}</span>
      ) : (
        <img
          className="trainer-photo"
          src={photo}
          alt={`${name}, trainer profile`}
          loading="lazy"
          onError={() => setFailedPhoto(photo)}
        />
      )}
      <i aria-hidden="true" />
    </div>
    <div className="trainer-card-copy">
      <div>
        <p className="eyebrow">{specialization || 'COACHING'}</p>
        <h3>{name}</h3>
      </div>
      <ArrowUpRight size={19} />
      {trainer.bio && <p>{trainer.bio}</p>}
      {experience && <span className="trainer-experience">{experience}</span>}
    </div>
  </article>
}

