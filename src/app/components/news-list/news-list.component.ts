import { Component, OnInit, ElementRef, Renderer2, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NewsService, NewsArticle } from '../../services/news.service';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { HttpClientModule } from '@angular/common/http';
import { Firestore } from '@angular/fire/firestore';

@Component({
  selector: 'app-news-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule,
    HttpClientModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="news-container">
      <header class="main-header">
        <div class="logo-container">
          <div class="logo">Global News for Idiots That Can't Read</div>
        </div>
        
        <div class="search-container">
          <input 
            type="text" 
            [placeholder]="currentPlaceholder"
            [(ngModel)]="searchQuery"
            (keyup.enter)="searchNews()"
            class="search-input"
          >
          <button 
            (click)="searchNews()" 
            class="search-button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="search-icon">
              <path 
                d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" 
                fill="currentColor"
              />
            </svg>
          </button>

          <button 
            (click)="openLogin()"
            class="login-button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="login-icon">
              <path 
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" 
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </header>

      <div class="category-tabs">
        <button 
          *ngFor="let category of categories" 
          (click)="loadNewsByCategory(category)"
          [class.active]="selectedCategory === category"
        >
          {{ category | titlecase }}
        </button>
      </div>

      <main class="news-grid">
        <article 
          *ngFor="let article of articles" 
          class="news-card"
        >
          <div class="card-image" (click)="openArticle(article.url)">
            <img 
              *ngIf="article.urlToImage; else placeholderImage" 
              [src]="article.urlToImage" 
              [alt]="article.title"
              (error)="usePlaceholderImage($event)"
            >
            <ng-template #placeholderImage>
              <img 
                src="assets/placeholder-news.png" 
                alt="News placeholder image"
                class="placeholder-image"
              >
            </ng-template>
          </div>
          <div class="card-content" (click)="openArticle(article.url)">
            <h3>{{ article.title }}</h3>
            <p>{{ article.description || 'No description available' }}</p>
            <div class="card-footer">
              <span class="source">{{ article.source.name }}</span>
              <span class="date">{{ article.publishedAt | date:'shortDate' }}</span>
              <div class="article-actions" (click)="$event.stopPropagation()">
                <button 
                  (click)="likeArticle(article); $event.stopPropagation()"
                  class="like-btn" 
                  [class.liked]="article.isLiked"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                </button>
                <button 
                  (click)="dislikeArticle(article); $event.stopPropagation()" 
                  class="dislike-btn" 
                  [class.disliked]="article.isDisliked"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73 0 1.1.9 2 2 2h6.31l-.95 4.57c-.02.1-.03.2-.03.31 0 .41.17.79.44 1.06l1.06 1.05 6.63-6.63c.37-.37.59-.88.59-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </article>
      </main>
      <div *ngIf="searchError" class="search-error">
        {{ searchError }}
      </div>
      <div *ngIf="isLoading" class="loading-container">
        <p>Loading news...</p>
      </div>
      <div *ngIf="loadingError" class="loading-error">
        {{ loadingError }}
      </div>
    </div>
  `,
  styles: [`
    .article-actions {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      margin-top: 10px;
    }

    .like-button, .dislike-button {
      background: none;
      border: none;
      font-size: 1.5em;
      cursor: pointer;
      margin-right: 15px;
      opacity: 0.5;
      transition: opacity 0.3s ease;
    }

    .like-button.liked, .dislike-button.disliked {
      opacity: 1;
    }

    .like-button:hover, .dislike-button:hover {
      opacity: 0.8;
    }
  `],
  styleUrls: ['./news-list.component.scss']
})
export class NewsListComponent implements OnInit, AfterViewInit, OnDestroy {
  articles: NewsArticle[] = [];
  categories: string[] = [
    'general', 
    'business', 
    'technology', 
    'entertainment', 
    'sports'
  ];
  selectedCategory: string = 'general';
  searchQuery: string = '';

  // Personal touch: Customize placeholders to feel more authentic
  funnyPlaceholders: string[] = [
    'What\'s brewing in the world today?',
    'Uncover stories that matter to you',
    'Your daily dose of global insights',
    'News that goes beyond headlines',
    'Discover perspectives, not just facts',
    'Stories that connect, not just inform',
    'Your window to the world\'s narratives',
    'Breaking news, human stories',
    'Journalism that sparks curiosity',
    'News that empowers your understanding'
  ];
  currentPlaceholderIndex: number = 0;
  placeholderIntervalId: any;
  placeholderElement: HTMLInputElement | null = null;

  // Add a property to track search state
  isSearching: boolean = false;
  searchError: string | null = null;

  // Track loading and error states
  isLoading: boolean = true;
  loadingError: string | null = null;

  // Flag to track API request limit
  apiRequestLimitReached = false;

  constructor(
    private newsService: NewsService, 
    private userService: UserService,
    private firestore: Firestore,
    private router: Router,
    private el: ElementRef, 
    private renderer: Renderer2
  ) {
    // Subscribe to API request limit observable
    this.newsService.apiRequestLimitReached$.subscribe(limitReached => {
      this.apiRequestLimitReached = limitReached;
      
      // If limit is reached, display error message
      if (limitReached) {
        this.displayApiLimitError();
      }
    });
  }

  ngOnInit(): void {
    // Load news and check for previously liked/disliked articles
    this.loadNewsByCategory(this.selectedCategory);
    
    // Check for existing interactions
    const interactions = this.newsService.getArticleInteractionsData();
    
    // After loading articles, mark liked/disliked articles
    this.articles = this.articles.map(article => {
      const articleId = this.newsService.generateArticleId(article);
      return {
        ...article,
        id: articleId,
        isLiked: interactions.liked.includes(articleId),
        isDisliked: interactions.disliked.includes(articleId)
      };
    });
    this.setupScrollAnimation();
    this.startPlaceholderCycle();
  }

  ngAfterViewInit(): void {
    // Get the search input element
    this.placeholderElement = this.el.nativeElement.querySelector('.search-input');
  }

  ngOnDestroy(): void {
    if (this.placeholderIntervalId) {
      clearInterval(this.placeholderIntervalId);
    }
  }

  startPlaceholderCycle(): void {
    this.placeholderIntervalId = setInterval(() => {
      // Cycle to next placeholder
      this.currentPlaceholderIndex = 
        (this.currentPlaceholderIndex + 1) % this.funnyPlaceholders.length;
      
      // Add animation effect
      if (this.placeholderElement) {
        // Remove any existing animations
        this.placeholderElement.classList.remove('placeholder-exit', 'placeholder-enter');
        
        // Trigger exit animation
        this.placeholderElement.classList.add('placeholder-exit');
        
        // Wait for exit animation to complete
        setTimeout(() => {
          if (this.placeholderElement) {
            // Remove exit animation and add enter animation
            this.placeholderElement.classList.remove('placeholder-exit');
            this.placeholderElement.classList.add('placeholder-enter');
          }
        }, 300); // Match this with CSS animation duration
      }
    }, 10000); // Change placeholder every 10 seconds
  }

  get currentPlaceholder(): string {
    return this.funnyPlaceholders[this.currentPlaceholderIndex];
  }

  setupScrollAnimation(): void {
    const newsGrid: HTMLElement | null = this.el.nativeElement.querySelector('.news-grid');
    if (!newsGrid) return;

    const observerOptions: IntersectionObserverInit = {
      root: null,
      rootMargin: '100px 0px', // Adjust to trigger earlier
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry: IntersectionObserverEntry, index: number) => {
        const target: HTMLElement = entry.target as HTMLElement;
        
        if (entry.isIntersecting) {
          // Determine column and apply appropriate translation
          switch(index % 3) {
            case 0: // First column
              this.renderer.setStyle(target, 'transform', 'translateY(-50px)');
              break;
            case 1: // Middle column
              this.renderer.setStyle(target, 'transform', 'translateY(50px)');
              break;
            case 2: // Last column
              this.renderer.setStyle(target, 'transform', 'translateY(-50px)');
              break;
          }
          this.renderer.setStyle(target, 'opacity', '1');
        } else {
          this.renderer.setStyle(target, 'transform', 'translateY(0)');
        }
      });
    }, observerOptions);

    const newsCards: Element[] = Array.from(newsGrid.querySelectorAll('.news-card'));
    newsCards.forEach((card: Element) => {
      this.renderer.setStyle(card, 'opacity', '0');
      observer.observe(card);
    });
  }

  filterArticles(articles: NewsArticle[]): NewsArticle[] {
    return articles.filter(article => 
      !article.title.includes('[Removed]') && 
      !article.description?.includes('[Removed]')
    );
  }

  loadNewsByCategory(category: string): void {
    // Check if API request limit is reached
    if (this.apiRequestLimitReached) {
      this.displayApiLimitError();
      return;
    }

    console.log(`Loading category: ${category}`);
    
    // Reset loading states
    this.isLoading = true;
    this.loadingError = null;
    this.selectedCategory = category;

    this.newsService.getTopHeadlines('us', category, 10)
      .subscribe({
        next: (articles: NewsArticle[]) => {
          this.isLoading = false;
          
          // Filter out [Removed] articles
          const filteredArticles = this.filterArticles(articles);
          
          // If filtered articles are empty, try again with a different category
          if (filteredArticles.length === 0) {
            this.loadingError = 'No articles found for this category. Try another.';
            this.loadNewsByCategory('general');
            return;
          }
          
          this.articles = filteredArticles;
          setTimeout(() => this.setupScrollAnimation(), 100);
        },
        error: (error) => {
          this.isLoading = false;
          this.loadingError = 'Failed to load news. Check your internet connection or API key.';
          console.error('Error loading news:', error);
          this.articles = [];
        }
      });
  }

  searchNews(): void {
    // Check if API request limit is reached
    if (this.apiRequestLimitReached) {
      this.displayApiLimitError();
      return;
    }

    // Trim and validate search query
    const query = this.searchQuery.trim();
    
    // Only perform search if query is not empty
    if (query) {
      // Reset search-related states
      this.selectedCategory = 'general';
      
      // Call news service to search articles
      this.newsService.searchNews(query, 'publishedAt', 10)
        .subscribe({
          next: (articles: NewsArticle[]) => {
            // Filter out [Removed] articles
            const filteredArticles = this.filterArticles(articles);
            
            // If no articles found, show error
            if (filteredArticles.length === 0) {
              this.searchError = `No articles found for "${query}"`;
              this.articles = [];
              return;
            }
            
            // Limit to 10 articles and update the view
            this.articles = filteredArticles;
            
            // Trigger scroll animation after articles are loaded
            setTimeout(() => this.setupScrollAnimation(), 100);
            
            // Optional: Add a visual indicator for search results
            console.log(`Found ${filteredArticles.length} articles for query: ${query}`);
          },
          error: (error) => {
            // Handle search errors
            this.searchError = 'Failed to search articles. Please try again.';
            console.error('Search failed:', error);
            
            // Clear previous articles
            this.articles = [];
          }
        });
    } else {
      // If search query is empty, reload default category
      this.loadNewsByCategory(this.selectedCategory);
      this.searchError = null;
    }
  }

  openArticle(url: string): void {
    window.open(url, '_blank');
  }

  usePlaceholderImage(event: any): void {
    event.target.src = 'assets/placeholder-news.png';
  }

  openLogin(): void {
    this.router.navigate(['/profile']);
  }

  likeArticle(article: NewsArticle) {
    // Generate a consistent article ID if not already present
    const articleId = article.id || this.newsService.generateArticleId(article);
    article.id = articleId;

    article.isLiked = !article.isLiked;
    if (article.isLiked) {
      this.newsService.likeArticle(article).subscribe({
        next: () => {
          // Add to local interactions
          const interactions = this.newsService.getArticleInteractionsData();
          if (!interactions.liked.includes(articleId)) {
            interactions.liked.push(articleId);
          }
          // Add to user profile
          this.userService.addArticleToProfile(article).subscribe({
            next: () => {
              console.log('Article added to profile');
            },
            error: (err) => {
              console.error('Error adding article to profile', err);
            }
          });
        },
        error: (err) => {
          console.error('Error liking article', err);
        }
      });
    } else {
      this.newsService.unlikeArticle(articleId).subscribe({
        next: () => {
          // Remove from local interactions
          const interactions = this.newsService.getArticleInteractionsData();
          const index = interactions.liked.indexOf(articleId);
          if (index > -1) {
            interactions.liked.splice(index, 1);
          }
          // Remove from user profile
          this.userService.removeArticleFromProfile(articleId).subscribe({
            next: () => {
              console.log('Article removed from profile');
            },
            error: (err) => {
              console.error('Error removing article from profile', err);
            }
          });
        },
        error: (err) => {
          console.error('Error unliking article', err);
        }
      });
    }
  }

  private fetchNextArticle() {
    // Check if API request limit is reached
    if (this.apiRequestLimitReached) {
      this.displayApiLimitError();
      return;
    }

    // Fetch top headlines to get a new article
    this.newsService.getTopHeadlines('us', this.selectedCategory, 10)
      .subscribe({
        next: (articles) => {
          // Filter out already disliked articles
          const interactions = this.newsService.getArticleInteractionsData();
          const availableArticles = articles.filter(article => {
            const articleId = this.newsService.generateArticleId(article);
            return !interactions.disliked.includes(articleId);
          });

          // Update articles if we have new ones
          if (availableArticles.length > 0) {
            this.articles = availableArticles;
          }
        },
        error: (error) => {
          console.error('Error fetching next article', error);
        }
      });
  }

  private displayApiLimitError() {
    // Create error message element
    const errorDiv = this.renderer.createElement('div');
    this.renderer.addClass(errorDiv, 'api-limit-error');
    this.renderer.setProperty(errorDiv, 'innerHTML', `
      <div class="error-container">
        <h2>News API Limit Reached</h2>
        <p>Sorry, we've reached the maximum number of news article requests.</p>
        <p>Please try again later or upgrade your API plan.</p>
        <button id="dismiss-error">Dismiss</button>
      </div>
    `);

    // Append to body
    this.renderer.appendChild(document.body, errorDiv);

    // Add dismiss event listener
    const dismissButton = errorDiv.querySelector('#dismiss-error');
    dismissButton.addEventListener('click', () => {
      this.renderer.removeChild(document.body, errorDiv);
    });

    // Add styles
    const styleTag = this.renderer.createElement('style');
    this.renderer.setProperty(styleTag, 'textContent', `
      .api-limit-error {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        z-index: 1000;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
      }
      .error-container {
        background-color: #ff4136;
        padding: 30px;
        border-radius: 10px;
        text-align: center;
        max-width: 500px;
      }
      .error-container h2 {
        margin-bottom: 15px;
      }
      .error-container button {
        margin-top: 15px;
        padding: 10px 20px;
        background-color: white;
        color: #ff4136;
        border: none;
        border-radius: 5px;
        cursor: pointer;
      }
    `);
    this.renderer.appendChild(document.head, styleTag);
  }

  dislikeArticle(article: NewsArticle) {
    // Generate a consistent article ID
    const articleId = article.id || this.newsService.generateArticleId(article);
    
    // Attach the generated ID to the article
    article.id = articleId;

    // Check if the article is already disliked
    const interactions = this.newsService.getArticleInteractionsData();
    const isCurrentlyDisliked = interactions.disliked.includes(articleId);

    if (isCurrentlyDisliked) {
      // Remove dislike
      this.newsService.removeDislike(articleId).subscribe({
        next: () => {
          article.isDisliked = false;
          // Remove from local interactions
          const index = interactions.disliked.indexOf(articleId);
          if (index > -1) {
            interactions.disliked.splice(index, 1);
          }
          // Remove from user profile
          this.userService.removeArticleFromProfile(articleId).subscribe({
            next: () => {
              console.log('Article removed from profile');
            },
            error: (err) => {
              console.error('Error removing article from profile', err);
            }
          });
        },
        error: (err) => {
          console.error('Error removing dislike', err);
        }
      });
    } else {
      // Remove like if it exists
      if (article.isLiked) {
        this.newsService.unlikeArticle(articleId).subscribe({
          next: () => {
            article.isLiked = false;
            const likedIndex = interactions.liked.indexOf(articleId);
            if (likedIndex > -1) {
              interactions.liked.splice(likedIndex, 1);
            }
          },
          error: (err) => {
            console.error('Error unliking article', err);
          }
        });
      }

      // Dislike the article
      this.newsService.dislikeArticle(article).subscribe({
        next: () => {
          article.isDisliked = true;
          // Add to local interactions
          if (!interactions.disliked.includes(articleId)) {
            interactions.disliked.push(articleId);
          }
          // Add to user profile
          this.userService.addArticleToProfile(article).subscribe({
            next: () => {
              console.log('Article added to profile');
            },
            error: (err) => {
              console.error('Error adding article to profile', err);
            }
          });
        },
        error: (err) => {
          console.error('Error disliking article', err);
        }
      });
    }
  }
}
