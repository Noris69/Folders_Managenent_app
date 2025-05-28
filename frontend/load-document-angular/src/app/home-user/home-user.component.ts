import { Component, OnInit }           from '@angular/core';
import { CommonModule }                from '@angular/common';
import { FormsModule }                 from '@angular/forms';
import { Router }                      from '@angular/router';
import { HttpClient, HttpHeaders }     from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { NavbarComponent }             from '../navbar/navbar.component';
import { DocumentService, DocumentDto } from '../core/services/document.service';
import { FolderService, FolderDto }     from '../core/services/folder.service';
import { environment }                 from '../../environments/environment';

@Component({
  selector: 'app-home-user',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './home-user.component.html',
  styleUrls: ['./home-user.component.css'],
})
export class HomeUserComponent implements OnInit {
  documents: DocumentDto[] = [];
  folders:   FolderDto[]   = [];

  categories = ['Contrat','Facture','Note','Autre'];
  tagsList   = ['Important','Urgent','À vérifier'];

  isDragging:      boolean     = false;
  currentFolderId: string|null = null;
  selectedDocId:   string|null = null;

  newFolderName = '';
  newDocMetadata = {
    author:         '',
    category:       '',
    folderId:       '',
    expirationDate: null as string|null,
    tags:           [] as string[],
  };

  searchTerm = '';

  // Aperçu
  showPreview = false;
  previewDoc: DocumentDto | null = null;
  previewContentType: 'pdf'|'image'|'office'|null = null;
  previewUrl!: SafeResourceUrl;
  previewOfficeUrl!: SafeResourceUrl;

  constructor(
    private docService:    DocumentService,
    private folderService: FolderService,
    private router:        Router,
    private http:          HttpClient,
    private sanitizer:     DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadFolders();
    this.loadDocuments();
  }

  private loadFolders(): void {
    this.folderService.list().subscribe({
      next: f => this.folders = f,
      error: e => console.error('Erreur listing folders', e),
    });
  }

  private loadDocuments(): void {
    this.docService.list(this.currentFolderId ?? undefined).subscribe({
      next: docs => this.documents = docs,
      error: e    => console.error('Erreur listing docs', e),
    });
  }

  changeFolder(folderId: string|null): void {
    this.currentFolderId = folderId;
    this.selectedDocId   = null;
    this.resetMetadata();
    this.loadDocuments();
  }

  createFolder(): void {
    const name = this.newFolderName.trim();
    if (!name) return;
    this.folderService.create({ name }).subscribe({
      next: () => {
        this.newFolderName = '';
        this.loadFolders();
      },
      error: e => console.error('Erreur création dossier', e),
    });
  }

  onFileSelected(evt: Event): void {
    const inp = evt.target as HTMLInputElement;
    if (inp.files) {
      this.uploadFiles(inp.files);
      inp.value = '';
    }
  }

  onDragOver(evt: DragEvent): void {
    evt.preventDefault();
    this.isDragging = true;
  }
  onDragLeave(evt: DragEvent): void {
    evt.preventDefault();
    this.isDragging = false;
  }
  onDrop(evt: DragEvent): void {
    evt.preventDefault();
    this.isDragging = false;
    if (evt.dataTransfer?.files) this.uploadFiles(evt.dataTransfer.files);
  }

  private uploadFiles(files: FileList): void {
    this.docService.upload(files, {
      author:         this.newDocMetadata.author,
      category:       this.newDocMetadata.category,
      folder:         this.newDocMetadata.folderId,
      expirationDate: this.newDocMetadata.expirationDate,
      tags:           this.newDocMetadata.tags,
    }).subscribe({
      next: created => {
        this.documents.unshift(...created);
        this.resetMetadata();
      },
      error: e => console.error('Erreur upload', e),
    });
  }

  selectDoc(doc: DocumentDto): void {
    this.selectedDocId = doc._id;
    this.newDocMetadata = {
      author:         doc.author || '',
      category:       doc.category || '',
      folderId:       doc.folder || '',
      expirationDate: doc.expirationDate
        ? doc.expirationDate.split('T')[0]
        : null,
      tags:           [...doc.tags],
    };
  }

