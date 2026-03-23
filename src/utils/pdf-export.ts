import jsPDF from 'jspdf';

interface DreamData {
  id: string;
  title: string;
  content: string;
  dream_date: string;
  mood?: string | null;
  tags?: string[] | null;
  alchemical_phase?: string | null;
  interpretation?: string | null;
  interpretation_summary?: string | null;
  image_url?: string | null;
}

interface ConversationMessage {
  dream_id?: string;
  role: string;
  content: string;
  created_at: string;
}

const MARGIN = 20;
const LINE_HEIGHT = 6;
const SECTION_GAP = 12;

class DiaryPDF {
  private pdf: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private y: number;
  private contentWidth: number;

  constructor() {
    this.pdf = new jsPDF('p', 'mm', 'a4');
    this.pageWidth = this.pdf.internal.pageSize.getWidth();
    this.pageHeight = this.pdf.internal.pageSize.getHeight();
    this.y = MARGIN;
    this.contentWidth = this.pageWidth - MARGIN * 2;
  }

  private checkPage(needed: number = 20) {
    if (this.y + needed > this.pageHeight - MARGIN) {
      this.pdf.addPage();
      this.y = MARGIN;
    }
  }

  private writeTitle(text: string, size: number = 24, color: [number, number, number] = [86, 54, 205]) {
    this.checkPage(size);
    this.pdf.setFontSize(size);
    this.pdf.setTextColor(...color);
    this.pdf.setFont('helvetica', 'bold');
    const lines = this.pdf.splitTextToSize(text, this.contentWidth);
    this.pdf.text(lines, MARGIN, this.y);
    this.y += lines.length * (size * 0.4) + 4;
  }

  private writeSubtitle(text: string) {
    this.checkPage(12);
    this.pdf.setFontSize(14);
    this.pdf.setTextColor(86, 54, 205);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(text, MARGIN, this.y);
    this.y += 8;
  }

  private writeLabel(text: string) {
    this.checkPage(10);
    this.pdf.setFontSize(9);
    this.pdf.setTextColor(140, 140, 140);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(text.toUpperCase(), MARGIN, this.y);
    this.y += 5;
  }

  private writeText(text: string, indent: number = 0) {
    this.pdf.setFontSize(11);
    this.pdf.setTextColor(50, 50, 50);
    this.pdf.setFont('helvetica', 'normal');
    const lines = this.pdf.splitTextToSize(text, this.contentWidth - indent);
    for (const line of lines) {
      this.checkPage(LINE_HEIGHT);
      this.pdf.text(line, MARGIN + indent, this.y);
      this.y += LINE_HEIGHT;
    }
  }

  private writeMeta(label: string, value: string) {
    this.checkPage(8);
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(120, 120, 120);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(`${label}: `, MARGIN, this.y);
    const labelWidth = this.pdf.getTextWidth(`${label}: `);
    this.pdf.setTextColor(50, 50, 50);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(value, MARGIN + labelWidth, this.y);
    this.y += 7;
  }

  private drawSeparator() {
    this.checkPage(8);
    this.y += 4;
    this.pdf.setDrawColor(200, 200, 200);
    this.pdf.setLineWidth(0.3);
    this.pdf.line(MARGIN, this.y, this.pageWidth - MARGIN, this.y);
    this.y += 8;
  }

  private formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  private getPhaseLabel(phase: string): string {
    const labels: Record<string, string> = {
      nigredo: 'Nigredo (Opera al Nero)',
      albedo: 'Albedo (Opera al Bianco)',
      rubedo: 'Rubedo (Opera al Rosso)',
    };
    return labels[phase] || phase;
  }

