import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from '@angular/fire/auth';
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
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    // Create admin profile if it doesn't exist
    this.createAdminProfileIfNeeded();
    this.updateFormValidation();
  }

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

        // Create a user document in Firestore with admin role
        const userDoc = doc(this.firestore, `users/${userCredential.user.uid}`);
        await setDoc(userDoc, {
          email: 'admin@newsapp.com',
          role: 'admin',
          createdAt: new Date()
        });

        console.log('Admin profile created successfully');
      } catch (createError) {
        console.error('Error creating admin profile:', createError);
      }
    }
  }

  updateFormValidation() {
    const usernameControl = this.loginForm.get('username');
    const confirmPasswordControl = this.loginForm.get('confirmPassword');

    if (this.isSignUp) {
      usernameControl?.setValidators([
        Validators.required, 
        Validators.minLength(3), 
        Validators.maxLength(20),
        Validators.pattern(/^[a-zA-Z0-9_]+$/)
      ]);
      confirmPasswordControl?.setValidators([Validators.required]);
    } else {
      usernameControl?.clearValidators();
      confirmPasswordControl?.clearValidators();
    }

    usernameControl?.updateValueAndValidity();
    confirmPasswordControl?.updateValueAndValidity();
  }

  toggleMode() {
    this.isSignUp = !this.isSignUp;
    this.errorMessage = '';
    this.updateFormValidation();
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    // Check if confirmPassword control exists and we're in signup mode
    if (password && confirmPassword && this.isSignUp) {
      if (password.value !== confirmPassword.value) {
        confirmPassword.setErrors({ passwordMismatch: true });
      } else {
        confirmPassword.setErrors(null);
      }
    }
    
    return null;
  }

  async onSubmit() {
    if (this.loginForm.invalid) {
      return;
    }

    const email = this.loginForm.get('email')?.value;
    const username = this.loginForm.get('username')?.value;
    const password = this.loginForm.get('password')?.value;

    try {
      if (this.isSignUp) {
        // Check if username already exists
        const usersRef = collection(this.firestore, 'users');
        const usernameQuery = query(usersRef, where('username', '==', username));
        const usernameSnapshot = await getDocs(usernameQuery);
        
        if (!usernameSnapshot.empty) {
          this.errorMessage = 'Username is already taken';
          return;
        }

        // Check if email already exists
        const emailQuery = query(usersRef, where('email', '==', email));
        const emailSnapshot = await getDocs(emailQuery);
        
        if (!emailSnapshot.empty) {
          this.errorMessage = 'Email is already registered';
          return;
        }

        // Sign Up
        const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
        console.log('User signed up successfully');
        
        // Create a user document in Firestore
        const userDocRef = doc(this.firestore, `users/${userCredential.user.uid}`);
        await setDoc(userDocRef, {
          email: userCredential.user.email,
          username: username,
          lastLogin: new Date()
        });
        
        this.router.navigate(['/news']);
      } else {
        // Login
        let userEmail = email;

        // If username is provided, find the corresponding email
        if (username) {
          const usersRef = collection(this.firestore, 'users');
          const q = query(usersRef, where('username', '==', username));
          const querySnapshot = await getDocs(q);
          
          if (querySnapshot.empty) {
            this.errorMessage = 'Username not found';
            return;
          }

          // Get the first matching user's email
          const userDoc = querySnapshot.docs[0];
          userEmail = userDoc.data()['email'];
        }

        const userCredential = await signInWithEmailAndPassword(this.auth, userEmail, password);
        console.log('User logged in successfully:', userCredential.user);
        // Navigate to news page
        this.router.navigate(['/news']).then(
          success => console.log('Navigation to news successful'),
          error => console.error('Navigation to news failed', error)
        );
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      this.errorMessage = error.message || 'Authentication failed';
    }
  }

  navigateHome() {
    this.router.navigate(['/']);
  }
}
