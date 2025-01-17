import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  // Development override flag
  private bypassAuth = false;

  constructor(
    private auth: Auth, 
    private router: Router
  ) {}

  async canActivate(): Promise<boolean> {
    // If bypassAuth is true, always allow access
    if (this.bypassAuth) {
      console.log('AuthGuard: Development mode - bypassing authentication');
      return true;
    }

    return new Promise((resolve) => {
      const unsubscribe = this.auth.onAuthStateChanged((user) => {
        unsubscribe(); // Unsubscribe immediately to prevent memory leaks
        
        console.log('AuthGuard - Current User:', user);
        
        if (user) {
          console.log('User is authenticated, allowing access');
          resolve(true);
        } else {
          console.log('No user authenticated, redirecting to login');
          this.router.navigate(['/']);
          resolve(false);
        }
      });
    });
  }

  // Method to manually toggle auth bypass (useful for development)
  toggleAuthBypass(enable: boolean = true) {
    this.bypassAuth = enable;
    console.log(`AuthGuard: Authentication bypass ${enable ? 'ENABLED' : 'DISABLED'}`);
  }
}
