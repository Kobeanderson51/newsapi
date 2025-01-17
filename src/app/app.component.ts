import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NewsListComponent } from './components/news-list/news-list.component';

@Component({
  selector: 'app-root',
  template: '<router-outlet></router-outlet>',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NewsListComponent]
})
export class AppComponent {}
