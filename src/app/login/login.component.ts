import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithRedirect } from '@angular/fire/auth';
import { Firestore, doc, setDoc, collection, query, where, getDocs } from '@angular/fire/firestore';

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

  ngOnInit() {
    // Add custom validator after form creation
    this.loginForm.setValidators(this.validateForm.bind(this));
    this.updateFormValidation();
    this.createAdminProfileIfNeeded();
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

  // Method for Google Sign-In click
  onGoogleSignInClick() {
    console.log('Google Sign-In Button Clicked');
    
    // Disable button to prevent multiple clicks
    const googleSignInButton = document.getElementById('google-signin-btn');
    if (googleSignInButton) {
      googleSignInButton.setAttribute('disabled', 'true');
    }

    // Add a small delay to ensure UI updates
    setTimeout(() => {
      this.signInWithGoogle().finally(() => {
        // Re-enable button after sign-in attempt
        if (googleSignInButton) {
          googleSignInButton.removeAttribute('disabled');
        }
      });
    }, 100);
  }

  // Method for Google Sign-In
  async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      
      // Configure provider for additional scopes if needed
      provider.addScope('profile');
      provider.addScope('email');

      // Try popup first, fallback to redirect if popup fails
      try {
        const userCredential = await signInWithPopup(this.auth, provider);
        
        // Optional: Create user document in Firestore
        if (userCredential.user) {
          const userRef = doc(this.firestore, 'users', userCredential.user.uid);
          await setDoc(userRef, {
            email: userCredential.user.email,
            displayName: userCredential.user.displayName,
            photoURL: userCredential.user.photoURL,
            createdAt: new Date()
          }, { merge: true });
        }

        // Navigate to news page
        this.router.navigate(['/news']);
      } catch (popupError) {
        console.warn('Popup sign-in failed, falling back to redirect', popupError);
        
        // Fallback to redirect method
        await signInWithRedirect(this.auth, provider);
      }
    } catch (error: any) {
      console.error('Google Sign-In Error', error);
      
      // Detailed error handling
      let errorMessage = 'Failed to sign in with Google. Please try again.';
      
      switch (error.code) {
        case 'auth/popup-blocked':
          errorMessage = 'Google Sign-In popup was blocked. Please allow popups for this site.';
          break;
        case 'auth/popup-closed-by-user':
          errorMessage = 'Google Sign-In was cancelled. Please try again.';
          break;
        case 'auth/unauthorized-domain':
          errorMessage = 'This domain is not authorized for Google Sign-In. Please contact support.';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Invalid credentials. Please try a different sign-in method.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Google Sign-In is not enabled. Please enable Google Sign-In in Firebase Authentication settings.';
          break;
        default:
          errorMessage = error.message || 'An unexpected error occurred during Google Sign-In.';
      }

      this.errorMessage = errorMessage;
      console.error('Detailed Google Sign-In Error:', {
        code: error.code,
        message: error.message,
        fullError: error
      });

      // Optional: Show error to user
      alert(errorMessage);
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
}
