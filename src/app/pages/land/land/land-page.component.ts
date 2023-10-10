import { Component, OnInit, OnDestroy} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { ApiDx29ServerService } from 'app/shared/services/api-dx29-server.service';
import { TrackEventsService } from 'app/shared/services/track-events.service';
import { Subscription  } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { NgbModal} from '@ng-bootstrap/ng-bootstrap';
import { EventsService } from 'app/shared/services/events.service';
import { InsightsService } from 'app/shared/services/azureInsights.service';
import Swal from 'sweetalert2';
import { environment } from 'environments/environment';

declare var JSZipUtils: any;
declare var Docxgen: any;

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

  constructor(private http: HttpClient, public translate: TranslateService, public toastr: ToastrService, private modalService: NgbModal, private apiDx29ServerService: ApiDx29ServerService, private eventsService: EventsService, public trackEventsService: TrackEventsService, public insightsService: InsightsService) {
    this.screenWidth = window.innerWidth;
    this.lang = sessionStorage.getItem('lang');
    this.originalLang = sessionStorage.getItem('lang');

    this.http.get('./assets/js/docs/jszip-utils.js', {responseType: 'text'})
    .subscribe(script => {
      // código después de cargar jszip-utils.js
    });

  this.http.get('./assets/js/docs/docxtemplater.v2.1.5.js', {responseType: 'text'})
    .subscribe(script => {
      // código después de cargar docxtemplater.js
    });

    /*$.getScript("./assets/js/docs/jszip-utils.js").done(function (script, textStatus) {
        //console.log("finished loading and running jszip-utils.js. with a status of" + textStatus);
    });

    $.getScript("./assets/js/docs/docxtemplater.v2.1.5.js").done(function (script, textStatus) {
        //console.log("finished loading and running docxtemplater.js. with a status of" + textStatus);
    });*/
        
  }


  async ngOnDestroy() {
    this.subscription.unsubscribe();
    if(this.modalService){
      this.modalService.dismissAll();
    }
  }



  async ngOnInit() { 
    this.apiDx29ServerService.getDetectLanguage('Hola');
    this.loadedDocs = true;
    if(this.docs.length == 0){
      this.step = 1;
    }else{
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
    //add new item to docs
    this.docs.push({parserObject:{ parserStrategy: 'Auto', callingParser: false, file: undefined }, langToExtract:'', medicalText: '', finish: false});
    var reader = new FileReader();
    reader.readAsDataURL(event[0]); // read file as data url
    reader.onload = (event2: any) => { // called once readAsDataURL is completed
        var the_url = event2.target.result
        var extension = (event[0]).name.substr((event[0]).name.lastIndexOf('.'));
        extension = extension.toLowerCase();
        if (event[0].type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || extension == '.docx') {
            this.loadFile(the_url, function (err, content) {
                if (err) { console.log(err); };
                var doc = new Docxgen(content);
                var text = doc.getFullText();
                this.detectLanguage(text, 'otherdocs');
                this.medicalText = text;
                this.showPanelExtractor = true;
                this.expanded = true;
            }.bind(this))
        } else if (event[0].type == 'application/pdf' || extension == '.pdf' || extension == '.jpg' || extension == '.png' || extension == '.gif' || extension == '.tiff' || extension == '.tif' || extension == '.bmp' || extension == '.dib' || extension == '.bpg' || extension == '.psd' || extension == '.jpeg' || extension == '.jpe' || extension == '.jfif') {
            this.docs[this.docs.length - 1].parserObject.file = event[0];
            if (extension == '.jpg' || extension == '.png' || extension == '.gif' || extension == '.tiff' || extension == '.tif' || extension == '.bmp' || extension == '.dib' || extension == '.bpg' || extension == '.psd' || extension == '.jpeg' || extension == '.jpe' || extension == '.jfif') {
              this.docs[this.docs.length - 1].parserObject.parserStrategy = 'OcrOnly';
            } else {
              this.docs[this.docs.length - 1].parserObject.parserStrategy = 'OcrOnly';//Auto
            }
            let index = this.docs.length - 1;
            this.callParser(index);
        } else {
            Swal.fire(this.translate.instant("dashboardpatient.error extension"), '', "error");
        }

    }
}

onFileChangePDF(event) {
  this.docs.push({parserObject:{ parserStrategy: 'Auto', callingParser: false, file: undefined }, langToExtract:'', medicalText: '', finish: false});
  if (event.target.files && event.target.files[0]) {
      var reader = new FileReader();
      reader.readAsDataURL(event.target.files[0]); // read file as data url
      reader.onload = (event2: any) => { // called once readAsDataURL is completed
          var the_url = event2.target.result

          var extension = (event.target.files[0]).name.substr((event.target.files[0]).name.lastIndexOf('.'));
          extension = extension.toLowerCase();
          this.docs[this.docs.length - 1].langToExtract = '';
          if (event.target.files[0].type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || extension == '.docx') {
              this.loadFile(the_url, function (err, content) {
                  if (err) { console.log(err); };
                  var doc = new Docxgen(content);
                  var text = doc.getFullText();
                  this.detectLanguage(text, 'otherdocs');
                  this.medicalText = text;
                  this.showPanelExtractor = true;
                  this.expanded = true;
              }.bind(this))
          } else if (event.target.files[0].type == 'application/pdf' || extension == '.pdf' || extension == '.jpg' || extension == '.png' || extension == '.gif' || extension == '.tiff' || extension == '.tif' || extension == '.bmp' || extension == '.dib' || extension == '.bpg' || extension == '.psd' || extension == '.jpeg' || extension == '.jpe' || extension == '.jfif') {
            this.docs[this.docs.length - 1].parserObject.file = event.target.files[0]
              if (extension == '.jpg' || extension == '.png' || extension == '.gif' || extension == '.tiff' || extension == '.tif' || extension == '.bmp' || extension == '.dib' || extension == '.bpg' || extension == '.psd' || extension == '.jpeg' || extension == '.jpe' || extension == '.jfif') {
                this.docs[this.docs.length - 1].parserObject.parserStrategy = 'OcrOnly';
              } else {
                this.docs[this.docs.length - 1].parserObject.parserStrategy = 'OcrOnly';//Auto
              }
              let index = this.docs.length - 1;
              this.callParser(index);

          } else {
              Swal.fire(this.translate.instant("dashboardpatient.error extension"), '', "error");
          }

      }

  }
}

loadFile(url, callback) {
  JSZipUtils.getBinaryContent(url, callback);
}

callParser(index) {
  Swal.fire({
      title: this.translate.instant("generics.Please wait"),
      html: '<i class="fa fa-spinner fa-spin fa-3x fa-fw info"></i>',
      showCancelButton: false,
      showConfirmButton: false,
      allowOutsideClick: false
  }).then((result) => {

  });

  this.docs[index].parserObject.callingParser = true;
  var self = this;
  var doc = this.docs[index]
  doc.index = index;
  var oReq = new XMLHttpRequest();
  var lang = this.lang;
  if (this.docs[index].langToExtract != '') {
      lang = this.docs[index].langToExtract;
  }

  oReq.open("PUT", environment.f29api + '/api/Document/Parse?Timeout=5000&language=' + lang + '&Strategy=' + this.docs[index].parserObject.parserStrategy, true);

  //var self = this;
  var doc = this.docs[index]
  var self = this;
  oReq.onload = function (oEvent) {
      Swal.close();
      doc.langToExtract = '';
      doc.parserObject.callingParser = false;
      // Uploaded.
      let file = oEvent.target;
      var target: any = {};
      target = file;
      //target--> status, strategy, content
      if (target.response.content == undefined) {
        doc.medicalText = '';
      } else {
        doc.medicalText = target.response.content
        doc.medicalText = doc.medicalText.split("\n").join(" ");
      }
      doc.finish = true;
      if (target.response.status == 'RequireOcr') {
        doc.parserObject.parserStrategy = 'OcrOnly';
          Swal.fire({
              title: self.translate.instant("parser.OcrOnlyTitle"),
              text: self.translate.instant("parser.OcrOnlyText"),
              icon: 'warning',
              showCancelButton: true,
              confirmButtonColor: '#33658a',
              cancelButtonColor: '#B0B6BB',
              confirmButtonText: self.translate.instant("generics.Yes"),
              cancelButtonText: self.translate.instant("generics.No"),
              showLoaderOnConfirm: true,
              allowOutsideClick: false,
              reverseButtons: true
          }).then((result) => {
              if (result.value) {
                  self.callParser(doc.index);
              } else {
                  var testLangText = doc.medicalText.substr(0, 4000)
                  self.detectLanguage(testLangText, 'parser', doc.index);
              }
          });

      } else {
          console.log(doc)
          doc.parserObject.parserStrategy = 'Auto'
          var testLangText = doc.medicalText.substr(0, 4000)
          self.detectLanguage(testLangText, 'parser', doc.index);
      }
  };
  oReq.send(this.docs[index].parserObject.file);
  const rt = "json";
  oReq.responseType = rt;
}

detectLanguage(testLangText, method, index) {
  this.subscription.add(this.apiDx29ServerService.getDetectLanguage(testLangText)
      .subscribe((res: any) => {
          var lang = this.lang;
          this.docs[index].langDetected = res[0].language;
          if (this.docs[index].langDetected != lang && this.docs[index].parserObject.parserStrategy != 'Auto') {
              Swal.fire({
                  title: this.translate.instant("patdiagdashboard.We have detected that the document is in another language"),
                  text: this.translate.instant("patdiagdashboard.Analyzed as") + '" "' + lang + '", "' + this.translate.instant("patdiagdashboard.detected as") + '" "' + res[0].language + '". "' + this.translate.instant("patdiagdashboard.do you want us to do it"),
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonColor: '#33658a',
                  cancelButtonColor: '#B0B6BB',
                  confirmButtonText: this.translate.instant("generics.Yes"),
                  cancelButtonText: this.translate.instant("generics.No"),
                  showLoaderOnConfirm: true,
                  allowOutsideClick: false,
                  reverseButtons: true
              }).then((result) => {
                  if (result.value) {
                    this.docs[index].langToExtract = this.docs[index].langDetected
                      if (method == 'parser') {
                          this.callParser(index);
                      }
                  } else {
                    this.docs[index].langToExtract = this.docs[index].langDetected
                      if (this.docs[index].medicalText != '') {
                          this.docs[index].finish = true;
                          //this.onSubmitToExtractor();
                      } else {
                          Swal.fire(this.translate.instant("patdiagdashboard.No text has been detected in the file"), '', "error");
                      }
                  }
              });

          } else {
              if (this.docs[index].langDetected != lang) {
                this.docs[index].langToExtract = this.docs[index].langDetected
              } else {
                this.docs[index].langToExtract = lang;
              }
              if (this.docs[index].medicalText != '') {
                  this.docs[index].finish = true;
                  //this.onSubmitToExtractor();
              } else {
                  Swal.fire(this.translate.instant("patdiagdashboard.No text has been detected in the file"), '', "error");
              }

          }
      }, (err) => {
          console.log(err);
          this.toastr.error('', this.translate.instant("generics.error try again"));
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
  this.docs.splice(index, 1);
}

    
}
