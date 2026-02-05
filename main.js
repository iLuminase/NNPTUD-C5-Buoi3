// API URL
const API_URL = "https://api.escuelajs.co/api/v1/products";
const CATEGORIES_API_URL = "https://api.escuelajs.co/api/v1/categories";

// Global state
let allProducts = [];
let filteredProducts = [];
let allCategories = [];
let currentPage = 1;
let itemsPerPage = 10;
let sortColumn = null;
let sortDirection = "asc";
let currentTooltip = null;

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML.replace(/'/g, "&#39;");
}

// Show tooltip at cursor position
function showTooltip(event, description) {
  hideTooltip(); // Hide any existing tooltip

  const tooltip = document.createElement("div");
  tooltip.className = "description-tooltip";
  tooltip.style.opacity = "0";
  tooltip.style.visibility = "hidden";
  tooltip.innerHTML = description;
  document.body.appendChild(tooltip);

  currentTooltip = tooltip;

  // Calculate position
  const rect = event.target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();

  let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
  let top = rect.top - tooltipRect.height - 15;

  // Adjust if tooltip goes off screen
  if (left < 10) left = 10;
  if (left + tooltipRect.width > window.innerWidth - 10) {
    left = window.innerWidth - tooltipRect.width - 10;
  }

  // If tooltip goes above viewport, show below
  if (top < 10) {
    top = rect.bottom + 15;
    tooltip.querySelector("::after") &&
      (tooltip.style.transform = "scaleY(-1)");
  }

  tooltip.style.left = left + "px";
  tooltip.style.top = top + "px";

  // Show tooltip with animation
  requestAnimationFrame(() => {
    tooltip.style.opacity = "1";
    tooltip.style.visibility = "visible";
  });
}

// Hide tooltip
function hideTooltip() {
  if (currentTooltip) {
    currentTooltip.remove();
    currentTooltip = null;
  }
}

// Fetch products from API
async function fetchProducts() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const products = await response.json();
    return products;
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

