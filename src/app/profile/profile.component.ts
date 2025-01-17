import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../services/user.service';
import { NewsService } from '../services/news.service';
import { Article } from '../models/article.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  user: any;
  likedArticles: Article[] = [];

  constructor(
    private userService: UserService,
    private newsService: NewsService
  ) {}

  ngOnInit() {
    this.userService.getCurrentUser().subscribe(user => {
      this.user = user;
      this.loadLikedArticles();
    });
  }

  loadLikedArticles() {
    this.newsService.getLikedArticles().subscribe(articles => {
      this.likedArticles = articles;
    });
  }

  removeFromLiked(articleId: string) {
    this.newsService.unlikeArticle(articleId).subscribe(() => {
      this.loadLikedArticles();
    });
  }
}
