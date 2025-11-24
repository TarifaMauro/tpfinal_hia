import { Component, OnInit } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Accordion, AccordionItemDirective } from '../../shared/accordion/accordion';
import * as bootstrap from 'bootstrap';
import { ProductoService, Producto, Categoria } from '../../../services/producto';
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

  allProducts: Producto[] = [];
  products: Producto[] = [];

  // filtros
  colors: string[] = [];
  categories: string[] = [];
  selectedColors: { [color: string]: boolean } = {};
  priceRange = { min: 0, max: 0 };
  selectedCategory = '';
  searchTerm = '';

  // paginado visual
  currentPage = 1;
  pageSize = 24;
  totalProducts = 0;
  totalPages = 0;
  pages: number[] = [];
  maxPagesToShow = 7;

  // cursor
  cursor: number | null = null;

  hoveredIndex: number | null = null;

  constructor(
    private productoService: ProductoService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.resetFilters();

      if (params['categoryName']) {
        this.selectedCategory = params['categoryName'];
      }

      this.loadProducts();
    });
  }

  trackByProduct(product: Producto) {
    return product._id;
  }
  openFilterModal() {
    const modal = new bootstrap.Modal(document.getElementById('filterModal')!);
    modal.show();
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
  resetFilters() {
    this.selectedColors = {};
    this.priceRange = { min: 0, max: 0 };
    this.searchTerm = '';
    this.cursor = null;
    this.currentPage = 1;
  }

  loadProducts(page: number = 1) {
    this.currentPage = page;

    // reset cursor solo si vamos a la primera página
    if (page === 1) {
      this.cursor = null;
    }

    this.loadPageByCursor(page);
  }

  private loadPageByCursor(targetPage: number) {
    let jumps = targetPage - 1;

    const fetchNext = () => {
      this.productoService
        .obtenerProductosCursor(this.cursor, this.pageSize, this.searchTerm)
        .subscribe(resp => {
          this.cursor = resp.nextCursor ?? null;

          if (jumps > 0) {
            jumps--;
            fetchNext();
            return;
          }

          // página objetivo lograda
          this.products = resp.items;
          this.allProducts = resp.items;
          this.totalProducts = resp.total;
          this.totalPages = Math.ceil(resp.total / this.pageSize);

          this.generatePagesArray();
          this.colors = this.getAllColors();
          this.categories = this.getAllCategories();
          this.priceRange.max = Math.max(...this.products.map(p => p.precio), 0);
        });
    };

    fetchNext();
  }

  onPageChange(page: number) {
    if (page < 1 || page > this.totalPages) return;
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

  // filtros
  getAllColors(): string[] {
    const colorSet = new Set<string>();
    this.allProducts.forEach(p => colorSet.add(p.color));
    return Array.from(colorSet);
  }

  getAllCategories(): string[] {
    const categorySet = new Set<string>();
    this.allProducts.forEach(p => {
      if (p.categoria && typeof p.categoria === 'object' && (p.categoria as Categoria).nombre) {
        categorySet.add((p.categoria as Categoria).nombre);
      }
    });
    return Array.from(categorySet);
  }

  onFilterChange() {
    this.cursor = null; // reinicia el recorrido
    this.loadProducts(1);
  }

  setHover(index: number, isHover: boolean) {
    this.hoveredIndex = isHover ? index : -1;
  }

  goToProductDetail(productId: string) {
    if (productId) this.router.navigate(['/product-detail', productId]);
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
