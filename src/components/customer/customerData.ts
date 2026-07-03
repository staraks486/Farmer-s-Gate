import { InventoryItem } from '../../types';

export interface MapTile {
  id: number;
  name: string;
  icon: string;
  x: number;
  y: number;
  isStore?: boolean;
}

export interface Coupon {
  code: string;
  discount: number;
  isPercentage: boolean;
  minAmount: number;
  description: string;
  badge: string;
}

export interface CommunityReview {
  id: string;
  author: string;
  rating: number;
  text: string;
  tags: string[];
  date: string;
}

export const mapTiles: MapTile[] = [
  { id: 1, name: 'Royal Gardens, Sector 45', icon: '🏢', x: 0, y: 0 },
  { id: 2, name: 'Greenwood Meadows, Sector 12', icon: '🏡', x: 1, y: 0 },
  { id: 3, name: 'Palm Grove Residency, Block C', icon: '🏢', x: 2, y: 0 },
  { id: 4, name: 'Saffron Heights, Sector 21', icon: '🏢', x: 3, y: 0 },
  { id: 5, name: 'Central Park Enclave, Sector 8', icon: '🌳', x: 0, y: 1 },
  { id: 6, name: "FarmersGate Dark Store (HQ)", icon: '🏪', x: 1, y: 1, isStore: true },
  { id: 7, name: 'Orchard Valley, Block A', icon: '🏡', x: 2, y: 1 },
  { id: 8, name: 'Skyline Apartments, Sector 50', icon: '🏢', x: 3, y: 1 },
  { id: 9, name: 'Lotus Villa Enclave, Sector 33', icon: '🏡', x: 0, y: 2 },
  { id: 10, name: 'Rosewood Boulevard, Sector 15', icon: '🏡', x: 1, y: 2 },
  { id: 11, name: 'Jasmine Residency, Sector 28', icon: '🏢', x: 2, y: 2 },
  { id: 12, name: 'Crescent Townships, Sector 40', icon: '🏢', x: 3, y: 2 },
];

export const availableCoupons: Coupon[] = [
  {
    code: 'FG50',
    discount: 50,
    isPercentage: false,
    minAmount: 150,
    description: 'Flat ₹50 OFF on orders above ₹150',
    badge: '₹50 OFF'
  },
  {
    code: 'FRESHFAST',
    discount: 10,
    isPercentage: true,
    minAmount: 100,
    description: 'Get 10% OFF on fresh morning harvests',
    badge: '10% OFF'
  },
  {
    code: 'FARMSTEAD',
    discount: 100,
    isPercentage: false,
    minAmount: 300,
    description: 'Flat ₹100 OFF on premium bulk crops above ₹300',
    badge: '₹100 OFF'
  },
  {
    code: 'FIRSTPASS',
    discount: 40,
    isPercentage: false,
    minAmount: 120,
    description: 'Special welcome coupon: Flat ₹40 OFF',
    badge: 'WELCOME OFFER'
  }
];

export const initialReviews: CommunityReview[] = [
  {
    id: 'rev-1',
    author: 'Aarav Kumar',
    rating: 5,
    text: 'Coriander and spinach are so fresh, they still have morning dew! Delivered in literally 8 minutes. Unbelievable.',
    tags: ['🥬 Super Fresh', '🏍️ Lightning Fast'],
    date: 'Today'
  },
  {
    id: 'rev-2',
    author: 'Priya Sharma',
    rating: 5,
    text: 'Onions and potatoes are top graded. Cleanly packed in paper bags instead of plastic. Highly recommended!',
    tags: ['🧼 Cleanly Packed', '💸 Great Price'],
    date: 'Yesterday'
  },
  {
    id: 'rev-3',
    author: 'Rohan Mehta',
    rating: 4,
    text: 'Great customer service. One tomato was slightly dented, and they immediately refunded it as cashback to my wallet!',
    tags: ['👑 Best Service', '🥬 Fresh'],
    date: '3 days ago'
  }
];

export const getVegEmoji = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('tomato')) return '🍅';
  if (n.includes('potato')) return '🥔';
  if (n.includes('onion')) return '🧅';
  if (n.includes('spinach') || n.includes('lettuce') || n.includes('cabbage') || n.includes('greens') || n.includes('methi') || n.includes('coriander') || n.includes('mint')) return '🥬';
  if (n.includes('carrot')) return '🥕';
  if (n.includes('garlic')) return '🧄';
  if (n.includes('ginger') || n.includes('adrak')) return '𫊪';
  if (n.includes('chili') || n.includes('pepper') || n.includes('mirch')) return '🌶️';
  if (n.includes('cucumber') || n.includes('kheera')) return '🥒';
  if (n.includes('corn') || n.includes('bhutta')) return '🌽';
  if (n.includes('broccoli')) return '🥦';
  if (n.includes('mushroom')) return '🍄';
  if (n.includes('lemon') || n.includes('nimbu')) return '🍋';
  if (n.includes('apple')) return '🍎';
  if (n.includes('banana')) return '🍌';
  if (n.includes('gourd') || n.includes('lauki')) return '🥒';
  return '🌱';
};

export const getVegColorClass = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('spinach') || n.includes('coriander') || n.includes('cabbage') || n.includes('methi') || n.includes('mint')) return 'from-emerald-50 to-emerald-100/50 text-emerald-700 border-emerald-100';
  if (n.includes('tomato') || n.includes('chili') || n.includes('apple')) return 'from-rose-50 to-orange-100/40 text-rose-600 border-rose-100';
  if (n.includes('potato') || n.includes('ginger') || n.includes('banana')) return 'from-amber-50 to-amber-100/40 text-amber-700 border-amber-100';
  if (n.includes('onion') || n.includes('garlic')) return 'from-purple-50 to-fuchsia-100/40 text-purple-700 border-purple-100';
  return 'from-slate-50 to-zinc-100/40 text-zinc-600 border-zinc-100';
};

export const getCategoryOfCrop = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('spinach') || n.includes('lettuce') || n.includes('cabbage') || n.includes('leaf') || n.includes('coriander') || n.includes('mint') || n.includes('methi')) return 'Leafy Greens';
  if (n.includes('potato') || n.includes('carrot') || n.includes('ginger') || n.includes('beetroot')) return 'Root Crops';
  if (n.includes('onion') || n.includes('garlic') || n.includes('tomato')) return 'Kitchen Staples';
  if (n.includes('chili') || n.includes('pepper') || n.includes('ginger') || n.includes('turmeric')) return 'Chili & Spices';
  return 'Daily Vegetables';
};
