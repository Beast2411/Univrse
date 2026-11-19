const API_BASE_URL = "http://localhost:5000/api/marketplace";
const DEFAULT_IMAGE = "images/bookss.jpg";

// DOM Elements
const grid = document.querySelector(".product-grid");
const productCount = document.querySelector("#product-count");
const statusBanner = document.querySelector("#status-banner");
const searchInput = document.querySelector(".marketplace-search");
const clearSearchBtn = document.querySelector("#clear-search");
const categoryChips = document.querySelectorAll(".category-chip");
const priceSortSelect = document.querySelector("#price-sort");
const statusFilterSelect = document.querySelector("#status-filter");
const resetFiltersBtn = document.querySelector("#reset-filters");

// Add/Edit Modal Elements
const openSellBtn = document.querySelector("#open-sell-btn");
const sellContainer = document.querySelector("#sell-form-container");
const sellModalTitle = document.querySelector("#sell-modal-title");
const sellModalSubtitle = document.querySelector("#sell-modal-subtitle");
const sellForm = document.querySelector("#sell-form");
const productIdInput = document.querySelector("#product-id");
const submitProductBtn = document.querySelector("#submit-product-btn");
const sellMessage = document.querySelector("#sell-message");
const cancelSellBtn = document.querySelector("#cancel-sell");
const closeSellBtn = document.querySelector("#close-sell");

// Detail Modal Elements
const detailOverlay = document.querySelector("#detail-modal-overlay");
const detailModalTitle = document.querySelector("#detail-modal-title");
const detailModalCategory = document.querySelector("#detail-modal-category");
const detailModalBody = document.querySelector("#detail-modal-body");
const closeDetailBtn = document.querySelector("#close-detail");

// Application State
let products = [];
let selectedCategory = "All";
let selectedStatus = "All";
let sortOrder = "default";
let bannerTimeout = null;

// Helper: Extract array safely whether backend returns [...] or { data: [...] } / { products: [...] }
function extractProductList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.products)) return payload.products;
  return null;
}

// Helper: Extract single product safely whether backend returns {...} or { data: {...} } / { product: {...} }
function extractSingleProduct(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (payload._id || payload.title) return payload;
  if (payload.data && typeof payload.data === "object") return payload.data;
  if (payload.product && typeof payload.product === "object") return payload.product;
  return null;
}

// Helper: Global Feedback Banner
function showBanner(message, type = "success") {
  clearTimeout(bannerTimeout);
  statusBanner.textContent = message;
  statusBanner.className = `status-banner ${type}`;
  statusBanner.hidden = false;

  if (type === "success") {
    bannerTimeout = setTimeout(() => {
      statusBanner.hidden = true;
    }, 4500);
  }
}

function hideBanner() {
  clearTimeout(bannerTimeout);
  statusBanner.hidden = true;
}

// Helper: Format INR Currency
function formatINR(value) {
  const num = Number(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number.isFinite(num) && num >= 0 ? num : 0);
}

// 1. GET /api/marketplace - Fetch all products
async function loadProducts() {
  grid.innerHTML = `
    <div class="state-box">
      <h3>Loading marketplace listings...</h3>
      <p>Connecting to Univrse server...</p>
    </div>
  `;
  productCount.textContent = "";

  try {
    const response = await fetch(API_BASE_URL);
    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    const result = await response.json();
    const list = extractProductList(result);

    if (!list) {
      throw new Error("Unexpected response format from backend.");
    }

    products = list;
    renderProducts();
  } catch (error) {
    console.error("Failed to fetch marketplace listings:", error);
    products = [];
    productCount.textContent = "0 listings available";
    grid.innerHTML = `
      <div class="state-box">
        <h3>Unable to load marketplace listings</h3>
        <p>${error.message}. Ensure the common backend is running on http://localhost:5000.</p>
        <button type="button" class="sell-btn" id="retry-load-btn">Retry Connection</button>
      </div>
    `;
    document.querySelector("#retry-load-btn")?.addEventListener("click", loadProducts);
  }
}

