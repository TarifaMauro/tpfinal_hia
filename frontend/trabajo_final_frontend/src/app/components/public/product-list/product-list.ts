import { Component, OnInit } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Accordion, AccordionItemDirective } from '../../shared/accordion/accordion';
import * as bootstrap from 'bootstrap';
import { ProductoService, Producto, Talla, Categoria } from '../../../services/producto';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-product-list',
  imports: [
    FormsModule,
    TitleCasePipe,
    Accordion,
    AccordionItemDirective,
    CommonModule,
  ],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css'
})
export class ProductList implements OnInit {
  // Productos originales y filtrados
  allProducts: Producto[] = [];
  products: Producto[] = [];

  // Filtros
  colors: string[] = [];
  categories: string[] = [];
  selectedColors: { [color: string]: boolean } = {};
  priceRange: { min: number; max: number } = { min: 0, max: 0 };
  selectedCategory: string = '';
  currentPage = 1;
  hoveredIndex: number | null = null;
  totalProducts: number = 0;
  totalPages: number = 0;
  pages: number[] = [];
  pageSize: number = 24;
  maxPagesToShow = 7;
  searchTerm: string = '';

  constructor(
    private productoService: ProductoService,
    private route: ActivatedRoute,
    private router: Router) {
  }

  ngOnInit(): void {
    // Primero escuchamos los parámetros de la ruta (/products/:categoryName)
    this.route.params.subscribe(params => {
      this.resetFilters();

      if (params['categoryName']) {
        this.selectedCategory = params['categoryName'];
      }

      this.loadProducts();
    });

    // También escuchamos los parámetros de consulta para mantener compatibilidad
    this.route.queryParams.subscribe(params => {
      if (params['category'] && !this.selectedCategory) {
        this.selectedCategory = params['category'];
        this.loadProducts();
      }
    });
  }

  // Resetear filtros
  resetFilters() {
    this.selectedColors = {};
    this.selectedCategory = '';
    this.priceRange = { min: 0, max: 0 };
    this.searchTerm = '';
  }

  loadProducts(page: number = 1) {
    this.currentPage = Math.max(1, page);
    const q = (this.searchTerm || '').trim();

    // Si se seleccionó categoría, mantenemos la llamada por categoría (no paginada)
    if (this.selectedCategory) {
      this.productoService.obtenerProductosPorCategoria(this.selectedCategory).subscribe(
        (productos) => {
          this.allProducts = productos || [];
          this.products = [...this.allProducts];
          this.totalProducts = this.products.length;
          this.totalPages = Math.max(1, Math.ceil(this.totalProducts / this.pageSize));
          this.generatePagesArray();
          this.colors = this.getAllColors();
          this.categories = this.getAllCategories();
          this.priceRange.max = Math.max(...this.products.map(p => p.precio), 0);
        },
        (err) => {
          // fallback a cargar todos los productos paginados si falla
          this.loadPagedFallback();
        }
      );
      return;
    }

    // Paginado server-side (mejor para base de datos)
    this.productoService.obtenerProductosPaginados(this.currentPage, this.pageSize, q).subscribe({
      next: (resp) => {
        const items = resp?.items || [];
        const total = resp?.total ?? items.length;
        this.allProducts = items;
        this.products = [...items];
        this.totalProducts = total;
        this.totalPages = Math.max(1, Math.ceil(this.totalProducts / this.pageSize));
        if (this.currentPage > this.totalPages) {
          this.currentPage = this.totalPages;
          // recargar si quedó fuera de rango
          this.loadProducts(this.currentPage);
          return;
        }
        this.generatePagesArray();
        this.colors = this.getAllColors();
        this.categories = this.getAllCategories();
        this.priceRange.max = Math.max(...this.products.map(p => p.precio), 0);
      },
      error: () => {
        // fallback: intentar cargar todos los productos localmente
        this.loadPagedFallback();
      }
    });
  }

  private loadPagedFallback() {
    this.productoService.obtenerProductos().subscribe(
      (productos) => {
        this.allProducts = productos || [];
        this.products = [...this.allProducts];
        this.totalProducts = this.products.length;
        this.totalPages = Math.max(1, Math.ceil(this.totalProducts / this.pageSize));
        this.generatePagesArray();
        this.colors = this.getAllColors();
        this.categories = this.getAllCategories();
        this.priceRange.max = Math.max(...this.products.map(p => p.precio), 0);
      }
    );
  }

  onSortChange(event: any) {
    const value = event.target.value;
    if (value === 'name') {
      this.products.sort((a, b) => a.nombre.localeCompare(b.nombre));
    } else if (value === 'price-low') {
      this.products.sort((a, b) => a.precio - b.precio);
    } else if (value === 'price-high') {
      this.products.sort((a, b) => b.precio - a.precio);
    }
  }

  setHover(index: number, isHover: boolean) {
    this.hoveredIndex = isHover ? index : -1;
  }

  trackByProduct(product: Producto) {
    return product._id;
  }

  getAllColors(): string[] {
    const colorSet = new Set<string>();
    this.allProducts.forEach(p => colorSet.add(p.color));
    return Array.from(colorSet);
  }

  getAllCategories(): string[] {
    const categorySet = new Set<string>();
    this.allProducts.forEach(p => {
      // Verificar si es un objeto Categoria o un string
      if (p.categoria && typeof p.categoria === 'object' && (p.categoria as Categoria).nombre) {
        categorySet.add((p.categoria as Categoria).nombre);
      }
    });
    return Array.from(categorySet);
  }

  onFilterChange() {
    // Usar paginado server-side al filtrar (reiniciar a página 1)
    this.loadProducts(1);
  }

  onPageChange(page: number): void {
    if (page < 1) page = 1;
    if (page > this.totalPages) page = this.totalPages;
    if (page === this.currentPage) return;
    this.loadProducts(page);
  }

  private generatePagesArray() {
    const total = this.totalPages;
    const current = this.currentPage;
    const max = this.maxPagesToShow;
    let start = Math.max(1, current - Math.floor(max / 2));
    let end = start + max - 1;
    if (end > total) {
      end = total;
      start = Math.max(1, end - max + 1);
    }
    this.pages = [];
    for (let p = start; p <= end; p++) this.pages.push(p);
  }

  openFilterModal() {
    const modal = new bootstrap.Modal(document.getElementById('filterModal')!);
    modal.show();
  }

  goToProductDetail(productId: string): void {
    if (productId) {
      this.router.navigate(['/product-detail', productId]);
    }
  }
  getStockTotal(product: Producto): number {
    return product.tallas?.reduce((acc, t) => acc + (t.stock || 0), 0) || 0;
  }

  getCategoriaNombre(product: Producto): string {
    if (!product.categoria) return 'Productos';
    if (typeof product.categoria === 'string') return product.categoria;
    if (typeof product.categoria === 'object' && 'nombre' in product.categoria) {
      return product.categoria.nombre || 'Productos';
    }
    return 'Productos';
  }
  getProductImage(product: any, index: number): string {
    if (this.hoveredIndex === index && product.imagenes?.length > 1) {
      return product.imagenes[1];
    }
    return product.imagenes[0] || 'assets/images/no-image.jpg';
  }
}
