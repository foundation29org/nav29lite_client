import { Component, OnInit, OnDestroy, ViewChild, TemplateRef, NgZone } from '@angular/core';
import { trigger, transition, animate } from '@angular/animations';
import { style } from '@angular/animations';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { ApiDx29ServerService } from 'app/shared/services/api-dx29-server.service';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { NgbModal, NgbModalRef, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { EventsService } from 'app/shared/services/events.service';
import { InsightsService } from 'app/shared/services/azureInsights.service';
import Swal from 'sweetalert2';
import { environment } from 'environments/environment';
import { Clipboard } from "@angular/cdk/clipboard"
import { jsPDFService } from 'app/shared/services/jsPDF.service'
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
declare var webkitSpeechRecognition: any;

@Component({
  selector: 'app-land',
  templateUrl: './land-page.component.html',
  styleUrls: ['./land-page.component.scss'],
  providers: [ApiDx29ServerService, jsPDFService],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(-100%)' }), 
        animate('1s ease-out', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('0.5s ease-in', style({ transform: 'translateX(-100%)' }))
      ])
    ]),
    trigger('testani', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }), 
        animate('1s ease-out', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('0.5s ease-in', style({ transform: 'translateX(100%)' }))
      ])
    ])
  ]
})



export class LandPageComponent implements OnInit, OnDestroy {

  private subscription: Subscription = new Subscription();
  loadedDocs: boolean = false;
  step: number = 1;
  docs: any = [];
  screenWidth: number;
  dataFile: any = {};
  lang: string = 'en';
  originalLang: string = 'en';
  messages = [];
  message = '';
  callingOpenai: boolean = false;
  actualStatus: string = '';
  messagesExpect: string = '';
  messagesExpectOutPut: string = '';
  private intervalId: any;
  valueProm: any = {};
  tempInput: string = '';
  detectedLang: string = 'en';
  intent: string = '';
  context = [];
  conversation = [];
  submitted: boolean = false;
  @ViewChild('contentSummaryDoc', { static: false }) contentSummaryDoc: TemplateRef<any>;
  modalReference: NgbModalRef;
  actualDoc: any = {};
  totalTokens = 0;
  readonly TOKENS_LIMIT: number = 100000;
  modegod: boolean = false;
  countModeGod: number = 0;
  callingSummary: boolean = false;
  summaryPatient: string = '';
  stepDisclaimer: number = 1;
  showPatientTypeButtons = false;
  myuuid: string = uuidv4();
  paramForm: string = null;
  actualRole: string = '';
  medicalText: string = '';
  summaryDx29: string = '';
  mode: string = '0';
  submode: string = null;
  recognition: any;
  recording = false;
  supported = false;
  timer: number = 0;
  timerDisplay: string = '00:00';
  private interval: any;
  private audioIntro = new Audio('assets/audio/sonido1.mp4');
  private audioOutro = new Audio('assets/audio/sonido2.mp4');

  constructor(private http: HttpClient, public translate: TranslateService, public toastr: ToastrService, private modalService: NgbModal, private apiDx29ServerService: ApiDx29ServerService, private eventsService: EventsService, public insightsService: InsightsService, private clipboard: Clipboard, public jsPDFService: jsPDFService, private ngZone: NgZone) {
    this.screenWidth = window.innerWidth;
    if(sessionStorage.getItem('lang') == null){
      sessionStorage.setItem('lang', this.translate.store.currentLang);

    }
    this.lang = this.translate.store.currentLang;
    this.originalLang = this.translate.store.currentLang;
  }

  async ngOnDestroy() {
    this.subscription.unsubscribe();
    if (this.modalService) {
      this.modalService.dismissAll();
    }
  }

  async ngOnInit() {

    this.showDisclaimer();

    this.loadedDocs = true;
    if (this.docs.length == 0) {
      this.step = 1;
    } else {
      this.step = 2;
    }

    this.eventsService.on('changelang', function (task) {
      (async () => {
        this.setupRecognition();
      })();
    }.bind(this));

  }

  showDisclaimer() {
    console.log(localStorage.getItem('hideDisclaimerlite'))
    if (localStorage.getItem('hideDisclaimerlite') == null || !localStorage.getItem('hideDisclaimerlite')) {
        this.stepDisclaimer = 1;
        document.getElementById("openModalIntro").click();
    }
  }

  showPolicy(){
    this.stepDisclaimer = 2;
    document.getElementById("openModalIntro").click();
  }

