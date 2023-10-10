import { NgModule } from '@angular/core';
import {CommonModule} from "@angular/common";

import { FilterPipe } from './filter.pipe';
import { SearchPipe } from './search.pipe';
import { ShortNamePipe } from './short-name.pipe';
import { BytesPipe } from './bytes.pipe';

@NgModule({
  declarations:[FilterPipe, SearchPipe, ShortNamePipe, BytesPipe],
  imports:[CommonModule],
  exports:[FilterPipe, SearchPipe, ShortNamePipe, BytesPipe]
})

export class PipeModule{}
