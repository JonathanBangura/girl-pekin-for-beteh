import { Search, SlidersHorizontal } from 'lucide-react'
import { PublicHeader, PublicFooter, NomineeCard } from '@/components/public/public'
import { nominees } from '@/lib/mock-data'

export default function NomineesPage() {
  return <><PublicHeader/><main>
    <section className="page-hero v2-page-hero"><span className="v2-overline">2026 Nominee Directory · Demo Data</span><h1>Discover award nominees by name, code and category.</h1><p>Representative nominee records are used to demonstrate the directory experience before live data is connected.</p></section>
    <section className="section v2-directory-section">
      <div className="v2-directory-toolbar"><label><Search size={16}/><input aria-label="Search nominees" placeholder="Search by name or nominee code"/></label><label><SlidersHorizontal size={16}/><select aria-label="Category filter"><option>All demo categories</option><option>Community Champion</option><option>Future Maker</option><option>Heart of Gold</option></select></label><span>{nominees.length} demo nominees</span></div>
      <div className="nominee-grid v2-nominee-grid">{nominees.map(n => <NomineeCard nominee={n} key={n.code}/>)}</div>
    </section>
  </main><PublicFooter/></>
}
