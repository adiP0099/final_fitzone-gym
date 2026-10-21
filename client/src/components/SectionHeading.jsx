export default function SectionHeading({ eyebrow, title, text, light = false }) {
  return <div className={`section-heading${light ? ' section-heading-light' : ''}`}><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{text && <p className="section-intro">{text}</p>}</div>
}
