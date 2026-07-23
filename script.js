/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineButton = document.getElementById("generateRoutine");

const STORAGE_KEY = "lorealRoutinePreferences";

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

function savePreferences() {
  const preferences = {
    category: categoryFilter.value,
    selectedProductIds: selectedProducts.map((product) => product.id),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

function restorePreferences() {
  const savedPreferences = localStorage.getItem(STORAGE_KEY);

  if (!savedPreferences) {
    return;
  }

  try {
    const parsedPreferences = JSON.parse(savedPreferences);

    if (parsedPreferences.category) {
      categoryFilter.value = parsedPreferences.category;
    }

    if (Array.isArray(parsedPreferences.selectedProductIds)) {
      selectedProducts = allProducts.filter((product) =>
        parsedPreferences.selectedProductIds.includes(product.id),
      );
    }
  } catch (error) {
    console.warn("Could not restore saved routine preferences.", error);
  }
}

function renderProductsForCurrentCategory() {
  if (!categoryFilter.value) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        Select a category to view products
      </div>
    `;
    return;
  }

  const filteredProducts = allProducts.filter(
    (product) => product.category === categoryFilter.value,
  );

  displayProducts(filteredProducts);
}

async function initializeApp() {
  await loadProducts();
  restorePreferences();
  renderSelectedProducts();
  renderProductsForCurrentCategory();
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
  savePreferences();

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
categoryFilter.addEventListener("change", async () => {
  if (allProducts.length === 0) {
    await loadProducts();
  }

  renderProductsForCurrentCategory();
  savePreferences();
});

function getFormValues() {
  const categoryValue = categoryFilter.value;
  const chatMessageValue = userInput.value.trim();
  const selectedProductsText =
    selectedProducts.length > 0
      ? selectedProducts
          .map((product) => `${product.name} (${product.brand})`)
          .join(", ")
      : "No products selected yet.";

  return {
    categoryValue,
    chatMessageValue,
    selectedProductsText,
  };
}

function buildRoutinePrompt(userMessage) {
  const { categoryValue, selectedProductsText } = getFormValues();

  return `Plan a personalized, step-by-step routine based on the selected products. Category: ${categoryValue || "No category selected"}. Selected products: ${selectedProductsText}. ${userMessage ? `The customer says: ${userMessage}` : "Please create a helpful beginner-friendly routine."}`;
}

function addMessage(text, sender) {
  const label = sender === "user" ? "You" : "AI";
  const messageClass = sender === "user" ? "user" : "ai";

  chatWindow.innerHTML += `<div class="msg ${messageClass}">${label}: ${text}</div>`;
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function fetchAIResponse(userMessage) {
  const routinePrompt = buildRoutinePrompt(userMessage);

  const response = await fetch(
    "https://loreal-chatbot-worker.ih184.workers.dev/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that helps customers navigate L'Oréal's products and provides tailored recommendations. If a user's query is unrelated to the brand portfolio of L'Oréal Group brands, politely inform them that you can only assist with L'Oréal-related inquiries.",
          },
          { role: "user", content: routinePrompt },
        ],
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
    addMessage(
      "Sorry, there was an error generating your routine. Please try again.",
    );
    console.error(error);
  }
}

chatWindow.innerHTML =
  '<div class="msg ai">👋 Hello! How can I help you today?</div>';

initializeApp();

generateRoutineButton.addEventListener("click", async () => {
  const { chatMessageValue } = getFormValues();

  if (selectedProducts.length === 0) {
    addMessage(
      "Please select at least one product before generating a routine.",
      "ai",
    );
    return;
  }

  const message = chatMessageValue || "Plan a personalized routine for me.";
  await handleUserInput(message);
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = userInput.value.trim();
  if (!message) {
    return;
  }

  userInput.value = "";
  await handleUserInput(message);
});
