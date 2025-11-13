import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportDashboardToPDF = async (
  userName: string,
  stats: { total: number; thisWeek: number; thisMonth: number },
  categoryData: Record<string, number>,
  insights: any[]
) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Titolo
  pdf.setFontSize(24);
  pdf.setTextColor(86, 54, 205);
  pdf.text('Report Analisi Sogni', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;
  pdf.setFontSize(12);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Generato il ${new Date().toLocaleDateString('it-IT')}`, pageWidth / 2, yPosition, { align: 'center' });
  
  // Statistiche generali
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
  
  // Distribuzione categorie
  yPosition += 15;
  pdf.setFontSize(16);
  pdf.text('Distribuzione Tipi di Sogni', 20, yPosition);
  
  yPosition += 10;
  pdf.setFontSize(12);
  Object.entries(categoryData).forEach(([category, count]) => {
    const categoryName = getCategoryName(category);
    const percentage = ((count / stats.total) * 100).toFixed(1);
    pdf.text(`${categoryName}: ${count} (${percentage}%)`, 30, yPosition);
    yPosition += 7;
  });
  
  // Insights
  if (insights.length > 0 && yPosition < pageHeight - 60) {
    yPosition += 10;
    pdf.setFontSize(16);
    pdf.text('Insights', 20, yPosition);
    
    yPosition += 10;
    pdf.setFontSize(11);
    insights.forEach(insight => {
      if (yPosition > pageHeight - 30) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setTextColor(0, 0, 0);
      pdf.text(`${insight.icon} ${insight.title}`, 30, yPosition);
      yPosition += 6;
      pdf.setTextColor(80, 80, 80);
      const lines = pdf.splitTextToSize(insight.description, pageWidth - 60);
      pdf.text(lines, 35, yPosition);
      yPosition += lines.length * 5 + 5;
    });
  }
  
  // Cattura grafico (se presente)
  const chartElement = document.getElementById('category-chart');
  if (chartElement) {
    try {
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      
      const imgData = canvas.toDataURL('image/png');
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.text('Grafico Distribuzione Categorie', 20, 20);
      
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 20, 30, imgWidth, imgHeight);
    } catch (error) {
      console.error('Errore nella cattura del grafico:', error);
    }
  }
  
  // Cattura grafico temporale (se presente)
  const temporalChartElement = document.getElementById('temporal-chart');
  if (temporalChartElement) {
    try {
      const canvas = await html2canvas(temporalChartElement, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      
      const imgData = canvas.toDataURL('image/png');
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.text('Evoluzione Temporale', 20, 20);
      
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 20, 30, imgWidth, imgHeight);
    } catch (error) {
      console.error('Errore nella cattura del grafico temporale:', error);
    }
  }
  
  // Salva PDF
  pdf.save(`report-sogni-${new Date().toISOString().split('T')[0]}.pdf`);
};

const getCategoryName = (id: string): string => {
  const names: Record<string, string> = {
    nightmare: 'Incubi',
    lucid: 'Sogni Lucidi',
    flying: 'Volare',
    love: 'Amore',
    nature: 'Natura',
    recurring: 'Ricorrenti',
    other: 'Altro'
  };
  return names[id] || 'Altro';
};
