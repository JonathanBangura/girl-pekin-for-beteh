export type Nominee = { name: string; category: string; votes: number; initials: string; color: string; story: string }
export type Event = { title: string; date: string; location: string; type: string; price: string }

export const nominees: Nominee[] = [
  { name: 'Mariama Koroma', category: 'Community Champion', votes: 1284, initials: 'MK', color: 'coral', story: 'Building safer pathways for girls through community-led mentorship in Freetown.' },
  { name: 'Abdul Bangura', category: 'Future Maker', votes: 984, initials: 'AB', color: 'teal', story: 'Creating access to digital skills and opportunity for young people in the East End.' },
  { name: 'Isatu Sesay', category: 'Heart of Gold', votes: 742, initials: 'IS', color: 'gold', story: 'Making every girl feel seen, supported and ready to lead.' },
]

export const events: Event[] = [
  { title: 'Girl Pikin Awards 2026', date: '28 Nov 2026', location: 'Bintumani Conference Centre', type: 'Awards night', price: 'From NLe 250' },
  { title: 'Girls Who Build', date: '12 Oct 2026', location: 'Freetown Innovation Hub', type: 'Workshop', price: 'Free' },
  { title: 'Walk For Her Future', date: '05 Oct 2026', location: 'Lumley Beach', type: 'Community', price: 'From NLe 50' },
]

export const stats = [
  { label: 'Girls reached', value: '12,480', change: '+18.4%' },
  { label: 'Active volunteers', value: '846', change: '+9.2%' },
  { label: 'Communities', value: '38', change: '+4 new' },
  { label: 'Funds raised', value: 'NLe 2.4M', change: '+24.8%' },
]

export const bars = [42, 58, 48, 72, 64, 84, 78, 96, 88, 76, 94, 100]
export const news = [
  { tag: 'Impact story', title: 'The girls turning their curiosity into careers', date: '18 Aug 2026' },
  { tag: 'Field notes', title: 'A new chapter for community mentorship', date: '02 Aug 2026' },
  { tag: 'From the team', title: 'Why we celebrate the helpers behind the heroes', date: '21 Jul 2026' },
]
