import { Routes } from '@angular/router';
import { NewsListComponent } from './components/news-list/news-list.component';
import { LoginComponent } from './login/login.component';
import { ProfileComponent } from './profile/profile.component';
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
    path: 'profile',
    component: ProfileComponent,
    canActivate: [authGuard]
  },
  { 
    path: '', 
    redirectTo: '/login', 
    pathMatch: 'full' 
  },
  { path: '**', redirectTo: '/login' }
];
