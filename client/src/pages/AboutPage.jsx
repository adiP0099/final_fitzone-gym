import { ArrowUpRight, Dumbbell, Heart, HeartPulse, Sparkles, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import SectionHeading from '../components/SectionHeading.jsx'

const values = [
  { icon: Heart, title: 'Progress over pressure', text: 'There is no one way to get stronger. We meet you where you are.' },
  { icon: Users, title: 'People make the place', text: 'A welcoming community makes showing up feel easier.' },
  { icon: Sparkles, title: 'Coaching with care', text: 'Good form, thoughtful guidance, and encouragement every step.' },
]

const facilities = [
  { icon: Dumbbell, title: 'Strength floor', text: 'A focused space for strength work, practical coaching, and building confidence at your own pace.' },
  { icon: Users, title: 'Group studio', text: 'Small-group sessions bring expert guidance and shared energy to your weekly routine.' },
  { icon: HeartPulse, title: 'Mobility space', text: 'Room to warm up, cool down, and make recovery part of a sustainable training plan.' },
]

export default function AboutPage() {
  return <main className="page-main"><section className="page-hero"><div className="container"><p className="eyebrow">OUR STORY / YOUR SPACE</p><h1>Built for the<br /><em>everyday strong.</em></h1><p>Fitness should make your life feel bigger, not give you one more thing to get perfect.</p></div></section>
    <section className="section-pad"><div className="container about-story-grid"><div className="about-art"><div className="about-art-sun" /><span>MOVE<br /><b>YOUR</b><br />WAY</span><i>FITZONE / COMMUNITY</i></div><div><p className="eyebrow">A LITTLE ABOUT US</p><h2>Good energy.<br />Real <em>progress.</em></h2><p className="body-copy">FitZone-Gym is built around a simple idea: a gym should help you feel more at home in your body. We bring together expert coaching, welcoming spaces, and a community that celebrates the work you put in.</p><p className="body-copy">Our approach is practical and personal: start with where you are, get guidance that suits your goals, and adjust as you grow. Training and facility details on this demo site are illustrative.</p><Link className="text-link" to="/about#facilities">About our facilities <ArrowUpRight size={17} /></Link></div></div></section>
    <section className="section-pad value-section" id="facilities"><div className="container"><SectionHeading eyebrow="ROOM TO TRAIN" title={<>Spaces for your <em>next step.</em></>} text="Illustrative facility concepts; confirm actual amenities before publishing."/><div className="value-grid">{facilities.map(({ icon: Icon, title, text }, index) => <article className="value-card" key={title}><span>0{index + 1}</span><Icon size={26} /><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>
    <section className="section-pad value-section"><div className="container"><SectionHeading eyebrow="WHAT WE BELIEVE" title={<>Strong is a <em>team effort.</em></>}/><div className="value-grid">{values.map(({ icon: Icon, title, text }, index) => <article className="value-card" key={title}><span>0{index + 1}</span><Icon size={26} /><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>
    <section className="closing-cta"><div className="container closing-inner"><div><p className="eyebrow">READY WHEN YOU ARE</p><h2>Your next step<br /><em>starts here.</em></h2></div><Link to="/plans" className="button button-primary button-large">See membership options <ArrowUpRight size={18} /></Link></div></section>
  </main>
}
