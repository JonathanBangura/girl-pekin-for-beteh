import Link from 'next/link'
import { PublicFooter, PublicHeader, Pill } from '@/components/public/public'
import { nominees } from '@/lib/mock-data'
export default async function NomineeProfilePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const nominee = nominees.find(n => n.code.toLowerCase() === code.toLowerCase()) || nominees[0]
  return <><PublicHeader/><main><section className="page-hero"><Pill tone="teal">Nominee Profile · {nominee.code}</Pill><h1>{nominee.name}</h1><p>{nominee.institution} · {nominee.category.replace('Mock category: ', '')}</p></section><section className="section two-col"><article className="panel nominee-vote-profile"><div className="nominee-card-top"><div className={`mini-avatar ${nominee.color}`}>{nominee.initials}</div><span className="nominee-code">{nominee.code}</span></div><h2>Nominee overview</h2><p>{nominee.story}</p></article><aside className="panel professional-order-summary"><Pill tone="gold">Public voting</Pill><div className="summary-line"><span>Nominee</span><strong>{nominee.name}</strong></div><div className="summary-line"><span>Code</span><strong>{nominee.code}</strong></div><Link className="button checkout-button" href={`/vote/${nominee.code}`}>Vote for this nominee</Link></aside></section></main><PublicFooter/></>
}
