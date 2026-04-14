// Mock data store for AutoBiz Pro demo

export const mockBookings = [
  { id: 1, customer: 'Priya Mehta', service: 'Haircut & Style', amount: 800, status: 'confirmed', time: '10:00 AM', date: '2026-04-11', phone: '+91 98765 43210', avatar: 'PM', avatarColor: '#6366f1' },
  { id: 2, customer: 'Arjun Singh', service: 'Beard Trim', amount: 300, status: 'pending', time: '11:30 AM', date: '2026-04-11', phone: '+91 87654 32109', avatar: 'AS', avatarColor: '#10b981' },
  { id: 3, customer: 'Sneha Patel', service: 'Full Body Massage', amount: 2500, status: 'confirmed', time: '2:00 PM', date: '2026-04-11', phone: '+91 76543 21098', avatar: 'SP', avatarColor: '#f59e0b' },
  { id: 4, customer: 'Vikram Rao', service: 'Hair Color', amount: 1800, status: 'completed', time: '4:00 PM', date: '2026-04-11', phone: '+91 65432 10987', avatar: 'VR', avatarColor: '#a855f7' },
  { id: 5, customer: 'Ananya Gupta', service: 'Facial', amount: 1200, status: 'cancelled', time: '5:30 PM', date: '2026-04-11', phone: '+91 54321 09876', avatar: 'AG', avatarColor: '#ef4444' },
  { id: 6, customer: 'Rohan Kumar', service: 'Haircut', amount: 500, status: 'confirmed', time: '9:00 AM', date: '2026-04-12', phone: '+91 43210 98765', avatar: 'RK', avatarColor: '#06b6d4' },
  { id: 7, customer: 'Deepika Nair', service: 'Manicure', amount: 600, status: 'pending', time: '12:00 PM', date: '2026-04-12', phone: '+91 32109 87654', avatar: 'DN', avatarColor: '#ec4899' },
];

export const mockCustomers = [
  { id: 1, name: 'Priya Mehta', phone: '+91 98765 43210', lastVisit: '2026-04-11', totalSpent: 5600, totalVisits: 8, avatar: 'PM', avatarColor: '#6366f1', status: 'active' },
  { id: 2, name: 'Arjun Singh', phone: '+91 87654 32109', lastVisit: '2026-04-11', totalSpent: 2100, totalVisits: 5, avatar: 'AS', avatarColor: '#10b981', status: 'active' },
  { id: 3, name: 'Sneha Patel', phone: '+91 76543 21098', lastVisit: '2026-04-09', totalSpent: 9800, totalVisits: 12, avatar: 'SP', avatarColor: '#f59e0b', status: 'active' },
  { id: 4, name: 'Vikram Rao', phone: '+91 65432 10987', lastVisit: '2026-04-08', totalSpent: 4200, totalVisits: 6, avatar: 'VR', avatarColor: '#a855f7', status: 'active' },
  { id: 5, name: 'Ananya Gupta', phone: '+91 54321 09876', lastVisit: '2026-03-25', totalSpent: 7200, totalVisits: 9, avatar: 'AG', avatarColor: '#ef4444', status: 'inactive' },
  { id: 6, name: 'Rohan Kumar', phone: '+91 43210 98765', lastVisit: '2026-04-05', totalSpent: 1800, totalVisits: 3, avatar: 'RK', avatarColor: '#06b6d4', status: 'active' },
  { id: 7, name: 'Deepika Nair', phone: '+91 32109 87654', lastVisit: '2026-04-03', totalSpent: 3400, totalVisits: 7, avatar: 'DN', avatarColor: '#ec4899', status: 'active' },
  { id: 8, name: 'Kiran Bose', phone: '+91 21098 76543', lastVisit: '2026-03-15', totalSpent: 600, totalVisits: 1, avatar: 'KB', avatarColor: '#14b8a6', status: 'inactive' },
];

