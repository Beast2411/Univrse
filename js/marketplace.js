const clearSearch = document.querySelector("#clear-search");
const grid = document.querySelector(".product-grid");
const productCount = document.querySelector("#product-count");
const search = document.querySelector(".marketplace-search");
const categories = document.querySelectorAll(".category-chip");
const priceSort = document.querySelector("#price-sort");
const conditionFilter = document.querySelector("#condition-filter");
const resetFilters = document.querySelector("#reset-filters");
let selectedCondition = "All";
const sellButton = document.querySelector(".sell-btn");
const sellContainer = document.querySelector("#sell-form-container");
const sellForm = document.querySelector("#sell-form");
const sellMessage = document.querySelector("#sell-message");
const cancelSell = document.querySelector("#cancel-sell");

let products = [];
let selectedCategory = "All";
let sortOrder = "default";

async function loadProducts() {
  try { 
    grid.innerHTML = '<p class="loading-message">Loading products...</p>';
    const response = await fetch("data/products.json");

    if (!response.ok) {
      throw new Error("Could not load product data.");
    }

    products = await response.json();

    if (!Array.isArray(products)) {
      throw new Error("Product data must be an array.");
    }

    renderProducts();
  } catch (error) {
    console.error(error);
   grid.replaceChildren();

const errorMessage = document.createElement("p");
errorMessage.textContent =
  "Unable to load marketplace products. Please refresh the page and try again.";
grid.appendChild(errorMessage);
  }
}

function renderProducts() {
  const query = search.value.trim().toLowerCase();

  const filtered = products.filter(product => {
    const name = String(product.name || "").toLowerCase();
    const category = String(product.category || "").toLowerCase();

   const location = String(product.location || "").toLowerCase();
const seller = String(product.seller || "").toLowerCase();

const matchesSearch =
  name.includes(query) ||
  category.includes(query) ||
  location.includes(query) ||
  seller.includes(query);
    const matchesCategory =
      selectedCategory === "All" ||
      category === selectedCategory.toLowerCase();

    const matchesCondition =
  selectedCondition === "All" ||
  String(product.condition || "").toLowerCase() ===
    selectedCondition.toLowerCase();

return matchesSearch && matchesCategory && matchesCondition;
  });

  if (sortOrder === "low-high") {
  filtered.sort((a, b) => Number(a.price) - Number(b.price));
} else if (sortOrder === "high-low") {
  filtered.sort((a, b) => Number(b.price) - Number(a.price));
} else if (sortOrder === "newest") {
  filtered.sort((a, b) => Number(b.id) - Number(a.id));
}
const productWord = products.length === 1 ? "product" : "products";
productCount.textContent =
  `Showing ${filtered.length} of ${products.length} ${productWord}`;
grid.replaceChildren();
if (filtered.length === 0) {
  const message = document.createElement("p");
 message.textContent = query
  ? `No products found for "${search.value.trim()}".`
  : "No products match your selected filters.";

  const clearButton = document.createElement("button");
  clearButton.textContent = "Clear Search";
  clearButton.className = "contact-btn";

  clearButton.addEventListener("click", () => {
    search.value = "";
    selectedCategory = "All";

    categories.forEach(button => {
      button.classList.remove("active");
      if (button.textContent.trim() === "All") {
        button.classList.add("active");
      }
    });

    renderProducts();
  });

  grid.replaceChildren(message, clearButton);
  return;
}

  filtered.forEach(product => {
    const card = document.createElement("div");
    card.className = "card product-card";
    card.style.cursor = "pointer";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `View details for ${product.name}`);

    const imageBox = document.createElement("div");
    imageBox.className = "product-image";

    const image = document.createElement("img");
    image.src = product.image || "images/bookss.jpg";
    image.alt = product.name || "Product";
    image.onerror = () => {
      image.onerror = null;
      image.src = "images/bookss.jpg";
    };

    imageBox.appendChild(image);

    const info = document.createElement("div");
    info.className = "product-info";

    const name = document.createElement("h3");
    name.textContent = product.name;

    const price = document.createElement("p");
    price.className = "product-price";
    price.textContent = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
}).format(Number(product.price));

    const category = document.createElement("p");
    category.className = "product-meta";
    category.textContent = `Category: ${product.category}`;

    const condition = document.createElement("p");
    condition.className = "product-meta";
    condition.textContent = `Condition: ${product.condition}`;

    const location = document.createElement("p");
    location.className = "product-meta";
   location.textContent = `Location: ${product.location}`;
    const seller = document.createElement("p");
    seller.className = "product-seller";
    seller.textContent = `Seller: ${product.seller || "Unknown"}`;
    const contact = document.createElement("button");
    contact.className = "contact-btn";
    contact.textContent = "Contact Seller";

    contact.addEventListener("click", event => {
      event.stopPropagation();
      alert(
        `Contact ${product.seller} about ${product.name}.\n` +
        "Seller contact details are not available in this demo."
      );
    });

    info.append(
      name,
      price,
      category,
      condition,
      location,
      seller,
      contact
    );

    card.append(imageBox, info);

    card.addEventListener("click", () => {
      alert(
        `Product: ${product.name}\n` +
        `Price: ₹${product.price}\n` +
        `Category: ${product.category}\n` +
        `Condition: ${product.condition}\n` +
        `Seller: ${product.seller}\n` +
        `Location: ${product.location}`
      );
    });
    card.addEventListener("keydown", event => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    card.click();
  }
});

    grid.appendChild(card);
  });
}

