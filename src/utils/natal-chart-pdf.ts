import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportNatalChartToPDF = async (
  profile: any,
  natalChartData: any
) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Title
  pdf.setFontSize(24);
  pdf.setTextColor(138, 43, 226); // Purple
  pdf.text('Il Tuo Tema Natale', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  pdf.setFontSize(12);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Generato il ${new Date().toLocaleDateString('it-IT')}`, pageWidth / 2, yPosition, { align: 'center' });
  
  // Personal Information
  yPosition += 15;
  pdf.setFontSize(16);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Informazioni Personali', 20, yPosition);
  
  yPosition += 10;
  pdf.setFontSize(12);
  if (profile.birth_date) {
    pdf.text(`Data di Nascita: ${new Date(profile.birth_date).toLocaleDateString('it-IT')}`, 30, yPosition);
    yPosition += 7;
  }
  if (profile.birth_time) {
    pdf.text(`Ora di Nascita: ${profile.birth_time}`, 30, yPosition);
    yPosition += 7;
  }
  if (profile.birth_place_name) {
    pdf.text(`Luogo di Nascita: ${profile.birth_place_name}`, 30, yPosition);
    yPosition += 7;
  }

  // Sun, Moon, Ascendant
  yPosition += 10;
  pdf.setFontSize(16);
  pdf.text('I Tuoi Pilastri Astrologici', 20, yPosition);
  
  yPosition += 10;
  pdf.setFontSize(12);
  
  const sun = natalChartData.planets?.find((p: any) => p.name === 'sun');
  const moon = natalChartData.planets?.find((p: any) => p.name === 'moon');
  const ascendant = natalChartData.planets?.find((p: any) => p.name === 'ascendant');
  
  if (sun) {
    pdf.setTextColor(138, 43, 226);
    pdf.text('☉ Sole:', 30, yPosition);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`${sun.sign} - ${sun.position.toFixed(2)}° (Casa ${sun.house})`, 50, yPosition);
    yPosition += 7;
  }
  
  if (moon) {
    pdf.setTextColor(138, 43, 226);
    pdf.text('☽ Luna:', 30, yPosition);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`${moon.sign} - ${moon.position.toFixed(2)}° (Casa ${moon.house})`, 50, yPosition);
    yPosition += 7;
  }
  
  if (ascendant) {
    pdf.setTextColor(138, 43, 226);
    pdf.text('↑ Ascendente:', 30, yPosition);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`${ascendant.sign} - ${ascendant.position.toFixed(2)}°`, 60, yPosition);
    yPosition += 7;
  }

  // Planets
  yPosition += 10;
  if (yPosition > pageHeight - 40) {
    pdf.addPage();
    yPosition = 20;
  }
  
  pdf.setFontSize(16);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Posizioni Planetarie', 20, yPosition);
  
  yPosition += 10;
  pdf.setFontSize(11);
  
  natalChartData.planets?.forEach((planet: any) => {
    if (yPosition > pageHeight - 20) {
      pdf.addPage();
      yPosition = 20;
    }
    
    const retrograde = planet.isRetrograde ? ' ℞' : '';
    pdf.setTextColor(138, 43, 226);
    pdf.text(`${planet.label}${retrograde}:`, 30, yPosition);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`${planet.sign} - ${planet.position.toFixed(2)}° (Casa ${planet.house})`, 70, yPosition);
    yPosition += 7;
  });

  // Houses
  yPosition += 10;
  if (yPosition > pageHeight - 40) {
    pdf.addPage();
    yPosition = 20;
  }
  
  pdf.setFontSize(16);
  pdf.text('Case Astrologiche', 20, yPosition);
  
  yPosition += 10;
  pdf.setFontSize(11);
  
  natalChartData.houses?.forEach((house: any, index: number) => {
    if (yPosition > pageHeight - 20) {
      pdf.addPage();
      yPosition = 20;
    }
    
    pdf.setTextColor(138, 43, 226);
    pdf.text(`Casa ${index + 1}:`, 30, yPosition);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`${house.sign} - ${house.position.toFixed(2)}°`, 60, yPosition);
    yPosition += 7;
  });

  // Aspects
  if (natalChartData.aspects && natalChartData.aspects.length > 0) {
    yPosition += 10;
    if (yPosition > pageHeight - 40) {
      pdf.addPage();
      yPosition = 20;
    }
    
    pdf.setFontSize(16);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Aspetti Principali', 20, yPosition);
    
    yPosition += 10;
    pdf.setFontSize(11);
    
    natalChartData.aspects.forEach((aspect: any) => {
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setTextColor(138, 43, 226);
      pdf.text(`${aspect.type}:`, 30, yPosition);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`${aspect.planet1} - ${aspect.planet2} (${aspect.angle}°)`, 60, yPosition);
      yPosition += 7;
    });
  }

  // Capture natal chart wheel
  const chartElement = document.querySelector('[data-natal-chart-wheel]') as HTMLElement;
  if (chartElement) {
    try {
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      
      const imgData = canvas.toDataURL('image/png');
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.text('Cerchio Zodiacale', 20, 20);
      
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Center the image
      const xPos = (pageWidth - imgWidth) / 2;
      pdf.addImage(imgData, 'PNG', xPos, 30, imgWidth, Math.min(imgHeight, pageHeight - 50));
    } catch (error) {
      console.error('Error capturing natal chart:', error);
    }
  }

  // Save PDF
  const fileName = `tema-natale-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
};
