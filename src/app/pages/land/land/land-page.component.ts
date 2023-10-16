import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
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

@Component({
  selector: 'app-land',
  templateUrl: './land-page.component.html',
  styleUrls: ['./land-page.component.scss'],
  providers: [ApiDx29ServerService]
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
  readonly TOKENS_LIMIT: number = 80000;
  modegod: boolean = false;
  countModeGod: number = 0;
  callingSummary: boolean = false;
  summaryPatient: string = '';

  constructor(private http: HttpClient, public translate: TranslateService, public toastr: ToastrService, private modalService: NgbModal, private apiDx29ServerService: ApiDx29ServerService, private eventsService: EventsService, public insightsService: InsightsService, private clipboard: Clipboard) {
    this.screenWidth = window.innerWidth;
    this.lang = sessionStorage.getItem('lang');
    this.originalLang = sessionStorage.getItem('lang');
  }

  async ngOnDestroy() {
    this.subscription.unsubscribe();
    if (this.modalService) {
      this.modalService.dismissAll();
    }
  }

  async ngOnInit() {
    this.loadedDocs = true;
    if (this.docs.length == 0) {
      this.step = 1;
    } else {
      this.step = 2;
    }

    this.eventsService.on('changelang', function (task) {
      (async () => {
        this.getTranslations();
      })();
    }.bind(this));

  }


  isSmallScreen(): boolean {
    return this.screenWidth < 576; // Bootstrap's breakpoint for small screen
  }

  onFileDropped(event) {
    for (let file of event) {
      var reader = new FileReader();
      reader.readAsDataURL(file); // read file as data url
      reader.onload = (event2: any) => { // called once readAsDataURL is completed
        var filename = (file).name;
        var extension = filename.substr(filename.lastIndexOf('.'));
        var pos = (filename).lastIndexOf('.')
        pos = pos - 4;
        if (pos > 0 && extension == '.gz') {
          extension = (filename).substr(pos);
        }
        filename = filename.split(extension)[0];
        var uniqueFileName = this.getUniqueFileName();
          filename = uniqueFileName + '/' + filename + extension;
          this.docs.push({ dataFile: { event: file, name: file.name, url: filename }, langToExtract: '', medicalText: '', state: 'false', tokens: 0 });
        if (event.target.files[0].type == 'application/pdf' || extension == '.docx' || event.target.files[0].type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
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
        reader.readAsDataURL(file); // read file as data url
        reader.onload = (event2: any) => { // called once readAsDataURL is completed
          var filename = (file).name;
          var extension = filename.substr(filename.lastIndexOf('.'));
          var pos = (filename).lastIndexOf('.')
          pos = pos - 4;
          if (pos > 0 && extension == '.gz') {
            extension = (filename).substr(pos);
          }
          filename = filename.split(extension)[0];
          var uniqueFileName = this.getUniqueFileName();
          filename = uniqueFileName + '/' + filename + extension;
          this.docs.push({ dataFile: { event: file, name: file.name, url: filename }, langToExtract: '', medicalText: '', state: 'false', tokens: 0 });
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

  getUniqueFileName() {
    var now = new Date();
    var y = now.getFullYear();
    var m = now.getMonth() + 1;
    var d = now.getDate();
    var h = now.getHours();
    var mm = now.getMinutes();
    var ss = now.getSeconds();
    var ff = Math.round(now.getMilliseconds() / 10);
    var date = '' + y.toString().substr(-2) + (m < 10 ? '0' : '') + m + (d < 10 ? '0' : '') + d + (h < 10 ? '0' : '') + h + (mm < 10 ? '0' : '') + mm + (ss < 10 ? '0' : '') + ss + (ff < 10 ? '0' : '') + ff;
    var randomString = this.makeid(8);
    var name = date + randomString;
    var url = y.toString().substr(-2) + '/' + (m < 10 ? '0' : '') + m + '/' + (d < 10 ? '0' : '') + d + '/' + name;
    return url;
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
        this.docs[res.doc_id].state = 'done';
        this.docs[res.doc_id].medicalText = res.data;
        this.docs[res.doc_id].tokens = res.tokens;
        this.totalTokens = this.totalTokens + res.tokens;
        this.submitted = false;
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
    let uuid = localStorage.getItem('uuid');
    var query = { "question": msg, "conversation": this.conversation, "userId": uuid, "context": this.context };
    console.log(query)
    this.subscription.add(this.http.post(environment.api + '/api/callnavigator/', query)
      .subscribe(async (res: any) => {

        this.conversation.push({ role: "user", content: this.message });
        this.conversation.push({ role: "assistant", content: res.response });
        this.message = '';
        this.translateInverse(res.response).catch(error => {
          console.error('Error al procesar el mensaje:', error);
          this.insightsService.trackException(error);
        });

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

      if (this.detectedLang != 'en') {
        var jsontestLangText = [{ "Text": msg }]
        this.subscription.add(this.apiDx29ServerService.getDeepLTranslationInvert(this.detectedLang, jsontestLangText)
          .subscribe((res2: any) => {
            if (res2.text != undefined) {
              msg = res2.text;
            }
            this.messages.push({
              text: msg,
              isUser: false
            });
            this.callingOpenai = false;
            resolve('ok')
          }, (err) => {
            console.log(err);
            this.insightsService.trackException(err);
            this.messages.push({
              text: msg,
              isUser: false
            });
            this.callingOpenai = false;
            resolve('ok')
          }));
      } else {
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

openResults(doc, contentSummaryDoc) {
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

madeSummary(){
  this.callingSummary = true;
  this.summaryPatient = '';
  this.context = [];
    for (let doc of this.docs) {
      if(doc.state == 'done'){
        this.context.push(doc.medicalText);
      }
    }
    if(this.context.length == 0){
      this.callingSummary = false;
      this.toastr.error('', this.translate.instant("demo.No documents to summarize"));
      return;
    }
    let uuid = localStorage.getItem('uuid');
    var query = { "userId": uuid, "context": this.context, "conversation": this.conversation };
    console.log(query)
    this.subscription.add(this.http.post(environment.api + '/api/callsummary/', query)
      .subscribe(async (res: any) => {
        console.log(res)
        if(res.response != undefined){
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

async translateInverseSummary(msg): Promise<string> {
  return new Promise((resolve, reject) => {

    if (this.detectedLang != 'en') {
      var jsontestLangText = [{ "Text": msg }]
      this.subscription.add(this.apiDx29ServerService.getDeepLTranslationInvert(this.detectedLang, jsontestLangText)
        .subscribe((res2: any) => {
          if (res2.text != undefined) {
            msg = res2.text;
          }
          this.summaryPatient = msg;
          this.summaryPatient = this.summaryPatient.replace(/\n/g, '<br>');
          this.callingSummary = false;
          resolve('ok')
        }, (err) => {
          console.log(err);
          this.insightsService.trackException(err);
          this.summaryPatient = msg;
          this.summaryPatient = this.summaryPatient.replace(/\n/g, '<br>');
          this.callingSummary = false;
          resolve('ok')
        }));
    } else {
      this.summaryPatient = msg;
      this.summaryPatient = this.summaryPatient.replace(/\n/g, '<br>');
      this.callingSummary = false;
      resolve('ok')
    }
  });
}


}
