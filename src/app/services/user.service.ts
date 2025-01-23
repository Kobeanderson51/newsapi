import { Injectable } from '@angular/core';
import { 
  Auth, 
  signOut, 
  onAuthStateChanged
} from '@angular/fire/auth';
import { Firestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove, setDoc } from '@angular/fire/firestore';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { NewsArticle } from './news.service';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private auth: Auth,
    private firestore: Firestore
  ) {
    // Listen for authentication state changes
    onAuthStateChanged(this.auth, (firebaseUser) => {
      if (firebaseUser) {
        this.updateUserProfile(firebaseUser);
      } else {
        this.currentUserSubject.next(null);
      }
    });
  }

  // Update user profile
  private updateUserProfile(firebaseUser: any | null): User | null {
    if (firebaseUser) {
      const user: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL
      };
      this.currentUserSubject.next(user);
      return user;
    }
    return null;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  // Sign out method
  signOut(): Observable<void> {
    return new Observable((observer) => {
      signOut(this.auth)
        .then(() => {
          this.currentUserSubject.next(null);
          observer.next();
          observer.complete();
        })
        .catch((error) => {
          console.error('Sign out error:', error);
          observer.error(error);
        });
    });
  }

  // Save user to Firestore
  private async saveUserToFirestore(firebaseUser: any) {
    if (!firebaseUser.uid) return;

    const userRef = doc(this.firestore, 'users', firebaseUser.uid);
    
    try {
      await setDoc(userRef, {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        createdAt: new Date()
      }, { merge: true });
    } catch (error) {
      console.error('Error saving user to Firestore:', error);
    }
  }

  // Add an article to user's profile
  addArticleToProfile(article: NewsArticle): Observable<boolean> {
    const user = this.getCurrentUser();
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
    const user = this.getCurrentUser();
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
    const user = this.getCurrentUser();
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

  // Get current user synchronously
  getCurrentUser(): User | null {
    return this.currentUserSubject.getValue();
  }
}
