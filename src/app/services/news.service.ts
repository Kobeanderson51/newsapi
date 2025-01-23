import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, from, BehaviorSubject, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { UserService } from './user.service';
import { Auth } from '@angular/fire/auth';
import { 
  Firestore, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  getDoc 
} from '@angular/fire/firestore';
import { environment } from '../../environments/environment';

export interface NewsArticle {
  source: { 
    id: string | null, 
    name: string 
  };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
  id?: string;
  isLiked?: boolean;
  isDisliked?: boolean;
  savedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NewsService {
  // Use environment variable for API key with fallback
  private apiKey: string;
  private apiBaseUrl = 'https://newsapi.org/v2';
  // Initialize with a default key
  private localStorageKey: string = 'liked_articles_anonymous';

  // New property to track API request limit
  private apiRequestLimitReached = new BehaviorSubject<boolean>(false);
  public apiRequestLimitReached$ = this.apiRequestLimitReached.asObservable();

  // Track the number of requests made
  private requestCount = 0;
  private readonly MAX_REQUESTS = 100; // NewsAPI free tier limit

  constructor(
    private http: HttpClient,
    private userService: UserService,
    private auth: Auth,
    private firestore: Firestore
  ) {
    // Set API key with fallback
    this.apiKey = this.getNewsApiKey();

    // Update local storage key when auth state changes
    this.auth.onAuthStateChanged(user => {
      this.localStorageKey = user 
        ? `liked_articles_${user.uid}` 
        : 'liked_articles_anonymous';
    });
  }

  // Method to get NewsAPI key with fallback
  private getNewsApiKey(): string {
    // Fallback to a default key if environment variable is not set
    const fallbackKey = '68c86cf4b0ce4276ba5c6ac693847e48';
    
    // Use environment variable if available, otherwise use fallback
    return environment.newsApiKey || fallbackKey;
  }

  // Method to log warnings about missing configuration
  private logConfigWarning(configType: string): void {
    console.warn(`[NewsService] ${configType} configuration is missing or incomplete. 
      Please check your Vercel environment variables.`);
  }

  // Method to get Firebase configuration with fallback
  private getFirebaseConfig(): any {
    // Default Firebase configuration (this should be replaced with your actual project's config)
    const fallbackConfig = {
      apiKey: "AIzaSyDh3NvhzWcHRhlfHrYIQreIKK6vXjgiS8Q",
      authDomain: "newsangularapp.firebaseapp.com",
      projectId: "newsangularapp",
      storageBucket: "newsangularapp.firebasestorage.app",
      messagingSenderId: "823520124714",
      appId: "1:823520124714:web:486c488aab226cccac4853",
      measurementId: "G-DSNEZQ3FLK"
    };

    // Check if Firebase config is empty or incomplete
    const envConfig = environment.firebase;
    const isConfigEmpty = !envConfig || 
      Object.values(envConfig).every(val => val === '');

    if (isConfigEmpty) {
      this.logConfigWarning('Firebase');
      return fallbackConfig;
    }

    // Merge environment config with fallback, prioritizing environment config
    return { ...fallbackConfig, ...envConfig };
  }

  // Method to check if request limit is reached
  private checkRequestLimit(): boolean {
    if (this.requestCount >= this.MAX_REQUESTS) {
      this.apiRequestLimitReached.next(true);
      console.error('NewsAPI request limit reached');
      return true;
    }
    return false;
  }

  getTopHeadlines(
    country: string = 'us', 
    category?: string, 
    pageSize: number = 10  // Default to 10 articles, can be customized
  ): Observable<NewsArticle[]> {
    // Check if request limit is reached
    if (this.checkRequestLimit()) {
      return of([]);
    }

    // Check if API key is valid
    if (!this.apiKey || this.apiKey === 'YOUR_NEWS_API_KEY_HERE') {
      this.logConfigWarning('NewsAPI Key');
      return of([]);
    }

    // Log warning if API key is a fallback
    if (this.apiKey === '68c86cf4b0ce4276ba5c6ac693847e48') {
      this.logConfigWarning('NewsAPI Key');
    }

    // Construct URL with optional category and page size
    const categoryParam = category ? `&category=${category}` : '';
    const url = `${this.apiBaseUrl}/top-headlines?country=${country}${categoryParam}&pageSize=${pageSize}&apiKey=${this.apiKey}`;

    return this.http.get<{ articles: NewsArticle[] }>(url).pipe(
      map(response => {
        // Increment request count
        this.requestCount++;

        // Filter out articles without a title or image
        const filteredArticles = response.articles.filter(article => 
          article.title && article.urlToImage
        );

        // Add unique IDs and check for existing interactions
        return filteredArticles.map(article => {
          const uniqueId = this.generateArticleId(article);
          const interactions = this.getArticleInteractionsData();
          
          return {
            ...article,
            id: uniqueId,
            isLiked: interactions.liked.includes(uniqueId),
            isDisliked: interactions.disliked.includes(uniqueId)
          };
        });
      }),
      catchError((error: HttpErrorResponse) => {
        // Check for specific NewsAPI error codes
        if (error.status === 429) {
          // Too Many Requests
          this.apiRequestLimitReached.next(true);
          console.error('NewsAPI request limit reached');
        } else if (error.status === 401) {
          // Unauthorized - likely invalid API key
          this.logConfigWarning('NewsAPI Key');
        }

        console.error('Error fetching top headlines', error);
        return of([]);
      })
    );
  }

  searchNews(
    query: string, 
    sortBy: string = 'publishedAt', 
    pageSize: number = 10  // Default to 10 articles, can be customized
  ): Observable<NewsArticle[]> {
    // Check if request limit is reached
    if (this.checkRequestLimit()) {
      return of([]);
    }

    // Log warning if API key is a fallback
    if (this.apiKey === '68c86cf4b0ce4276ba5c6ac693847e48') {
      this.logConfigWarning('NewsAPI Key');
    }

    const url = `${this.apiBaseUrl}/everything?q=${encodeURIComponent(query)}&sortBy=${sortBy}&pageSize=${pageSize}&apiKey=${this.apiKey}`;
    
    return this.http.get<{ articles: NewsArticle[] }>(url).pipe(
      map(response => {
        // Increment request count
        this.requestCount++;

        // Add unique IDs and check for existing interactions
        return response.articles.map(article => {
          const uniqueId = this.generateArticleId(article);
          const interactions = this.getArticleInteractionsData();
          
          return {
            ...article,
            id: uniqueId,
            isLiked: interactions.liked.includes(uniqueId),
            isDisliked: interactions.disliked.includes(uniqueId)
          };
        });
      }),
      catchError((error: HttpErrorResponse) => {
        // Check for specific NewsAPI error codes
        if (error.status === 429) {
          // Too Many Requests
          this.apiRequestLimitReached.next(true);
          console.error('NewsAPI request limit reached');
        } else if (error.status === 401) {
          // Unauthorized - likely invalid API key
          this.logConfigWarning('NewsAPI Key');
        }

        console.error('Error searching news', error);
        return of([]);
      })
    );
  }

  // Generate a unique ID for an article based on its properties
  generateArticleId(article: NewsArticle): string {
    // Create a consistent string representation of key article properties
    const idString = `${article.url}|${article.publishedAt}|${article.title}`;
    
    // Simple hash function to convert string to a unique identifier
    let hash = 0;
    for (let i = 0; i <idString.length; i++) {
      const char = idString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert to positive integer and then to base-36 string
    return Math.abs(hash).toString(36);
  }

  // Get article interactions specific to the current user
  public getArticleInteractionsData(): { liked: string[], disliked: string[] } {
    const user = this.auth.currentUser;
    if (!user) {
      return { liked: [], disliked: [] };
    }

    const storedInteractions = localStorage.getItem(this.localStorageKey);
    return storedInteractions 
      ? JSON.parse(storedInteractions) 
      : { liked: [], disliked: [] };
  }

  // Save article interactions for the current user
  public updateArticleInteractions(interactions: { liked: string[], disliked: string[] }): void {
    const user = this.auth.currentUser;
    if (!user) {
      return;
    }

    // Save to local storage
    localStorage.setItem(this.localStorageKey, JSON.stringify(interactions));

    // Also save to Firestore for cross-device sync
    const userDocRef = doc(this.firestore, `users/${user.uid}`);
    updateDoc(userDocRef, {
      articleInteractions: interactions
    }).catch(error => {
      console.error('Error updating article interactions in Firestore', error);
    });
  }

  // Like an article
  likeArticle(article: NewsArticle): Observable<boolean> {
    const user = this.auth.currentUser;
    if (!user) {
      console.error('No authenticated user');
      return of(false);
    }

    // Ensure we have a consistent article ID
    const articleId = this.generateArticleId(article);
    
    // Get current interactions
    const interactions = this.getArticleInteractionsData();
    
    // Remove from disliked if present
    const dislikedIndex = interactions.disliked.indexOf(articleId);
    if (dislikedIndex > -1) {
      interactions.disliked.splice(dislikedIndex, 1);
    }

    // Add to liked if not already present
    if (!interactions.liked.includes(articleId)) {
      interactions.liked.push(articleId);
      
      // Save the liked article to Firestore
      const userDocRef = doc(this.firestore, `users/${user.uid}`);
      updateDoc(userDocRef, {
        savedArticles: arrayUnion({
          ...article,
          id: articleId,
          isLiked: true,
          savedAt: new Date().toISOString()
        })
      }).catch(error => {
        console.error('Error saving liked article', error);
      });
    }

    // Update interactions
    this.updateArticleInteractions(interactions);

    return of(true);
  }

  // Unlike an article
  unlikeArticle(articleId: string): Observable<boolean> {
    const user = this.auth.currentUser;
    if (!user) {
      console.error('No authenticated user');
      return of(false);
    }

    const interactions = this.getArticleInteractionsData();
    const likedIndex = interactions.liked.indexOf(articleId);
    
    if (likedIndex > -1) {
      interactions.liked.splice(likedIndex, 1);
    }

    // Remove from local storage liked articles
    const likedArticlesData = localStorage.getItem('likedArticlesData') || '[]';
    const likedArticles = JSON.parse(likedArticlesData);
    
    const articleIndex = likedArticles.findIndex(
      (a: NewsArticle) => this.generateArticleId(a) === articleId
    );
    
    if (articleIndex > -1) {
      likedArticles.splice(articleIndex, 1);
      localStorage.setItem('likedArticlesData', JSON.stringify(likedArticles));
    }

    this.updateArticleInteractions(interactions);
    return of(true);
  }

  // Get liked articles for the current user
  getLikedArticles(): Observable<NewsArticle[]> {
    const user = this.auth.currentUser;
    if (!user) {
      return of([]);
    }

    const userDocRef = doc(this.firestore, `users/${user.uid}`);

    return from(getDoc(userDocRef).then(docSnap => {
      if (docSnap.exists()) {
        const savedArticles = docSnap.data()['savedArticles'] || [];
        const interactions = this.getArticleInteractionsData();

        // Use a Set to track unique article IDs
        const uniqueArticleIds = new Set<string>();
        
        return savedArticles
          .filter((article: NewsArticle) => {
            const articleId = article.id || this.generateArticleId(article);
            
            // Check if this article is liked and hasn't been seen before
            const isLiked = interactions.liked.includes(articleId);
            const isUnique = !uniqueArticleIds.has(articleId);
            
            // If it's liked and unique, add to the set
            if (isLiked && isUnique) {
              uniqueArticleIds.add(articleId);
              return true;
            }
            
            return false;
          })
          .map((article: NewsArticle) => ({
            ...article,
            isLiked: true
          }));
      }
      return [];
    }).catch(error => {
      console.error('Error fetching liked articles', error);
      return [];
    }));
  }

  // Dislike an article
  dislikeArticle(article: NewsArticle): Observable<boolean> {
    const user = this.auth.currentUser;
    if (!user) {
      console.error('No authenticated user');
      return of(false);
    }

    // Ensure we have a consistent article ID
    const articleId = this.generateArticleId(article);
    
    // Get current interactions
    const interactions = this.getArticleInteractionsData();
    
    // Remove from liked if present
    const likedIndex = interactions.liked.indexOf(articleId);
    if (likedIndex > -1) {
      interactions.liked.splice(likedIndex, 1);
      
      // Remove from liked articles in local storage
      const likedArticlesData = localStorage.getItem('likedArticlesData') || '[]';
      const likedArticles = JSON.parse(likedArticlesData);
      
      const articleIndex = likedArticles.findIndex(
        (a: NewsArticle) => this.generateArticleId(a) === articleId
      );
      
      if (articleIndex > -1) {
        likedArticles.splice(articleIndex, 1);
        localStorage.setItem('likedArticlesData', JSON.stringify(likedArticles));
      }
    }

    // Add to disliked if not already present
    if (!interactions.disliked.includes(articleId)) {
      interactions.disliked.push(articleId);
    }

    this.updateArticleInteractions(interactions);
    return of(true);
  }

  // Remove dislike from an article
  removeDislike(articleId: string): Observable<boolean> {
    const user = this.auth.currentUser;
    if (!user) {
      console.error('No authenticated user');
      return of(false);
    }

    const interactions = this.getArticleInteractionsData();
    const dislikedIndex = interactions.disliked.indexOf(articleId);
    
    if (dislikedIndex > -1) {
      interactions.disliked.splice(dislikedIndex, 1);
    }

    this.updateArticleInteractions(interactions);
    return of(true);
  }

  // Remove an article from profile
  removeArticleFromProfile(articleId: string): Observable<boolean> {
    const user = this.auth.currentUser;
    if (!user) {
      console.error('No authenticated user');
      return of(false);
    }

    // Get current interactions
    const interactions = this.getArticleInteractionsData();
    
    // Remove from liked articles in Firestore
    const userDocRef = doc(this.firestore, `users/${user.uid}`);
    updateDoc(userDocRef, {
      savedArticles: arrayRemove({ id: articleId })
    }).catch(error => {
      console.error('Error removing article from profile', error);
    });

    // Remove from liked interactions
    const likedIndex = interactions.liked.indexOf(articleId);
    if (likedIndex > -1) {
      interactions.liked.splice(likedIndex, 1);
    }

    // Update interactions
    this.updateArticleInteractions(interactions);

    return of(true);
  }

  // Reset method for testing or when getting a new API key
  resetRequestCount() {
    this.requestCount = 0;
    this.apiRequestLimitReached.next(false);
  }
}
