/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const selectedProductsList = document.getElementById("selectedProductsList");

let allProducts = [];
let selectedProducts = [];

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

selectedProductsList.innerHTML = `
  <p class="empty-state">No products selected yet.</p>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products;
  return allProducts;
}

function renderSelectedProducts() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `<p class="empty-state">No products selected yet.</p>`;
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
      <div class="selected-product-pill">${product.name}</div>
    `,
    )
    .join("");
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedProducts.some(
        (item) => item.id === product.id,
      );

      return `
        <div
          class="product-card ${isSelected ? "selected" : ""}"
          data-product-id="${product.id}"
          tabindex="0"
          role="button"
          aria-pressed="${isSelected}"
        >
          <img src="${product.image}" alt="${product.name}">
          <div class="product-info">
            <h3>${product.name}</h3>
            <p>${product.brand}</p>
          </div>
          <div class="product-overlay">
            <p>${product.description}</p>
          </div>
        </div>
      `;
    })
    .join("");
}

function toggleSelectedProduct(productId) {
  const product = allProducts.find((item) => item.id === productId);

  if (!product) {
    return;
  }

  const isAlreadySelected = selectedProducts.some(
    (item) => item.id === productId,
  );

  if (isAlreadySelected) {
    selectedProducts = selectedProducts.filter((item) => item.id !== productId);
  } else {
    selectedProducts.push(product);
  }

  renderSelectedProducts();

  const currentProducts = allProducts.filter(
    (item) => item.category === categoryFilter.value,
  );
  displayProducts(currentProducts);
}

productsContainer.addEventListener("click", (event) => {
  const card = event.target.closest(".product-card");

  if (!card) {
    return;
  }

  toggleSelectedProduct(Number(card.dataset.productId));
});

productsContainer.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const card = event.target.closest(".product-card");

  if (!card) {
    return;
  }

  event.preventDefault();
  toggleSelectedProduct(Number(card.dataset.productId));
});

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory,
  );

  displayProducts(filteredProducts);
});

function addMessage(text, sender) {
  const label = sender === "user" ? "You" : "AI";
  const messageClass = sender === "user" ? "user" : "ai";

  chatWindow.innerHTML += `<div class="msg ${messageClass}">${label}: ${text}</div>`;
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function fetchAIResponse(userMessage) {
  const response = await fetch(
    "https://loreal-chatbot-worker.ih184.workers.dev/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
           {role: "system",
          content:
            "You are a helpful assistant that helps customers navigate L'Oréal's products and provides tailored recommendations. If a user's query is unrelated to L'Oréal products, politely inform them that you can only assist with L'Oréal-related inquiries.",
        },
          { role: "user", content: userMessage }],
          temperature: 0.7,
          max_completion_tokens: 500,

      }),
    },
  );

  const data = await response.json();
  return data.choices[0].message.content;
}

async function handleUserInput(userMessage) {
  addMessage(userMessage, "user");

  try {
    const aiResponse = await fetchAIResponse(userMessage);
    addMessage(aiResponse, "ai");
  } catch (error) {
    addMessage("Sorry, there was an error generating your routine. Please try again.");
    console.error(error);
  }
}

chatWindow.innerHTML =
  '<div class="msg ai">👋 Hello! How can I help you today?</div>';

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = userInput.value.trim();
  if (!message) {
    return;
  }

  userInput.value = "";
  await handleUserInput(message);
});
