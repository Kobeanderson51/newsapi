import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithRedirect, UserCredential, onAuthStateChanged, getAuth, setPersistence, browserLocalPersistence } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class LoginComponent implements OnInit {
  isSignUp = false;
  loginForm: FormGroup;
  errorMessage: string = '';

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private auth: Auth,
    private firestore: Firestore
  ) {
    this.loginForm = this.fb.group({
      username: [''],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['']
    });
  }

  async ngOnInit() {
    // Add custom validator after form creation
    this.loginForm.setValidators(this.validateForm.bind(this));
    this.updateFormValidation();

    // Set persistence
    try {
      const auth = getAuth();
      await setPersistence(auth, browserLocalPersistence);
    } catch (error) {
      console.error('Error setting auth persistence:', error);
    }

    // Subscribe to auth state changes
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        console.log('User is signed in:', user.email);
        this.router.navigate(['/news']);
      }
    });
  }

  // Method for Google Sign-In click
  async onGoogleSignInClick() {
    console.log('Google Sign-In Button Clicked');
    
    const googleSignInButton = document.getElementById('google-signin-btn');
    if (googleSignInButton) {
      googleSignInButton.setAttribute('disabled', 'true');
    }

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      // Try popup sign-in
      const result = await signInWithPopup(this.auth, provider);
      await this.handleSignInSuccess(result);
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      this.handleSignInError(error);
    } finally {
      if (googleSignInButton) {
        googleSignInButton.removeAttribute('disabled');
      }
    }
  }

  // Handle successful sign-in
  private async handleSignInSuccess(result: UserCredential) {
    try {
      if (result.user) {
        // Update user document in Firestore
        const userRef = doc(this.firestore, 'users', result.user.uid);
        await setDoc(userRef, {
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          lastSignIn: new Date(),
          updatedAt: new Date()
        }, { merge: true });

        // Navigate to news page
        this.router.navigate(['/news']);
      }
    } catch (error) {
      console.error('Error updating user document:', error);
      this.errorMessage = 'Failed to update user profile. Please try again.';
    }
  }

  // Handle sign-in errors
  private handleSignInError(error: { code?: string, message?: string }) {
    console.error('Sign-in error details:', error);
    
    let errorMessage = 'Failed to sign in with Google. Please try again.';
    
    switch (error.code) {
      case 'auth/popup-blocked':
        errorMessage = 'Sign-in popup was blocked. Please allow popups for this site.';
        break;
      case 'auth/popup-closed-by-user':
        errorMessage = 'Sign-in was cancelled.';
        break;
      case 'auth/unauthorized-domain':
        errorMessage = 'This domain is not authorized for Google Sign-In. Please contact support.';
        break;
      case 'auth/operation-not-allowed':
        errorMessage = 'Google Sign-In is not enabled. Please contact support.';
        break;
      default:
        errorMessage = error.message || 'An unexpected error occurred during sign-in.';
    }

    this.errorMessage = errorMessage;
  }

  // Custom form validation method
  validateForm(form: AbstractControl): ValidationErrors | null {
    // Only validate if in sign-up mode
    if (this.isSignUp) {
      const username = form.get('username');
      const password = form.get('password');
      const confirmPassword = form.get('confirmPassword');

      // Validate username
      if (!username?.value) {
        username?.setErrors({ required: true });
      }

      // Validate password match
      if (password && confirmPassword && password.value !== confirmPassword.value) {
        confirmPassword.setErrors({ passwordMismatch: true });
        return { passwordMismatch: true };
      }
    }

    return null;
  }

  // Update form validation based on sign-up/login mode
  updateFormValidation() {
    const usernameControl = this.loginForm.get('username');
    const confirmPasswordControl = this.loginForm.get('confirmPassword');

    if (this.isSignUp) {
      usernameControl?.setValidators([Validators.required]);
      confirmPasswordControl?.setValidators([Validators.required]);
    } else {
      usernameControl?.clearValidators();
      confirmPasswordControl?.clearValidators();
    }

    usernameControl?.updateValueAndValidity();
    confirmPasswordControl?.updateValueAndValidity();
  }

  // Toggle between login and sign-up modes
  toggleMode() {
    this.isSignUp = !this.isSignUp;
    this.updateFormValidation();
    this.errorMessage = ''; // Clear any previous error messages
    this.loginForm.reset(); // Reset the form
  }

  // Submit form method
  async onSubmit() {
    if (this.loginForm.invalid) {
      return;
    }

    try {
      const { email, password, username } = this.loginForm.value;

      if (this.isSignUp) {
        // Sign up logic
        const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
        
        // Optional: Create user document in Firestore
        if (userCredential.user) {
          const userRef = doc(this.firestore, 'users', userCredential.user.uid);
          await setDoc(userRef, {
            username,
            email,
            createdAt: new Date()
          });
        }
      } else {
        // Login logic
        await signInWithEmailAndPassword(this.auth, email, password);
      }

      // Navigate to news page
      this.router.navigate(['/news']);
    } catch (error) {
      console.error('Authentication Error', error);
      this.errorMessage = 'Authentication failed. Please check your credentials.';
    }
  }

  // Create admin profile if it doesn't exist
  async createAdminProfileIfNeeded() {
    try {
      // Try to sign in with admin credentials
      await signInWithEmailAndPassword(this.auth, 'admin@newsapp.com', 'admin123');
      console.log('Admin profile already exists');
      return;
    } catch (error) {
      // If sign in fails, create the admin profile
      try {
        const userCredential = await createUserWithEmailAndPassword(
          this.auth, 
          'admin@newsapp.com', 
          'admin123'
        );
        console.log('Admin profile created');
      } catch (createError) {
        console.error('Error creating admin profile', createError);
      }
    }
  }
}
