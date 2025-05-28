import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  access: string;          // JWT access token
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.api}/auth`;

  /** POST /api/auth/register */
  register(dto: RegisterDto): Observable<void> {
    return this.http.post<AuthResponse>(`${this.base}/register`, dto).pipe(
      map(res => {
        // On stocke l'access token pour les futurs appels protégés
        localStorage.setItem('access', res.access);
      }),
      catchError(this.handle)
    );
  }

  private handle(err: HttpErrorResponse) {
    const msg =
      err.error?.message || err.statusText || 'Erreur de communication';
    return throwError(() => msg);
  }
}