// 2. GET /api/marketplace/:id - Fetch single product details
async function viewProductDetails(productId) {
  detailModalTitle.textContent = "Loading details...";
  detailModalCategory.textContent = "";
  detailModalBody.innerHTML = "<p>Fetching latest item details from server...</p>";
  openModal(detailOverlay);

  try {
    const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(productId)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch product (${response.status})`);
    }

    const result = await response.json();
    const item = extractSingleProduct(result);

    if (!item) {
      throw new Error("Product details not found.");
    }

    detailModalTitle.textContent = item.title || "Untitled Product";
    detailModalCategory.textContent = `${item.category || "Other"} • ${item.status || "Available"}`;

    detailModalBody.innerHTML = "";

    const img = document.createElement("img");
    img.src = item.imageUrl?.trim() || DEFAULT_IMAGE;
    img.alt = item.title || "Product image";
    img.onerror = () => {
      img.onerror = null;
      img.src = DEFAULT_IMAGE;
    };

    const priceEl = document.createElement("p");
    priceEl.className = "product-price";
    priceEl.textContent = formatINR(item.price);

    const descEl = document.createElement("p");
    descEl.innerHTML = `<strong>Description:</strong> `;
    descEl.append(document.createTextNode(item.description || "No description provided."));

    const sellerEl = document.createElement("p");
    sellerEl.innerHTML = `<strong>Seller:</strong> `;
    sellerEl.append(document.createTextNode(item.sellerName || "Student"));

    const contactEl = document.createElement("p");
    contactEl.innerHTML = `<strong>Contact:</strong> `;
    contactEl.append(document.createTextNode(item.contact || "Not provided"));

    detailModalBody.append(img, priceEl, descEl, sellerEl, contactEl);
  } catch (error) {
    console.error("Error fetching single product:", error);
    detailModalTitle.textContent = "Error";
    detailModalBody.innerHTML = `<p>Could not load product details: ${error.message}</p>`;
  }
}

// 3. POST /api/marketplace & 4. PUT /api/marketplace/:id
async function handleProductSubmit(event) {
  event.preventDefault();
  sellMessage.textContent = "";

  const formData = new FormData(sellForm);
  const existingId = String(formData.get("id") || "").trim();

  const payload = {
    title: String(formData.get("title") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    category: String(formData.get("category") || "").trim(),
    price: Number(formData.get("price")),
    sellerName: String(formData.get("sellerName") || "").trim(),
    contact: String(formData.get("contact") || "").trim(),
    imageUrl: String(formData.get("imageUrl") || "").trim(),
    status: String(formData.get("status") || "Available").trim()
  };

  if (
    !payload.title ||
    !payload.description ||
    !payload.category ||
    !payload.sellerName ||
    !payload.contact ||
    !Number.isFinite(payload.price) ||
    payload.price < 0
  ) {
    sellMessage.textContent = "Please fill in all required fields with valid values.";
    return;
  }

  const isEdit = Boolean(existingId);
  const url = isEdit ? `${API_BASE_URL}/${encodeURIComponent(existingId)}` : API_BASE_URL;
  const method = isEdit ? "PUT" : "POST";

  submitProductBtn.disabled = true;
  submitProductBtn.textContent = isEdit ? "Saving..." : "Adding...";

  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Request failed with status ${response.status}`);
    }

    closeSellModal();
    showBanner(
      isEdit ? `"${payload.title}" updated successfully.` : `"${payload.title}" added to Marketplace.`,
      "success"
    );
    await loadProducts();
  } catch (error) {
    console.error("Save product error:", error);
    sellMessage.textContent = `Error: ${error.message}`;
  } finally {
    submitProductBtn.disabled = false;
    submitProductBtn.textContent = isEdit ? "Save Changes" : "Add Listing";
  }
}

