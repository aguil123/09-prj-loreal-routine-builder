/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const clearSelectionBtn = document.getElementById("clearSelectionBtn");
const generateRoutineBtn = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");

/* Keep app state in variables */
let selectedCategory = "";
let selectedProductIds = [];
let currentDisplayedProducts = [];
let allProducts = [];
let conversationMessages = [];

const systemPrompt =
  "You are a L'Oréal skincare and beauty advisor. Create a helpful routine and answer follow-up questions based on the products the user selected. If the user asks something unrelated, refuse to answer and politely redirect them to skincare and beauty topics.";
const storageKey = "loreal-selected-products";
const categoryStorageKey = "loreal-selected-category";

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  if (allProducts.length > 0) {
    return allProducts;
  }

  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products;
  return allProducts;
}

/* Save the current selection so it is available after a refresh */
function saveSelectedProducts() {
  localStorage.setItem(storageKey, JSON.stringify(selectedProductIds));

  if (selectedCategory) {
    localStorage.setItem(categoryStorageKey, selectedCategory);
  } else {
    localStorage.removeItem(categoryStorageKey);
  }
}

/* Restore the saved selection when the page loads */
function loadSavedSelection() {
  const savedProducts = localStorage.getItem(storageKey);
  if (savedProducts) {
    try {
      const parsedProducts = JSON.parse(savedProducts);
      if (Array.isArray(parsedProducts)) {
        selectedProductIds = parsedProducts;
      }
    } catch (error) {
      console.log("Could not load saved products", error);
    }
  }

  const savedCategory = localStorage.getItem(categoryStorageKey);
  if (savedCategory) {
    selectedCategory = savedCategory;
    categoryFilter.value = savedCategory;
  }
}

/* Build the product cards HTML */
function displayProducts(products) {
  currentDisplayedProducts = products;

  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedProductIds.includes(product.id);
      const safeName = escapeHtml(product.name);
      const safeBrand = escapeHtml(product.brand);
      const safeDescription = escapeHtml(product.description);

      return `
      <div
        class="product-card ${isSelected ? "selected" : ""}"
        data-product-id="${product.id}"
        role="button"
        tabindex="0"
        aria-label="Select ${safeName}. ${safeDescription}"
        aria-describedby="product-description-${product.id}"
      >
        <img src="${product.image}" alt="${safeName}" />
        <div class="product-info">
          <h3>${safeName}</h3>
          <p>${safeBrand}</p>
          <p id="product-description-${product.id}" class="product-description">${safeDescription}</p>
        </div>
      </div>
    `;
    })
    .join("");
}

/* Render the list of chosen products */
function renderSelectedProducts() {
  if (selectedProductIds.length === 0) {
    selectedProductsList.innerHTML = `<p>No products selected yet.</p>`;
    return;
  }

  const chosenProducts = allProducts.filter((product) =>
    selectedProductIds.includes(product.id),
  );

  selectedProductsList.innerHTML = chosenProducts
    .map(
      (product) => `
      <div class="selected-product-item">
        <span><strong>${product.brand}:</strong> ${product.name}</span>
        <button class="remove-product-btn" data-product-id="${product.id}" type="button" aria-label="Remove ${product.name}">
          ×
        </button>
      </div>
    `,
    )
    .join("");
}

function toggleProductSelection(productId) {
  const index = selectedProductIds.indexOf(productId);
  if (index === -1) {
    selectedProductIds.push(productId);
  } else {
    selectedProductIds.splice(index, 1);
  }

  saveSelectedProducts();
  displayProducts(currentDisplayedProducts);
  renderSelectedProducts();
}

/* Toggle product selection when a product card is clicked */
productsContainer.addEventListener("click", (event) => {
  const card = event.target.closest(".product-card");
  if (!card) return;

  const productId = Number(card.dataset.productId);
  if (!productId) return;

  toggleProductSelection(productId);
});

productsContainer.addEventListener("keydown", (event) => {
  const card = event.target.closest(".product-card");
  if (!card) return;

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    const productId = Number(card.dataset.productId);
    if (!productId) return;

    toggleProductSelection(productId);
  }
});

