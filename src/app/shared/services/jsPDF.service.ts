import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { jsPDF } from "jspdf";

@Injectable()
export class jsPDFService {
    constructor(public translate: TranslateService) {
    }
    lang: string = '';
    meses: any = {
        "enero": "January",
        "febrero": "February",
        "marzo": "March",
        "abril": "April",
        "mayo": "May",
        "junio": "June",
        "julio": "July",
        "agosto": "August",
        "septiembre": "September",
        "octubre": "October",
        "noviembre": "November",
        "diciembre": "December"
    };
    maxCharsPerLine = 120;

    private newHeatherAndFooter(doc){
        // Footer
        var logoHealth = new Image();
        logoHealth.src = "assets/img/logo-foundation-twentynine-footer.png"
        doc.addImage(logoHealth, 'png', 20, 284, 25, 10);
        doc.setFont(undefined, 'normal');
        /*doc.setFontSize(10);
        doc.setTextColor(51, 101, 138)
        doc.textWithLink("https://nav29.org", 148, 290, { url: 'https://nav29.org' });*/
        doc.setTextColor(0, 0, 0);
    }

    private getFormatDate(date) {
        var localeLang = 'en-US';
        if (this.lang == 'es') {
            localeLang = 'es-ES'
        }else if (this.lang == 'de') {
            localeLang = 'de-DE'
        }else if (this.lang == 'fr') {
            localeLang = 'fr-FR'
        }else if (this.lang == 'it') {
            localeLang = 'it-IT'
        }else if (this.lang == 'pt') {
            localeLang = 'pt-PT'
        }
        return date.toLocaleString(localeLang, { month: 'long' , day: 'numeric', year: 'numeric'});
    }

    private pad(number) {
        if (number < 10) {
            return '0' + number;
        }
        return number;
    }
    private checkIfNewPage(doc, lineText) {
        if (lineText < 270) {
            return lineText
        }
        else {
            doc.addPage()
            this.newHeatherAndFooter(doc)
            lineText = 20;
            return lineText;
        }
    }  
    

    private writeDataHeader(doc, pos, lineText, text) {
        doc.setTextColor(0, 0, 0)
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        doc.text(text, pos, lineText += 20);
    }

    private getDate() {
        var date = new Date()
        return date.getUTCFullYear() + this.pad(date.getUTCMonth() + 1) + this.pad(date.getUTCDate()) + this.pad(date.getUTCHours()) + this.pad(date.getUTCMinutes()) + this.pad(date.getUTCSeconds());
    };

    private writeAboutUs(doc,lineText){
        lineText = this.checkIfNewPage(doc, lineText);
        doc.setFont(undefined, 'bold');
        doc.text(this.translate.instant("generics.Foundation 29"), 10, lineText);
        this.writelinePreFooter(doc, this.translate.instant("about.footer1"), lineText += 5);
        lineText = this.checkIfNewPage(doc, lineText);
        this.writelinePreFooter(doc, this.translate.instant("about.footer2"), lineText += 5);
        lineText = this.checkIfNewPage(doc, lineText);
        this.writelinePreFooter(doc, this.translate.instant("about.footer3"), lineText += 5);
        if(this.lang =='es'){
            lineText = this.checkIfNewPage(doc, lineText);
            this.writelinePreFooter(doc, this.translate.instant("about.footer4"), lineText += 5);
        }     
        lineText = this.checkIfNewPage(doc, lineText);
        doc.setTextColor(0, 0, 0)
        lineText += 5;
        doc.setFontSize(9);
        doc.setTextColor(117, 120, 125)
        doc.text(this.translate.instant("about.footer6"), 10, lineText += 5);
        doc.setTextColor(51, 101, 138)
        var url = "mailto:info@foundation29.org";
        doc.textWithLink("info@foundation29.org", (((this.translate.instant("about.footer6")).length*2)-18), lineText, { url: url });
        //lineText = this.checkIfNewPage(doc, lineText);
        doc.setTextColor(0, 0, 0);
    }

    writelinePreFooter(doc, text, lineText){
        doc.setFontSize(9);
        doc.setTextColor(117, 120, 125)
        doc.setFont(undefined, 'normal');
        doc.text(text, 10, lineText);
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
    }

