import { Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { NewsArticle } from './news.service';

export interface User {
  email: string;
  fullName: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(
    private auth: Auth,
    private firestore: Firestore
  ) {}

  getCurrentUser(): User | null {
    return null; // Always return null to simulate logged out state
  }

  isLoggedIn(): boolean {
    return false; // Always return false
  }

  logout(): void {
    // Do nothing
  }

  // Add an article to user's profile
  addArticleToProfile(article: NewsArticle): Observable<boolean> {
    const user = this.auth.currentUser;
    if (!user) {
      console.error('No authenticated user');
      return of(false);
    }

    const userDocRef = doc(this.firestore, `users/${user.uid}`);

    // Convert article to a storable format
    const articleToStore = {
      id: article.id,
      title: article.title,
      description: article.description,
      url: article.url,
      urlToImage: article.urlToImage,
      publishedAt: article.publishedAt,
      source: article.source,
      savedAt: new Date().toISOString()
    };

    return from(updateDoc(userDocRef, {
      savedArticles: arrayUnion(articleToStore)
    }).then(() => true).catch(error => {
      console.error('Error adding article to profile', error);
      return false;
    }));
  }

  // Remove an article from user's profile
  removeArticleFromProfile(articleId: string): Observable<boolean> {
    const user = this.auth.currentUser;
    if (!user) {
      console.error('No authenticated user');
      return of(false);
    }

    const userDocRef = doc(this.firestore, `users/${user.uid}`);

    return from(updateDoc(userDocRef, {
      savedArticles: arrayRemove({ id: articleId })
    }).then(() => true).catch(error => {
      console.error('Error removing article from profile', error);
      return false;
    }));
  }

  // Get current user's saved articles
  getSavedArticles(): Observable<NewsArticle[]> {
    const user = this.auth.currentUser;
    if (!user) {
      console.error('No authenticated user');
      return of([]);
    }

    const userDocRef = doc(this.firestore, `users/${user.uid}`);

    return from(getDoc(userDocRef).then(docSnap => {
      if (docSnap.exists()) {
        return docSnap.data()['savedArticles'] || [];
      }
      return [];
    }).catch(error => {
      console.error('Error fetching saved articles', error);
      return [];
    }));
  }
}
