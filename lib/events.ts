export type EventCategory = 'beach_cleanup' | 'bioblitz' | 'waste_collection';

export interface CleanupEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  url: string;
  organization: string;
  category: EventCategory;
}

export const EVENTS: CleanupEvent[] = [
  {
    id: '1',
    title: "Earth Month Nothin' But Sand Beach Clean Up",
    date: '2026-04-18',
    time: '10:00 AM – 12:00 PM',
    location: 'Santa Monica Beach Pier (Northside), Tower 1550',
    description: "Start where it all began, at Heal the Bay's home base in Santa Monica! Join one of the org's largest cleanups to remove debris from the iconic beach.",
    url: 'https://donate.healthebay.org/event/nothin-but-sand-earth-month-2026/e765396',
    organization: 'Heal the Bay',
    category: 'beach_cleanup',
  },
  {
    id: '2',
    title: 'Earth Month BioBlitz – Manhattan Beach',
    date: '2026-04-25',
    time: '10:00 AM – 12:00 PM',
    location: 'Manhattan Beach Dunes',
    description: 'Community science event documenting local wildlife while supporting coastal restoration and honoring communities affected by wildfires.',
    url: 'https://lp.constantcontactpages.com/ev/reg/yfashcv/lp/2e96e74d-25e2-4712-90fe-98425446b8e3',
    organization: 'Heal the Bay',
    category: 'bioblitz',
  },
  {
    id: '3',
    title: 'Earth Month BioBlitz – Temescal Canyon',
    date: '2026-04-26',
    time: '9:00 AM – 12:00 PM',
    location: 'Temescal Canyon Park',
    description: 'Community science event documenting local wildlife while supporting restoration efforts across the LA coast.',
    url: 'https://www.eventbrite.com/e/heal-the-bay-bioblitz-and-restoration-days-2026-la-city-nature-challenge-tickets-1984838745117',
    organization: 'Heal the Bay',
    category: 'bioblitz',
  },
  {
    id: '4',
    title: 'Hacienda Heights HHW & E-Waste Collection',
    date: '2026-05-02',
    time: '9:00 AM – 3:00 PM',
    location: 'Dibble Adult School, 1600 Pontenova Ave, Hacienda Heights',
    description: 'Safely dispose of household hazardous waste and electronic waste free of charge at this drive-through collection event.',
    url: 'https://cleanla.lacounty.gov/event/unincorporated-hacienda-heights-free-hhw-and-e-waste-collection-event/',
    organization: 'LA County CleanLA',
    category: 'waste_collection',
  },
  {
    id: '5',
    title: 'West Covina HHW & E-Waste Collection',
    date: '2026-05-16',
    time: '9:00 AM – 3:00 PM',
    location: 'West Covina Maintenance Yard, 825 S Sunset Ave, West Covina',
    description: 'Safely dispose of household hazardous waste and electronic waste free of charge at this drive-through collection event.',
    url: 'https://cleanla.lacounty.gov/event/city-of-west-covina-hhw-and-e-waste-collection-event/',
    organization: 'LA County CleanLA',
    category: 'waste_collection',
  },
  {
    id: '6',
    title: 'Maywood HHW & E-Waste Collection',
    date: '2026-05-30',
    time: '9:00 AM – 3:00 PM',
    location: 'Southeast Rio Vista YMCA at Maywood Park, 57th St & Heliotrope Ave',
    description: 'Drive-through collection for household hazardous waste and electronic waste at no cost to residents.',
    url: 'https://cleanla.lacounty.gov/event/city-of-maywood-free-hhw-and-e-waste-collection-event/',
    organization: 'LA County CleanLA',
    category: 'waste_collection',
  },
  {
    id: '7',
    title: 'Agoura HHW & E-Waste Collection',
    date: '2026-06-14',
    time: '9:00 AM – 3:00 PM',
    location: 'Calabasas Landfill, 5300 Lost Hills Road, Agoura',
    description: 'Safely dispose of household hazardous waste and electronic waste free of charge at this drive-through collection event.',
    url: 'https://cleanla.lacounty.gov/event/unincorporated-agoura-free-hhw-and-e-waste-collection-event-2/',
    organization: 'LA County CleanLA',
    category: 'waste_collection',
  },
  {
    id: '8',
    title: 'Rowland Heights HHW & E-Waste Collection',
    date: '2026-06-20',
    time: '9:00 AM – 3:00 PM',
    location: 'John A Rowland High School, 2000 S Otterbein Ave, Rowland Heights',
    description: 'Safely dispose of household hazardous waste and electronic waste free of charge at this drive-through collection event.',
    url: 'https://cleanla.lacounty.gov/event/unincorporated-rowland-heights-free-hhw-and-e-waste-collection-event/',
    organization: 'LA County CleanLA',
    category: 'waste_collection',
  },
  {
    id: '9',
    title: 'Culver City HHW & E-Waste Collection',
    date: '2026-06-27',
    time: '9:00 AM – 3:00 PM',
    location: 'Wende Museum, 10808 Culver Blvd, Culver City',
    description: 'Safely dispose of household hazardous waste and electronic waste free of charge at this drive-through collection event.',
    url: 'https://cleanla.lacounty.gov/event/city-of-culver-city-free-hhw-and-e-waste-collection-event-2/',
    organization: 'LA County CleanLA',
    category: 'waste_collection',
  },
];