  cancelEdit(): void {
    this.selectedDocId = null;
    this.resetMetadata();
  }

  saveChanges(): void {
    if (!this.selectedDocId) return;
    this.docService.update(this.selectedDocId, {
      author:         this.newDocMetadata.author,
      category:       this.newDocMetadata.category,
      folder:         this.newDocMetadata.folderId,
      expirationDate: this.newDocMetadata.expirationDate,
      tags:           this.newDocMetadata.tags,
    }).subscribe({
      next: upd => {
        const i = this.documents.findIndex(d => d._id === upd._id);
        if (i > -1) this.documents[i] = upd;
        this.cancelEdit();
      },
      error: e => console.error('Erreur update', e),
    });
  }

  toggleTag(tag: string): void {
    const i = this.newDocMetadata.tags.indexOf(tag);
    if (i > -1) this.newDocMetadata.tags.splice(i,1);
    else        this.newDocMetadata.tags.push(tag);
  }

  shareDoc(doc: DocumentDto): void {
    const email = window.prompt('Email du destinataire :');
    if (!email) return;
    this.docService.share(doc._id, email).subscribe({
      next: () => alert(`Partagé avec ${email}`),
      error: err => alert(err.error?.message || 'Erreur partage'),
    });
  }

  previewDocInline(doc: DocumentDto): void {
    this.previewDoc = doc;
    // ← on construit l’URL directe vers /uploads
    const fileUrl = `${environment.baseUrl}${doc.path}`;
    if (doc.type === 'application/pdf' || /\.pdf$/i.test(doc.name)) {
      this.previewContentType = 'pdf';
      this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(fileUrl);
    }
    else if (
      doc.type.startsWith('image/') ||
      /\.(png|jpe?g|gif)$/i.test(doc.name)
    ) {
      this.previewContentType = 'image';
      this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(fileUrl);
    }
    else {
      this.previewContentType = 'office';
      const officeUrl =
        `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
      this.previewOfficeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(officeUrl);
    }
    this.showPreview = true;
  }

  closePreview(): void {
    this.showPreview = false;
    this.previewDoc  = null;
  }

  logout(): void {
    const token = localStorage.getItem('access') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    this.http.post(`${environment.api}/auth/logout`, {}, {
      headers, withCredentials: true
    }).subscribe({
      next: () => {
        localStorage.removeItem('access');
        this.router.navigate(['/login']);
      },
      error: () => {
        localStorage.removeItem('access');
        this.router.navigate(['/login']);
      }
    });
  }

  download(doc: DocumentDto): void {
    this.docService.download(doc._id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href    = url;
        a.download = doc.name;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: e => console.error('Erreur download', e),
    });
  }

  formatSize(b: number): string {
    if (b < 1024)       return `${b} B`;
    if (b < 1024*1024)  return `${(b/1024).toFixed(1)} KB`;
    return `${(b/(1024*1024)).toFixed(1)} MB`;
  }

  getFolderName(id: string|null): string {
    if (!id) return '-';
    const f = this.folders.find(x => x._id === id);
    return f ? f.name : '-';
  }

  get filteredDocuments(): DocumentDto[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.documents;
    return this.documents.filter(doc => {
      if (doc.name.toLowerCase().includes(term)) return true;
      if (doc.author?.toLowerCase().includes(term)) return true;
      if (doc.category?.toLowerCase().includes(term)) return true;
      if (
        this.getFolderName(doc.folder||null)
          .toLowerCase()
          .includes(term)
      )
        return true;
      if (doc.tags.some(t => t.toLowerCase().includes(term))) return true;
      return false;
    });
  }

  private resetMetadata(): void {
    this.newDocMetadata = {
      author:         '',
      category:       '',
      folderId:       '',
      expirationDate: null,
      tags:           [],
    };
  }
}
