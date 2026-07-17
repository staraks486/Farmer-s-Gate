/**
 * WhatsApp Service for FarmersGate
 * Generates beautifully formatted order message templates for customers to send via WhatsApp.
 */

export interface WhatsAppItem {
  vegetableName: string;
  quantity: number;
  pricePerKg: number;
  totalPrice: number;
  emoji?: string;
  unit?: string;
}

export interface WhatsAppOrderDetails {
  orderNumber?: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: WhatsAppItem[];
  totalAmount: number;
  discount?: number;
  walletDebited?: number;
  deliveryFee?: number;
  finalPaid: number;
  storeName?: string;
  orderDate?: string;
  status?: string;
  storeLocation?: string;
  storeManagerName?: string;
  storeManagerPhone?: string;
}

/**
 * Generates a clean, professional, and visually engaging WhatsApp text message 
 * detailing customer purchases and total invoice status.
 */
export function generateWhatsAppOrderMessage(details: WhatsAppOrderDetails): string {
  const storeHeader = details.storeName ? `🏪 *Store:* ${details.storeName}` : `🏪 *FarmersGate Dispatch Hub*`;
  const locationLine = details.storeLocation ? `📍 *Store Location:* ${details.storeLocation}` : '';
  const managerLine = (details.storeManagerName || details.storeManagerPhone)
    ? `👤 *Store Manager:* ${details.storeManagerName || 'Manager'} (${details.storeManagerPhone || 'N/A'})`
    : '';
  const orderNumStr = details.orderNumber ? `🆔 *Order ID:* #${details.orderNumber}` : `🆔 *Order:* Draft Checkout`;
  const dateStr = details.orderDate 
    ? `📅 *Date:* ${new Date(details.orderDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}` 
    : '';
  const statusStr = details.status ? `🚦 *Status:* ${details.status}` : '';

  const customerSection = [
    `👤 *Customer:* ${details.customerName}`,
    `📞 *Contact:* ${details.customerPhone}`,
    `📍 *Address:* ${details.customerAddress}`
  ].join('\n');

  const itemsHeader = `*🛍️ Sourced Harvest Items:*`;
  const itemsList = details.items.map((item, idx) => {
    const unitLabel = item.unit || 'Kg';
    const emojiStr = item.emoji || '🥦';
    return `${idx + 1}. ${emojiStr} *${item.vegetableName}* - ${item.quantity} ${unitLabel} (₹${item.pricePerKg}/${unitLabel}) → *₹${item.totalPrice.toFixed(2)}*`;
  }).join('\n');

  const summaryLines = [
    `-----------------------------`,
    `💰 *Subtotal:* ₹${details.totalAmount.toFixed(2)}`
  ];

  if (details.discount && details.discount > 0) {
    summaryLines.push(`🎟️ *Promo Slashed:* -₹${details.discount.toFixed(2)}`);
  }

  if (details.walletDebited && details.walletDebited > 0) {
    summaryLines.push(`💳 *Wallet Debited:* -₹${details.walletDebited.toFixed(2)}`);
  }

  const deliveryCharge = details.deliveryFee ?? 0;
  summaryLines.push(`🚚 *Delivery Fee:* ${deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge.toFixed(2)}`}`);
  summaryLines.push(`-----------------------------`);
  summaryLines.push(`⭐ *Total Paid/Payable:* *₹${details.finalPaid.toFixed(2)}*`);
  summaryLines.push(`-----------------------------`);

  const footer = `🌾 _Thank you for buying farm direct! Delivered in 9-Mins by FarmersGate_ ⚡`;

  const templateArray = [
    `🌾 *FARMERSGATE TICKET RECEIPT* 🌾`,
    '',
    storeHeader,
  ];

  if (locationLine) {
    templateArray.push(locationLine);
  }
  if (managerLine) {
    templateArray.push(managerLine);
  }

  templateArray.push(
    orderNumStr,
    dateStr,
    statusStr,
    '',
    customerSection,
    '',
    itemsHeader,
    itemsList,
    '',
    ...summaryLines,
    '',
    footer
  );

  return templateArray.filter(line => line !== null && line !== undefined).join('\n');
}

/**
 * Constructs a fully encoded wa.me redirect link.
 * If targetPhoneNumber is provided, targets that phone number.
 */
export function getWhatsAppLink(message: string, targetPhoneNumber?: string): string {
  const cleanPhone = targetPhoneNumber 
    ? targetPhoneNumber.trim().replace(/[^\d]/g, '') 
    : '';
  
  const encodedText = encodeURIComponent(message);
  
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}

/**
 * Directly triggers standard browser redirect to send the order message.
 */
export function sendWhatsAppOrder(details: WhatsAppOrderDetails, targetPhoneNumber?: string): void {
  const msg = generateWhatsAppOrderMessage(details);
  const url = getWhatsAppLink(msg, targetPhoneNumber);
  window.open(url, '_blank', 'noopener,noreferrer');
}