    generateResultsPDF(summary, lang, qrCodeDataURL){
        //create a copy of jsonContent
    
        this.lang = lang;
        const doc = new jsPDF();
        var lineText = 0;
        

        // Cabecera inicial
        var img_logo = new Image();
        /*img_logo.src = "assets/img/logo.png"
        doc.addImage(img_logo, 'png', 10, 10, 20, 17);*/
        img_logo.src = "assets/img/logo-lg-white.png"
        doc.addImage(img_logo, 'png', 10, 17, 15, 12);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        var actualDate = new Date();
        var dateHeader = this.getFormatDate(actualDate);
        if(lang=='es'){
            this.writeDataHeader(doc, 87, 5, dateHeader);
        }else{
            this.writeDataHeader(doc, 93, 5, dateHeader);
        }

       //Add QR
       if(qrCodeDataURL == null){
        var img_qr = new Image();
        img_qr.src = "assets/img/elements/qr.png"
        doc.addImage(img_qr, 'png', 160, 5, 32, 30);
        doc.setFontSize(8);
        doc.text('https://nav29.org', 164, 37);
        doc.setFontSize(10);
       }else{
        var img_qr = new Image();
        img_qr.src = qrCodeDataURL;
        doc.addImage(img_qr, 'png', 160, 5, 32, 30);
        doc.setFontSize(8);
        doc.text(this.translate.instant("pdf.Scan to rate the summary"), 152, 37);
        doc.setFontSize(10);
       }
        

        this.newHeatherAndFooter(doc);

        lineText += 45;
        const parser = new DOMParser();
        const dochtml = parser.parseFromString(summary, 'text/html');
        const processNode = (node, yPos) => {
            lineText = yPos;
            if (node.nodeType === Node.TEXT_NODE) {
              // Dividir el texto del nodo en palabras
              
              //lineText += 10;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              // Manejar diferentes tipos de elementos
              switch (node.tagName) {
                case 'UL':
                    // No es necesario hacer nada al inicio de una lista, pero podrías configurar un indicador aquí si es necesario
                    break;
                case 'LI':
                    doc.setFontSize(9);
                    doc.setFont(undefined, 'normal');
                    lineText = this.writeLineUnique(doc, node.textContent.trim(), lineText, true);
                    lineText += 2;
                    break;
                case 'BR':
                    lineText += 10; // Simplemente aumentar la línea para un salto
                    break;
                case 'H1':
                    doc.setFontSize(13);
                    doc.setFont(undefined, 'bold');
                    lineText += 5;
                    doc.text(node.textContent.trim(), 10, lineText);
                    lineText += 7;
                    lineText = this.checkIfNewPage(doc, lineText);
                    break;
                case 'H2':
                    doc.setFontSize(12);
                    doc.setFont(undefined, 'bold');
                    lineText += 5;
                    doc.text(node.textContent.trim(), 10, lineText);
                    lineText += 7;
                    lineText = this.checkIfNewPage(doc, lineText);
                    break;
                case 'H3':
                    doc.setFontSize(11);
                    doc.setFont(undefined, 'bold');
                    lineText += 5;
                    doc.text(node.textContent.trim(), 10, lineText);
                    lineText += 7;
                    lineText = this.checkIfNewPage(doc, lineText);
                    break;
                case 'H4':
                    doc.setFontSize(10);
                    doc.setFont(undefined, 'bold');
                    lineText += 5;
                    doc.text(node.textContent.trim(), 10, lineText);
                    lineText += 7;
                    lineText = this.checkIfNewPage(doc, lineText);
                    break;
                case 'P':
                    doc.setFontSize(9);
                    doc.setFont(undefined, 'normal');
                    lineText = this.writeLineUnique(doc, node.textContent.trim(), lineText, false);
                    lineText += 5;
                    lineText = this.checkIfNewPage(doc, lineText);
                    break;
                case 'SPAN':
                    doc.setFontSize(9);
                    doc.setFont(undefined, 'normal');
                    lineText = this.writeLineUnique(doc, node.textContent.trim(), lineText, false);
                    lineText += 5;
                    lineText = this.checkIfNewPage(doc, lineText);
                    break;
              }
          
              node.childNodes.forEach(childNode => {
                lineText = processNode(childNode, lineText);
              });
            }
            return lineText;
          };

        processNode(dochtml.body, lineText);


        lineText += 10;
        this.writeAboutUs(doc, lineText);
        
        var pageCount = doc.internal.pages.length; //Total Page Number
        pageCount = pageCount-1;
        for (var i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            //footer page
            doc.text(this.translate.instant("pdf.page")+ ' ' + i + '/' + pageCount, 97, 290);
        }
        // Save file
        var date = this.getDate();
        doc.save('Nav29_Report_' + date + '.pdf');

    }

    writeLineUnique(doc, text, lineText, isList){
        const words = text.split(' ');
        let lineSegment = '';
        let firstLine = true;
        while (words.length > 0) {
            let testLine = lineSegment + words[0] + ' ';
            if (testLine.length > this.maxCharsPerLine && lineSegment.length > 0) {
                if(isList && firstLine){
                    doc.text('• ' + lineSegment, 10, lineText);
                    firstLine = false;
                }else{
                    doc.text(lineSegment, 10, lineText);
                }
            lineText += 5;
            lineSegment = '';
            lineText = this.checkIfNewPage(doc, lineText);
            } else {
            lineSegment = testLine;
            words.shift();
            }
        }
    
        if (lineSegment.length > 0) {
            if(isList && firstLine){
                doc.text('• ' + lineSegment, 10, lineText);
            }else{
                doc.text(lineSegment, 10, lineText);
            }
            lineText += 5;
            lineText = this.checkIfNewPage(doc, lineText);
        }

        return lineText;
    }


    // Order by descending key
    keyDescOrder = ((a, b) => {
        var a_month=a.split("-")[0]
        var a_year = a.split("-")[1]
        var b_month=b.split("-")[0]
        var b_year=b.split("-")[1]
        a_month = this.getMonthFromString(a_month);
        b_month = this.getMonthFromString(b_month);
        if(new Date(a_year).getTime() > new Date(b_year).getTime()){
            return 1;
        }
        else if(new Date(a_year).getTime() < new Date(b_year).getTime()){
            return -1;
        }
        else{
            if(new Date(a_month).getTime() > new Date(b_month).getTime()){
                return 1;
            }
            else if(new Date(a_month).getTime() < new Date(b_month).getTime()){
                return -1;
            }
            else{
                return 0;
            }
        }
    })

    getMonthFromString(mon) {
        if (this.lang != 'es') {
            return new Date(Date.parse(mon + " 1, 2012")).getMonth() + 1
        } else {
            var date = new Date(Date.parse(this.meses[mon] + " 1, 2012")).getMonth() + 1;
            return date;
        }

    }

    // Order by descending value
    valueDateDescOrder = ((a,b)=> {
        if(new Date(a).getTime() > new Date(b).getTime()){
            return -1;
        }
        else if(new Date(a).getTime() < new Date(b).getTime()){
            return -1;
        }
        else return 0;
    })

}
