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
let editingId = null;

function showMessage(message, isError = false) {
  sellMessage.textContent = message;
  sellMessage.style.color = isError ? "#b42318" : "#18794e";
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });

  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed. Please try again.");
  return data;
}

async function loadProducts() {
  grid.setAttribute("aria-busy", "true");
  grid.textContent = "Loading listings...";
  try {
    products = await apiRequest("/api/products");
    if (!Array.isArray(products)) throw new Error("The products response is invalid.");
    renderProducts();
  } catch (error) {
    console.error(error);
    grid.textContent = `${error.message} Start the app with npm start and open http://localhost:3000/marketplace.html.`;
  } finally {
    grid.removeAttribute("aria-busy");
  }
}

function makeText(tag, className, value) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = value;
  return element;
}

function renderProducts() {
  const query = search.value.trim().toLowerCase();
  const filtered = products.filter(product => {
    const searchable = [product.name, product.category, product.condition, product.location, product.seller]
      .filter(Boolean).join(" ").toLowerCase();
    const matchesSearch = searchable.includes(query);
    const matchesCategory = selectedCategory === "All" ||
      product.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  grid.replaceChildren();

  if (filtered.length === 0) {
    grid.appendChild(makeText("p", "empty-state", "No listings found. Try another search or category."));
    return;
  }

  filtered.forEach(product => {
    const card = document.createElement("article");
    card.className = "card product-card";

    const imageBox = makeText("div", "product-image", "");
    const image = document.createElement("img");
    image.src = product.image || "images/bookss.jpg";
    image.alt = product.name;
    image.loading = "lazy";
    image.onerror = () => {
      image.onerror = null;
      image.src = "images/bookss.jpg";
    };
    imageBox.appendChild(image);

    const info = document.createElement("div");
    info.className = "product-info";
    info.append(
      makeText("h3", "", product.name),
      makeText("p", "product-price", `₹${Number(product.price).toLocaleString("en-IN")}`),
      makeText("p", "product-meta", `Category: ${product.category}`),
      makeText("p", "product-meta", `Condition: ${product.condition}`),
      makeText("p", "product-meta", `Location: ${product.location}`),
      makeText("p", "product-seller", `Seller: ${product.seller}`)
    );

    const actions = makeText("div", "product-actions", "");
    const contact = makeText("button", "contact-btn", "Contact Seller");
    contact.type = "button";
    contact.addEventListener("click", () => {
      alert(`Seller: ${product.seller}\nItem: ${product.name}\nPickup location: ${product.location}\n\nThis demo does not store seller phone numbers or email addresses.`);
    });

    const edit = makeText("button", "listing-action edit-btn", "Edit");
    edit.type = "button";
    edit.addEventListener("click", () => startEditing(product));

    const remove = makeText("button", "listing-action delete-btn", "Delete");
    remove.type = "button";
    remove.addEventListener("click", () => deleteProduct(product));

    actions.append(contact, edit, remove);
    info.appendChild(actions);
    card.append(imageBox, info);
    grid.appendChild(card);
  });
}

function startEditing(product) {
  editingId = product.id;
  sellForm.elements.name.value = product.name;
  sellForm.elements.price.value = product.price;
  sellForm.elements.category.value = product.category;
  sellForm.elements.condition.value = product.condition;
  sellForm.elements.location.value = product.location;
  sellForm.elements.seller.value = product.seller;
  sellForm.querySelector('[type="submit"]').textContent = "Save Changes";
  sellContainer.style.display = "block";
  showMessage(`Editing "${product.name}".`);
  sellContainer.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetForm() {
  editingId = null;
  sellForm.reset();
  sellForm.querySelector('[type="submit"]').textContent = "Add Listing";
}

async function deleteProduct(product) {
  if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
  try {
    await apiRequest(`/api/products/${encodeURIComponent(product.id)}`, { method: "DELETE" });
    products = products.filter(item => item.id !== product.id);
    renderProducts();
  } catch (error) {
    alert(error.message);
  }
}

search.addEventListener("input", renderProducts);

categories.forEach(button => {
  button.addEventListener("click", () => {
    selectedCategory = button.textContent.trim();
    categories.forEach(item => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    renderProducts();
  });
});

sellButton.addEventListener("click", () => {
  resetForm();
  sellContainer.style.display = "block";
  showMessage("");
  sellForm.elements.name.focus();
});

cancelSell.addEventListener("click", () => {
  sellContainer.style.display = "none";
  resetForm();
  showMessage("");
});

sellForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!sellForm.reportValidity()) return;

  const formData = new FormData(sellForm);
  const product = {
    name: String(formData.get("name") || "").trim(),
    price: Number(formData.get("price")),
    category: String(formData.get("category") || ""),
    condition: String(formData.get("condition") || ""),
    location: String(formData.get("location") || "").trim(),
    seller: String(formData.get("seller") || "").trim()
  };

  const submitButton = sellForm.querySelector('[type="submit"]');
  submitButton.disabled = true;
  showMessage(editingId === null ? "Adding listing..." : "Saving changes...");

  try {
    const result = editingId === null
      ? await apiRequest("/api/products", { method: "POST", body: JSON.stringify(product) })
      : await apiRequest(`/api/products/${encodeURIComponent(editingId)}`, {
          method: "PUT",
          body: JSON.stringify(product)
        });

    const wasEditing = editingId !== null;
    if (!wasEditing) products.push(result);
    else products = products.map(item => item.id === editingId ? result : item);

    renderProducts();
    sellContainer.style.display = "none";
    resetForm();
    showMessage(wasEditing ? "Listing updated successfully." : "Listing added successfully.");
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    submitButton.disabled = false;
  }
});

loadProducts();