  showPanelIntro(content) {
    if (this.modalReference != undefined) {
        this.modalReference.close();
    }
    let ngbModalOptions: NgbModalOptions = {
        backdrop: 'static',
        keyboard: false,
        windowClass: 'ModalClass-sm'
    };
    this.modalReference = this.modalService.open(content, ngbModalOptions);
}

nextDisclaimer() {
  this.stepDisclaimer++;
  if (this.stepDisclaimer > 2) {
      this.finishDisclaimer();
  }
}

prevDisclaimer() {
  this.stepDisclaimer--;
}

finishDisclaimer() {
  if (this.modalReference != undefined) {
      this.modalReference.close();
  }
  localStorage.setItem('hideDisclaimerlite', 'true')
}

showForm() {
}


  selectOpt(opt){
    this.audioIntro.play().catch(error => console.error("Error al reproducir el audio:", error));
    this.mode = '1';
    this.submode= opt;
    this.medicalText = '';
    this.summaryDx29 = '';
    /*this.summaryPatient = '';
    this.conversation = [];
    this.context = [];
    this.messages = [];
    this.initChat();
    this.totalTokens = 0;
    this.modegod = false;
    this.countModeGod = 0;
    this.callingSummary = false;
    this.docs = [];
    this.recording = false;
    this.loadedDocs = false;
    this.step = 1;*/
    if(this.submode=='opt2'){
      this.setupRecognition();
    }
  }

  backmode0(): void {
    this.audioOutro.play().catch(error => console.error("Error al reproducir el audio:", error));
    this.mode = '0';
    this.submode = null;
  }

