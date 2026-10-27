export interface SportCategory {
  id: number;
  code: string;
  name: string;
  description: string;
  banner_image: string;
  sort_order: number;
  court_count?: number;
}

export interface VenueAmenity {
  id: number;
  name: string;
  icon?: string;
}

export interface Court {
  id: number;
  venue_id: number;
  sport_category_id: number;
  sport_category?: SportCategory;
  code: string;
  name: string;
  surface_type: string;
  indoor: boolean;
  capacity: number;
  hourly_rate_standard: number;
  hourly_rate_peak: number;
  peak_start: string;
  peak_end: string;
  min_booking_minutes: number;
  slot_minutes: number;
  description?: string;
  status: 'active' | 'maintenance' | 'closed';
}

export interface Venue {
  id: number;
  owner_id: number;
  code: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  ward?: string;
  district: string;
  city: string;
  latitude?: number;
  longitude?: number;
  phone: string;
  email?: string;
  open_time: string;
  close_time: string;
  rating: number;
  review_count: number;
  image: string;
  status: 'active' | 'inactive' | 'pending';
  amenities?: VenueAmenity[];
  courts?: Court[];
}

export interface Addon {
  id: number;
  code: string;
  name: string;
  category: 'drink' | 'equipment' | 'service';
  price: number;
  unit: string;
  stock_quantity?: number;
}

export interface Voucher {
  id: number;
  code: string;
  name: string;
  discount_type: 'fixed' | 'percent';
  discount_value: number;
  max_discount?: number;
  min_order_value: number;
  usage_limit?: number;
  used_count: number;
  starts_at: string;
  ends_at: string;
  status: 'active' | 'inactive';
}

export interface Booking {
  id: number;
  booking_code: string;
  user_id?: number;
  venue_id: number;
  venue?: Venue;
  court_id: number;
  court?: Court;
  voucher_id?: number;
  source: 'website' | 'counter' | 'admin';
  booking_date: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  note?: string;
  court_fee: number;
  addons_fee: number;
  discount_amount: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  payment_status: 'unpaid' | 'partial' | 'paid' | 'refunded';
  payment_method: 'vietqr' | 'cash' | 'bank_transfer';
  checked_in: boolean;
  checked_in_at?: string;
  created_at: string;
}

export const MOCK_CATEGORIES: SportCategory[] = [
  {
    id: 1,
    code: 'football',
    name: 'Bóng Đá Mini',
    description: 'Sân cỏ nhân tạo 5 & 7 người đạt chuẩn thi đấu',
    banner_image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',
    sort_order: 1,
    court_count: 28,
  },
  {
    id: 2,
    code: 'badminton',
    name: 'Cầu Lông',
    description: 'Sân thảm Yonex chống trượt, trần cao và đèn chống chói',
    banner_image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80',
    sort_order: 2,
    court_count: 42,
  },
  {
    id: 3,
    code: 'pickleball',
    name: 'Pickleball',
    description: 'Sân Acrylic 8 lớp tiêu chuẩn USA, trong nhà & ngoài trời',
    banner_image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1200&q=80',
    sort_order: 3,
    court_count: 18,
  },
  {
    id: 4,
    code: 'tennis',
    name: 'Quần Vợt',
    description: 'Sân cứng Decoturf có mái che và máy bắn bóng tự động',
    banner_image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1200&q=80',
    sort_order: 4,
    court_count: 12,
  },
  {
    id: 5,
    code: 'basketball',
    name: 'Bóng Rổ',
    description: 'Sàn gỗ Maple giảm chấn chuẩn FIBA và bảng rổ kính cường lực',
    banner_image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80',
    sort_order: 5,
    court_count: 15,
  }
];

