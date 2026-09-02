import Link from 'next/link'
import { ArrowUpRight, Building2, Copy, Share2, Vote } from 'lucide-react'
import { PublicFooter, PublicHeader, Pill } from '@/components/public/public'
import { nominees } from '@/lib/mock-data'

export default async function NomineeProfilePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const nominee = nominees.find(n => n.code.toLowerCase() === code.toLowerCase()) || nominees[0]
  return <><PublicHeader/><main>
    <section className="v2-nominee-profile-hero">
      <div className={`v2-profile-monogram ${nominee.color}`}>{nominee.initials}</div>
      <div className="v2-profile-heading"><span className="v2-overline">Nominee Profile · {nominee.code}</span><h1>{nominee.name}</h1><p><Building2 size={15}/>{nominee.institution}</p><div className="v2-profile-tags"><Pill>{nominee.category.replace('Demo category: ', '')}</Pill><Pill tone="teal">Demo nominee record</Pill></div></div>
      <div className="v2-profile-actions"><button className="button secondary"><Copy size={14}/> Copy link</button><button className="button secondary"><Share2 size={14}/> Share</button></div>
    </section>
    <section className="section v2-profile-content">
      <article className="v2-profile-main"><span className="v2-overline">Nominee overview</span><h2>Profile information</h2><p>{nominee.story}</p><div className="v2-profile-info-grid"><div><span>Nominee code</span><strong>{nominee.code}</strong></div><div><span>Institution</span><strong>{nominee.institution}</strong></div><div><span>Category</span><strong>{nominee.category.replace('Demo category: ', '')}</strong></div><div><span>Profile status</span><strong>Demo / Preview</strong></div></div></article>
      <aside className="v2-vote-aside"><span className="v2-overline light">Public Voting</span><h2>Support this nominee.</h2><p>Select a vote quantity and continue through the dedicated voting checkout.</p><Link className="button light" href={`/vote/${nominee.code}`}><Vote size={15}/> Vote for {nominee.name.split(' ')[0]}</Link><Link className="v2-light-link" href="/nominees">Back to nominees <ArrowUpRight size={14}/></Link></aside>
    </section>
  </main><PublicFooter/></>
}