  setupRecognition() {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      // El navegador soporta la funcionalidad
      console.log('soporta')
      this.recognition = new webkitSpeechRecognition();
      if(this.lang == 'en'){
        this.recognition.lang = 'en-US';
      }else if(this.lang == 'es'){
        this.recognition.lang = 'es-ES';
      }else if(this.lang == 'fr'){
        this.recognition.lang = 'fr-FR';
      }else if(this.lang == 'de'){
        this.recognition.lang = 'de-DE';
      }else if(this.lang == 'it'){
        this.recognition.lang = 'it-IT';
      }else if(this.lang == 'pt'){
        this.recognition.lang = 'pt-PT';
      }
      this.recognition.continuous = true;
      this.recognition.maxAlternatives = 3;
      this.supported = true;
    } else {
      // El navegador no soporta la funcionalidad
      this.supported = false;
      console.log('no soporta')
    }
  }


  startTimer(restartClock) {
    if(restartClock){
      this.timer = 0;
      this.timerDisplay = '00:00';
    }
    this.interval = setInterval(() => {
      this.timer++;
      this.timerDisplay = this.secondsToDisplay(this.timer);
    }, 1000);
  }
  
  stopTimer() {
    clearInterval(this.interval);
    this.timerDisplay = this.secondsToDisplay(this.timer);
  }
  
  secondsToDisplay(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  toggleRecording() {
    if (this.recording) {
      //mosstrar el swal durante dos segundos diciendo que es está procesando
      Swal.fire({
        title: this.translate.instant("voice.Processing audio..."),
        html: this.translate.instant("voice.Please wait a few seconds."),
        showCancelButton: false,
        showConfirmButton: false,
        allowOutsideClick: false
      })
      //esperar dos segundos
      setTimeout(function () {
        this.stopTimer();
        this.recognition.stop();
        Swal.close();
      }.bind(this), 2000);
      
      this.recording = !this.recording;
    } else {
      if(this.medicalText.length > 0){
        //quiere continuar con la grabacion o empezar una nueva
        Swal.fire({
          title: this.translate.instant("voice.Do you want to continue recording?"),
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#0CC27E',
          cancelButtonColor: '#FF586B',
          confirmButtonText: this.translate.instant("voice.Yes, I want to continue."),
          cancelButtonText: this.translate.instant("voice.No, I want to start a new recording."),
          showLoaderOnConfirm: true,
          allowOutsideClick: false
        }).then((result) => {
          if (result.value) {
            this.continueRecording(false, true);
          }else{
            this.medicalText = '';
            this.continueRecording(true, true);
          }
        });
      }else{
        this.continueRecording(true, true);
      }
    }
    
  }

  continueRecording(restartClock, changeState){
    this.startTimer(restartClock);
    this.recognition.start();
    this.recognition.onresult = (event) => {
      console.log(event)
      var transcript = event.results[event.resultIndex][0].transcript;
      console.log(transcript); // Utilizar el texto aquí
      //this.medicalText += transcript + '\n';
      this.ngZone.run(() => {
        this.medicalText += transcript + '\n';
      });
      if (event.results[event.resultIndex].isFinal) {
        console.log('ha terminado')
      }
    };

   // this.recognition.onerror = function(event) {
    this.recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
        console.log('Reiniciando el reconocimiento de voz...');
        this.restartRecognition(); // Llama a una función para reiniciar el reconocimiento
      } else {
        // Para otros tipos de errores, muestra un mensaje de error
        this.toastr.error('', this.translate.instant("voice.Error in voice recognition."));
      }
    };
    if(changeState){
      this.recording = !this.recording;
    }
  }

  restartRecognition() {
    this.recognition.stop(); // Detiene el reconocimiento actual
    setTimeout(() => this.continueRecording(false, false), 100); // Un breve retraso antes de reiniciar
  }

  madeSummaryTranscript(){
    console.log(this.medicalText)
    //this.summaryDx29
    this.callingSummary = true;
      if(this.medicalText.length == 0){
        this.callingSummary = false;
        this.toastr.error('', this.translate.instant("demo.No documents to summarize"));
        return;
      }
      let context = [];
      context.push(this.medicalText);
      this.paramForm = this.myuuid+'/results/'+this.makeid(8)
      var query = { "userId": this.myuuid, "context": context, "conversation": this.conversation, paramForm: this.paramForm };
      this.subscription.add(this.http.post(environment.api + '/api/calltranscriptsummary/', query)
        .subscribe(async (res: any) => {
          if(res.response != undefined){
            res.response = res.response.replace(/^```html\n|\n```$/g, '');
            res.response = res.response.replace(/\\n\\n/g, '<br>');
            res.response = res.response.replace(/\n/g, '<br>');
            this.translateInverseSummaryDx(res.response).catch(error => {
              console.error('Error al procesar el mensaje:', error);
              this.insightsService.trackException(error);
            });
          }else{
            this.callingSummary = false;
            this.toastr.error('', this.translate.instant("generics.error try again"));
          }
          

        }, (err) => {
          this.callingSummary = false;
          console.log(err);
          this.insightsService.trackException(err);
        }));
  }


  isSmallScreen(): boolean {
    return this.screenWidth < 576; // Bootstrap's breakpoint for small screen
  }

  onFileDropped(event) {
    for (let file of event) {
      var reader = new FileReader();
      reader.readAsArrayBuffer(file); // read file as data url
      reader.onload = (event2: any) => { // called once readAsDataURL is completed
        var filename = (file).name;
        var extension = filename.substr(filename.lastIndexOf('.'));
        var pos = (filename).lastIndexOf('.')
        pos = pos - 4;
        if (pos > 0 && extension == '.gz') {
          extension = (filename).substr(pos);
        }
        filename = filename.split(extension)[0];
          filename = this.myuuid + '/' + filename + extension;
          this.docs.push({ dataFile: { event: file, name: file.name, url: filename, content: event2.target.result }, langToExtract: '', medicalText: '', state: 'false', tokens: 0 });
        if (file.type == 'application/pdf' || extension == '.docx' || file.type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          let index = this.docs.length - 1;
          //this.callParser(index);
          this.prepareFile(index);
        } else {
          Swal.fire(this.translate.instant("dashboardpatient.error extension"), '', "error");
        }
      }
    }
  }

  onFileChangePDF(event) {
    for (let file of event.target.files) {
      if (event.target.files && file) {
        var reader = new FileReader();
        reader.readAsArrayBuffer(file); // read file as data url
        reader.onload = (event2: any) => { // called once readAsDataURL is completed
          var filename = (file).name;
          var extension = filename.substr(filename.lastIndexOf('.'));
          var pos = (filename).lastIndexOf('.')
          pos = pos - 4;
          if (pos > 0 && extension == '.gz') {
            extension = (filename).substr(pos);
          }
          filename = filename.split(extension)[0];
          filename = this.myuuid + '/' + filename + extension;
          this.docs.push({ dataFile: { event: file, name: file.name, url: filename, content: event2.target.result }, langToExtract: '', medicalText: '', state: 'false', tokens: 0 });
          if (event.target.files[0].type == 'application/pdf' || extension == '.docx' || event.target.files[0].type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            let index = this.docs.length - 1;
            this.prepareFile(index);
          } else {
            Swal.fire(this.translate.instant("dashboardpatient.error extension"), '', "error");
          }
        }
      }
    }
  }

  makeid(length) {
    var result = '';
    var characters = '0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += Math.floor(Math.random() * charactersLength);
    }
    return result;
  }

  prepareFile(index) {
    this.docs[index].state = 'uploading';
    const formData = new FormData();
    formData.append("thumbnail", this.docs[index].dataFile.event);
    formData.append("url", this.docs[index].dataFile.url);
    formData.append("docId", index);
    this.sendFile(formData, index);
  }

  sendFile(formData, index) {
    this.submitted = true;
    this.subscription.add(this.http.post(environment.api + '/api/upload', formData)
      .subscribe((res: any) => {
        if(res.status!=200){
          this.docs[index].state = 'failed';
        }else{
          this.docs[res.doc_id].state = 'done';
          this.docs[res.doc_id].medicalText = res.data;
          this.docs[res.doc_id].tokens = res.tokens;
          this.totalTokens = this.totalTokens + res.tokens;
          this.submitted = false;
        }
        
      }, (err) => {
        this.docs[index].state = 'failed';
        console.log(err);
        this.insightsService.trackException(err);
        this.submitted = false;
        var msgFail = this.translate.instant("generics.Data saved fail");
          if(err.error.message){
            this.toastr.error(err.error.message, msgFail);
          }else{
            this.toastr.error('', msgFail);
          }
      }));
  }

  deleteDoc(doc, index) {
    Swal.fire({
      title: this.translate.instant("generics.Are you sure?"),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0CC27E',
      cancelButtonColor: '#FF586B',
      confirmButtonText: this.translate.instant("generics.Delete"),
      cancelButtonText: this.translate.instant("generics.No, cancel"),
      showLoaderOnConfirm: true,
      allowOutsideClick: false
    }).then((result) => {
      if (result.value) {
        this.confirmDeleteDoc(doc, index);
      }
    });
  }

  confirmDeleteDoc(doc, index) {
    this.totalTokens = this.totalTokens - doc.tokens;
    this.docs.splice(index, 1);
  }

  sendMessage() {
    if (!this.message) {
      return;
    }
    if(this.totalTokens > this.TOKENS_LIMIT){
      this.toastr.error('', this.translate.instant("demo.Tokens limit exceeded"));
      return;
    }

    this.messages.push({
      text: this.message,
      isUser: true
    });
    this.detectIntent();
  }

  detectIntent() {
    this.callingOpenai = true;
    this.actualStatus = 'procesando intent';
    this.statusChange();
    var promIntent = this.translate.instant("promts.0", {
      value: this.message,
    });
    this.valueProm = { value: promIntent };
    this.tempInput = this.message;
    var testLangText = this.message
    if (testLangText.length > 0) {
      this.subscription.add(this.apiDx29ServerService.getDetectLanguage(testLangText)
        .subscribe((res: any) => {
          if (res[0].language != 'en') {
            this.detectedLang = res[0].language;
            var info = [{ "Text": this.message }]
            this.subscription.add(this.apiDx29ServerService.getTranslationDictionary(res[0].language, info)
              .subscribe((res2: any) => {
                var textToTA = this.message;
                if (res2[0] != undefined) {
                  if (res2[0].translations[0] != undefined) {
                    textToTA = res2[0].translations[0].text;
                    this.tempInput = res2[0].translations[0].text;
                  }
                }
                promIntent = this.translate.instant("promts.0", {
                  value: textToTA,
                });
                this.valueProm = { value: promIntent };
                this.continueSendIntent(textToTA);
              }, (err) => {
                console.log(err);
                this.insightsService.trackException(err);
                this.continueSendIntent(this.message);
              }));
          } else {
            this.detectedLang = 'en';
            this.continueSendIntent(this.message);
          }

        }, (err) => {
          console.log(err);
          this.insightsService.trackException(err);
          this.toastr.error('', this.translate.instant("generics.error try again"));
        }));
    } else {
      this.continueSendIntent(this.message);
    }
  }

  private statusChange() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.messagesExpectOutPut = '';

    this.messagesExpect = this.translate.instant(`messages.${this.actualStatus}`);
    this.delay(100);
    const words = this.messagesExpect.split(' ');
    let index = 0;

    this.intervalId = setInterval(() => {
      if (index < words.length && this.callingOpenai) {
        const word = words[index];
        this.messagesExpectOutPut += (index > 0 ? ' ' : '') + word;
        index++;
      } else {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    }, 20);
  }

  delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  continueSendIntent(msg) {
    this.context = [];
    for (let doc of this.docs) {
      this.context.push(doc.medicalText);
    }
    var query = { "question": msg, "conversation": this.conversation, "userId": this.myuuid, "context": this.context };
    console.log(query)
    this.subscription.add(this.http.post(environment.api + '/api/callnavigator/', query)
      .subscribe(async (res: any) => {
        if(res.response != undefined){
          this.conversation.push({ role: "user", content: this.message });
          this.conversation.push({ role: "assistant", content: res.response });
          this.message = '';
          this.translateInverse(res.response).catch(error => {
            console.error('Error al procesar el mensaje:', error);
            this.insightsService.trackException(error);
          });
        }else{
          this.callingOpenai = false;
          this.toastr.error('', this.translate.instant("generics.error try again"));
        }
        

      }, (err) => {
        this.callingOpenai = false;
        console.log(err);
        this.insightsService.trackException(err);
        //this.message = '';
        this.messages.push({
          text: '<strong>' + this.translate.instant("generics.error try again") + '</strong>',
          isUser: false
        });
      }));
  }

  async translateInverse(msg): Promise<string> {
    return new Promise((resolve, reject) => {
  
      // Función auxiliar para procesar el contenido de la tabla
      const processTable = (tableContent) => {
        // Dentro de las tablas, mantenemos los saltos de línea intactos
        return tableContent;
      };
  
      // Función auxiliar para procesar el texto fuera de las tablas
      const processNonTableContent = (text) => {
        // Fuera de las tablas, convertimos los saltos de línea en <br>
        return text.replace(/\\n\\n/g, '<br>').replace(/\n/g, '<br>');
      };
  
      if (this.detectedLang != 'en') {
        var jsontestLangText = [{ "Text": msg }];
        this.subscription.add(this.apiDx29ServerService.getDeepLTranslationInvert(this.detectedLang, jsontestLangText)
          .subscribe((res2: any) => {
            if (res2.text != undefined) {
              msg = res2.text;
            }
  
            // Dividimos el mensaje en partes de tabla y no tabla
            const parts = msg.split(/(<table>|<\/table>)/);
  
            // Procesamos las secciones y reconstruimos el mensaje final
            msg = parts.map((part, index) => {
              // Solo procesamos el texto fuera de las etiquetas de la tabla
              if (part === '<table>' || part === '</table>') {
                return part;
              }
              return index % 4 === 2 ? processTable(part) : processNonTableContent(part);
            }).join('');
  
            this.messages.push({
              text: msg,
              isUser: false
            });
            this.callingOpenai = false;
            resolve('ok');
          }, (err) => {
            console.log(err);
            this.insightsService.trackException(err);
            msg = processNonTableContent(msg);
            this.messages.push({
              text: msg,
              isUser: false
            });
            this.callingOpenai = false;
            resolve('ok');
          }));
      } else {
        msg = processNonTableContent(msg);
        this.messages.push({
          text: msg,
          isUser: false
        });
        this.callingOpenai = false;
        resolve('ok');
      }
    });
  }
  
  async translateInverse2(msg): Promise<string> {
    return new Promise((resolve, reject) => {

      if (this.detectedLang != 'en') {
        var jsontestLangText = [{ "Text": msg }]
        this.subscription.add(this.apiDx29ServerService.getDeepLTranslationInvert(this.detectedLang, jsontestLangText)
          .subscribe((res2: any) => {
            if (res2.text != undefined) {
              msg = res2.text;
            }
            msg = msg.replace(/\\n\\n/g, '<br>');
            msg = msg.replace(/\n/g, '<br>');
            this.messages.push({
              text: msg,
              isUser: false
            });
            this.callingOpenai = false;
            resolve('ok')
          }, (err) => {
            console.log(err);
            this.insightsService.trackException(err);
            msg = msg.replace(/\\n\\n/g, '<br>');
            msg = msg.replace(/\n/g, '<br>');
            this.messages.push({
              text: msg,
              isUser: false
            });
            this.callingOpenai = false;
            resolve('ok')
          }));
      } else {
        msg = msg.replace(/\\n\\n/g, '<br>');
        msg = msg.replace(/\n/g, '<br>');
        this.messages.push({
          text: msg,
          isUser: false
        });
        this.callingOpenai = false;
        resolve('ok')
      }
    });
  }

  copymsg(msg){
    this.clipboard.copy(msg.text);
    Swal.fire({
        icon: 'success',
        html: this.translate.instant("messages.Results copied to the clipboard"),
        showCancelButton: false,
        showConfirmButton: false,
        allowOutsideClick: false
    })
    setTimeout(function () {
        Swal.close();
    }, 2000);
}

