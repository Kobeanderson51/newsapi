import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth, updateProfile, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from '@angular/fire/auth';
import { Firestore, doc, updateDoc, collection, query, where, getDocs, getDoc } from '@angular/fire/firestore';
import { NavbarComponent } from '../navbar/navbar.component';
import { NewsService } from '../../services/news.service';
import { NewsArticle } from '../../services/news.service';

interface PopularArticle extends NewsArticle {
  likeCount: number;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  standalone: true,
  imports: [CommonModule, NavbarComponent, ReactiveFormsModule],
  template: `
    <app-navbar></app-navbar>
    <div class="profile-container">
      <div class="profile-card" *ngIf="!loading && userProfile">
        <div class="profile-header">
          <h1 class="profile-username">{{ userProfile.username || 'Anonymous User' }}</h1>
        </div>
        
        <div class="account-settings">
          <h2>Account Settings</h2>
          <form [formGroup]="accountSettingsForm" (ngSubmit)="updateAccountSettings()">
            <div class="form-group">
              <label for="username">Username</label>
              <input 
                type="text" 
                id="username" 
                formControlName="username" 
                placeholder="Enter new username"
              >
              <div *ngIf="accountSettingsForm.get('username')?.invalid && accountSettingsForm.get('username')?.touched" class="error-message">
                Username must be 3-20 characters long and contain only letters, numbers, and underscores.
              </div>
            </div>

            <div class="form-group">
              <label for="email">Email</label>
              <input 
                type="email" 
                id="email" 
                formControlName="email" 
                placeholder="Enter new email"
              >
              <div *ngIf="accountSettingsForm.get('email')?.invalid && accountSettingsForm.get('email')?.touched" class="error-message">
                Please enter a valid email address.
              </div>
            </div>

            <div class="form-group">
              <label for="currentPassword">Current Password</label>
              <input 
                type="password" 
                id="currentPassword" 
                formControlName="currentPassword" 
                placeholder="Current password (required to make changes)"
              >
            </div>

            <div class="form-group">
              <label for="newPassword">New Password (optional)</label>
              <input 
                type="password" 
                id="newPassword" 
                formControlName="newPassword" 
                placeholder="Leave blank if not changing"
              >
              <div *ngIf="accountSettingsForm.get('newPassword')?.invalid && accountSettingsForm.get('newPassword')?.touched" class="error-message">
                Password must be at least 6 characters long.
              </div>
            </div>

            <button 
              type="submit" 
              class="update-button" 
              [disabled]="accountSettingsForm.invalid"
            >
              Update Account
            </button>
          </form>
        </div>

        <button (click)="logout()" class="logout-button">Logout</button>
      </div>

      <div *ngIf="loading" class="loading-spinner">
        <div class="spinner"></div>
        <p>Loading profile...</p>
      </div>

      <div *ngIf="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <div class="liked-articles-section" *ngIf="likedArticles.length > 0">
        <h2>Liked Articles</h2>
        <div class="liked-articles-grid">
          <div *ngFor="let article of likedArticles" class="article-card">
            <div class="article-image-container" (click)="openArticle(article.url)">
              <img *ngIf="article.urlToImage" [src]="article.urlToImage" alt="Article Image" class="article-image">
            </div>
            <div class="article-details">
              <h3 (click)="openArticle(article.url)">{{ article.title }}</h3>
              <p class="article-description" (click)="showLikedMessage()">{{ article.description }}</p>
              <div class="article-footer">
                <span class="liked-badge">❤️ Liked Article</span>
                <button (click)="removeArticle(article)" class="remove-article-button">Remove</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div *ngIf="likedArticles.length === 0" class="no-liked-articles">
        No liked articles yet.
      </div>

      <div class="popular-articles-section" *ngIf="popularArticles.length > 0">
        <h2>Popular Articles</h2>
        <div class="popular-articles-grid">
          <div *ngFor="let article of popularArticles" class="article-card">
            <div class="article-image-container" (click)="openArticle(article.url)">
              <img *ngIf="article.urlToImage" [src]="article.urlToImage" alt="Article Image" class="article-image">
            </div>
            <div class="article-details">
              <h3 (click)="openArticle(article.url)">{{ article.title }}</h3>
              <p class="article-description" (click)="showLikedMessage()">{{ article.description }}</p>
              <div class="article-footer">
                <span class="liked-badge">
                  {{ article.likeCount }} {{ article.likeCount === 1 ? 'like' : 'likes' }}
                  <span *ngIf="article.likeCount >= 3">🔥</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div *ngIf="popularArticles.length === 0" class="no-popular-articles">
        No popular articles yet.
      </div>
    </div>
  `,
  styles: [`
    .profile-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }

    .profile-card {
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      padding: 30px;
      text-align: center;
      transition: transform 0.3s ease;
    }

    .profile-header {
      margin-bottom: 25px;
    }

    .profile-username {
      font-size: 24px;
      color: #333;
      margin: 0;
    }

    .profile-details-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 15px;
      margin-bottom: 25px;
    }

    .profile-detail {
      display: flex;
      align-items: center;
      background-color: #f4f6f7;
      border-radius: 8px;
      padding: 15px;
    }

    .profile-detail i {
      font-size: 24px;
      margin-right: 15px;
      opacity: 0.7;
    }

    .detail-content {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .detail-label {
      font-size: 12px;
      color: #7f8c8d;
      margin-bottom: 5px;
      text-transform: uppercase;
    }

    .detail-value {
      font-size: 16px;
      color: #2c3e50;
    }

    .logout-button {
      background-color: #e74c3c;
      color: white;
      border: none;
      padding: 12px 25px;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.3s ease;
    }

    .logout-button:hover {
      background-color: #c0392b;
    }

    .loading-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
    }

    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-message {
      color: #e74c3c;
      text-align: center;
      margin-top: 20px;
    }

    .liked-articles-section {
      margin-top: 30px;
      text-align: left;
    }

    .liked-articles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 20px;
    }

    .article-card {
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
      transition: transform 0.3s ease;
    }

    .article-card:hover {
      transform: scale(1.05);
    }

    .article-image-container {
      cursor: pointer;
    }

    .article-image {
      width: 100%;
      height: 200px;
      object-fit: cover;
    }

    .article-details {
      padding: 15px;
    }

    .article-details h3 {
      margin-top: 0;
      font-size: 1.1em;
      cursor: pointer;
    }

    .article-description {
      cursor: default;
      color: #666;
    }

    .article-footer {
      margin-top: 10px;
      display: flex;
      justify-content: center;
    }

    .liked-badge {
      background-color: #ff6b6b;
      color: white;
      padding: 5px 10px;
      border-radius: 20px;
      font-size: 0.8em;
    }

    .remove-article-button {
      background-color: #ff4444;
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 5px;
      cursor: pointer;
      margin-left: 10px;
    }

    .no-liked-articles {
      margin-top: 30px;
      color: #666;
    }

    .popular-articles-section {
      margin-top: 30px;
      text-align: left;
    }

    .popular-articles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 20px;
    }

    .no-popular-articles {
      margin-top: 30px;
      color: #666;
    }

    .account-settings {
      background-color: #f4f6f7;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .account-settings h2 {
      margin-top: 0;
      margin-bottom: 20px;
      color: #2c3e50;
      text-align: center;
    }

    .form-group {
      margin-bottom: 15px;
    }

    .form-group label {
      display: block;
      margin-bottom: 5px;
      color: #7f8c8d;
    }

    .form-group input {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 16px;
    }

    .error-message {
      color: #e74c3c;
      font-size: 0.8em;
      margin-top: 5px;
    }

    .update-button {
      width: 100%;
      padding: 12px;
      background-color: #3498db;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.3s ease;
    }

    .update-button:hover {
      background-color: #2980b9;
    }

    .update-button:disabled {
      background-color: #bdc3c7;
      cursor: not-allowed;
    }
  `]
})
export class ProfileComponent implements OnInit {
  userProfile: any = null;
  loading: boolean = true;
  errorMessage: string | null = null;
  likedArticles: NewsArticle[] = [];
  popularArticles: NewsArticle[] = [
    // {
    //   title: "SpaceX Successfully Launches New Satellite Constellation",
    //   description: "SpaceX has successfully launched its latest batch of satellites, expanding global internet coverage and marking another milestone in space technology.",
    //   url: "https://example.com/spacex-launch",
    //   urlToImage: "https://images.unsplash.com/photo-1516849677043-ef67c9557e16?w=500",
    //   publishedAt: new Date().toISOString(),
    //   content: "",
    //   source: { id: null, name: "Space News" }
    // },
    // {
    //   title: "Breakthrough in Quantum Computing Achieved",
    //   description: "Scientists announce a major breakthrough in quantum computing, potentially revolutionizing the future of computing technology.",
    //   url: "https://example.com/quantum-computing",
    //   urlToImage: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=500",
    //   publishedAt: new Date().toISOString(),
    //   content: "",
    //   source: { id: null, name: "Tech Daily" }
    // },
    // {
    //   title: "New AI Model Can Predict Weather Patterns with 95% Accuracy",
    //   description: "Researchers develop a groundbreaking AI model that can predict weather patterns with unprecedented accuracy, potentially transforming meteorology.",
    //   url: "https://example.com/ai-weather",
    //   urlToImage: "https://images.unsplash.com/photo-1527482797697-8795b05a13fe?w=500",
    //   publishedAt: new Date().toISOString(),
    //   content: "",
    //   source: { id: null, name: "AI News" }
    // }
  ];
  accountSettingsForm: FormGroup;

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router,
    private newsService: NewsService,
    private fb: FormBuilder
  ) {
    this.accountSettingsForm = this.fb.group({
      username: ['', [
        Validators.minLength(3), 
        Validators.maxLength(20), 
        Validators.pattern(/^[a-zA-Z0-9_]+$/)
      ]],
      email: ['', [Validators.email]],
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.minLength(6)]]
    });
  }

  ngOnInit() {
    this.loadUserProfile();
    this.loadLikedArticles();
  }

  async loadUserProfile() {
    try {
      const user = this.auth.currentUser;
      console.log('Current User:', user);

      if (!user) {
        this.loading = false;
        this.router.navigate(['/login']);
        return;
      }

      // Fetch user document from Firestore
      const userDocRef = doc(this.firestore, `users/${user.uid}`);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        this.userProfile = userDocSnap.data();
        
        // Populate form with current username and email
        this.accountSettingsForm.patchValue({
          username: this.userProfile.username,
          email: this.userProfile.email
        });
      } else {
        this.errorMessage = 'User profile not found';
      }

      this.loading = false;
    } catch (error) {
      console.error('Error loading user profile:', error);
      this.errorMessage = 'Failed to load user profile';
      this.loading = false;
    }
  }

  async updateAccountSettings() {
    if (this.accountSettingsForm.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = null;

    try {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }

      const { username, email, currentPassword, newPassword } = this.accountSettingsForm.value;

      // Reauthenticate user
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update Firestore document
      const userDocRef = doc(this.firestore, `users/${user.uid}`);
      const updateData: any = {};
      
      // Update username if changed
      if (username && username !== this.userProfile.username) {
        // Check username uniqueness
        const usersRef = collection(this.firestore, 'users');
        const usernameQuery = query(usersRef, where('username', '==', username));
        const usernameSnapshot = await getDocs(usernameQuery);
        
        if (!usernameSnapshot.empty) {
          this.errorMessage = 'Username is already taken';
          this.loading = false;
          return;
        }
        
        updateData.username = username;
        await updateProfile(user, { displayName: username });
      }

      // Update email if changed
      if (email && email !== user.email) {
        // Check email uniqueness
        const emailQuery = query(collection(this.firestore, 'users'), where('email', '==', email));
        const emailSnapshot = await getDocs(emailQuery);
        
        if (!emailSnapshot.empty) {
          this.errorMessage = 'Email is already registered';
          this.loading = false;
          return;
        }

        // Update email 
        await updateEmail(user, email);
        
        updateData.email = email;
        updateData.emailVerified = false; // Track verification status

        this.errorMessage = 'Email updated.';
      }

      // Update password if new password provided
      if (newPassword) {
        await updatePassword(user, newPassword);
      }

      // Update Firestore document if there are changes
      if (Object.keys(updateData).length > 0) {
        await updateDoc(userDocRef, updateData);
      }

      // Reload user profile
      await this.loadUserProfile();

      this.errorMessage = 'Account updated successfully!';
    } catch (error: any) {
      console.error('Update account error:', error);
      this.errorMessage = error.message || 'Failed to update account';
    } finally {
      this.loading = false;
    }
  }

  loadLikedArticles() {
    this.newsService.getLikedArticles().subscribe({
      next: (articles) => {
        this.likedArticles = articles;
      },
      error: (error) => {
        console.error('Error fetching liked articles:', error);
      }
    });
  }

  openArticle(url: string) {
    window.open(url, '_blank');
  }

  showLikedMessage() {
    // Do nothing when description is clicked
  }

  removeArticle(article: NewsArticle) {
    // Implement article removal logic
    const index = this.likedArticles.findIndex(a => a.id === article.id);
    if (index !== -1) {
      this.likedArticles.splice(index, 1);
      // Additional logic to remove from backend/service
    }
  }

  logout() {
    this.auth.signOut().then(() => {
      this.router.navigate(['/login']);
    }).catch((error) => {
      console.error('Logout error:', error);
    });
  }
}