// Search products as the user types.
search.addEventListener("input", renderProducts);

// Filter products by category.
categories.forEach(button => {
  button.addEventListener("click", () => {
    selectedCategory = button.textContent.trim();

    categories.forEach(item => item.classList.remove("active"));
    button.classList.add("active");

    renderProducts();
  });
});

// Open the demo listing form.

const closeSell = document.querySelector("#close-sell");

function openSellModal() {
  sellContainer.classList.add("is-open");
  sellContainer.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  sellMessage.textContent = "";
}

function closeSellModal() {
  sellContainer.classList.remove("is-open");
  sellContainer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  sellForm.reset();
  sellMessage.textContent = "";
}

sellButton.addEventListener("click", openSellModal);
cancelSell.addEventListener("click", closeSellModal);
closeSell.addEventListener("click", closeSellModal);

sellContainer.addEventListener("click", event => {
  if (event.target === sellContainer) {
    closeSellModal();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && sellContainer.classList.contains("is-open")) {
    closeSellModal();
  }
});

// Add a temporary product for the current demo session.
sellForm.addEventListener("submit", event => {
  event.preventDefault();

  const formData = new FormData(sellForm);

  const product = {
    id: Date.now(),
    name: String(formData.get("name") || "").trim(),
    price: Number(formData.get("price")),
    category: String(formData.get("category") || ""),
    condition: String(formData.get("condition") || ""),
    location: String(formData.get("location") || "").trim(),
    seller: String(formData.get("seller") || "").trim(),
    image: "images/bookss.jpg"
  };

  if (
    !product.name ||
    !product.category ||
    !product.condition ||
    !product.location ||
    !product.seller ||
    !Number.isFinite(product.price) ||
    product.price <= 0
  ) {
    sellMessage.textContent = "Please enter valid product details.";
    return;
  }

  products.push(product);
  renderProducts();

  sellMessage.textContent =
    "Demo listing added! It will not be saved permanently.";

   closeSellModal();
});

priceSort.addEventListener("change", () => {
  sortOrder = priceSort.value;
  renderProducts();
});
conditionFilter.addEventListener("change", () => {
  selectedCondition = conditionFilter.value;
  renderProducts();
});
resetFilters.addEventListener("click", () => {
  search.value = "";
  selectedCategory = "All";
  selectedCondition = "All";
  sortOrder = "default";

  priceSort.value = "default";
  conditionFilter.value = "All";

  categories.forEach(button => {
    button.classList.toggle(
      "active",
      button.textContent.trim() === "All"
    );
  });

  renderProducts();
});
clearSearch.addEventListener("click", () => {
  search.value = "";
  selectedCategory = "All";

  categories.forEach(button => {
    button.classList.toggle(
      "active",
      button.textContent.trim() === "All"
    );
  });

  renderProducts();
});// Load the sample products from the JSON file.
loadProducts();