/* Remove a single selected product from the list */
selectedProductsList.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".remove-product-btn");
  if (!removeButton) return;

  const productId = Number(removeButton.dataset.productId);
  if (!productId) return;

  selectedProductIds = selectedProductIds.filter((id) => id !== productId);
  saveSelectedProducts();
  displayProducts(currentDisplayedProducts);
  renderSelectedProducts();
});

/* Clear all selected products */
clearSelectionBtn.addEventListener("click", () => {
  selectedProductIds = [];
  saveSelectedProducts();
  displayProducts(currentDisplayedProducts);
  renderSelectedProducts();
});

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  selectedCategory = e.target.value;
  const products = await loadProducts();

  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory,
  );

  saveSelectedProducts();
  displayProducts(filteredProducts);
  renderSelectedProducts();
});

/* Restore the saved selection when the page opens */
async function initializeApp() {
  await loadProducts();
  loadSavedSelection();

  if (selectedCategory) {
    const filteredProducts = allProducts.filter(
      (product) => product.category === selectedCategory,
    );
    displayProducts(filteredProducts);
  } else {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        Select a category to view products
      </div>
    `;
  }

  renderSelectedProducts();
}

initializeApp();

/* Build the personalized routine prompt */
function buildRoutineMessage() {
  const chosenProducts = allProducts.filter((product) =>
    selectedProductIds.includes(product.id),
  );

  const chosenProductNames = chosenProducts
    .map((product) => `${product.brand} ${product.name}`)
    .join(", ");

  const userMessage = `Build a personalized routine for the chosen category: ${selectedCategory}.
Use the selected products: ${chosenProductNames}.
Explain why each product is a good fit for this category and how the user should apply them in order.`;

  return userMessage;
}

/* Escape text to safely add HTML markup */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* Format AI text into paragraphs and lists for readability */
function formatAssistantResponse(text) {
  const escaped = escapeHtml(text || "");
  const paragraphs = escaped.split(/\n\s*\n/);

  return paragraphs
    .map((paragraph) => {
      const lines = paragraph
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const isList = lines.every((line) => /^(-|\*|\d+\.)\s+/.test(line));
      if (isList) {
        const ordered = /^\d+\./.test(lines[0]);
        const tag = ordered ? "ol" : "ul";
        const listItems = lines
          .map((line) => line.replace(/^(-|\*|\d+\.)\s+/, ""))
          .map((item) => `<li>${item}</li>`)
          .join("");

        return `<${tag} class="assistant-list">${listItems}</${tag}>`;
      }

      return `<p class="assistant-paragraph">${lines.join("<br />")}</p>`;
    })
    .join("");
}

/* Show the conversation in the chat window */
function renderConversation() {
  const visibleMessages = conversationMessages.filter(
    (message) => message.role !== "system",
  );

  chatWindow.innerHTML = visibleMessages
    .map((message) => {
      if (message.role === "user") {
        return `<div class="user-message">${escapeHtml(message.content)}</div>`;
      }

      return `<div class="assistant-response">${formatAssistantResponse(message.content)}</div>`;
    })
    .join("");
}

/* Send the current conversation to the Cloudflare Worker */
async function requestAssistantReply() {
  const response = await fetch(
    "https://loreal-chatbot-worker.aguila2k23.workers.dev/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationMessages,
        ],
      }),
    },
  );

  const data = await response.json();
  return (
    data.choices?.[0]?.message?.content || "No response returned from the API."
  );
}

/* Generate routine when the button is clicked */
generateRoutineBtn.addEventListener("click", async () => {
  if (!selectedCategory || selectedProductIds.length === 0) {
    chatWindow.innerHTML =
      "Please select a category and at least one product before generating a routine.";
    return;
  }

  chatWindow.innerHTML = "Generating your personalized routine...";
  conversationMessages = [{ role: "system", content: systemPrompt }];
  conversationMessages.push({ role: "user", content: buildRoutineMessage() });
  renderConversation();

  const routine = await requestAssistantReply();
  conversationMessages.push({ role: "assistant", content: routine });
  renderConversation();
});

/* Chat form submission handler */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userMessage = userInput.value.trim();
  if (!userMessage) return;

  conversationMessages.push({ role: "user", content: userMessage });
  renderConversation();
  chatWindow.innerHTML += '<div class="assistant-response">Thinking...</div>';
  userInput.value = "";

  const reply = await requestAssistantReply();
  conversationMessages.push({ role: "assistant", content: reply });
  renderConversation();
});