getBlobUrl(doc){
  let url = URL.createObjectURL(doc.dataFile.event);
  window.open(url);
}

openResults(doc, contentSummaryDoc) {
  console.log(doc)
  this.actualDoc=doc;
  let ngbModalOptions: NgbModalOptions = {
    keyboard: false,
    windowClass: 'ModalClass-sm' // xl, lg, sm
  };
  if (this.modalReference != undefined) {
    this.modalReference.close();
    this.modalReference = undefined;
  }
  this.modalReference = this.modalService.open(contentSummaryDoc, ngbModalOptions);
}

openFileInput(fileInput: any): void {
  fileInput.click();
}

async closeModal() {

  if (this.modalReference != undefined) {
    this.modalReference.close();
    this.modalReference = undefined;
  }
}

copyConversationToClipboard() {
  let conversationText = '';
  let me = this.translate.instant("generics.Me")
  for (let message of this.messages) {
    console.log(message)
    conversationText += message.isUser ? me+`: ${message.text}\n` : `Nav29: ${message.text}\n`;
  }
  navigator.clipboard.writeText(conversationText).then(() => {
    alert('Conversación copiada al portapapeles.');
  });
}

showModeGod(){
  this.countModeGod++;
  if(this.countModeGod == 5){
    this.modegod = true;
    this.toastr.success('', 'Mode God activated');
  }
}

