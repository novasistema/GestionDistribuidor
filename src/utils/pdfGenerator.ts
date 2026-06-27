import { jsPDF } from 'jspdf';
import { Sale } from '../db';

/**
 * Generates a high-fidelity PDF document from a sale record matching the user's requested layout.
 */
export function generateSalePdf(
  sale: Sale, 
  companyName?: string, 
  companyPhone?: string, 
  companyAddress?: string, 
  logoUrl?: string
): jsPDF {
  // Create A4 portrait document (A4 size: 210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // 1. Safe Date parsing
  let saleDate: Date;
  try {
    saleDate = sale.fecha ? new Date(sale.fecha) : new Date();
  } catch (e) {
    saleDate = new Date();
  }

  // Header Short Date format: DD/MM/YY
  const day = String(saleDate.getDate()).padStart(2, '0');
  const month = String(saleDate.getMonth() + 1).padStart(2, '0');
  const year = String(saleDate.getFullYear()).slice(-2);
  const headerShortDate = `${day}/${month}/${year}`;

  // Emission ISO date format: YYYY-MM-DD
  const emissionIso = saleDate.toISOString().split('T')[0];

  // Price and Subtotal formatting: Dot thousand separator, integer precision (exactly like PDF mockup)
  const formatValueWithDots = (val: number): string => {
    const rounded = Math.round(val);
    const parts = String(rounded).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts[0];
  };

  // Product name clean/truncation & format (prefixed with dot and capitalized)
  const formatProductName = (name: string, maxLen = 42): string => {
    let clean = name.toUpperCase().trim();
    if (!clean.startsWith('.')) {
      clean = '. ' + clean;
    }
    if (clean.length > maxLen) {
      return clean.substring(0, maxLen - 3) + '...';
    }
    return clean;
  };

  const items = sale.articulos;
  const pages: typeof items[] = [];
  let currentChunk: typeof items = [];
  let isFirstPage = true;

  // Split details into pages to avoid overflow. First page holds slightly fewer items due to header space.
  for (const item of items) {
    const capacity = isFirstPage ? 23 : 32;
    currentChunk.push(item);
    if (currentChunk.length === capacity) {
      pages.push(currentChunk);
      currentChunk = [];
      isFirstPage = false;
    }
  }
  if (currentChunk.length > 0) {
    pages.push(currentChunk);
  }

  // Draw each page
  pages.forEach((pageItems, pageIdx) => {
    if (pageIdx > 0) {
      doc.addPage();
    }

    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);

    const isFirst = pageIdx === 0;
    
    if (isFirst) {
      // --- HEADER TEXT COLUMN (LEFT) ---
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.text('Cotización', 15, 20);

      const displayCompany = (companyName || 'WALKER').toUpperCase();
      doc.setFont('helvetica', 'bold');
      
      // Dynamic scaling for company name to avoid overflow clipping
      let companyFontSize = 24;
      if (displayCompany.length > 12) companyFontSize = 18;
      if (displayCompany.length > 20) companyFontSize = 14;
      
      doc.setFontSize(companyFontSize);
      doc.text(displayCompany, 15, 30);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.text(headerShortDate, 15, 38);

      const clientDisplay = `CLIENTE: ${(sale.clienteNombre || 'DESCONOCIDO').toUpperCase()}`;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(clientDisplay, 15, 47);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.text(`Fecha de emisión: ${emissionIso}`, 15, 56);
      doc.text(`Fecha de vencimiento: ${emissionIso}`, 15, 62);

      // --- LOGO (RIGHT) ---
      if (logoUrl) {
        try {
          doc.addImage(logoUrl, 'PNG', 145, 18, 42, 19);
        } catch (err) {
          console.warn("Could not load custom logo into PDF:", err);
          drawDummyOrangeLogo(doc, companyName);
        }
      } else {
        drawDummyOrangeLogo(doc, companyName);
      }

      // CRITICAL RESTORATION: Always restore default black styles, font family and line widths here
      // so that product grids do not inherit logo properties.
      doc.setTextColor(0, 0, 0);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
    }

    // --- PRODUCTS TABLE ---
    const yTableStart = isFirst ? 71 : 20;
    const rowCount = pageItems.length;
    const tableHeight = 8 + (rowCount * 7); // 8mm header + 7mm for each detail row

    // Draw the main grid boundary
    doc.setLineWidth(0.2);
    doc.rect(15, yTableStart, 180, tableHeight);

    // Vertical column separator lines: Column starts at x=15, width=180
    doc.line(115, yTableStart, 115, yTableStart + tableHeight);
    doc.line(135, yTableStart, 135, yTableStart + tableHeight);
    doc.line(160, yTableStart, 160, yTableStart + tableHeight);

    // Horizontal table header divider
    doc.line(15, yTableStart + 8, 195, yTableStart + 8);

    // Horizontal divider for each remaining detail rows
    for (let i = 0; i < rowCount - 1; i++) {
      const lineY = yTableStart + 8 + (i + 1) * 7;
      doc.line(15, lineY, 195, lineY);
    }

    // --- RENDER TABLE HEADERS ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('PRODUCTO', 15 + 2.5, yTableStart + 5.5);
    doc.text('CANTIDAD', 115 + 10, yTableStart + 5.5, { align: 'center' });
    doc.text('PRECIO', 135 + 12.5, yTableStart + 5.5, { align: 'center' });
    doc.text('SUBTOTAL', 160 + 17.5, yTableStart + 5.5, { align: 'center' });

    // --- RENDER TABLE DETAIL ROWS ---
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5); // Fixed elegant size for row details to prevent overflowing margins
    pageItems.forEach((item, index) => {
      const itemY = yTableStart + 8 + (index * 7);
      
      // Producto Name (prefixed with dot and capitalized)
      doc.text(formatProductName(item.nombre), 15 + 2.5, itemY + 5);

      // Cantidad (Centered)
      doc.text(String(item.cantidad), 115 + 10, itemY + 5, { align: 'center' });

      // Precio (Centered)
      doc.text(formatValueWithDots(item.precioConDescuento), 135 + 12.5, itemY + 5, { align: 'center' });

      // Subtotal (Centered)
      doc.text(formatValueWithDots(item.totalItem), 160 + 17.5, itemY + 5, { align: 'center' });
    });

    // --- TOTAL BAR (ONLY ON THE LAST PAGE) ---
    const isLastPage = pageIdx === pages.length - 1;
    if (isLastPage) {
      const totalY = yTableStart + tableHeight + 5;

      // Draw the double grid boxes for Total Info
      doc.setLineWidth(0.2);
      // Left box spans 145mm (Col 1 + Col 2 + Col 3)
      doc.rect(15, totalY, 145, 8);
      // Right box spans 35mm (Col 4)
      doc.rect(160, totalY, 35, 8);

      // Render "TOTAL $" text centered in left box
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('TOTAL $', 15 + (145 / 2), totalY + 5.5, { align: 'center' });

      // Render total numeric value centered in the right box
      doc.text(formatValueWithDots(sale.total), 160 + (35 / 2), totalY + 5.5, { align: 'center' });
    }
  });

  return doc;
}

