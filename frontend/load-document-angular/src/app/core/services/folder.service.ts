import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FolderDto {
  _id: string;
  name: string;
  parent?: string;
}

@Injectable({ providedIn: 'root' })
export class FolderService {
  private base = `${environment.api}/folders`;

  constructor(private http: HttpClient) {}

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('access') || '';
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  list(): Observable<FolderDto[]> {
    return this.http.get<FolderDto[]>(this.base, {
      headers: this.authHeaders(),
    });
  }

  create(payload: { name: string; parent?: string }): Observable<FolderDto> {
    return this.http.post<FolderDto>(this.base, payload, {
      headers: this.authHeaders(),
    });
  }
}
