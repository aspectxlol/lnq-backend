import { promises as fs } from 'fs';

export type PrinterOrderItem = {
  name: string;
  quantity: number;
  price: number; // integer (IDR)
  notes?: string[];
};

export type PrinterOrder = {
  id: number;
  customer: string;
  date: Date;
  pickupDate?: Date | null;
  items: PrinterOrderItem[];
};

function formatPrice(price: number): string {
  // Keep output ASCII-friendly for ESC/POS
  return `Rp${price.toLocaleString('id-ID')}`;
}

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

function formatPrintDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const min = pad2(date.getMinutes());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

// Adapted from your buildPrinterOutput(order: ParsedOrder)
export function buildPrinterOutput(order: PrinterOrder): string {
  const ESC = '\x1B';
  const GS = '\x1D';
  const LF = '\x0A';

  let out = '';

  // === INIT ===
  out += ESC + '@';

  // === CUSTOMER (BIG) ===
  out += ESC + 'a' + '\x01'; // center
  out += GS + '!' + '\x11'; // double width + height
  out += order.customer + LF + LF;

  // === RESET → NORMAL ===
  out += ESC + '@';
  out += ESC + 'a' + '\x01';

  const dateToPrint = order.pickupDate ?? order.date;
  out += formatPrintDate(dateToPrint) + LF + LF;

  // === ITEMS ===
  out += ESC + 'a' + '\x00';
  out += '------------------------------' + LF;

  let total = 0;

  for (const item of order.items) {
    const lineTotal = item.quantity * item.price;
    total += lineTotal;

    // BIG item name
    out += GS + '!' + '\x11';
    out += `${item.quantity}x ` + item.name + LF;

    // RESET for small text
    out += ESC + '@';

    // Quantity / price
    out += ` ${item.quantity} x ${formatPrice(item.price)} = ${formatPrice(lineTotal)}` + LF;

    // NOTES (small + indented)
    if (item.notes?.length) {
      for (const note of item.notes) {
        out += `   (${note})` + LF;
      }
    }
  }

  out += '------------------------------' + LF;

  // === TOTAL (BIG) ===
  out += GS + '!' + '\x11';
  out += `TOTAL ${formatPrice(total)}` + LF + LF;

  // === RESET ===
  out += ESC + '@';
  out += ESC + 'a' + '\x01';
  out += 'Thank you' + LF + LF;

  // === CUT ===
  out += GS + 'V' + '\x00';

  return out;
}

export async function writeToPrinterDevice(devicePath: string, content: string): Promise<void> {
  const handle = await fs.open(devicePath, 'w');
  try {
    // latin1/binary keeps 1 char = 1 byte for control codes
    const buffer = Buffer.from(content, 'latin1');
    await handle.write(buffer, 0, buffer.length, null);
  } finally {
    await handle.close();
  }
}