/**
 * Decently styles an elegant typography orange logotype similar to Walker logo if no image is available.
 */
function drawDummyOrangeLogo(doc: jsPDF, companyName?: string) {
  const words = (companyName || 'Walker').toUpperCase().split(' ');
  let brand = words[0];
  if (brand.length < 4 && words[1]) {
    brand = `${brand} ${words[1]}`;
  }
  
  // Truncate to ideal length if excessively long
  if (brand.length > 15) {
    brand = brand.substring(0, 15);
  }

  let logoFontSize = 26;
  if (brand.length > 8) logoFontSize = 20;
  if (brand.length > 12) logoFontSize = 15;

  // Custom orange styled logo
  doc.setTextColor(249, 115, 22); // Tailwind orange-500
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(logoFontSize);
  
  // Align right against right printable margin (195mm) to guarantee it never overflows boundaries
  doc.text(brand, 195, 28, { align: 'right' });
  
  // Underline matches exactly the width of the text!
  const brandWidth = doc.getTextWidth(brand);
  const startX = 195 - brandWidth;
  
  doc.setDrawColor(249, 115, 22);
  doc.setLineWidth(0.6);
  doc.line(startX, 31, 195, 31);
}

/**
 * Builds a WhatsApp custom text message and triggers redirection URL for sending invoices
 */
export function getWhatsAppShareData(sale: Sale, clientPhone: string, adminPhone?: string, companyName?: string) {
  const itemsSummary = sale.articulos
    .map(i => `• ${i.cantidad}x ${i.nombre} ($${i.precioConDescuento}/u) = *$${i.totalItem.toLocaleString()}*`)
    .join('\n');

  const textMessage = `*${(companyName || 'DISTRIBUIDORA MÓVIL').toUpperCase()}* 🚀\n` +
    `*Comprobante de Venta Electrónico*\n\n` +
    `📄 *Nº Comprobante:* ${sale.numeroComprobante}\n` +
    `📅 *Fecha:* ${new Date(sale.fecha).toLocaleString()}\n` +
    `👤 *Cliente:* ${sale.clienteNombre}\n` +
    `💼 *Vendedor:* ${sale.vendedorNombre}\n\n` +
    `🛒 *Detalle de Artículos:*\n${itemsSummary}\n\n` +
    `💰 *TOTAL FACTURADO:* *$${sale.total.toLocaleString()}*\n\n` +
    `---------------------------------------\n` +
    `ℹ️ _Se ha adjuntado tu comprobante PDF para la rendición de cuentas. ¡Muchas gracias por tu compra!_`;

  const cleanPhone = clientPhone.replace(/[^0-9]/g, '');
  const cleanAdminPhone = adminPhone ? adminPhone.replace(/[^0-9]/g, '') : '';
  
  const clientUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMessage)}`;
  const adminUrl = cleanAdminPhone 
    ? `https://wa.me/${cleanAdminPhone}?text=${encodeURIComponent(`*COPIA ADMINISTRADOR - ${sale.numeroComprobante}*\n\n` + textMessage)}`
    : '';

  return {
    rawMessage: textMessage,
    clientUrl,
    adminUrl
  };
}