// Fetch categories from API
async function fetchCategories() {
  try {
    const response = await fetch(CATEGORIES_API_URL);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const categories = await response.json();
    return categories;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

// Search products by title
function searchProducts(searchTerm) {
  if (!searchTerm.trim()) {
    filteredProducts = [...allProducts];
  } else {
    const term = searchTerm.toLowerCase();
    filteredProducts = allProducts.filter((product) =>
      product.title.toLowerCase().includes(term),
    );
  }
  currentPage = 1;
  renderTable();
}

// Sort products
function sortProducts(column) {
  if (sortColumn === column) {
    // Toggle direction if same column
    sortDirection = sortDirection === "asc" ? "desc" : "asc";
  } else {
    // New column, default to ascending
    sortColumn = column;
    sortDirection = "asc";
  }

  filteredProducts.sort((a, b) => {
    let valueA = a[column];
    let valueB = b[column];

    // Handle string comparison (title)
    if (typeof valueA === "string") {
      valueA = valueA.toLowerCase();
      valueB = valueB.toLowerCase();
    }

    if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
    if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  updateSortIcons();
  renderTable();
}

// Update sort icons
function updateSortIcons() {
  document.querySelectorAll(".sortable").forEach((header) => {
    const column = header.dataset.column;
    const icon = header.querySelector(".sort-icon");

    if (column === sortColumn) {
      header.classList.add("active");
      icon.className =
        sortDirection === "asc"
          ? "bi bi-arrow-up sort-icon"
          : "bi bi-arrow-down sort-icon";
    } else {
      header.classList.remove("active");
      icon.className = "bi bi-arrow-down-up sort-icon";
    }
  });
}

// Create table row HTML
function createTableRow(product) {
  const { id, title, price, description, category, images } = product;

  // Get the first image or use a placeholder
  const imageUrl =
    images && images.length > 0 ? images[0] : "https://placehold.co/600x400";

  // Truncate description for preview
  const descPreview =
    description.length > 50
      ? description.substring(0, 50) + "..."
      : description;

  return `
    <tr>
      <td class="text-center"><strong>${id}</strong></td>
      <td>${title}</td>
      <td class="text-end"><strong class="text-success">$${price}</strong></td>
      <td>
        <span class="badge bg-info">${category.name}</span>
      </td>
      <td class="text-center">
        <img 
          src="${imageUrl}" 
          class="product-image-thumb" 
          alt="${title}"
          onerror="this.src='https://placehold.co/600x400'"
          title="Click to view"
        />
      </td>
      <td class="description-cell">
        <div class="description-preview" onmouseenter="showTooltip(event, '${escapeHtml(description)}')" onmouseleave="hideTooltip()">${descPreview}</div>
      </td>
      <td class="text-center">
        <button class="btn btn-sm btn-primary" onclick="viewProductDetail(${id})" title="Xem chi tiết">
          <i class="bi bi-eye"></i>
        </button>
      </td>
    </tr>
  `;
}

// Render table
function renderTable() {
  const tbody = document.getElementById("products-tbody");
  const totalCount = document.getElementById("total-count");

  // Update total count
  totalCount.textContent = filteredProducts.length;

  // Calculate pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Render rows
  if (paginatedProducts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4">
          <div class="text-muted">
            <i class="bi bi-inbox" style="font-size: 2rem;"></i>
            <p class="mt-2">Không tìm thấy sản phẩm nào</p>
          </div>
        </td>
      </tr>
    `;
  } else {
    tbody.innerHTML = paginatedProducts
      .map((product) => createTableRow(product))
      .join("");
  }

  renderPagination();
}

// Render pagination
function renderPagination() {
  const pagination = document.getElementById("pagination");
  const paginationContainer = document.getElementById("pagination-container");
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  if (totalPages <= 1) {
    paginationContainer.style.display = "none";
    return;
  }

  paginationContainer.style.display = "block";

  let html = "";

  // Previous button
  html += `
    <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
      <a class="page-link" href="#" data-page="${currentPage - 1}">
        <i class="bi bi-chevron-left"></i>
      </a>
    </li>
  `;

  // Page numbers
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  if (startPage > 1) {
    html += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
    if (startPage > 2) {
      html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `
      <li class="page-item ${i === currentPage ? "active" : ""}">
        <a class="page-link" href="#" data-page="${i}">${i}</a>
      </li>
    `;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
    html += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
  }

  // Next button
  html += `
    <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
      <a class="page-link" href="#" data-page="${currentPage + 1}">
        <i class="bi bi-chevron-right"></i>
      </a>
    </li>
  `;

  pagination.innerHTML = html;

  // Add event listeners to pagination links
  pagination.querySelectorAll("a.page-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const page = parseInt(e.currentTarget.dataset.page);
      if (page && page !== currentPage && page >= 1 && page <= totalPages) {
        currentPage = page;
        renderTable();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  });
}

// Export to CSV
function exportToCSV() {
  // Get current view data (filtered and sorted)
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentViewProducts = filteredProducts.slice(startIndex, endIndex);

  if (currentViewProducts.length === 0) {
    alert("Không có dữ liệu để export!");
    return;
  }

  // CSV headers
  const headers = ["ID", "Title", "Price", "Category", "Description", "Images"];

  // Convert data to CSV rows
  const csvRows = [headers.join(",")];

  currentViewProducts.forEach((product) => {
    // Escape and clean data for CSV
    const cleanText = (text) => {
      if (!text) return "";
      // Replace double quotes with two double quotes and wrap in quotes
      return `"${String(text).replace(/"/g, '""').replace(/\n/g, " ").replace(/\r/g, "")}"`;
    };

    const row = [
      product.id,
      cleanText(product.title),
      product.price,
      cleanText(product.category.name),
      cleanText(product.description),
      cleanText(product.images.join(" | ")), // Use | to separate multiple images
    ];
    csvRows.push(row.join(","));
  });

  // Create CSV content with proper line endings
  const csvContent = csvRows.join("\r\n");

  // Create blob and download with BOM for Excel compatibility
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `products_page${currentPage}_${new Date().getTime()}.csv`,
  );
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// View product detail
function viewProductDetail(productId) {
  const product = allProducts.find((p) => p.id === productId);
  if (!product) {
    alert("Không tìm thấy sản phẩm!");
    return;
  }

  // Fill form with product data
  document.getElementById("edit-product-id").value = product.id;
  document.getElementById("edit-title").value = product.title;
  document.getElementById("edit-price").value = product.price;
  document.getElementById("edit-description").value = product.description;

  // Populate and select category
  populateCategorySelect("edit-category-id", product.category.id);

  document.getElementById("edit-images").value = product.images.join("\n");

  // Show image previews
  updateImagePreviews("edit");

  // Show modal
  const modal = new bootstrap.Modal(
    document.getElementById("modalProductDetail"),
  );
  modal.show();
}

