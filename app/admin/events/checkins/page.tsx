import Link from 'next/link'
import { AdminModule } from '@/components/portal/admin-module'
export default function CheckinsPage(){return <><AdminModule title="Check-ins" eyebrow="Events"/><div className="portal-content" style={{paddingTop:0}}><Link className="button" href="/scan">Open Scanner</Link></div></>}
