import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  HttpClient,
  HttpClientModule,
  HttpErrorResponse,
} from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';

interface LoginResponse {
  access: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, HttpClientModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  error = '';
  loginStep: 1 | 2 = 1; // 1 = credentials, 2 = TOTP

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      totp: ['', [Validators.pattern(/^\d{6}$/)]],
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.loading) return;
    this.loading = true;
    this.error = '';

    const payload: any = {
      email: this.loginForm.value.email,
      password: this.loginForm.value.password,
    };
    // seulement ajouter totp si on est à l'étape 2
    if (this.loginStep === 2) {
      payload.totp = this.loginForm.value.totp;
    }

    this.http.post<LoginResponse>(
      `${environment.api}/auth/login`,
      payload
    ).subscribe({
      next: ({ access }) => {
        localStorage.setItem('access', access);
        this.router.navigate(['/documents']);
      },
      error: (err: HttpErrorResponse) => {
        const msg = err.error?.message || err.statusText || 'Erreur réseau';
        // si on est en step1 et que c'est "Code MFA invalide", on passe à step2
        if (this.loginStep === 1 && msg === 'Code MFA invalide') {
          this.loginStep = 2;
          this.loading = false;
          this.error = '';
          return;
        }
        this.error = msg;
        this.loading = false;
      },
    });
  }
}
