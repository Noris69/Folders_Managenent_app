import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NavbarComponent } from "../../navbar/navbar.component";

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NavbarComponent]
})
export class DashboardComponent implements OnInit {
  users: User[] = [];
  userForm: FormGroup;
  editingUser: User | null = null;
  error: string = '';

  constructor(private fb: FormBuilder) {
    this.userForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required],
      password: ['', Validators.minLength(6)]  // optionnel pour modification
    });
  }

  ngOnInit(): void {
    // Initialiser avec des utilisateurs fictifs (ou récupérer via API)
    this.users = [
      { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' },
      { id: 2, name: 'Bob', email: 'bob@example.com', role: 'user' }
    ];
  }

  onSubmit() {
    if (this.userForm.invalid) return;

    const data = this.userForm.value;

    if (this.editingUser) {
      // Modifier utilisateur
      const index = this.users.findIndex(u => u.id === this.editingUser!.id);
      if (index !== -1) {
        this.users[index] = { ...this.editingUser, ...data };
      }
      this.editingUser = null;
    } else {
      // Ajouter nouvel utilisateur
      const newUser: User = {
        id: Date.now(), // id fictif
        name: data.name,
        email: data.email,
        role: data.role
      };
      this.users.push(newUser);
    }

    this.userForm.reset();
  }

  editUser(user: User) {
    this.editingUser = user;
    this.userForm.patchValue(user);
  }

  cancelEdit() {
    this.editingUser = null;
    this.userForm.reset();
  }

  deleteUser(user: User) {
    this.users = this.users.filter(u => u.id !== user.id);
    if (this.editingUser?.id === user.id) {
      this.cancelEdit();
    }
  }
}
