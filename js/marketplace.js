
const grid = document.querySelector(".product-grid");
const search = document.querySelector(".marketplace-search");
const categories = document.querySelectorAll(".category-chip");

const sellButton = document.querySelector(".sell-btn");
const sellContainer = document.querySelector("#sell-form-container");
const sellForm = document.querySelector("#sell-form");
const sellMessage = document.querySelector("#sell-message");
const cancelSell = document.querySelector("#cancel-sell");

let products = [];
let selectedCategory = "All";

async function loadProducts() {
  try {
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
    grid.textContent = "Could not load products. Please try again.";
  }
}

function renderProducts() {
  const query = search.value.trim().toLowerCase();

  const filtered = products.filter(product => {
    const name = String(product.name || "").toLowerCase();
    const category = String(product.category || "").toLowerCase();

   const location = String(product.location || "").toLowerCase();

const matchesSearch =
  name.includes(query) ||
  category.includes(query) ||
  location.includes(query);

    const matchesCategory =
      selectedCategory === "All" ||
      category === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  grid.replaceChildren();

  if (filtered.length === 0) {
    grid.textContent = "No products found.";
    return;
  }

  filtered.forEach(product => {
    const card = document.createElement("div");
    card.className = "card product-card";
    card.style.cursor = "pointer";

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
    price.textContent = `₹${product.price}`;

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
    seller.textContent = `Seller: ${product.seller}`;

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
sellButton.addEventListener("click", () => {
  sellContainer.style.display = "block";
  sellMessage.textContent = "";
});

// Close and reset the form.
cancelSell.addEventListener("click", () => {
  sellContainer.style.display = "none";
  sellForm.reset();
  sellMessage.textContent = "";
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

  sellForm.reset();
  sellContainer.style.display = "none";
});

// Load the sample products from the JSON file.
loadProducts();