export const MOCK_VENUES: Venue[] = [
  {
    id: 1,
    owner_id: 2,
    code: 'CHAN-HUNG',
    name: 'SportZone Chấn Hưng Complex',
    slug: 'sportzone-chan-hung',
    description: 'Tổ hợp thể thao đa năng hàng đầu khu vực Tân Bình với cụm sân bóng đá cỏ nhân tạo monofilament và sân cầu lông thảm chuyên nghiệp.',
    address: '48 Chấn Hưng',
    ward: 'Phường 6',
    district: 'Quận Tân Bình',
    city: 'TP. Hồ Chí Minh',
    phone: '0908 123 456',
    email: 'chanhung@sportzone.local',
    open_time: '06:00',
    close_time: '23:00',
    rating: 4.8,
    review_count: 10,
    image: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1200&q=80',
    status: 'active',
    amenities: [
      { id: 1, name: 'Bãi đỗ ô tô & xe máy rộng rãi' },
      { id: 2, name: 'Căng tin máy lạnh phục vụ nước ép' },
      { id: 3, name: 'Phòng tắm nóng lạnh riêng biệt' },
      { id: 4, name: 'Hệ thống đèn LED 500 Lux' },
      { id: 5, name: 'Wifi tốc độ cao miễn phí' },
    ],
    courts: [
      {
        id: 1,
        venue_id: 1,
        sport_category_id: 1,
        code: 'FB-1',
        name: 'Sân Bóng Đá 1 (5 người)',
        surface_type: 'Cỏ nhân tạo Monofilament 50mm',
        indoor: false,
        capacity: 10,
        hourly_rate_standard: 220000,
        hourly_rate_peak: 340000,
        peak_start: '17:00:00',
        peak_end: '21:00:00',
        min_booking_minutes: 60,
        slot_minutes: 30,
        status: 'active'
      },
      {
        id: 2,
        venue_id: 1,
        sport_category_id: 1,
        code: 'FB-2',
        name: 'Sân Bóng Đá 2 (5 người)',
        surface_type: 'Cỏ nhân tạo Monofilament 50mm',
        indoor: false,
        capacity: 10,
        hourly_rate_standard: 220000,
        hourly_rate_peak: 340000,
        peak_start: '17:00:00',
        peak_end: '21:00:00',
        min_booking_minutes: 60,
        slot_minutes: 30,
        status: 'active'
      },
      {
        id: 3,
        venue_id: 1,
        sport_category_id: 1,
        code: 'FB-7',
        name: 'Sân Bóng Đá 7 Người VIP',
        surface_type: 'Cỏ nhân tạo cao cấp VFF',
        indoor: false,
        capacity: 14,
        hourly_rate_standard: 450000,
        hourly_rate_peak: 680000,
        peak_start: '17:00:00',
        peak_end: '21:00:00',
        min_booking_minutes: 60,
        slot_minutes: 30,
        status: 'active'
      },
      {
        id: 4,
        venue_id: 1,
        sport_category_id: 2,
        code: 'BM-1',
        name: 'Sân Cầu Lông VIP 1',
        surface_type: 'Thảm Yonex 5.0mm',
        indoor: true,
        capacity: 4,
        hourly_rate_standard: 90000,
        hourly_rate_peak: 140000,
        peak_start: '17:00:00',
        peak_end: '21:00:00',
        min_booking_minutes: 60,
        slot_minutes: 30,
        status: 'active'
      },
    ]
  },
  {
    id: 2,
    owner_id: 3,
    code: 'D-SPORTS',
    name: 'D-Sports Pickleball & Tennis Arena',
    slug: 'dsports-pickleball-arena',
    description: 'Trung tâm thể thao trong nhà cao cấp chuyên biệt cho Pickleball và Tennis chuẩn thi đấu quốc tế tại Phú Nhuận.',
    address: '202 Hoàng Văn Thụ',
    ward: 'Phường 9',
    district: 'Quận Phú Nhuận',
    city: 'TP. Hồ Chí Minh',
    phone: '0938 889 990',
    email: 'dsports@sportzone.local',
    open_time: '05:30',
    close_time: '23:00',
    rating: 4.9,
    review_count: 489,
    image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1200&q=80',
    status: 'active',
    amenities: [
      { id: 6, name: 'Mái che vòm cao 12m' },
      { id: 7, name: 'Pro Shop bán vợt & bóng chính hãng' },
      { id: 8, name: 'Quán cà phê view sân tầng 2' },
      { id: 9, name: 'Phòng thay đồ khóa vân tay' }
    ],
    courts: [
      {
        id: 6,
        venue_id: 2,
        sport_category_id: 3,
        code: 'PB-1',
        name: 'Pickleball Center Court 1',
        surface_type: 'Acrylic 8 lớp tiêu chuẩn USA',
        indoor: true,
        capacity: 4,
        hourly_rate_standard: 150000,
        hourly_rate_peak: 240000,
        peak_start: '17:00:00',
        peak_end: '21:00:00',
        min_booking_minutes: 60,
        slot_minutes: 30,
        status: 'active'
      },
      {
        id: 9,
        venue_id: 2,
        sport_category_id: 4,
        code: 'TN-1',
        name: 'Tennis Center Court',
        surface_type: 'Hard Court Acrylic Decoturf',
        indoor: true,
        capacity: 4,
        hourly_rate_standard: 200000,
        hourly_rate_peak: 320000,
        peak_start: '17:00:00',
        peak_end: '21:00:00',
        min_booking_minutes: 60,
        slot_minutes: 30,
        status: 'active'
      }
    ]
  },
  {
    id: 3,
    owner_id: 2,
    code: 'HOOP-ZONE',
    name: 'Hoop Zone & Badminton Center Hà Nội',
    slug: 'hoopzone-badminton-hanoi',
    description: 'Trung tâm thể thao chất lượng cao tại Cầu Giấy, nổi tiếng với mặt sàn gỗ Maple bóng rổ và cụm sân cầu lông thoáng mát.',
    address: '180 Hoàng Quốc Việt',
    district: 'Quận Cầu Giấy',
    city: 'Hà Nội',
    phone: '0977 654 321',
    open_time: '06:00',
    close_time: '22:30',
    rating: 4.7,
    review_count: 215,
    image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80',
    status: 'active',
    amenities: [
      { id: 10, name: 'Sàn gỗ giảm chấn' },
      { id: 11, name: 'Bảng điểm điện tử LED' },
      { id: 12, name: 'Tủ locker khóa từ an toàn' }
    ],
    courts: [
      {
        id: 10,
        venue_id: 3,
        sport_category_id: 5,
        code: 'BB-1',
        name: 'Sân Bóng Rổ Full Court 5x5',
        surface_type: 'Sàn gỗ Maple tiêu chuẩn NBA',
        indoor: true,
        capacity: 10,
        hourly_rate_standard: 300000,
        hourly_rate_peak: 450000,
        peak_start: '17:00:00',
        peak_end: '21:00:00',
        min_booking_minutes: 60,
        slot_minutes: 30,
        status: 'active'
      }
    ]
  }
];

