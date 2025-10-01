export const MARKETPLACE_MAPPINGS = {
  'tiktok': {
    'brand': 'TIKTOK',
    'order_number': 'Order ID',
    'order_status': 'Order Substatus',
    'order_date': 'Created Time',
    'wh_loc': 'Warehouse Name',
    'awb': 'Tracking ID',
    'transporter': 'Shipping Provider Name',
    'sla': null
  },
  'zalora': {
    'brand': 'GINEE',
    'order_number': 'Order Number',
    'order_status': 'Status',
    'order_date': 'Created at',
    'wh_loc': null,
    'awb': 'Tracking Code',
    'transporter': 'Shipping Provider',
    'sla': null
  },
  'shopee': {
    'brand': 'SHOPEE',
    'order_number': 'No. Pesanan',
    'order_status': 'Status Pesanan',
    'order_date': 'Waktu Pesanan Dibuat',
    'wh_loc': 'Nama Gudang',
    'awb': 'No. Resi',
    'transporter': 'Opsi Pengiriman',
    'sla': 'Pesanan Harus Dikirimkan Sebelum (Menghindari keterlambatan)'
  },
  'jubelio': {
    'brand': 'JUBELIO',
    'order_number': 'Order ID',
    'order_status': 'Status',
    'order_date': 'Order Date',
    'wh_loc': 'Warehouse Location',
    'awb': 'Tracking Number',
    'transporter': 'Courier',
    'sla': 'SLA'
  },
  'lazada': {
    'brand': 'LAZADA',
    'order_number': 'orderNumber',
    'order_status': 'status',
    'order_date': 'createTime',
    'wh_loc': 'wareHouse',
    'awb': 'trackingCode',
    'transporter': 'shippingProvider',
    'sla': 'ttsSla'
  },
  'tokopedia': {
    'brand': 'TOKOPEDIA',
    'order_number': 'Nomor Invoice',
    'order_status': 'Status Terakhir',
    'order_date': null, // Will be handled specially
    'wh_loc': null,
    'awb': 'No Resi / Kode Booking',
    'transporter': null,
    'sla': null
  },
  'blibli': {
    'brand': 'BLIBLI',
    'order_number': 'No. Order',
    'order_status': 'Order Status',
    'order_date': 'Tanggal Order',
    'wh_loc': null,
    'awb': 'No. Awb',
    'transporter': 'Servis Logistik',
    'sla': null
  },
  'ginee': {
    'brand': 'GINEE',
    'order_number': 'Order ID',
    'order_status': 'Status',
    'order_date': 'Create Time',
    'wh_loc': null,
    'awb': 'AWB/Tracking code',
    'transporter': 'Courier',
    'sla': 'Ship Before'
  },
  'desty': {
    'brand': 'DESTY',
    'order_number': 'Nomor Pesanan\n(di Desty)',
    'order_status': 'Status Pesanan',
    'order_date': 'Tanggal Pesanan Dibuat',
    'wh_loc': 'Nama Gudang\nMaster',
    'awb': 'Nomor AWB/Resi',
    'transporter': 'Kurir',
    'sla': 'Dikirim Sebelum'
  }
};

// Helper function to get marketplace mapping by sales channel
export const getMarketplaceMapping = (salesChannel) => {
  if (!salesChannel) return null;
  
  const normalizedChannel = salesChannel.toLowerCase().trim();
  return MARKETPLACE_MAPPINGS[normalizedChannel] || null;
};

// Helper function to get all available sales channels
export const getAvailableSalesChannels = () => {
  return Object.keys(MARKETPLACE_MAPPINGS).map(channel => ({
    key: channel,
    label: channel.charAt(0).toUpperCase() + channel.slice(1),
    brand: MARKETPLACE_MAPPINGS[channel].brand
  }));
};

// Helper function to get field mapping for a specific marketplace
export const getFieldMapping = (salesChannel, field) => {
  const mapping = getMarketplaceMapping(salesChannel);
  return mapping ? mapping[field] : null;
};

// Helper function to check if a field exists for a marketplace
export const hasField = (salesChannel, field) => {
  const mapping = getMarketplaceMapping(salesChannel);
  return mapping && mapping[field] !== null;
};

// Helper function to get standardized field names
export const getStandardizedFieldNames = () => {
  return {
    'order_number': 'Nomor Order',
    'order_status': 'Status Order',
    'order_date': 'Tanggal Order',
    'wh_loc': 'Nama Gudang',
    'awb': 'Nomor Resi',
    'transporter': 'Kurir/Transporter',
    'sla': 'SLA'
  };
};
