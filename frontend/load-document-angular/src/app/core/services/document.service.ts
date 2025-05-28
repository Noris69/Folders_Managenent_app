import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DocumentDto {
  _id: string;
  name: string;
  size: number;
  uploadDate: string;
  author?: string;
  category?: string;
  folder?: string;
  expirationDate?: string;
  tags: string[];
  type: string;
  path: string;
}

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private base = `${environment.api}/docs`;

  constructor(private http: HttpClient) {}

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('access') || '';
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  /** GET /api/docs[?folder=<id>] */
  list(folderId?: string): Observable<DocumentDto[]> {
    let url = this.base;
    if (folderId !== undefined) url += `?folder=${folderId}`;
    return this.http.get<DocumentDto[]>(url, { headers: this.authHeaders() });
  }

  /** POST /api/docs/upload */
  upload(
    files: FileList,
    metadata: {
      author: string;
      category: string;
      folder: string;
      expirationDate: string | null;
      tags: string[];
    }
  ): Observable<DocumentDto[]> {
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('files', f));
    fd.append('author', metadata.author || '');
    fd.append('category', metadata.category || '');
    fd.append('folder', metadata.folder || '');
    if (metadata.expirationDate) {
      fd.append('expirationDate', metadata.expirationDate);
    }
    fd.append('tags', JSON.stringify(metadata.tags));
    return this.http.post<DocumentDto[]>(`${this.base}/upload`, fd, {
      headers: this.authHeaders(),
    });
  }

  /** PUT /api/docs/:id */
  update(
    id: string,
    metadata: {
      author: string;
      category: string;
      folder: string;
      expirationDate: string | null;
      tags: string[];
    }
  ): Observable<DocumentDto> {
    return this.http.put<DocumentDto>(`${this.base}/${id}`, metadata, {
      headers: this.authHeaders(),
    });
  }

  /** POST /api/docs/:id/share */
  share(id: string, email: string): Observable<void> {
    return this.http.post<void>(
      `${this.base}/${id}/share`,
      { email },
      { headers: this.authHeaders() }
    );
  }

  /** GET /api/docs/:id/download */
  download(id: string): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/download`, {
      headers: this.authHeaders(),
      responseType: 'blob',
    });
  }
}