  writeCover(title: string, subtitle?: string) {
    this.y = this.pageHeight / 3;
    this.pdf.setFontSize(32);
    this.pdf.setTextColor(86, 54, 205);
    this.pdf.setFont('helvetica', 'bold');
    const titleLines = this.pdf.splitTextToSize(title, this.contentWidth);
    this.pdf.text(titleLines, this.pageWidth / 2, this.y, { align: 'center' });
    this.y += titleLines.length * 14 + 10;

    if (subtitle) {
      this.pdf.setFontSize(14);
      this.pdf.setTextColor(120, 120, 120);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text(subtitle, this.pageWidth / 2, this.y, { align: 'center' });
      this.y += 10;
    }

    this.pdf.setFontSize(11);
    this.pdf.setTextColor(160, 160, 160);
    this.pdf.text(
      `Generato il ${new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      this.pageWidth / 2,
      this.y + 20,
      { align: 'center' }
    );
  }

  writeIndex(dreams: DreamData[]) {
    this.pdf.addPage();
    this.y = MARGIN;
    this.writeTitle('Indice dei Sogni', 20);
    this.y += 6;

    dreams.forEach((dream, i) => {
      this.checkPage(10);
      this.pdf.setFontSize(10);
      this.pdf.setTextColor(120, 120, 120);
      this.pdf.setFont('helvetica', 'normal');
      const num = String(i + 1).padStart(2, '0');
      const date = this.formatDate(dream.dream_date);
      this.pdf.text(`${num}. ${date}`, MARGIN, this.y);
      
      this.pdf.setTextColor(50, 50, 50);
      this.pdf.setFont('helvetica', 'bold');
      const titleX = MARGIN + 40;
      const titleLines = this.pdf.splitTextToSize(dream.title, this.contentWidth - 40);
      this.pdf.text(titleLines[0], titleX, this.y);
      this.y += 8;
    });
  }

  writeDreamEntry(dream: DreamData, conversations: ConversationMessage[], index?: number) {
    if (index !== undefined && index > 0) {
      this.pdf.addPage();
      this.y = MARGIN;
    }

    // Header
    if (index !== undefined) {
      this.writeLabel(`Sogno ${String(index + 1).padStart(2, '0')}`);
    }
    this.writeTitle(dream.title, 20, [30, 30, 30]);
    this.writeMeta('Data', this.formatDate(dream.dream_date));
    if (dream.mood) this.writeMeta('Umore', dream.mood);
    if (dream.alchemical_phase) this.writeMeta('Fase Alchemica', this.getPhaseLabel(dream.alchemical_phase));
    if (dream.tags?.length) this.writeMeta('Tag', dream.tags.join(', '));

    this.drawSeparator();

    // Content
    this.writeSubtitle('Il Sogno');
    this.writeText(dream.content);
    this.y += SECTION_GAP;

    // Interpretation
    if (dream.interpretation) {
      this.drawSeparator();
      this.writeSubtitle('Interpretazione');
      // Strip markdown formatting for PDF
      const cleanInterpretation = dream.interpretation
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/- /g, '• ');
      this.writeText(cleanInterpretation);
      this.y += SECTION_GAP;
    }

    // Conversations
    const dreamConvos = conversations.filter(c => 
      (c as any).dream_id ? (c as any).dream_id === dream.id : true
    );

    if (dreamConvos.length > 0) {
      this.drawSeparator();
      this.writeSubtitle('Dialogo con l\'Alchimista');
      
      for (const msg of dreamConvos) {
        this.checkPage(14);
        const sender = msg.role === 'user' ? 'Tu' : 'L\'Alchimista';
        this.pdf.setFontSize(10);
        this.pdf.setTextColor(86, 54, 205);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text(`${sender}:`, MARGIN + 4, this.y);
        this.y += 5;

        const cleanContent = msg.content
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1');
        this.writeText(cleanContent, 4);
        this.y += 4;
      }
    }
  }

  save(filename: string) {
    this.pdf.save(filename);
  }
}

export const exportSingleDreamPDF = async (
  dream: DreamData,
  conversations: ConversationMessage[]
) => {
  const diary = new DiaryPDF();
  diary.writeDreamEntry(dream, conversations);
  diary.save(`diario-sogno-${dream.dream_date}.pdf`);
};

export const exportAllDreamsPDF = async (
  dreams: DreamData[],
  conversations: ConversationMessage[]
) => {
  const diary = new DiaryPDF();
  diary.writeCover('Il Mio Diario dei Sogni');
  diary.writeIndex(dreams);

  dreams.forEach((dream, i) => {
    const dreamConvos = conversations.filter(c => (c as any).dream_id === dream.id);
    diary.writeDreamEntry(dream, dreamConvos, i);
  });

  diary.save(`diario-sogni-${new Date().toISOString().split('T')[0]}.pdf`);
};

// Legacy export kept for backwards compatibility
export const exportDashboardToPDF = async (
  userName: string,
  stats: { total: number; thisWeek: number; thisMonth: number },
  categoryData: Record<string, number>,
  insights: any[]
) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  let yPosition = 20;

  pdf.setFontSize(24);
  pdf.setTextColor(86, 54, 205);
  pdf.text('Report Analisi Sogni', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 15;
  pdf.setFontSize(12);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Generato il ${new Date().toLocaleDateString('it-IT')}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 15;
  pdf.setFontSize(16);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Statistiche Generali', 20, yPosition);

  yPosition += 10;
  pdf.setFontSize(12);
  pdf.text(`Sogni Totali: ${stats.total}`, 30, yPosition);
  yPosition += 7;
  pdf.text(`Questa Settimana: ${stats.thisWeek}`, 30, yPosition);
  yPosition += 7;
  pdf.text(`Questo Mese: ${stats.thisMonth}`, 30, yPosition);

  pdf.save(`report-sogni-${new Date().toISOString().split('T')[0]}.pdf`);
};