export const mockMessages = [
  {
    id: 1, customer: 'Priya Mehta', avatar: 'PM', avatarColor: '#6366f1',
    platform: 'whatsapp', unread: 2, lastTime: '10:32 AM',
    messages: [
      { id: 1, text: 'Hi, what are your services?', from: 'customer', time: '10:28 AM' },
      { id: 2, text: 'Hello Priya! We offer haircuts, coloring, facials, and more. Check our booking link to see all services!', from: 'business', time: '10:29 AM' },
      { id: 3, text: 'What is the price for hair color?', from: 'customer', time: '10:32 AM' },
      { id: 4, text: 'Hair color starts from ₹1,800. Want to book a slot?', from: 'customer', time: '10:32 AM' },
    ]
  },
  {
    id: 2, customer: 'Arjun Singh', avatar: 'AS', avatarColor: '#10b981',
    platform: 'instagram', unread: 0, lastTime: '9:15 AM',
    messages: [
      { id: 1, text: 'Can I book for today?', from: 'customer', time: '9:10 AM' },
      { id: 2, text: 'Yes! Click the link to book: https://autobizpro.app/book/haircraft', from: 'business', time: '9:12 AM' },
      { id: 3, text: 'Done! Thanks 🙏', from: 'customer', time: '9:15 AM' },
    ]
  },
  {
    id: 3, customer: 'Sneha Patel', avatar: 'SP', avatarColor: '#f59e0b',
    platform: 'whatsapp', unread: 1, lastTime: 'Yesterday',
    messages: [
      { id: 1, text: 'Is there any discount today?', from: 'customer', time: 'Yesterday' },
    ]
  },
  {
    id: 4, customer: 'Vikram Rao', avatar: 'VR', avatarColor: '#a855f7',
    platform: 'whatsapp', unread: 0, lastTime: 'Yesterday',
    messages: [
      { id: 1, text: 'Reminder: Your appointment is tomorrow at 4 PM', from: 'business', time: 'Yesterday' },
      { id: 2, text: 'Thanks for the reminder!', from: 'customer', time: 'Yesterday' },
    ]
  },
];

export const mockAutomations = [
  { id: 1, name: 'Price Enquiry Reply', trigger: 'Message contains "price"', action: 'Send price list + booking link', active: true, runs: 48 },
  { id: 2, name: 'Booking Confirmation', trigger: 'Booking confirmed', action: 'Send confirmation + reminder', active: true, runs: 124 },
  { id: 3, name: '24h Follow-up', trigger: 'No reply for 24 hours', action: 'Send follow-up message', active: true, runs: 32 },
  { id: 4, name: 'Walk-in Thank You', trigger: 'Walk-in entry saved', action: 'Send thank you SMS', active: true, runs: 67 },
  { id: 5, name: 'Appointment Reminder', trigger: '2 hours before booking', action: 'Send WhatsApp reminder', active: false, runs: 0 },
  { id: 6, name: 'Review Request', trigger: 'Booking completed', action: 'Send review request link', active: false, runs: 0 },
];

export const mockWalkins = [
  { id: 1, name: 'Kiran Bose', phone: '+91 21098 76543', service: 'Haircut', amount: 400, time: '9:45 AM', date: '2026-04-11' },
  { id: 2, name: 'Manu Sharma', phone: '+91 98765 11111', service: 'Beard Trim', amount: 200, time: '11:00 AM', date: '2026-04-11' },
];

export const mockServices = [
  { id: 1, name: 'Haircut & Style', duration: 45, price: 800, category: 'Hair' },
  { id: 2, name: 'Beard Trim', duration: 20, price: 300, category: 'Grooming' },
  { id: 3, name: 'Hair Color', duration: 120, price: 1800, category: 'Hair' },
  { id: 4, name: 'Full Body Massage', duration: 90, price: 2500, category: 'Wellness' },
  { id: 5, name: 'Facial', duration: 60, price: 1200, category: 'Skin' },
  { id: 6, name: 'Manicure', duration: 45, price: 600, category: 'Nails' },
  { id: 7, name: 'Pedicure', duration: 45, price: 700, category: 'Nails' },
  { id: 8, name: 'Hair Spa', duration: 60, price: 1500, category: 'Hair' },
];

export const mockRevenueData = [
  { day: 'Mon', revenue: 4200, bookings: 6 },
  { day: 'Tue', revenue: 5800, bookings: 8 },
  { day: 'Wed', revenue: 3100, bookings: 4 },
  { day: 'Thu', revenue: 6700, bookings: 9 },
  { day: 'Fri', revenue: 8900, bookings: 12 },
  { day: 'Sat', revenue: 12400, bookings: 18 },
  { day: 'Sun', revenue: 9600, bookings: 14 },
];
