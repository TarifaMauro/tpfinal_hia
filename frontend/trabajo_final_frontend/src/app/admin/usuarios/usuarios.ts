import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule } from '@angular/forms';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { LoginService } from '../../services/login';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { MisValidadores } from '../../validadores/mis-validadores';

@Component({
  selector: 'app-usuarios',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class Usuarios implements OnInit {
  formUsuario!: FormGroup; //Formulario para editar usuario
  usuarios: any[] = []; //Array para almacenar los usuarios
  usuario: any; //Usuario para mostrar en el modal
  usuarioOriginal: any; //Usuario original para restaurar en caso de cancelar edición
  username: string = ''; //Variable enlazada al form para búsqueda por username
  ultimoUsernameBuscado: string = ''; //Último username buscado para evitar llamadas innecesarias
  msgError: string = ''; //Mensaje de error para mostrar en caso de problemas
  filtrado: boolean = false; //Indica si se está filtrando por username
  editandoUsuario: boolean = false; //Indica si se está editando un usuario

  // Nuevas propiedades para paginación
  page: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  totalItems: number = 0;
  pages: number[] = [];
  constructor(
    private router: Router,
    private loginService: LoginService,
    private toastr: ToastrService,
    private fb: FormBuilder
  ) {
    this.formUsuario = this.fb.group(this.obtenerControlesFormulario());
  }

  

  private obtenerControlesFormulario() {
    return {
      nombres: new FormControl<string>('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(3),
          Validators.pattern('^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$'),
          MisValidadores.validarPrimerLetra,
        ],
      }),
      apellido: new FormControl<string>('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(3),
          Validators.pattern('^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$'),
          MisValidadores.validarPrimerLetra,
        ],
      }),
      username: new FormControl<string>('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(4),
          Validators.pattern('^[a-zA-Z0-9_ ]+$'),
        ],
      }),
      email: new FormControl<string>({ value: '', disabled: true }),
    };
  }

  ngOnInit(): void {
    this.cargarUsuarios();
  }

   cargarUsuarios(page: number = 1) {
    this.page = page;
    const q = (this.username || '').trim();

    this.loginService.obtenerUsuariosPaginados(this.page, this.pageSize, q).subscribe({
      next: (result) => {
        // Respuesta esperada: { items: [...], total: number }
        this.usuarios = result.items || result.data || result.docs || [];
        this.totalItems = result.total ?? result.totalItems ?? result.count ?? this.usuarios.length;
        this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize));
        // Si la página actual quedó fuera de rango después de la consulta, ajusta y recarga
        if (this.page > this.totalPages) {
          this.page = this.totalPages;
          this.cargarUsuarios(this.page);
          return;
        }
        this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
      },
      error: (error) => {
        this.mostrarError(error, 'Error al cargar los usuarios');
      },
    });
  }

  mostrarDetallesUsuario(id: string, paraEditar: boolean = false) {
    this.loginService.getUserById(id).subscribe({
      next: (result) => {
        this.usuario = result.data;
        if (paraEditar) {
          this.editandoUsuario = true;
          this.usuarioOriginal = { ...this.usuario }; // Clona el usuario para restaurar si se cancela
          // Enlaza los datos del usuario al formulario reactivo
          this.formUsuario.patchValue({
            username: this.usuario.username,
            email: this.usuario.email,
            nombres: this.usuario.nombres,
            apellido: this.usuario.apellido,
          });
        }
      },
      error: (error) => this.mostrarError(error),
    });
  }

  editarUsuario(id: string) {
    this.mostrarDetallesUsuario(id, true);
  }

  guardarEdicionUsuario() {
    this.usuario = {
      ...this.usuario,
      ...this.formUsuario.value, // Actualiza los valores del usuario con el formulario
    };

    this.loginService.updateCount(this.usuario).subscribe({
      next: (result) => {
        this.editandoUsuario = false;
        this.actualizarSessionStorage();
        this.cargarUsuarios();
        this.toastr.success(result.msg);
      },
      error: (error) => {
        this.mostrarError(error, 'Error al actualizar el usuario');
      },
    });
  }

  // Actualiza los datos del usuario en el sessionStorage
  // para que se reflejen en otras partes de la app (cuenta del usuario, etc.)
  actualizarSessionStorage() {
    const { username, nombres, apellido } = this.formUsuario.value;
    sessionStorage.setItem('username', username);
    sessionStorage.setItem('nombres', nombres);
    sessionStorage.setItem('apellido', apellido);
  }

  filtrarUsuarios() {
    const username = this.username?.trim();
    if (!username) {
      this.msgError = 'Debe ingresar un nombre de usuario para buscar';
      return;
    }

    this.msgError = '';
    if (username === this.ultimoUsernameBuscado) {
      this.toastr.info('Acaba de realizar la misma búsqueda');
      return;
    }

    this.ultimoUsernameBuscado = username;
    this.filtrado = true;
    this.cargarUsuarios(1);
  }

  eliminarUsuario(id: string, username: string) {
    const usuarioLogueado = sessionStorage.getItem('username');

    if (usuarioLogueado === username) {
      this.toastr.error('No puedes eliminar tu usuario estando conectado');
      return;
    }

    this.confirmarEliminacion().then((result) => {
      if (result.isConfirmed) {
        this.loginService.deleteUser(id).subscribe({
          next: (result) => {
            this.toastr.info(result.msg);
            this.cargarUsuarios();
          },
          error: (error) => {
            this.mostrarError(error, 'Error al eliminar el usuario');
          },
        });
      }
    });
  }

  private confirmarEliminacion(): Promise<any> {
    return Swal.fire({
      title: '¿Estás seguro?',
      text: '¡Esta acción no se puede deshacer!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Estoy seguro',
      cancelButtonText: 'Cancelar',
      customClass: {
        confirmButton: 'btn btn-warning',
        cancelButton: 'btn btn-danger',
      },
    });
  }

  borrarFiltro() {
    this.msgError = '';
    this.username = '';
    this.filtrado = false;
    this.cargarUsuarios();
  }

  crearUsuario() {
    this.router.navigate(['/form'], {
      queryParams: { returnUrl: this.router.url, accion: 'register' },
    });
  }

  cerrarModal() {
    this.editandoUsuario = false;
    this.usuario = null;
    this.usuarioOriginal = null;
  }

  private mostrarError(
    error: any,
    fallbackMessage: string = 'Error procesando la operación'
  ) {
    const errorMessage = error?.error?.msg || fallbackMessage;
    this.toastr.error(errorMessage);
  }
   // Controles de paginación
  goToPage(p: number) {
    if (p < 1 || p > this.totalPages) return;
    this.cargarUsuarios(p);
  }

  prevPage() {
    if (this.page > 1) this.cargarUsuarios(this.page - 1);
  }

  nextPage() {
    if (this.page < this.totalPages) this.cargarUsuarios(this.page + 1);
  }

  cambiarPageSize(size: number) {
    this.pageSize = size;
    this.cargarUsuarios(1);
  }
}