// Populate category select dropdown
function populateCategorySelect(selectId, selectedId = null) {
  const select = document.getElementById(selectId);
  select.innerHTML = '<option value="">-- Chọn danh mục --</option>';

  allCategories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = `${category.name} (ID: ${category.id})`;
    if (selectedId && category.id == selectedId) {
      option.selected = true;
    }
    select.appendChild(option);
  });
}

// Update image previews
function updateImagePreviews(type) {
  const textareaId = type === "edit" ? "edit-images" : "create-images";
  const previewListId =
    type === "edit" ? "image-preview-list" : "create-image-preview-list";

  const textarea = document.getElementById(textareaId);
  const previewList = document.getElementById(previewListId);

  const imageUrls = textarea.value.split("\n").filter((url) => url.trim());

  if (imageUrls.length === 0) {
    previewList.innerHTML = '<p class="text-muted">Chưa có hình ảnh</p>';
    return;
  }

  previewList.innerHTML = imageUrls
    .map(
      (url) => `
    <img src="${url.trim()}" class="image-input-preview" onerror="this.src='https://placehold.co/150x150?text=Error'" />
  `,
    )
    .join("");
}

// Update product (PUT)
async function updateProduct() {
  const productId = document.getElementById("edit-product-id").value;
  const title = document.getElementById("edit-title").value.trim();
  const price = parseFloat(document.getElementById("edit-price").value);
  const description = document.getElementById("edit-description").value.trim();
  const categoryId = parseInt(
    document.getElementById("edit-category-id").value,
  );
  const imagesText = document.getElementById("edit-images").value.trim();

  if (!title || !price || !description || !categoryId || isNaN(categoryId)) {
    alert("Vui lòng điền đầy đủ thông tin và chọn danh mục!");
    console.error("Validation failed:", {
      title,
      price,
      description,
      categoryId,
    });
    return;
  }

  const images = imagesText
    .split("\n")
    .filter((url) => url.trim())
    .map((url) => url.trim());

  if (images.length === 0) {
    alert("Cần ít nhất 1 URL hình ảnh!");
    return;
  }

  const updateData = {
    title,
    price,
    description,
    categoryId,
    images,
  };

  try {
    const response = await fetch(`${API_URL}/${productId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      throw new Error(`Update failed with status: ${response.status}`);
    }

    const updatedProduct = await response.json();

    // Close modal
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("modalProductDetail"),
    );
    modal.hide();

    // Show success message
    alert(
      "Cập nhật sản phẩm thành công! Trang sẽ tự động tải lại để cập nhật dữ liệu.",
    );

    // Reload page to fetch fresh data from API
    window.location.reload();
  } catch (error) {
    console.error("Error updating product:", error);
    alert("Lỗi khi cập nhật sản phẩm. Vui lòng thử lại!");
  }
}

// Create new product (POST)
async function createProduct() {
  const title = document.getElementById("create-title").value.trim();
  const price = parseFloat(document.getElementById("create-price").value);
  const description = document
    .getElementById("create-description")
    .value.trim();
  const categoryId = parseInt(
    document.getElementById("create-category-id").value,
  );
  const imagesText = document.getElementById("create-images").value.trim();

  if (!title || !price || !description || !categoryId || !imagesText) {
    alert("Vui lòng điền đầy đủ thông tin bắt buộc!");
    return;
  }

  const images = imagesText
    .split("\n")
    .filter((url) => url.trim())
    .map((url) => url.trim());

  if (images.length === 0) {
    alert("Cần ít nhất 1 URL hình ảnh!");
    return;
  }

  const newProductData = {
    title,
    price,
    description,
    categoryId,
    images,
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newProductData),
    });

    if (!response.ok) {
      throw new Error("Create failed");
    }

    const createdProduct = await response.json();

    // Add to local data
    allProducts.unshift(createdProduct); // Add to beginning
    filteredProducts = [...allProducts];
    currentPage = 1; // Go to first page
    renderTable();

    // Close modal and reset form
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("modalCreateProduct"),
    );
    modal.hide();
    document.getElementById("form-create-product").reset();
    document.getElementById("create-image-preview-list").innerHTML = "";

    alert("Tạo sản phẩm mới thành công!");
  } catch (error) {
    console.error("Error creating product:", error);
    alert("Lỗi khi tạo sản phẩm. Vui lòng thử lại!");
  }
}

// Initialize event listeners
function initializeEventListeners() {
  // Search input
  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", (e) => {
    searchProducts(e.target.value);
  });

  // Items per page
  const itemsPerPageSelect = document.getElementById("items-per-page");
  itemsPerPageSelect.addEventListener("change", (e) => {
    itemsPerPage = parseInt(e.target.value);
    currentPage = 1;
    renderTable();
  });

  // Sort headers
  document.querySelectorAll(".sortable").forEach((header) => {
    header.addEventListener("click", () => {
      const column = header.dataset.column;
      sortProducts(column);
    });
  });

  // Export CSV button
  const btnExportCSV = document.getElementById("btn-export-csv");
  btnExportCSV.addEventListener("click", exportToCSV);

  // Create product button
  const btnCreateProduct = document.getElementById("btn-create-product");
  btnCreateProduct.addEventListener("click", () => {
    // Reset form
    document.getElementById("form-create-product").reset();
    document.getElementById("create-image-preview-list").innerHTML = "";

    // Populate categories
    populateCategorySelect("create-category-id");

    // Show modal
    const modal = new bootstrap.Modal(
      document.getElementById("modalCreateProduct"),
    );
    modal.show();
  });

  // Save edit button
  const btnSaveEdit = document.getElementById("btn-save-edit");
  btnSaveEdit.addEventListener("click", updateProduct);

  // Save create button
  const btnSaveCreate = document.getElementById("btn-save-create");
  btnSaveCreate.addEventListener("click", createProduct);

  // Image preview listeners
  document.getElementById("edit-images").addEventListener("input", () => {
    updateImagePreviews("edit");
  });

  document.getElementById("create-images").addEventListener("input", () => {
    updateImagePreviews("create");
  });
}

// Initialize the dashboard
async function init() {
  const loading = document.getElementById("loading");
  const tableContainer = document.getElementById("table-container");
  const controlsSection = document.getElementById("controls-section");

  // Fetch all products and categories
  allProducts = await fetchProducts();
  allCategories = await fetchCategories();
  filteredProducts = [...allProducts];

  // Hide loading, show table
  loading.style.display = "none";
  tableContainer.style.display = "block";
  controlsSection.style.display = "block";

  // Initialize event listeners
  initializeEventListeners();

  // Render initial table
  renderTable();
}

// Run when DOM is loaded
document.addEventListener("DOMContentLoaded", init);
