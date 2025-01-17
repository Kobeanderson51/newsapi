import { Routes } from '@angular/router';
import { NewsListComponent } from './components/news-list/news-list.component';
import { LoginComponent } from './login/login.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { AuthGuard } from './guards/auth.guard';
import { ProfileComponent } from './components/profile/profile.component';

export const routes: Routes = [
  { 
    path: '', 
    component: LoginComponent 
  },
  { 
    path: 'news', 
    component: NewsListComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'home', 
    component: NewsListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '' }
];