// 5. PATCH /api/marketplace/:id/status - Toggle Available / Sold
async function toggleProductStatus(product) {
  const currentStatus = product.status || "Available";
  const nextStatus = currentStatus === "Sold" ? "Available" : "Sold";

  try {
    const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(product._id)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Status update failed (${response.status})`);
    }

    showBanner(`"${product.title}" marked as ${nextStatus}.`, "success");
    await loadProducts();
  } catch (error) {
    console.error("Toggle status error:", error);
    showBanner(`Could not update status: ${error.message}`, "error");
  }
}

// 6. DELETE /api/marketplace/:id - Delete product
async function deleteProduct(product) {
  const confirmed = window.confirm(`Delete "${product.title}" permanently?`);
  if (!confirmed) return;

  try {
    const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(product._id)}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Delete failed (${response.status})`);
    }

    showBanner(`"${product.title}" deleted successfully.`, "success");
    await loadProducts();
  } catch (error) {
    console.error("Delete product error:", error);
    showBanner(`Could not delete product: ${error.message}`, "error");
  }
}

// Render Filtered & Sorted Cards
function renderProducts() {
  const query = searchInput.value.trim().toLowerCase();

  const filtered = products.filter(product => {
    const title = String(product.title || "").toLowerCase();
    const category = String(product.category || "Other");
    const status = String(product.status || "Available");

    const matchesSearch = title.includes(query);
    const matchesCategory =
      selectedCategory === "All" ||
      category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesStatus =
      selectedStatus === "All" ||
      status.toLowerCase() === selectedStatus.toLowerCase();

    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (sortOrder === "low-high") {
    filtered.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (sortOrder === "high-low") {
    filtered.sort((a, b) => Number(b.price) - Number(a.price));
  }

  const label = products.length === 1 ? "listing" : "listings";
  productCount.textContent = `Showing ${filtered.length} of ${products.length} ${label}`;
  grid.replaceChildren();

  // Empty states
  if (products.length === 0) {
    grid.innerHTML = `
      <div class="state-box">
        <h3>No items listed yet</h3>
        <p>Be the first student on campus to list an item for sale.</p>
        <button type="button" class="sell-btn" id="empty-sell-btn">+ Sell an item</button>
      </div>
    `;
    document.querySelector("#empty-sell-btn")?.addEventListener("click", () => openAddModal());
    return;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="state-box">
        <h3>No matching items</h3>
        <p>No products matched your current search or filter criteria.</p>
        <button type="button" class="reset-filters-btn" id="empty-reset-btn">Reset Filters</button>
      </div>
    `;
    document.querySelector("#empty-reset-btn")?.addEventListener("click", resetAllFilters);
    return;
  }

  filtered.forEach(product => {
    const isSold = String(product.status).toLowerCase() === "sold";

    const card = document.createElement("article");
    card.className = `card product-card${isSold ? " is-sold" : ""}`;

    // Image + Status Badge
    const imageBox = document.createElement("div");
    imageBox.className = "product-image";

    const image = document.createElement("img");
    image.src = product.imageUrl?.trim() || DEFAULT_IMAGE;
    image.alt = product.title || "Product image";
    image.onerror = () => {
      image.onerror = null;
      image.src = DEFAULT_IMAGE;
    };

    const badge = document.createElement("span");
    badge.className = `status-badge ${isSold ? "sold" : "available"}`;
    badge.textContent = isSold ? "Sold" : "Available";

    imageBox.append(image, badge);

    // Info Section
    const info = document.createElement("div");
    info.className = "product-info";

    const titleEl = document.createElement("h3");
    titleEl.textContent = product.title || "Untitled Product";

    const priceEl = document.createElement("p");
    priceEl.className = "product-price";
    priceEl.textContent = formatINR(product.price);

    const descEl = document.createElement("p");
    descEl.className = "product-description";
    descEl.textContent = product.description || "No description provided.";

    const categoryEl = document.createElement("p");
    categoryEl.className = "product-meta";
    categoryEl.textContent = `Category: ${product.category || "Other"}`;

    const sellerEl = document.createElement("p");
    sellerEl.className = "product-seller";
    sellerEl.textContent = `Seller: ${product.sellerName || "Student"} (${product.contact || "No contact"})`;

    // Card Action Buttons
    const actions = document.createElement("div");
    actions.className = "card-actions";

    const detailsBtn = document.createElement("button");
    detailsBtn.type = "button";
    detailsBtn.className = "contact-btn";
    detailsBtn.textContent = "View Details & Contact";
    detailsBtn.addEventListener("click", () => viewProductDetails(product._id));

    const toggleStatusBtn = document.createElement("button");
    toggleStatusBtn.type = "button";
    toggleStatusBtn.className = "action-btn status-toggle-btn";
    toggleStatusBtn.textContent = isSold ? "Mark Available" : "Mark Sold";
    toggleStatusBtn.addEventListener("click", () => toggleProductStatus(product));

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "action-btn edit-btn";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => openEditModal(product));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "action-btn delete-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteProduct(product));

    actions.append(detailsBtn, toggleStatusBtn, editBtn, deleteBtn);
    info.append(titleEl, priceEl, descEl, categoryEl, sellerEl, actions);
    card.append(imageBox, info);
    grid.appendChild(card);
  });
}

// Modal Management
function openModal(overlay) {
  overlay.classList.add("is-open");
  overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeModal(overlay) {
  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function openAddModal() {
  sellForm.reset();
  productIdInput.value = "";
  sellModalTitle.textContent = "Sell an Item";
  sellModalSubtitle.textContent = "List your item for other students to discover.";
  submitProductBtn.textContent = "Add Listing";
  sellMessage.textContent = "";
  openModal(sellContainer);
}

function openEditModal(product) {
  sellForm.reset();
  productIdInput.value = product._id || "";
  sellForm.elements.title.value = product.title || "";
  sellForm.elements.price.value = product.price ?? "";
  sellForm.elements.category.value = product.category || "Other";
  sellForm.elements.status.value = product.status || "Available";
  sellForm.elements.description.value = product.description || "";
  sellForm.elements.sellerName.value = product.sellerName || "";
  sellForm.elements.contact.value = product.contact || "";
  sellForm.elements.imageUrl.value = product.imageUrl || "";

  sellModalTitle.textContent = "Edit Listing";
  sellModalSubtitle.textContent = "Update product details and save to Marketplace.";
  submitProductBtn.textContent = "Save Changes";
  sellMessage.textContent = "";
  openModal(sellContainer);
}

function closeSellModal() {
  closeModal(sellContainer);
  sellForm.reset();
  productIdInput.value = "";
  sellMessage.textContent = "";
}

function resetAllFilters() {
  searchInput.value = "";
  selectedCategory = "All";
  selectedStatus = "All";
  sortOrder = "default";

  priceSortSelect.value = "default";
  statusFilterSelect.value = "All";

  categoryChips.forEach(chip => {
    chip.classList.toggle("active", chip.dataset.category === "All");
  });

  renderProducts();
}

// Event Listeners
searchInput.addEventListener("input", renderProducts);

clearSearchBtn.addEventListener("click", () => {
  searchInput.value = "";
  renderProducts();
});

categoryChips.forEach(chip => {
  chip.addEventListener("click", () => {
    selectedCategory = chip.dataset.category || "All";
    categoryChips.forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    renderProducts();
  });
});

priceSortSelect.addEventListener("change", () => {
  sortOrder = priceSortSelect.value;
  renderProducts();
});

statusFilterSelect.addEventListener("change", () => {
  selectedStatus = statusFilterSelect.value;
  renderProducts();
});

resetFiltersBtn.addEventListener("click", resetAllFilters);

openSellBtn.addEventListener("click", openAddModal);
cancelSellBtn.addEventListener("click", closeSellModal);
closeSellBtn.addEventListener("click", closeSellModal);
closeDetailBtn.addEventListener("click", () => closeModal(detailOverlay));

sellContainer.addEventListener("click", event => {
  if (event.target === sellContainer) closeSellModal();
});

detailOverlay.addEventListener("click", event => {
  if (event.target === detailOverlay) closeModal(detailOverlay);
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (sellContainer.classList.contains("is-open")) closeSellModal();
    if (detailOverlay.classList.contains("is-open")) closeModal(detailOverlay);
  }
});

sellForm.addEventListener("submit", handleProductSubmit);

document.querySelector("#back-to-top")?.addEventListener("click", () => {
  document.querySelector(".main-content")?.scrollTo({ top: 0, behavior: "smooth" });
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// Initialize Marketplace
hideBanner();
loadProducts();