selectSubrole(){
  this.showPatientTypeButtons = true;
}

madeSummary(role){
  this.actualRole = role;
  if(role=='physician'){
    this.showPatientTypeButtons = false;
  }
  this.callingSummary = true;
  this.summaryPatient = '';
  this.context = [];
  let nameFiles = [];
    for (let doc of this.docs) {
      if(doc.state == 'done'){
        this.context.push(doc.medicalText);
        nameFiles.push(doc.dataFile.name);
      }
    }
    if(this.context.length == 0){
      this.callingSummary = false;
      this.toastr.error('', this.translate.instant("demo.No documents to summarize"));
      return;
    }
    this.paramForm = this.myuuid+'/results/'+this.makeid(8)
    var query = { "userId": this.myuuid, "context": this.context, "conversation": this.conversation, "role": role, nameFiles: nameFiles, paramForm: this.paramForm };
    this.subscription.add(this.http.post(environment.api + '/api/callsummary/', query)
      .subscribe(async (res: any) => {
        if(res.response != undefined){
          res.response = res.response.replace(/^```html\n|\n```$/g, '');
          res.response = res.response.replace(/\\n\\n/g, '<br>');
          res.response = res.response.replace(/\n/g, '<br>');
          this.translateInverseSummary(res.response).catch(error => {
            console.error('Error al procesar el mensaje:', error);
            this.insightsService.trackException(error);
          });
        }else{
          this.callingSummary = false;
          this.toastr.error('', this.translate.instant("generics.error try again"));
        }
        

      }, (err) => {
        this.callingSummary = false;
        console.log(err);
        this.insightsService.trackException(err);
      }));
}

