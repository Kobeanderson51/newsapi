import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../services/user.service';
import { NewsService, NewsArticle } from '../services/news.service';
import { NavbarComponent } from '../components/navbar/navbar.component';
import { Subscription, Observable, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { RouterModule, Router } from '@angular/router';
import { Auth, signOut, updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from '@angular/fire/auth';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, NavbarComponent, RouterModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit, OnDestroy {
  // Observables
  currentUser$: Observable<any>;
  likedArticles$: Observable<NewsArticle[]>;
  
  // Form controls
  profileForm: FormGroup;
  passwordForm: FormGroup;
  
  // Error and success messages
  errorMessage = '';
  successMessage = '';

  // Subscriptions
  private subscriptions: Subscription[] = [];

  constructor(
    private userService: UserService,
    private newsService: NewsService,
    private auth: Auth,
    private router: Router,
    private fb: FormBuilder
  ) {
    // Current user observable
    this.currentUser$ = this.userService.currentUser$;

    // Liked articles observable
    this.likedArticles$ = this.currentUser$.pipe(
      switchMap(user => {
        if (user) {
          return this.newsService.getLikedArticles().pipe(
            catchError(error => {
              console.error('Error fetching liked articles', error);
              this.errorMessage = 'Failed to load liked articles';
              return of([]);
            })
          );
        }
        return of([]);
      })
    );

    // Profile form
    this.profileForm = this.fb.group({
      displayName: ['', Validators.required],
      email: [{value: '', disabled: true}]
    });

    // Password change form
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    // Populate profile form
    this.subscriptions.push(
      this.currentUser$.subscribe(user => {
        if (user) {
          this.profileForm.patchValue({
            displayName: user.displayName || '',
            email: user.email || ''
          });
        }
      })
    );
  }

  ngOnInit() {}

  ngOnDestroy() {
    // Unsubscribe from all subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Custom validator for password match
  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');

    return newPassword && confirmPassword && newPassword.value === confirmPassword.value 
      ? null 
      : { passwordMismatch: true };
  }

  // Remove a liked article
  removeLikedArticle(articleId: string) {
    const sub = this.newsService.removeArticleFromProfile(articleId).subscribe({
      next: (success) => {
        if (success) {
          this.successMessage = 'Article removed successfully';
          this.errorMessage = '';
        } else {
          this.errorMessage = 'Failed to remove article';
          this.successMessage = '';
        }
      },
      error: (error) => {
        console.error('Error removing liked article', error);
        this.errorMessage = 'Failed to remove article';
        this.successMessage = '';
      }
    });

    this.subscriptions.push(sub);
  }

  // Update profile method
  async updateProfile() {
    if (this.profileForm.invalid) return;

    try {
      const user = this.auth.currentUser;
      if (user) {
        await updateProfile(user, {
          displayName: this.profileForm.get('displayName')?.value
        });
        this.successMessage = 'Profile updated successfully';
        this.errorMessage = '';
      }
    } catch (error: any) {
      console.error('Profile Update Error', error);
      this.errorMessage = error.message || 'Failed to update profile';
      this.successMessage = '';
    }
  }

  // Change password method
  async changePassword() {
    if (this.passwordForm.invalid) return;

    try {
      const user = this.auth.currentUser;
      if (user && user.email) {
        // Reauthenticate user
        const credential = EmailAuthProvider.credential(
          user.email, 
          this.passwordForm.get('currentPassword')?.value
        );
        await reauthenticateWithCredential(user, credential);

        // Update password
        await updatePassword(user, this.passwordForm.get('newPassword')?.value);
        
        this.successMessage = 'Password changed successfully';
        this.errorMessage = '';
        
        // Reset form
        this.passwordForm.reset();
      }
    } catch (error: any) {
      console.error('Password Change Error', error);
      this.errorMessage = this.getPasswordErrorMessage(error.code);
      this.successMessage = '';
    }
  }

  // Helper method to get user-friendly error messages
  private getPasswordErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/wrong-password':
        return 'Current password is incorrect';
      case 'auth/weak-password':
        return 'New password is too weak';
      case 'auth/requires-recent-login':
        return 'Please log out and log in again to change your password';
      default:
        return 'Failed to change password. Please try again.';
    }
  }

  // Logout method
  async logout() {
    try {
      await this.userService.signOut().toPromise();
      // Navigate to login page after logout
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout Error', error);
      this.errorMessage = 'Failed to log out. Please try again.';
    }
  }
}
