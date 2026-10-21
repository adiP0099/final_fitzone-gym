import { Info } from 'lucide-react'

export default function DemoNotice({ children = 'Please review this information.' }) {
  return <div className="demo-notice" role="note"><Info size={17} /><span>{children}</span></div>
}
