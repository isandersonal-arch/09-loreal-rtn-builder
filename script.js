/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const apiKey = OPENAI_API_KEY; // Make sure to name your secret OPENAI_API

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
    </div>
  `
    )
    .join("");
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
});


function addMessage(text, sender) {
  const label = sender === "user" ? "You" : "AI";
  const messageClass = sender === "user" ? "user" : "ai";

  chatWindow.innerHTML += `<div class="msg ${messageClass}">${label}: ${text}</div>`;
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function fetchOpenAIResponse(userMessage) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that helps customers navigate L'Oréal's products and provides tailored recommendations. If a user's query is unrelated to L'Oréal products, politely inform them that you can only assist with L'Oréal-related inquiries.",
        },
        { role: "user", content: userMessage },
      ],
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

async function handleUserInput(userMessage) {
  addMessage(userMessage, "user");

  try {
    const aiResponse = await fetchOpenAIResponse(userMessage);
    addMessage(aiResponse, "ai");
  } catch (error) {
    addMessage("Sorry, I could not get a response right now.", "ai");
    console.error(error);
  }
}

chatWindow.innerHTML =
  '<div class="msg ai">👋 Hello! How can I help you today?</div>';

const workerUrl = "https://loreal-chatbot-worker.ih184.workers.dev/"; // Replace with your Cloudflare Worker URL

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = userInput.value.trim();
  if (!message) {
    return;
  }

  userInput.value = "";
  await handleUserInput(message);
});
