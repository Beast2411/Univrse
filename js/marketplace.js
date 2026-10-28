
const grid = document.querySelector(".product-grid");
const search = document.querySelector(".marketplace-search");
const categories = document.querySelectorAll(".category-chip");

let products = [];
let selectedCategory = "All";

async function loadProducts() {
  try {
    const response = await fetch("/api/products");
    if (!response.ok) throw new Error("Failed to load products");

    products = await response.json();
    renderProducts();
  } catch (error) {
    console.error(error);
    grid.textContent = "Could not load products.";
  }
}

function renderProducts() {
  const query = search.value.trim().toLowerCase();

  const filtered = products.filter(product => {
    const matchesSearch =
      product.name.toLowerCase().includes(query);

    const matchesCategory =
      selectedCategory === "All" ||
      product.category.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  grid.replaceChildren();

  filtered.forEach(product => {
    const card = document.createElement("div");
    card.className = "card product-card";

    const imageBox = document.createElement("div");
    imageBox.className = "product-image";

    const image = document.createElement("img");
    image.src = product.image;
    image.alt = product.name;
    imageBox.appendChild(image);

    const info = document.createElement("div");
    info.className = "product-info";

    const name = document.createElement("h3");
    name.textContent = product.name;

    const price = document.createElement("p");
    price.className = "product-price";
    price.textContent = `₹${product.price}`;

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
    contact.addEventListener("click", () => {
      alert(`Contact ${product.seller} about ${product.name}.`);
    });

    info.append(name, price, condition, location, seller, contact);
    card.append(imageBox, info);
    grid.appendChild(card);
  });

  if (filtered.length === 0) {
    grid.textContent = "No products found.";
  }
}

search.addEventListener("input", renderProducts);

categories.forEach(button => {
  button.addEventListener("click", () => {
    selectedCategory = button.textContent.trim();

    categories.forEach(item => item.classList.remove("active"));
    button.classList.add("active");

    renderProducts();
  });
});

loadProducts();

const sellButton = document.querySelector(".sell-btn");
const sellContainer = document.querySelector("#sell-form-container");
const sellForm = document.querySelector("#sell-form");
const sellMessage = document.querySelector("#sell-message");
const cancelSell = document.querySelector("#cancel-sell");

sellButton.addEventListener("click", () => {
  sellContainer.style.display = "block";
  sellMessage.textContent = "";
});

cancelSell.addEventListener("click", () => {
  sellContainer.style.display = "none";
  sellForm.reset();
});

sellForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(sellForm);

  const product = {
    name: formData.get("name").trim(),
    price: Number(formData.get("price")),
    category: formData.get("category"),
    condition: formData.get("condition"),
    location: formData.get("location").trim(),
    seller: formData.get("seller").trim()
  };

  try {
    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Could not add listing");
    }

    products.push(result);
    renderProducts();

    sellMessage.textContent = "Listing added successfully!";
    sellForm.reset();
    sellContainer.style.display = "none";
  } catch (error) {
    sellMessage.textContent = error.message;
  }
});
