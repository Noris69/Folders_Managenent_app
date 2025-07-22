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

interface RegisterResponse {
  access: string;
  qr: string;
  mfaSecret: string;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent {
  registerForm: FormGroup;
  loading = false;
  error = '';

  // Toggle affichage du mot de passe
  showPassword = false;

  // Pour le QR et la clé MFA
  qrCode: string | null = null;
  mfaSecret: string | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  /** Bascule l’affichage du champ password */
  toggleShowPassword(): void {
    this.showPassword = !this.showPassword;
  }

  /** Génère un mot de passe aléatoire robuste */
  generatePassword(): void {
    const pwd = this.createRandomPassword(12);
    this.registerForm.get('password')?.setValue(pwd);
  }

  private createRandomPassword(length: number): string {
    const charset =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}|;:,.<>?';
    let ret = '';
    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array);
    array.forEach((num) => (ret += charset[num % charset.length]));
    return ret;
  }

  onSubmit(): void {
    if (this.registerForm.invalid || this.loading) return;

    this.loading = true;
    this.error = '';
    this.qrCode = null;
    this.mfaSecret = null;

    this.http
      .post<RegisterResponse>(
        `${environment.api}/auth/register`,
        this.registerForm.value
      )
      .subscribe({
        next: ({ access, qr, mfaSecret }) => {
          localStorage.setItem('access', access);
          this.qrCode = qr;
          this.mfaSecret = mfaSecret;
          this.loading = false;
        },
        error: (err: HttpErrorResponse) => {
          this.error =
            err.error?.message || err.statusText || 'Erreur de communication';
          this.loading = false;
        },
      });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
