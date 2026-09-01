export type Nominee = { name: string; category: string; votes: number; initials: string; code: string; institution: string; color: string; story: string }
export type Event = { slug: string; title: string; date: string; location: string; type: string; price: string }

export const nominees: Nominee[] = [
  { name: 'Mariama Koroma', category: 'Mock category: Community Champion', votes: 1284, initials: 'MK', code: '50MISA26001', institution: 'University of Sierra Leone', color: 'coral', story: 'A demo profile celebrating a student creating safer pathways for girls through community-led mentorship.' },
  { name: 'Abdul Bangura', category: 'Mock category: Future Maker', votes: 984, initials: 'AB', code: '50MISA26002', institution: 'Njala University', color: 'teal', story: 'A demo profile celebrating digital skills, curiosity and opportunity for young people.' },
  { name: 'Isatu Sesay', category: 'Mock category: Heart of Gold', votes: 742, initials: 'IS', code: '50MISA26003', institution: 'Fourah Bay College', color: 'gold', story: 'A demo profile celebrating a student helping every girl feel seen and ready to lead.' },
]

export const events: Event[] = [
  { slug: '50misa-2026', title: "50 Most Influential Students' Award – Sierra Leone", date: '21 Nov 2026', location: 'Freetown City Hall', type: 'Awards night', price: 'From NLe 250' },
  { slug: 'girls-who-build', title: 'Girls Who Build', date: '12 Oct 2026', location: 'Freetown Innovation Hub', type: 'Workshop', price: 'Free' },
  { slug: 'walk-for-her-future', title: 'Walk For Her Future', date: '05 Oct 2026', location: 'Lumley Beach', type: 'Community', price: 'From NLe 50' },
]

export const ticketTiers = [
  { name: 'Diploma', price: 250, displayPrice: 'NLe 250', state: 'Available' },
  { name: 'Degree', price: 500, displayPrice: 'NLe 500', state: 'Available' },
  { name: 'Masters', price: 1000, displayPrice: 'NLe 1,000', state: 'Available' },
  { name: 'PhD', price: 0, displayPrice: 'By Donation', state: 'By Donation' },
]

export const stats = [
  { label: 'Demo votes recorded', value: '1,284', change: 'Sample data' },
  { label: 'Demo nominees', value: '18', change: 'Sample data' },
  { label: 'Demo events', value: '03', change: 'Sample data' },
  { label: 'Demo ticket orders', value: '48', change: 'Sample data' },
]
export const bars = [42, 58, 48, 72, 64, 84, 78, 96, 88, 76, 94, 100]
export const news = [
  { tag: 'Demo story', title: 'The girls turning curiosity into careers', date: '18 Aug 2026' },
  { tag: 'Demo field note', title: 'A new chapter for community mentorship', date: '02 Aug 2026' },
  { tag: 'Demo update', title: 'Celebrating the helpers behind the heroes', date: '21 Jul 2026' },
]
export const mockVotePrice = 10
export const eventDetails = { title: "50 Most Influential Students' Award – Sierra Leone", edition: '6th Edition', date: '21 November 2026', time: '5:00 PM', location: 'Freetown City Hall' }
export const ticketIdentifiers = { order: 'ORD-26-00048', ticket: 'TKT-26-X82F91' }
