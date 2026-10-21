import { Dumbbell } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Brand({ inverse = false, onClick }) {
  return (
    <Link className={`brand${inverse ? ' brand-inverse' : ''}`} to="/" aria-label="FitZone Gym home" onClick={onClick}>
      <span className="brand-mark"><Dumbbell size={21} strokeWidth={2.4} /></span>
      <span>FITZONE<span className="brand-small">TRAIN WITH PURPOSE</span></span>
    </Link>
  )
}