async translateInverseSummary2(msg): Promise<string> {
  return new Promise((resolve, reject) => {

    if (this.lang != 'en') {
      var jsontestLangText = [{ "Text": msg }]
      this.subscription.add(this.apiDx29ServerService.getDeepLTranslationInvert(this.lang, jsontestLangText)
        .subscribe((res2: any) => {
          if (res2.text != undefined) {
            msg = res2.text;
          }
          this.summaryPatient = msg;
          this.summaryPatient = this.summaryPatient.replace(/\\n\\n/g, '<br>');
          this.summaryPatient = this.summaryPatient.replace(/\n/g, '<br>');
          this.callingSummary = false;
          resolve('ok')
        }, (err) => {
          console.log(err);
          this.insightsService.trackException(err);
          this.summaryPatient = msg;
          this.summaryPatient = this.summaryPatient.replace(/\\n\\n/g, '<br>');
          this.summaryPatient = this.summaryPatient.replace(/\n/g, '<br>');
          this.callingSummary = false;
          resolve('ok')
        }));
    } else {
      this.summaryPatient = msg;
      this.summaryPatient = this.summaryPatient.replace(/\\n\\n/g, '<br>');
      this.summaryPatient = this.summaryPatient.replace(/\n/g, '<br>');
      this.callingSummary = false;
      resolve('ok')
    }
  });
}

async translateInverseSummary(msg): Promise<string> {
  return new Promise((resolve, reject) => {
    // Función auxiliar para procesar el contenido de la tabla
    const processTable = (tableContent) => {
      return tableContent.replace(/\n/g, ''); // Eliminar saltos de línea dentro de la tabla
    };

    // Función auxiliar para procesar el texto fuera de las tablas
    const processNonTableContent = (text) => {
      return text.replace(/\\n\\n/g, '<br>').replace(/\n/g, '<br>');
    };

    if (this.lang != 'en') {
      var jsontestLangText = [{ "Text": msg }]
      this.subscription.add(this.apiDx29ServerService.getDeepLTranslationInvert(this.lang, jsontestLangText)
        .subscribe((res2: any) => {
          if (res2.text != undefined) {
            msg = res2.text;
          }
          
          // Aquí procesamos el mensaje
          const parts = msg.split(/(<table>|<\/table>)/); // Divide el mensaje en partes de tabla y no tabla
          this.summaryPatient = parts.map((part, index) => {
            if (index % 4 === 2) { // Los segmentos de tabla estarán en las posiciones 2, 6, 10, etc. (cada 4 desde el segundo)
              return processTable(part);
            } else {
              return processNonTableContent(part);
            }
          }).join('');

          this.callingSummary = false;
          resolve('ok');
        }, (err) => {
          console.log(err);
          this.insightsService.trackException(err);
          this.summaryPatient = processNonTableContent(msg);
          this.callingSummary = false;
          resolve('ok');
        }));
    } else {
      this.summaryPatient = processNonTableContent(msg);
      this.callingSummary = false;
      resolve('ok');
    }
  });
}


