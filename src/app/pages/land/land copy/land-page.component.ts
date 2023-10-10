import { Component, OnInit, OnDestroy, ViewChild, TemplateRef, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import { TranslateService } from '@ngx-translate/core';
import { SortService } from 'app/shared/services/sort.service';
import { DateService } from 'app/shared/services/date.service';
import { SearchService } from 'app/shared/services/search.service';
import { ApiDx29ServerService } from 'app/shared/services/api-dx29-server.service';
import { TrackEventsService } from 'app/shared/services/track-events.service';
import { Subscription  } from 'rxjs';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { NgbModal, NgbModalRef, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { EventsService } from 'app/shared/services/events.service';
import { Clipboard } from "@angular/cdk/clipboard"
import { ParamService } from 'app/shared/services/param.service';
import { InsightsService } from 'app/shared/services/azureInsights.service';

@Component({
  selector: 'app-land',
  templateUrl: './land-page.component.html',
  styleUrls: ['./land-page.component.scss'],
  providers: [ApiDx29ServerService]
})

export class LandPageComponent implements OnInit, OnDestroy {
  step: number = 0;
  private subscription: Subscription = new Subscription();
  subscription2: Subscription;
  eventsForm: FormGroup;
  preparingFile: boolean = false;
  dataFile: any = {};
  submitted = false;
  saving: boolean = false;
  loadedPatientId: boolean = false;
  showTextAreaFlag: boolean = false;
  medicalText: string = '';
  loadedDocs: boolean = false;
  docs: any = [];

  query: string = '';
  queryCopy: string = '';
  callinglangchainraito: boolean = false;
  responseLangchain: string = '';
  savedRecommendations: any = [];
  actualDoc: any = {};
  modalReference: NgbModalRef;

  messages = [];
  message = '';
  callingOpenai: boolean = false;

  valueProm: any = {};
  tempInput: string = '';
  detectedLang: string = 'en';
  intent: string = '';
  context = [];

  callingTextAnalytics: boolean = false;
  resTextAnalyticsSegments: any;
  events = [];
  allEvents = [];
  allTypesEvents = [];
  subtypes = [];
  metadata: any = {};

  pendingDoc: boolean = false;

  notallergy: boolean = true;
  defaultDoc: any = {};

  loadedEvents: boolean = false;
  loadedAllEvents: boolean = false;
  accessToken = {
    // tslint:disable-next-line:max-line-length
    sasToken: null,
    blobAccountUrl: environment.blobAccountUrl,
    containerName: '',
    patientId: ''
  };
  resultText: string = '';
  summaryDoc: any = {};
  summaryJson: any = {};
  private messageSubscription: Subscription;
  @ViewChild('contentviewSummary', { static: false }) contentviewSummary: TemplateRef<any>;
  @ViewChild('contentviewDoc', { static: false }) contentviewDoc: TemplateRef<any>;
  @ViewChild('contentSummaryDoc', { static: false }) contentSummaryDoc: TemplateRef<any>;
  tasksUpload: any[] = [];
  taskAnonimize: any[] = [];
  translateYouCanAskInChat: string = '';
  translateExtractingMedicalEvents: string = '';
  translateGeneratingSummary: string = '';
  translateAnonymizingDocument: string = '';
  translateSummaryPatient: string = '';
  messagesExpect: string = '';
  messagesExpectOutPut: string = '';
  suggestionFromSummary: any[] = [];
  isDonating: boolean = false;
  changingDonation: boolean = true;
  hasChangesEvents: boolean = false;
  loadingDoc: boolean = false;
  summaryDate: Date = null;
  generatingPDF: boolean = false;
  actualStatus: string = '';
  private intervalId: any;
  sendingVote: boolean = false;
  actualParam: string = '';
  currentPatient: string = '';
  containerName: string = '';
  newPermission:any;
  mode: string = 'Custom';
  loadedShareData: boolean = false;
  generateUrlQr = '';
  listCustomShare = [];
  individualShare = [];
  showNewCustom: boolean = false;
  modalQr: NgbModalRef;
  widthPanelCustomShare = null;
  haveInfo: boolean = false;
  screenWidth: number;

  constructor(private http: HttpClient, public translate: TranslateService, private formBuilder: FormBuilder, public toastr: ToastrService, private sortService: SortService, private modalService: NgbModal, private apiDx29ServerService: ApiDx29ServerService, private dateService: DateService, private eventsService: EventsService, private searchService: SearchService, private clipboard: Clipboard, public trackEventsService: TrackEventsService, private route: ActivatedRoute, private paramService: ParamService, public insightsService: InsightsService) {
    this.screenWidth = window.innerWidth;
  }

  get ef() { return this.eventsForm.controls; }

  async ngOnDestroy() {
    //save this.messages in bbdd
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
    if (this.subscription2) {
      this.subscription2.unsubscribe();
    }
    this.eventsService.destroy();
  }


  getTranslations(){
    this.translateYouCanAskInChat = this.translate.instant('messages.m2.1');
    this.translateExtractingMedicalEvents = this.translate.instant('messages.m4.1');
    this.translateGeneratingSummary = this.translate.instant('messages.m3.1');
    this.translateAnonymizingDocument = this.translate.instant('messages.m5.1');
    this.translateSummaryPatient = this.translate.instant('messages.m6.1');
    this.messagesExpect = this.translate.instant("messages.expect0")
  }

  isStepInProcess(): boolean {
    let value = false;
    for (let task of Object.values(this.tasksUpload)) {
      for (let step of task.steps) {
        if (step.status === 'inProcess') {
          value= true;
        }
      }
    }
    return value;
  }

  async ngOnInit() {
    this.initEnvironment();
    
    this.getTranslations();
    

    this.eventsService.on('changelang', function (task) {
      (async () => {
        this.getTranslations();
      })();
    }.bind(this));

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
      if (index < words.length && (this.callingOpenai)) {
        const word = words[index];
        this.messagesExpectOutPut += (index > 0 ? ' ' : '') + word;
        index++;
      } else {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    }, 20);
  }


  onMessageClick(event: MouseEvent, index: number) {
    const target = event.target as HTMLElement;
    if (target.tagName.toLowerCase() === 'resumen') {
      event.preventDefault();
      //search in docs where _id = target.id
      const doc = this.docs.find(x => x._id === target.id);
      if (doc) {
        this.openResults(doc, this.contentSummaryDoc);
      }
    }

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

  async deleteChat() {
    this.messages = [];
    this.initChat();
    this.context.splice(1, this.context.length - 1);
  }

  initEnvironment() {
    this.currentPatient = this.trackEventsService.myuuid;
    this.containerName = this.trackEventsService.myuuid;
    this.getDocs(1);
    this.getStateDonation();
  }

  setStep(step) {
    if (this.subscription2) {
      this.subscription2.unsubscribe();
    }
    this.subscription2 = this.paramService.currentParam.subscribe(param => {
      this.actualParam = param;
      if(this.actualParam=='Data'){
        this.step = 2;
        this.loadEnvironmentMydata();
      }else{
        if(param=='Chat' && this.step == 2){
          if (this.docs.length == 0) {
            this.step = 1;
          }else{
            this.step = 1;
          }
        }else{
          if (this.docs.length == 0 && this.step == 1) {
            this.step = 1;
          }else{
            this.step = step;
          }
          
        }
      }
    });

    //if(this.actualParam!='Data'){
    
    const my = this.route.snapshot.queryParams['my'];
    
    if (this.docs.length == 0 && (step == 1 || step== 0) && my != 'Data') {
      this.step = 1;
    }else{
      if(my == 'Data'){
        this.step = 2;
      }else{
        this.step = step;
      }
    }
    if(this.step == 0){
      this.paramService.changeParam('Chat');
    }else if(this.step == 1 && my == 'Chat'){
      this.paramService.changeParam('Chat');
    }else if(this.step == 2 || my == 'Data'){
      this.paramService.changeParam('Data');
      this.loadEnvironmentMydata();
    }
  }

  loadEnvironmentMydata() {
    //load docs
    this.docs = [];
    this.loadedDocs = false;
    this.subscription.add(this.http.get(environment.api + '/api/documents/' + this.currentPatient)
    .subscribe((resDocs: any) => {
      if (resDocs.message || resDocs.length == 0) {

      } else {
        resDocs.sort(this.sortService.DateSortInver("date"));
        this.docs = resDocs;
        for (var i = 0; i < this.docs.length; i++) {
          const fileName = this.docs[i].url.split("/").pop();
          this.docs[i].title = fileName;
          if (this.docs[i].data != '') {
            var numTotalEvents = 0;
            var numLeftEvents = 0;
            if (this.docs[i].data.symptoms) {
              numTotalEvents = this.docs[i].data.symptoms.length;
              numTotalEvents += this.docs[i].data.medications.length;
              numTotalEvents += this.docs[i].data.allergies.length;
              numTotalEvents += this.docs[i].data.diagnoses.length;

              if (this.docs[i].data.treatments) {
                numTotalEvents += this.docs[i].data.treatments.length;
              }
              this.docs[i].numTotalEvents = numTotalEvents;

              for (var j = 0; j < this.docs[i].data.symptoms.length; j++) {
                if (!this.docs[i].data.symptoms[j].checked) {
                  numLeftEvents++;
                }
              }

              for (var j = 0; j < this.docs[i].data.medications.length; j++) {
                if (!this.docs[i].data.medications[j].checked) {
                  numLeftEvents++;
                }
              }

              for (var j = 0; j < this.docs[i].data.allergies.length; j++) {
                if (!this.docs[i].data.allergies[j].checked) {
                  numLeftEvents++;
                }
              }

              for (var j = 0; j < this.docs[i].data.diagnoses.length; j++) {
                if (!this.docs[i].data.diagnoses[j].checked) {
                  numLeftEvents++;
                }
              }

              if (this.docs[i].data.treatments) {
                for (var j = 0; j < this.docs[i].data.treatments.length; j++) {
                  if (!this.docs[i].data.treatments[j].checked) {
                    numLeftEvents++;
                  }
                }
              }
            }
            this.docs[i].numLeftEvents = numLeftEvents;
          }
        }
      }
      this.loadedDocs = true;
    }, (err) => {
      console.log(err);
      this.insightsService.trackException(err);
      this.loadedDocs = true;
      this.toastr.error('', this.translate.instant("generics.error try again"));
    }));

  }

  getDocs(step) {
    //this.initChat();
    this.loadEvents(false);
    this.context = [];
    this.actualDoc = {};
    this.defaultDoc = {};
    this.docs = [];
    this.loadedDocs = false;
    this.pendingDoc = false;
    this.subscription.add(this.http.get(environment.api + '/api/documents/' + this.currentPatient)
      .subscribe((resDocs: any) => {
        if (resDocs.message || resDocs.length == 0) {
          //no tiene historico de docs
          this.setStep(1);
          this.initChat();
        } else {
          resDocs.sort(this.sortService.DateSortInver("date"));
          this.docs = resDocs;
          for (var i = 0; i < this.docs.length; i++) {
            const fileName = this.docs[i].url.split("/").pop();
            this.docs[i].title = fileName;
            if (this.docs[i].data != '') {
              var numTotalEvents = 0;
              var numLeftEvents = 0;
              if (this.docs[i].data.symptoms) {
                numTotalEvents = this.docs[i].data.symptoms.length;
                numTotalEvents += this.docs[i].data.medications.length;
                numTotalEvents += this.docs[i].data.allergies.length;
                numTotalEvents += this.docs[i].data.diagnoses.length;

                if (this.docs[i].data.treatments) {
                  numTotalEvents += this.docs[i].data.treatments.length;
                }
                this.docs[i].numTotalEvents = numTotalEvents;

                for (var j = 0; j < this.docs[i].data.symptoms.length; j++) {
                  if (!this.docs[i].data.symptoms[j].checked) {
                    numLeftEvents++;
                  }
                }

                for (var j = 0; j < this.docs[i].data.medications.length; j++) {
                  if (!this.docs[i].data.medications[j].checked) {
                    numLeftEvents++;
                  }
                }

                for (var j = 0; j < this.docs[i].data.allergies.length; j++) {
                  if (!this.docs[i].data.allergies[j].checked) {
                    numLeftEvents++;
                  }
                }

                for (var j = 0; j < this.docs[i].data.diagnoses.length; j++) {
                  if (!this.docs[i].data.diagnoses[j].checked) {
                    numLeftEvents++;
                  }
                }

                if (this.docs[i].data.treatments) {
                  for (var j = 0; j < this.docs[i].data.treatments.length; j++) {
                    if (!this.docs[i].data.treatments[j].checked) {
                      numLeftEvents++;
                    }
                  }
                }
              }


              this.docs[i].numLeftEvents = numLeftEvents;
              if (!this.docs[i].cured) {
                this.pendingDoc = true;
              }
            }
          }
          this.defaultDoc = this.docs[0];
          this.setStep(step);
          
          if (this.docs.length == 0) {
            this.deleteChat();
            //this.pendingDoc = true;
            //Swal.fire('Ya me has alimentado con tu primer documento', 'Ahora puedes preguntarme algo sobre ti!', "success");
            //Swal.fire('These are the data that we have detected.', 'Uncheck the ones that are not correct.', "success");
          }else{
            this.initChat();
          }
        }

        this.loadedDocs = true;
      }, (err) => {
        console.log(err);
        this.insightsService.trackException(err);
        this.loadedDocs = true;
        this.toastr.error('', this.translate.instant("generics.error try again"));
      }));
  }

  loadEvents(newEvent) {
    this.subtypes = [];
    this.loadedEvents = false;
    this.events = [];
    this.metadata = {
      "name": '',
      "age": '',
      "gender": '',
      "symptoms": [],
      "medications": [],
      "allergies": [],
      "diagnoses": [],
      "treatments": [],
      "genes": [],
      "others": [],
      "anomalies": []
    }
    this.subscription.add(this.http.get(environment.api + '/api/actualevents/' + this.currentPatient)
      .subscribe((res: any) => {
        if (res.message) {
          //no tiene información
        } else {
          if (res.length > 0) {
            res.sort(this.sortService.DateSort("dateInput"));
            for (let i = 0; i < res.length; i++) {
              var typeTranslated = res[i].type;
              if (typeTranslated == 'allergy') {
                typeTranslated = this.translate.instant('events.Allergy');
              } else if (typeTranslated == 'disease') {
                typeTranslated = this.translate.instant('events.Disease');
              } else if (typeTranslated == 'drug') {
                typeTranslated = this.translate.instant('events.Drug');
              } else if (typeTranslated == 'symptom') {
                typeTranslated = this.translate.instant('events.Symptom');
              } else if (typeTranslated == 'treatment') {
                typeTranslated = this.translate.instant('events.Treatment');
              } else if (typeTranslated == 'gene') {
                typeTranslated = this.translate.instant('events.Gene');
              } else if (typeTranslated == 'other') {
                typeTranslated = res[i].subtype;
                //typeTranslated = this.translate.instant('generics.Other');
              }
              res[i].typeTranslated = typeTranslated;
              res[i].dateInput = new Date(res[i].dateInput);

              var dateWithoutTime = '';
              var endDateWithoutTime = '';
              if (res[i].date != undefined) {
                if(res[i].date.indexOf("T") != -1){
                  dateWithoutTime = res[i].date.split("T")[0];
                }
              }
              if (res[i].endDate != undefined) {
                if(res[i].endDate.indexOf("T") != -1){
                  endDateWithoutTime = res[i].endDate.split("T")[0];
                }
              }
              if (res[i].type == 'allergy') {
                this.metadata.allergies.push({ name: res[i].name, date: dateWithoutTime});
              } else if (res[i].type == 'disease') {
                this.metadata.diagnoses.push({ name: res[i].name, date: dateWithoutTime, endDate: endDateWithoutTime });
              } else if (res[i].type == 'drug') {
                let dose = '';
                if (res[i].data){
                  if (res[i].data.value != undefined){
                    dose = res[i].data.value + ' mg/day';
                  }
                }
                this.metadata.medications.push({ name: res[i].name, dose: dose, date: dateWithoutTime, endDate: endDateWithoutTime });
              } else if (res[i].type == 'symptom') {
                this.metadata.symptoms.push({ name: res[i].name, date: dateWithoutTime });
              } else if (res[i].type == 'treatment') {
                this.metadata.treatments.push({ name: res[i].name, date: dateWithoutTime });
              } else if (res[i].type == 'gene') {
                this.metadata.genes.push({ name: res[i].name, date: dateWithoutTime });
              } else if (res[i].type == 'other') {
                this.metadata.others.push({ name: res[i].name, date: dateWithoutTime });
                var found = false;
                for (var j = 0; j < this.subtypes.length && !found; j++) {
                  if (this.subtypes[j] == res[i].subtype) {
                    found = true;
                  }
                }
                if (!found) {
                  this.subtypes.push(res[i].subtype);
                }
              } else {
                this.metadata.anomalies.push({ name: res[i].name, date: dateWithoutTime });
              }

            }

            this.events = res;
          }

        }

        //json to string
        // var infoPatient = JSON.stringify(this.metadata);
        const patientInfo = this.metadata;
        if (newEvent) {
          //replace first element
          this.context[0] = { role: "assistant", content: patientInfo };
        } else {
          this.context.push({ role: "assistant", content: patientInfo });
        }
        this.loadedEvents = true;
      }, (err) => {
        console.log(err);
        this.insightsService.trackException(err);
        this.loadedEvents = true;
      }));
  }


  deleteDoc(doc) {
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
        this.confirmDeleteDoc(doc);
      }
    });
  }

  confirmDeleteDoc(doc) {
    this.loadedDocs = false;
    var info = { containerName: this.containerName }
    this.subscription.add(this.http.post(environment.api + '/api/deletedocument/' + doc._id, info)
      .subscribe((resDocs: any) => {
        this.continueConfirmDeleteDoc(doc._id);
        
      }, (err) => {
        console.log(err);
        this.insightsService.trackException(err);
        this.loadedDocs = true;
        this.toastr.error('', this.translate.instant("generics.error try again"));
      }));
  }

  continueConfirmDeleteDoc(docId){
    //if has a messagge with index doc._id, delete it this.messages.push({ task: this.tasksUpload[parsedData.docId], index:  parsedData.docId}); delete it
    var foundElement = this.searchService.search(this.messages, 'index', docId);
    if (foundElement) {
      var index = this.messages.indexOf(foundElement);
      this.messages.splice(index, 1);
    }
    this.toastr.success('', this.translate.instant("generics.Deleted successfully"));
    if((this.docs.length)-1 == 0){
      this.paramService.changeParam('Chat');
    }
    this.getDocs(2);
  }

  confirmDeleteDocEvents(eventsIds, docId) {
    this.loadedDocs = false;
    var eventsIdsTemp = [];
        for(let i=0; i<eventsIds.length; i++){
          eventsIdsTemp.push(eventsIds[i]._id);
        }

    var eventsIdsDef = {eventsIds: eventsIdsTemp};
    this.subscription.add( this.http.post(environment.api+'/api/deleteevents/'+this.currentPatient, eventsIdsDef)
      .subscribe((resDocs: any) => {
        this.continueConfirmDeleteDoc(docId);
      }, (err) => {
        console.log(err);
        this.insightsService.trackException(err);
        this.loadedDocs = true;
        this.toastr.error('', this.translate.instant("generics.error try again"));
      }));
  }


  onFileChangeStep(event) {
    this.preparingFile = true;
    if (event.target.files && event.target.files[0]) {
      var reader = new FileReader();
      reader.readAsDataURL(event.target.files[0]); // read file as data url
      reader.onload = (event2: any) => { // called once readAsDataURL is completed
        this.preparingFile = false;
        var filename = event.target.files[0].name;
        var extension = filename.substr(filename.lastIndexOf('.'));
        var pos = (filename).lastIndexOf('.')
        pos = pos - 4;
        if (pos > 0 && extension == '.gz') {
          extension = (filename).substr(pos);
        }
        filename = filename.split(extension)[0];
        if (extension == '.jpg' || extension == '.png' || extension == '.jpeg' || event.target.files[0].type == 'application/pdf' || extension == '.docx' || event.target.files[0].type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // if (event.target.files[0].type == 'application/pdf') {
          var uniqueFileName = this.getUniqueFileName();
          filename = 'raitofile/' + uniqueFileName + '/' + filename + extension;
          this.dataFile = { event: event.target.files[0], url: filename, name: event.target.files[0].name }
          this.prepareFile();
        } else {
          Swal.fire(this.translate.instant("dashboardpatient.error extension"), '', "warning");
        }
      }
    }
  }

  openFileInput(fileInput: any): void {
    fileInput.click();
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

  prepareFile() {
    if (this.dataFile.url == undefined) {
      console.log('invalid')
      return;
    }
  }

  onFileChangeStep2() {
    this.submitted = true;
    const formData = new FormData();
    formData.append("thumbnail", this.dataFile.event);
    formData.append("url", this.dataFile.url);
    formData.append("containerName", this.containerName);
    formData.append("userId", this.trackEventsService.myuuid);
    this.sendFile(formData);
  }

  sendFile(formData) {
    var fileInfo = { name: this.dataFile.event.name, docId: null }
    //if this.messages have file type, delete this.messages.push({ file: 'new file'});
    var foundElement = this.searchService.search(this.messages, 'file', 'new file');
    if (foundElement) {
      var index = this.messages.indexOf(foundElement);
      this.messages.splice(index, 1);
      //and delete de previous message
      this.messages.splice(index, 1);
    }
    this.subscription.add(this.http.post(environment.api + '/api/upload/' + this.currentPatient, formData)
      .subscribe((res: any) => {
        if (res.message == 'Done' && res.docId) {
          //send broadcast to wait signalR
          fileInfo.docId = res.docId;
          this.eventsService.broadcast('tasksUpload', fileInfo);
        }
        this.dataFile = {};
        this.submitted = false;
        this.paramService.changeParam('Chat');
        this.getDocs(1);
      }, (err) => {
        this.dataFile = {};
        this.getDocs(this.step);
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

  showTextArea() {
    this.showTextAreaFlag = true;
  }

  hideTextArea() {
    this.showTextAreaFlag = false;
  }

  createFileTxt() {
    //create a .txt file with the content of medicalText textarea
    var uniqueFileName = this.getUniqueFileName();
    var filename = 'raitofile/' + uniqueFileName + '/medicalText.txt';
    var blob = new Blob([this.medicalText], { type: "text/plain;charset=utf-8" });
    this.dataFile = { event: blob, url: filename, name: 'medicalText.txt' }
    this.showTextAreaFlag = false;
    this.prepareFile();
  }

  async closeModal() {

    if (this.modalReference != undefined) {
      this.modalReference.close();
      this.modalReference = undefined;
    }
    /*await this.delay(1000);
    this.actualDoc = undefined;*/
  }

  delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  changeAllergies(value) {
    this.notallergy = value;
  }

  checkData(index, value, property) {
    // Comprueba si la propiedad existe en el objeto y si es un array.
    if (this.actualDoc.data.data.hasOwnProperty(property) && Array.isArray(this.actualDoc.data.data[property])) {
      // Comprueba si el índice existe en el array.
      if (index < this.actualDoc.data.data[property].length) {
        this.actualDoc.data.data[property][index].checked = value;
        this.hasChangesEvents = true;
      }
    }
  }

  checkDate(index, value, property) {
    // Comprueba si la propiedad existe en el objeto y si es un array.
    if (this.actualDoc.data.data.hasOwnProperty(property) && Array.isArray(this.actualDoc.data.data[property])) {
      // Comprueba si el índice existe en el array.
      if (index < this.actualDoc.data.data[property].length) {
        this.actualDoc.data.data[property][index].date = value;
        this.hasChangesEvents = true;
      }
    }
  }

  checkEndDate(index, value, property) {
    // Comprueba si la propiedad existe en el objeto y si es un array.
    if (this.actualDoc.data.data.hasOwnProperty(property) && Array.isArray(this.actualDoc.data.data[property])) {
      // Comprueba si el índice existe en el array.
      if (index < this.actualDoc.data.data[property].length) {
        value = this.dateService.transformDate(new Date(value));
        this.actualDoc.data.data[property][index].endDate = value;
        this.hasChangesEvents = true;
      }
    }
  }

  updateDoc(showToastAndLoadDocs) {
    this.saving = true;
    if (this.actualDoc.data.allergies) {
      if (this.notallergy && this.actualDoc.data.allergies.length == 0) {
        this.actualDoc.data.allergies.push({ name: 'Not provided', checked: true })
      }
    }
    Swal.fire({
      title: this.translate.instant("generics.Please wait"),
      showCancelButton: false,
      showConfirmButton: false,
      allowOutsideClick: false
    }).then((result) => {

    });

    this.subscription.add(this.http.put(environment.api + '/api/document/' + this.actualDoc._id, this.actualDoc)
      .subscribe((res: any) => {
        this.saving = false;
        if(showToastAndLoadDocs){
          this.closeModal();
          this.toastr.success('', this.translate.instant("events.The events have been saved"));
          if(this.step==2){
            this.getDocs(2);
          }else{
            this.getDocs(1);
          }
          
        }else{
          this.actualDoc.cured = true;
        }
        Swal.close();
      }, (err) => {
        this.saving = false;
        console.log(err);
        this.insightsService.trackException(err);
        if(showToastAndLoadDocs){
          this.toastr.error('', this.translate.instant("generics.Data saved fail"));
        }
        Swal.close();
      }));
  }

  async closeModalEvents() {
    //if(!this.actualDoc.cured || this.hasChangesEvents){
      this.hasChangesEvents = false;
      this.updateDoc(true);
    if (this.modalReference != undefined) {
      this.modalReference.close();
      this.modalReference = undefined;
    }
  }

  sendMessage() {
    if (!this.message) {
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

  continueSendIntent(msg) {
    //enviar a la función
    if (this.docs.length > 0) {
      this.context[0].content.name = this.docs[0].data.name;
      this.context[0].content.age = this.docs[0].data.age;
      this.context[0].content.gender = this.docs[0].data.gender;
    }
    var query = { "question": msg, "context": this.context, "containerName": this.containerName, "index": this.currentPatient, "userId": this.trackEventsService.myuuid };
    this.subscription.add(this.http.post(environment.api + '/api/callnavigator/', query)
      .subscribe(async (res: any) => {
        if (res.action == 'Data') {
          //this.detectTypeEvent();
        } else if (res.action == 'Question') {
          
        }else if (res.action == 'Document') {
          this.message = '';
          this.messages.push({ file: 'new file' });
          this.callingOpenai = false;
        }else if (res.action == 'Contact') {
          this.message = '';
          this.messages.push({
            text: 'Show Form contact',
            isUser: false
          });
          this.callingOpenai = false;
        } else {
          //this.message = '';
          /*this.messages.push({
            text: '<strong>'+this.translate.instant("generics.error try again")+'</strong>',
            isUser: false
          });*/
          //this.toastr.error('', this.translate.instant("generics.error try again"));
          this.callingOpenai = false;
        }

      }, (err) => {
         this.callingOpenai = false;
        console.log(err);
        this.insightsService.trackException(err);
        //this.message = '';
        this.messages.push({
          text: '<strong>'+this.translate.instant("generics.error try again")+'</strong>',
          isUser: false
        });
           /*this.messages.push({
             text: '<strong>'+this.translate.instant("generics.error try again")+'</strong> <span class="d-block">'+err.message+'</span>',
             isUser: false
           });*/
        //this.toastr.error('', this.translate.instant("generics.error try again"));
      }));
  }


  
  shuffle<T>(array: T[]): T[] {
    let currentIndex = array.length;
    let temporaryValue: T;
    let randomIndex: number;

    while (0 !== currentIndex) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    return array;
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


  get date() {
    //return this.seizuresForm.get('date').value;
    let minDate = new Date(this.eventsForm.get('date').value);
    return minDate;
  }


  openResults(doc, contentSummaryDoc) {
    var fileName = 'summary.txt';
    if(this.translate.currentLang=='en'){
      fileName = 'summary_translated.txt';
    }
    this.actualDoc = doc;
    var url = doc.url.substr(0, doc.url.lastIndexOf('/') + 1)
    var fileUrl = url + fileName;
    this.subscription.add(this.http.get(this.accessToken.blobAccountUrl + this.accessToken.containerName + '/' + fileUrl + this.accessToken.sasToken, { responseType: 'text' })
      .subscribe((res: any) => {
        //this.resultText = res.replace(/\n/g, '<br>');
        this.summaryDoc = JSON.parse(res);
        //this.resultText = res;
        let ngbModalOptions: NgbModalOptions = {
          keyboard: false,
          windowClass: 'ModalClass-sm' // xl, lg, sm
        };
        if (this.modalReference != undefined) {
          this.modalReference.close();
          this.modalReference = undefined;
        }
        this.modalReference = this.modalService.open(contentSummaryDoc, ngbModalOptions);
      }, (err) => {
        console.log(err);
        this.insightsService.trackException(err);
        this.toastr.error('', this.translate.instant('messages.msgError'));
      }));
  }

  openAnonymizedResults(doc, contentviewDoc, type) {
    this.loadingDoc = true;
    //get doc
    this.subscription.add(this.http.get(environment.api + '/api/document/' + doc._id)
    .subscribe((res: any) => {
      if(!res.message){
        doc = res;
        if(doc.anonymized=='true'){
          this.actualDoc = doc;
          var url = doc.url.substr(0, doc.url.lastIndexOf('/') + 1)
          var fileNameNcr = url + type;
          this.subscription.add(this.http.get(this.accessToken.blobAccountUrl + this.accessToken.containerName + '/' + fileNameNcr + this.accessToken.sasToken, { responseType: 'text' })
            .subscribe((res: any) => {
              let parts = res.split(/(\[ANON-\d+\])/g);
              for (let i = 0; i < parts.length; i++) {
                if (/\[ANON-\d+\]/.test(parts[i])) {
                  let length = parseInt(parts[i].match(/\d+/)[0]);
                  let blackSpan = '<span style="background-color: black; display: inline-block; width:' + length + 'em;">&nbsp;</span>';
                  parts[i] = blackSpan;
                }
              }
              let finalTxt = parts.join('');
              this.resultText = finalTxt;
              this.resultText =  this.resultText.replace(/\n/g, '<br>');
              //this.resultText = res;
              let ngbModalOptions: NgbModalOptions = {
                keyboard: false,
                windowClass: 'ModalClass-sm' // xl, lg, sm
              };
              if (this.modalReference != undefined) {
                this.modalReference.close();
                this.modalReference = undefined;
              }
              this.modalReference = this.modalService.open(contentviewDoc, ngbModalOptions);
            }, (err) => {
              console.log(err);
              this.insightsService.trackException(err);
              this.toastr.error('', this.translate.instant('messages.msgError'));
            }));
        }else if(doc.anonymized=='inProcess'){
          var msg1 = this.translate.instant("messages.m5.4")
          Swal.fire('', msg1, "info");
        }else{
          //doc.anonymized=='false'
          var msg1 = this.translate.instant("messages.m5.4")
          Swal.fire('', msg1, "info");
          //anonymizeDocument
          this.anonymizeDocument(doc);
        }
      }
      this.loadingDoc = false;
    }, (err) => {
      this.loadingDoc = false;
      console.log(err);
      this.insightsService.trackException(err);
    }));

    
    
  }

  anonymizeDocument(doc){
    var info = { 'docId': doc._id};
    this.subscription.add(this.http.post(environment.api + '/api/anonymizedocument/' + this.currentPatient, info)
      .subscribe((res: any) => {
      }, (err) => {
        console.log(err);
        this.insightsService.trackException(err);
        this.toastr.error('', this.translate.instant("generics.error try again"));
      }));
  }

  openResultsInChat(doc, type) {
    this.actualDoc = doc;
    var url = doc.url.substr(0, doc.url.lastIndexOf('/') + 1)
    var fileNameNcr = url + type;
    this.subscription.add(this.http.get(this.accessToken.blobAccountUrl + this.accessToken.containerName + '/' + fileNameNcr + this.accessToken.sasToken, { responseType: 'text' })
      .subscribe((res: any) => {
        this.resultText = res.replace(/\n/g, '<br>');
        this.messages.push({
          text: '<strong>Resumen:</strong>' + this.resultText,
          isUser: false
        });
      }, (err) => {
        console.log(err);
        this.insightsService.trackException(err);
      }));
  }

  async startDonating(){
    this.isDonating = true;
    this.changingDonation = true;
    this.changeDonation(true);
  }

  async stopDonating(){
    this.isDonating = false;
    this.changingDonation = true;
    this.changeDonation(false);
  }


  getStateDonation(){
    this.subscription.add(this.http.get(environment.api + '/api/patient/donation/' + this.currentPatient)
      .subscribe((res: any) => {
        this.isDonating = res.donation;
        this.changingDonation = false;
      }, (err) => {
        console.log(err);
        this.insightsService.trackException(err);
        this.toastr.error('', this.translate.instant("generics.error try again"));
        this.changingDonation = false;
      }));
  }

  changeDonation(state){
    var info = { 'donation': state};
    this.subscription.add(this.http.put(environment.api + '/api/patient/donation/' + this.currentPatient, info)
      .subscribe((res: any) => {
        if(res.documents){
          let numDocs = res.documents;
          var msg1 = this.translate.instant("messages.m5.3", {
            value: numDocs
          })
          Swal.fire('', msg1, "info");
        }
        this.isDonating = state;
        this.changingDonation = false;
      }, (err) => {
        console.log(err);
        this.insightsService.trackException(err);
        this.toastr.error('', this.translate.instant("generics.error try again"));
        this.isDonating = !state;
        this.changingDonation = false;
      }));
  }

  getPatientSummary(regenerate){
    this.haveInfo = false;
    let info = { 'userId': this.trackEventsService.myuuid, 'regenerate': regenerate};
    this.subscription.add(this.http.post(environment.api + '/api/patient/summary/' + this.currentPatient, info)
        .subscribe((res: any) => {
          if(res.summary=='The patient does not have any information'){
            this.toastr.info('', this.translate.instant("generics.The patient does not have any information yet"));
            this.haveInfo = false;
          }else{
            this.haveInfo = true;
            if(res.summary=='true'){
              this.getPatientSummaryFile();
              this.summaryDate= res.summaryDate;
            }else{
              //doc.anonymized=='false'
              var msg1 = this.translate.instant("messages.m6.3")
              Swal.fire('', msg1, "info");
            }
          }
          
        }, (err) => {
          console.log(err);
          this.insightsService.trackException(err);
          this.toastr.error('', this.translate.instant("generics.error try again"));
        }));
    }

    getPatientSummaryFile(){
      var fileName = 'raitofile/summary/final_card.txt';
      if(this.translate.currentLang=='en'){
        fileName = 'raitofile/summary/final_card_translated.txt';
      }
      this.subscription.add(this.http.get(this.accessToken.blobAccountUrl + this.accessToken.containerName + '/' + fileName + this.accessToken.sasToken+ '&random=' + Math.random(), { responseType: 'text' })
        .subscribe((res: any) => {
          this.summaryJson = JSON.parse(res);
          console.log(this.summaryJson)
        //this.resultText = res;
        let ngbModalOptions: NgbModalOptions = {
          keyboard: false,
          windowClass: 'ModalClass-sm' // xl, lg, sm
        };
        if (this.modalReference != undefined) {
          this.modalReference.close();
          this.modalReference = undefined;
        }
        this.modalReference = this.modalService.open(this.contentviewSummary, ngbModalOptions);
          
        }, (err) => {
          console.log(err);
          this.insightsService.trackException(err);
          this.getPatientSummary(true);
        }));
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

    @HostListener('window:resize', ['$event'])
    onResize(event) {
      if(!this.showNewCustom && this.listCustomShare.length>0 &&  document.getElementById('panelCustomShare') != null){
        this.widthPanelCustomShare = document.getElementById('panelCustomShare').offsetWidth;
      }
      this.screenWidth = window.innerWidth;
    }

    isSmallScreen(): boolean {
      return this.screenWidth < 576; // Bootstrap's breakpoint for small screen
    }

    openModal(modaltemplate){
      let ngbModalOptions: NgbModalOptions = {
            backdrop : 'static',
            keyboard : false,
            windowClass: 'ModalClass-sm'// xl, lg, sm
      };
      this.modalReference = this.modalService.open(modaltemplate, ngbModalOptions);
    }
    
}
