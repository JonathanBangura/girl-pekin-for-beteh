export type Nominee = {
  name: string
  category: string
  votes: number
  initials: string
  code: string
  institution: string
  color: string
  story: string
}

export type Event = {
  slug: string
  title: string
  date: string
  location: string
  type: string
  price: string
  demo?: boolean
}

export const nominees: Nominee[] = [
  {
    name: 'Mariama Koroma',
    category: 'Demo category: Community Champion',
    votes: 1284,
    initials: 'MK',
    code: '50MISA26001',
    institution: 'University of Sierra Leone',
    color: 'coral',
    story: 'Demo nominee biography content. Approved nominee information will replace this text when the platform is connected to live data.',
  },
  {
    name: 'Abdul Bangura',
    category: 'Demo category: Future Maker',
    votes: 984,
    initials: 'AB',
    code: '50MISA26002',
    institution: 'Njala University',
    color: 'teal',
    story: 'Demo nominee biography content. Approved nominee information will replace this text when the platform is connected to live data.',
  },
  {
    name: 'Isatu Sesay',
    category: 'Demo category: Heart of Gold',
    votes: 742,
    initials: 'IS',
    code: '50MISA26003',
    institution: 'Fourah Bay College',
    color: 'gold',
    story: 'Demo nominee biography content. Approved nominee information will replace this text when the platform is connected to live data.',
  },
]

export const events: Event[] = [
  {
    slug: '50misa-2026',
    title: "50 Most Influential Students' Award – Sierra Leone",
    date: '21 Nov 2026',
    location: 'Freetown City Hall',
    type: 'Awards Ceremony',
    price: 'From NLe 250',
  },
  {
    slug: 'demo-programme-forum',
    title: 'Demo Programme Forum',
    date: '12 Oct 2026',
    location: 'Venue placeholder',
    type: 'Demo Event',
    price: 'Demo',
    demo: true,
  },
  {
    slug: 'demo-community-session',
    title: 'Demo Community Session',
    date: '05 Oct 2026',
    location: 'Venue placeholder',
    type: 'Demo Event',
    price: 'Demo',
    demo: true,
  },
]

export const ticketTiers = [
  { name: 'Diploma', price: 250, displayPrice: 'NLe 250', state: 'Available' },
  { name: 'Degree', price: 500, displayPrice: 'NLe 500', state: 'Available' },
  { name: 'Masters', price: 1000, displayPrice: 'NLe 1,000', state: 'Available' },
  { name: 'PhD', price: 0, displayPrice: 'By Donation', state: 'By Donation' },
]

export const stats = [
  { label: 'Vote orders', value: '1,284', change: 'Demo data' },
  { label: 'Nominees', value: '18', change: 'Demo data' },
  { label: 'Ticket orders', value: '48', change: 'Demo data' },
  { label: 'Pending reviews', value: '12', change: 'Demo data' },
]

export const bars = [42, 58, 48, 72, 64, 84, 78, 96, 88, 76, 94, 100]

export const news = [
  { tag: 'Demo update', title: 'Programme update placeholder', date: '18 Aug 2026' },
  { tag: 'Demo news', title: 'Foundation news placeholder', date: '02 Aug 2026' },
  { tag: 'Demo notice', title: 'Community notice placeholder', date: '21 Jul 2026' },
]

export const mockVotePrice = 10

export const eventDetails = {
  title: "50 Most Influential Students' Award – Sierra Leone",
  edition: '6th Edition',
  date: '21 November 2026',
  time: '5:00 PM',
  location: 'Freetown City Hall',
  artwork: '/campaigns/50misa-2026-official.png',
}

export const ticketIdentifiers = {
  order: 'ORD-26-00048',
  ticket: 'TKT-26-X82F91',
}