/* let testLangText = '';
    for (let doc of this.docs) {
      if(doc.state == 'done'){
        testLangText+=doc.medicalText;
      }
    }
    testLangText = testLangText.substr(0, 2000)
    this.subscription.add(this.apiDx29ServerService.getDetectLanguage(testLangText)
        .subscribe((res: any) => {
          if (res[0].language != 'en') {

          }

          }, (err) => {
            console.log(err);
            this.insightsService.trackException(err);
            this.toastr.error('', this.translate.instant("generics.error try again"));
          }));
          */

          async deleteChat() {
            this.messages = [];
            this.initChat();
          }

          initChat() {
            if (this.messages.length == 0) {
              this.messages = [];
              if (this.docs.length == 0) {
                this.messages.push({
                  text: this.translate.instant('home.botmsg1'),
                  isUser: false
                });
              } else {
                this.messages.push({
                  text: this.translate.instant('home.botmsg2'),
                  isUser: false
                });
              }
            }
        
          }

          async download(){
           let url = 'https://davlv9v24on.typeform.com/to/z6hgZFGs#uuid='+this.paramForm+'&role='+this.actualRole
            const qrCodeDataURL = await QRCode.toDataURL(url);
            console.log(this.summaryPatient)
            let tempSumary = this.summaryPatient.replace(/<br\s*\/?>/gi, '').replace(/\s{2,}/g, ' ');
            this.jsPDFService.generateResultsPDF(tempSumary, this.translate.store.currentLang, qrCodeDataURL)
            /* let htmldemo={"text":"<div><br>  <h3>Resumen médico</h3><br>  <p>Los documentos que acaba de cargar son historiales médicos y ayudan a explicar su historial de salud, su estado actual y los tratamientos en curso. Este resumen está diseñado para ofrecerle una comprensión clara de su situación médica.</p><br>  <h4>Presentación del paciente</h4><br>  <p>El paciente es Sergio Isla Miranda, un varón de 14 años con un historial de afecciones médicas complejas, principalmente de naturaleza neurológica.</p><br>  <h4>Diagnósticos</h4><br>  <ul><br>    <li><strong>Epilepsia:</strong> Sergio padece epilepsia refractaria, concretamente Síndrome de Dravet, que es una forma grave de epilepsia de difícil tratamiento.</li><br>    <li><strong>Trastornos del desarrollo:</strong> Tiene un trastorno generalizado del desarrollo y un trastorno grave del lenguaje expresivo y comprensivo.</li><br>    <li><strong>Condiciones físicas:</strong> Sergio también tiene los pies muy arqueados (pies cavos), anemia ferropénica y una curvatura de la columna vertebral (escoliosis dorsolumbar).</li><br>  </ul><br>  <h4>Tratamiento y medicación</h4><br>  <ul><br>    <li><strong>Medicación:</strong> Sergio toma varios medicamentos, entre ellos Diacomit, Depakine, Noiafren y Fenfluramina para controlar su epilepsia.</li><br>    <li><strong>Suplementos:</strong> También toma suplementos de hierro para tratar su anemia.</li><br>    <li><strong>Terapias:</strong> Participa en fisioterapia, logopedia y educación física adaptada para favorecer su desarrollo y su salud física.</li><br>  </ul><br>  <h4>Otros</h4><br>  <ul><br>    <li>Sergio ha sufrido estados epilépticos, que son ataques prolongados que requieren atención médica inmediata.</li><br>    <li>Tiene una mutación en el gen SCN1A, que está asociada a su epilepsia.</li><br>    <li>Su plan de tratamiento se sigue de cerca y se ajusta según sea necesario para controlar su enfermedad.</li><br>    <li>Sergio requiere atención y seguimiento continuos debido a la gravedad de su epilepsia, que puede incluir emergencias potencialmente mortales como una parada cardiaca.</li><br>  </ul><br>  <p>Es importante que Sergio y sus cuidadores mantengan una comunicación abierta con los profesionales sanitarios para garantizar el mejor tratamiento posible de su enfermedad.</p><br></div>"};
            htmldemo.text = htmldemo.text.replace(/<br\s*\/?>/gi, '').replace(/\s{2,}/g, ' ');
            this.jsPDFService.generateResultsPDF(htmldemo.text, this.translate.store.currentLang, qrCodeDataURL)*/
          }

          openFeedback(){
            let url = 'https://davlv9v24on.typeform.com/to/z6hgZFGs#uuid='+this.paramForm+'&role='+this.actualRole
            window.open(url, "_blank");
          }

          newSummary(){
            this.summaryPatient = '';
          }

          getLiteral(literal) {
            return this.translate.instant(literal);
        }

        showPanelBig(content) {
          this.medicalText = '';
          this.summaryDx29 = '';
          if (this.modalReference != undefined) {
              this.modalReference.close();
          }
          let ngbModalOptions: NgbModalOptions = {
              backdrop: 'static',
              keyboard: false,
              windowClass: 'ModalClass-xl'
          };
          this.modalReference = this.modalService.open(content, ngbModalOptions);
      }

      createSummaryDx29(){
            console.log(this.medicalText)
            //this.summaryDx29
            this.callingSummary = true;
              if(this.medicalText.length == 0){
                this.callingSummary = false;
                this.toastr.error('', this.translate.instant("demo.No documents to summarize"));
                return;
              }
              let context = [];
              context.push(this.medicalText);
              this.paramForm = this.myuuid+'/results/'+this.makeid(8)
              var query = { "userId": this.myuuid, "context": context, "conversation": this.conversation, paramForm: this.paramForm };
              this.subscription.add(this.http.post(environment.api + '/api/calldxsummary/', query)
                .subscribe(async (res: any) => {
                  if(res.response != undefined){
                    res.response = res.response.replace(/^```html\n|\n```$/g, '');
                    res.response = res.response.replace(/\\n\\n/g, '<br>');
                    res.response = res.response.replace(/\n/g, '<br>');
                    this.translateInverseSummaryDx(res.response).catch(error => {
                      console.error('Error al procesar el mensaje:', error);
                      this.insightsService.trackException(error);
                    });
                  }else{
                    this.callingSummary = false;
                    this.toastr.error('', this.translate.instant("generics.error try again"));
                  }
                  

                }, (err) => {
                  this.callingSummary = false;
                  console.log(err);
                  this.insightsService.trackException(err);
                }));
          }


          async translateInverseSummaryDx(msg): Promise<string> {
            return new Promise((resolve, reject) => {
              // Función auxiliar para procesar el contenido de la tabla
              const processTable = (tableContent) => {
                return tableContent.replace(/\n/g, ''); // Eliminar saltos de línea dentro de la tabla
              };
          
              // Función auxiliar para procesar el texto fuera de las tablas
              const processNonTableContent = (text) => {
                return text.replace(/\\n\\n/g, '<br>').replace(/\n/g, '<br>');
              };
          
              if (this.lang != 'en') {
                var jsontestLangText = [{ "Text": msg }]
                this.subscription.add(this.apiDx29ServerService.getDeepLTranslationInvert(this.lang, jsontestLangText)
                  .subscribe((res2: any) => {
                    if (res2.text != undefined) {
                      msg = res2.text;
                    }
                    
                    // Aquí procesamos el mensaje
                    const parts = msg.split(/(<table>|<\/table>)/); // Divide el mensaje en partes de tabla y no tabla
                    this.summaryDx29 = parts.map((part, index) => {
                      if (index % 4 === 2) { // Los segmentos de tabla estarán en las posiciones 2, 6, 10, etc. (cada 4 desde el segundo)
                        return processTable(part);
                      } else {
                        return processNonTableContent(part);
                      }
                    }).join('');
          
                    this.callingSummary = false;
                    resolve('ok');
                  }, (err) => {
                    console.log(err);
                    this.insightsService.trackException(err);
                    this.summaryDx29 = processNonTableContent(msg);
                    this.callingSummary = false;
                    resolve('ok');
                  }));
              } else {
                this.summaryDx29 = processNonTableContent(msg);
                this.callingSummary = false;
                resolve('ok');
              }
            });
          }

          copySummaryDx(){
            this.clipboard.copy(this.summaryDx29);
            Swal.fire({
                icon: 'success',
                html: this.translate.instant("messages.Results copied to the clipboard"),
                showCancelButton: false,
                showConfirmButton: false,
                allowOutsideClick: false
            })
            setTimeout(function () {
                Swal.close();
            }, 2000);
        }

        restartSummaryDx(){
          this.summaryDx29 = '';
          this.medicalText = '';
        }

        gotoDxGPT(){
          let url = `https://dxgpt.app/?medicalText=${encodeURIComponent(this.summaryDx29)}`;
          window.open(url, '_blank');
        }

}
