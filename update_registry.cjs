const fs = require('fs');
let code = fs.readFileSync('src/components/CustomerMilkRegistry.tsx', 'utf-8');

// Add imports
code = code.replace(
  `} from 'lucide-react';`, 
  `  FileText,
  Share2,
  Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';`
);

// Add state for billing modal
if (!code.includes('showBillModal')) {
  code = code.replace(
    /const \[customers, setCustomers\] = useState<MilkCustomer\[\]>/,
    `const [showBillModal, setShowBillModal] = useState<MilkCustomer | null>(null);
  const [customers, setCustomers] = useState<MilkCustomer[]>`
  );
}

// Add billing functions and modal
const modalCode = `
  const generateBillContent = (c: MilkCustomer) => {
    // Collect last 30 logs
    const recentLogs = (c.logs || []).slice(-30).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    let totalAmt = 0;
    recentLogs.forEach(l => {
       if (l.delivered) {
         if (c.milkType === 'Both') {
            const cowQty = l.cowQuantity ?? (c.cowQuantity || 0);
            const bufQty = l.buffaloQuantity ?? (c.buffaloQuantity || 0);
            totalAmt += (cowQty * (c.cowPrice ?? 0)) + (bufQty * (c.buffaloPrice ?? 0));
         } else {
            const qty = l.actualQuantity ?? c.quantity;
            totalAmt += (qty * c.price);
         }
       }
    });

    return { recentLogs, totalAmt };
  };

  const handleDownloadPDF = async (c: MilkCustomer) => {
    const el = document.getElementById('bill-receipt-content');
    if (!el) return;
    
    const canvas = await html2canvas(el, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(\`MilkBill_\${c.name.replace(/\\s/g, '_')}.pdf\`);
  };

  const handleDownloadImage = async (c: MilkCustomer) => {
    const el = document.getElementById('bill-receipt-content');
    if (!el) return;
    
    const canvas = await html2canvas(el, { scale: 2 });
    const link = document.createElement('a');
    link.download = \`MilkBill_\${c.name.replace(/\\s/g, '_')}.png\`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleShareWhatsApp = (c: MilkCustomer) => {
    const { recentLogs, totalAmt } = generateBillContent(c);
    
    let text = \`🐄 *FARMERSGATE MILK LEDGER* 🐄\\n\\n\`;
    text += \`👤 *Name:* \${c.name}\\n\`;
    text += \`📝 *Subscription:* \${c.milkType} (\${c.milkType === 'Both' ? \`Cow: \${c.cowQuantity}L, Buf: \${c.buffaloQuantity}L\` : \`\${c.quantity}L/day\`})\\n\\n\`;
    
    text += \`*📅 Recent Deliveries:*\\n\`;
    recentLogs.slice(0, 10).forEach(l => {
       text += \`- \${new Date(l.date).toLocaleDateString()}: \${l.delivered ? '✅ Delivered' : '❌ Missed'}\\n\`;
    });
    if (recentLogs.length > 10) {
      text += \`- ... and \${recentLogs.length - 10} more\\n\`;
    }
    
    text += \`\\n💰 *Total Due (Selected Period):* ₹\${totalAmt.toFixed(2)}\\n\\n\`;
    text += \`_Powered by FarmersGate Tech_\`;
    
    const encoded = encodeURIComponent(text);
    window.open(\`https://wa.me/\${c.mobile}?text=\${encoded}\`, '_blank');
  };
`;

// Insert modal logic
code = code.replace(
  `const handleQuickSetPrice =`, 
  modalCode + `\n  const handleQuickSetPrice =`
);

fs.writeFileSync('src/components/CustomerMilkRegistry.tsx', code);