export const MOCK_ADDONS: Addon[] = [
  { id: 1, code: 'WATER-AQUA', name: 'Nước suối Aquafina 500ml', category: 'drink', price: 10000, unit: 'Chai', stock_quantity: 200 },
  { id: 2, code: 'WATER-POCARI', name: 'Nước điện giải Pocari Sweat 500ml', category: 'drink', price: 20000, unit: 'Chai', stock_quantity: 100 },
  { id: 3, code: 'WATER-REVIVE', name: 'Revive Chanh muối bù khoáng', category: 'drink', price: 18000, unit: 'Chai', stock_quantity: 85 },
  { id: 4, code: 'RENT-BM', name: 'Thuê vợt Cầu lông Yonex Carbon Pro', category: 'equipment', price: 30000, unit: 'Cây/Trận', stock_quantity: 20 },
  { id: 5, code: 'RENT-PB', name: 'Thuê set 2 vợt Pickleball + 3 bóng', category: 'equipment', price: 40000, unit: 'Set/Trận', stock_quantity: 16 },
  { id: 6, code: 'RENT-FB', name: 'Thuê bóng đá Molten size 5 thi đấu', category: 'equipment', price: 25000, unit: 'Quả/Trận', stock_quantity: 12 },
  { id: 7, code: 'RENT-BIBS', name: 'Thuê bộ 10 áo Bib phân đội', category: 'equipment', price: 30000, unit: 'Bộ/Trận', stock_quantity: 8 },
  { id: 8, code: 'REFEREE', name: 'Trọng tài điều hành trận đấu 60p', category: 'service', price: 150000, unit: 'Trận', stock_quantity: 5 }
];

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: 1,
    booking_code: 'SZ-77812',
    user_id: 4,
    venue_id: 1,
    venue: MOCK_VENUES[0],
    court_id: 1,
    court: MOCK_VENUES[0].courts![0],
    source: 'website',
    booking_date: new Date().toISOString().split('T')[0],
    start_time: '18:00:00',
    end_time: '19:30:00',
    customer_name: 'Nguyễn Minh Anh',
    customer_phone: '0912 345 678',
    customer_email: 'minhanh@example.com',
    note: 'Đội mặc áo xanh thi đấu giao hữu',
    court_fee: 510000,
    addons_fee: 40000,
    discount_amount: 50000,
    total_price: 500000,
    status: 'confirmed',
    payment_status: 'paid',
    payment_method: 'vietqr',
    checked_in: false,
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    booking_code: 'SZ-88301',
    user_id: 4,
    venue_id: 2,
    venue: MOCK_VENUES[1],
    court_id: 6,
    court: MOCK_VENUES[1].courts![0],
    source: 'website',
    booking_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    start_time: '19:00:00',
    end_time: '20:30:00',
    customer_name: 'Trần Quốc Huy',
    customer_phone: '0909 888 777',
    court_fee: 360000,
    addons_fee: 20000,
    discount_amount: 0,
    total_price: 380000,
    status: 'confirmed',
    payment_status: 'partial',
    payment_method: 'cash',
    checked_in: false,
    created_at: new Date().toISOString()
  },
  {
    id: 3,
    booking_code: 'SZ-66021',
    user_id: 4,
    venue_id: 1,
    venue: MOCK_VENUES[0],
    court_id: 4,
    court: MOCK_VENUES[0].courts![3],
    source: 'counter',
    booking_date: new Date().toISOString().split('T')[0],
    start_time: '07:00:00',
    end_time: '08:00:00',
    customer_name: 'Lê Thu Trang',
    customer_phone: '0988 111 222',
    court_fee: 90000,
    addons_fee: 0,
    discount_amount: 0,
    total_price: 90000,
    status: 'completed',
    payment_status: 'paid',
    payment_method: 'cash',
    checked_in: true,
    checked_in_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString()
  }
];
