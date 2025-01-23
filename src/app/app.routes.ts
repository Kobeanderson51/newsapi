import { Routes } from '@angular/router';
import { NewsListComponent } from './components/news-list/news-list.component';
import { LoginComponent } from './components/login/login.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { AuthGuard } from './guards/auth.guard';
import { ProfileComponent } from './components/profile/profile.component';
import { inject } from '@angular/core';
import { UserService } from './services/user.service';
import { Router } from '@angular/router';

// Authentication guard
export const authGuard = () => {
  const userService = inject(UserService);
  const router = inject(Router);

  if (userService.isAuthenticated()) {
    return true;
  }

  // Redirect to login page if not authenticated
  return router.createUrlTree(['/login']);
};

export const routes: Routes = [
  { 
    path: 'login', 
    component: LoginComponent 
  },
  { 
    path: 'news', 
    component: NewsListComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'home', 
    component: NewsListComponent,
    canActivate: [authGuard]
  },
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [authGuard]
  },
  { 
    path: '', 
    redirectTo: '/news', 
    pathMatch: 'full' 
  },
  { path: '**', redirectTo: '/news' }
];
