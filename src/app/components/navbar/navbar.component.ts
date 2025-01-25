import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserService } from '../../services/user.service';
import { User } from '../../services/user.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
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
