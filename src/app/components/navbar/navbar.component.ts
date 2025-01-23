import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserService } from '../../services/user.service';
import { User } from '../../services/user.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav>
      <div class="logo">News App</div>
      <div class="nav-links">
        <a routerLink="/news" routerLinkActive="active">News</a>
        <a routerLink="/profile" routerLinkActive="active">Profile</a>
        
        <div *ngIf="user" class="user-section">
          <img 
            *ngIf="user.photoURL" 
            [src]="user.photoURL" 
            alt="Profile" 
            class="profile-pic"
          >
          <span>{{ user.displayName || user.email }}</span>
          <button (click)="logout()">Logout</button>
        </div>
        
        <a *ngIf="!user" routerLink="/login">Login</a>
      </div>
    </nav>
  `,
  styles: [`
    nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 30px;
      background-color: #ffffff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .logo {
      font-size: 1.5rem;
      font-weight: bold;
      color: #333;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .nav-links a {
      text-decoration: none;
      color: #333;
      transition: color 0.3s;
    }
    .nav-links a:hover, .nav-links a.active {
      color: #007bff;
    }
    .user-section {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .profile-pic {
      width: 40px;
      height: 40px;
      border-radius: 50%;
    }
    .user-section button {
      background-color: #dc3545;
      color: white;
      border: none;
      padding: 8px 15px;
      border-radius: 4px;
      cursor: pointer;
    }
  `]
})
export class NavbarComponent {
  user: User | null = null;

  constructor(private userService: UserService) {
    this.userService.currentUser$.subscribe(user => {
      this.user = user;
    });
  }

  logout() {
    this.userService.signOut().subscribe({
      next: () => {
        // Redirect to login page after logout
        window.location.href = '/login';
      },
      error: (err) => {
        console.error('Logout error', err);
      }
    });
  }
}
