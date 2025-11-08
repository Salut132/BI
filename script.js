// ==============================
// Chat App — Gemini Integration with Voice Support
// ==============================

// DOM Elements
const messageForm = document.querySelector(".prompt__form");
const chatHistoryContainer = document.querySelector(".chats");

// FIX 1: Corrected DOM selector from ".suggestions__item" to ".suggests__item"
const suggestionItems = document.querySelectorAll(".suggests__item"); 

const themeToggleButton = document.getElementById("themeToggler");
const clearChatButton = document.getElementById("deleteButton");
const voiceInputButton = document.getElementById("voiceInputButton"); // Add a button for voice input

// State variables
let currentUserMessage = null;
let isGeneratingResponse = false;

// Speech Recognition and Synthesis
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
const synth = window.speechSynthesis;

// API Proxy URL (Backend)
const API_PROXY_URL = 'http://localhost:3000/api/generateContent'; // Replace with your backend URL

// ==============================
// Load Chat History & Theme
// ==============================
const loadSavedChatHistory = () => {
  const savedConversations = JSON.parse(localStorage.getItem("saved-api-chats")) || [];
  const isLightTheme = localStorage.getItem("themeColor") === "light_mode";

  document.body.classList.toggle("light_mode", isLightTheme);
  themeToggleButton.innerHTML = isLightTheme
    ? '<i class="bx bx-moon"></i>'
    : '<i class="bx bx-sun"></i>';

  chatHistoryContainer.innerHTML = "";

  // Display saved chats
  savedConversations.forEach(conversation => {
    // User message
    const userMessageHtml = `
      <div class="message__content">
        <img class="message__avatar" src="asset\profile.png" alt="User Avatar" />
        <p class="message__text">${conversation.userMessage}</p>
      </div>
    `;
    const outgoingMessageElement = createChatMessageElement(userMessageHtml, "message--outgoing");
    chatHistoryContainer.appendChild(outgoingMessageElement);

    // API response
    const responseText = conversation.apiResponse?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
    const parsedApiResponse = marked.parse(responseText);

    const responseHtml = `
      <div class="message__content">
        <img class="message__avatar" src="assets/logo.png" alt="Birtalu Avata" />
        <p class="message__text"></p>
        <div class="message__loading-indicator hide">
          <div class="message__loading-bar"></div>
          <div class="message__loading-bar"></div>
          <div class="message__loading-bar"></div>
      </div>
      </div>
      <span onClick="copyMessageToClipboard(this)" class="message__icon hide">
        <i class='bx bx-copy'></i>
      </span>
    `;

    const incomingMessageElement = createChatMessageElement(responseHtml, "message--incoming");
    chatHistoryContainer.appendChild(incomingMessageElement);

    const messageTextElement = incomingMessageElement.querySelector(".message__text");

    showTypingEffect(responseText, parsedApiResponse, messageTextElement, incomingMessageElement, true);
  });

  document.body.classList.toggle("hide-header", savedConversations.length > 0);
};

// ==============================
// Create Message Element
// ==============================
const createChatMessageElement = (htmlContent, ...cssClasses) => {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", ...cssClasses);
  messageElement.innerHTML = htmlContent;
  return messageElement;
};

// ==============================
// Typing Effect
// ==============================
const showTypingEffect = (rawText, htmlText, messageElement, incomingMessageElement, skipEffect = false) => {
  const copyIconElement = incomingMessageElement.querySelector(".message__icon");
  copyIconElement.classList.add("hide");

  if (skipEffect) {
    messageElement.innerHTML = htmlText;
    hljs.highlightAll();
    addCopyButtonToCodeBlocks();
    copyIconElement.classList.remove("hide");
    isGeneratingResponse = false;
    return;
  }

  const wordsArray = rawText.split(" ");
  let wordIndex = 0;

  const typingInterval = setInterval(() => {
    messageElement.innerText += (wordIndex === 0 ? "" : " ") + wordsArray[wordIndex++];
    if (wordIndex === wordsArray.length) {
      clearInterval(typingInterval);
      isGeneratingResponse = false;
      messageElement.innerHTML = htmlText;
      hljs.highlightAll();
      addCopyButtonToCodeBlocks();
      copyIconElement.classList.remove("hide");
    }
  }, 75);
};

// ==============================
// API Request
// ==============================
const requestApiResponse = async (incomingMessageElement) => {
  const messageTextElement = incomingMessageElement.querySelector(".message__text");

  try {
    const response = await fetch(API_PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: currentUserMessage }] }]
      }),
    });

    const responseData = await response.json();
    if (!response.ok) throw new Error(responseData.error?.message || "API request failed.");

    const responseText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
    const parsedApiResponse = marked.parse(responseText);

    showTypingEffect(responseText, parsedApiResponse, messageTextElement, incomingMessageElement);

    // Speak the API response
    speakText(responseText);

    // Save conversation
    let savedConversations = JSON.parse(localStorage.getItem("saved-api-chats")) || [];
    savedConversations.push({
      userMessage: currentUserMessage,
      apiResponse: responseData,
    });

    localStorage.setItem("saved-api-chats", JSON.stringify(savedConversations));

  } catch (error) {
    isGeneratingResponse = false;
    messageTextElement.innerText = `Error: ${error.message}`;
    messageTextElement.closest(".message").classList.add("message--error");
  } finally {
    incomingMessageElement.classList.remove("message--loading");
  }
};

// ==============================
// Loading Animation
// ==============================
const displayLoadingAnimation = () => {
  const loadingHtml = `
    <div class="message__content">
      <img class="message__avatar" src="assets/logo.png" alt="Birtalu Avatar" />
      <p class="message__text"></p>
      <div class="message__loading-indicator">
        <div class="message__loading-bar"></div>
        <div class="message__loading-bar"></div>
        <div class="message__loading-bar"></div>
      </div>
    </div>
    <span onClick="copyMessageToClipboard(this)" class="message__icon hide">
      <i class='bx bx-copy-list'></i>
    </span>
  `;

  const loadingMessageElement = createChatMessageElement(loadingHtml, "message--incoming", "message--loading");
  chatHistoryContainer.appendChild(loadingMessageElement);

  requestApiResponse(loadingMessageElement);
};

// ==============================
// Copy Message
// ==============================
const copyMessageToClipboard = (copyButton) => {
  const messageContent = copyButton.parentElement.querySelector(".message__text").innerText;
  navigator.clipboard.writeText(messageContent).then(() => {
    copyButton.innerHTML = '<i class="bx bx-check"></i>';
    setTimeout(() => (copyButton.innerHTML = '<i class="bx bx-copy-list"></i>'), 1000);
  });
};

// ==============================
// Add Copy Buttons to Code Blocks
// ==============================
const addCopyButtonToCodeBlocks = () => {
  const codeBlocks = document.querySelectorAll("pre");
  codeBlocks.forEach(block => {
    const codeElement = block.querySelector("code");
    const language =
      [...codeElement.classList].find(cls => cls.startsWith("language-"))?.replace("language-", "") || "Text";

    const languageLabel = document.createElement("div");
    languageLabel.innerText = language.charAt(0).toUpperCase() + language.slice(1);
    languageLabel.classList.add("code__language-label");
    block.appendChild(languageLabel);

    const copyButton = document.createElement("button");
    copyButton.innerHTML = '<i class="bx bx-copy-list"></i>';
    copyButton.classList.add("code__copy-button");
    block.appendChild(copyButton);

    copyButton.addEventListener("click", () => {
      navigator.clipboard.writeText(codeElement.innerText).then(() => {
        copyButton.innerHTML = '<i class="bx bx-check"></i>';
        setTimeout(() => (copyButton.innerHTML = '<i class="bx bx-copy-list"></i>'), 2000);
      }).catch(() => alert("Unable to copy text!"));
    });
  });
};

// ==============================
// Handle Sending Message
// ==============================
const handleOutgoingMessage = () => {
  const inputField = messageForm.querySelector(".prompt__form-input");
  currentUserMessage = currentUserMessage || inputField.value.trim();
  if (!currentUserMessage || isGeneratingResponse) return;

  isGeneratingResponse = true;

  const outgoingMessageHtml = `
    <div class="message__content">
      <img class="message__avatar" src="assets/profile.png" alt="User Avatar" />
      <p class="message__text">${currentUserMessage}</p>
      </div>
  `;

  const outgoingMessageElement = createChatMessageElement(outgoingMessageHtml, "message--outgoing");
  chatHistoryContainer.appendChild(outgoingMessageElement);

  messageForm.reset();
  document.body.classList.add("hide-header");
  setTimeout(displayLoadingAnimation, 500);
};

// ==============================
// Theme Toggle
// ==============================
themeToggleButton.addEventListener("click", () => {
  const isLightTheme = document.body.classList.toggle("light_mode");
  localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
  themeToggleButton.innerHTML = isLightTheme
    ? '<i class="bx bx-moon"></i>'
    : '<i class="bx bx-sun"></i>';
});

// ==============================
// Clear Chat History
// ==============================
clearChatButton.addEventListener("click", () => {
  if (confirm("Are you sure you want to delete all chat history?")) {
    localStorage.removeItem("saved-api-chats");
    loadSavedChatHistory();
    currentUserMessage = null;
    isGeneratingResponse = false;
    document.body.classList.remove("hide-header"); // Show header again after clearing
  }
});

// ==============================
// Suggestions Click Handler
// ==============================
suggestionItems.forEach(suggestion => {
  suggestion.addEventListener("click", () => {
    // FIX 1: Corrected the class name to ".suggests__item-text" to match the HTML
    currentUserMessage = suggestion.querySelector(".suggests__item-text").innerText;
    handleOutgoingMessage();
  });
});

// ==============================
// Form Submit
// ==============================
messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  handleOutgoingMessage();
});

// ==============================
// Voice Input (Speech-to-Text)
// ==============================
if (recognition) {
  recognition.lang = "en-US"; // Set language for recognition
  recognition.interimResults = false;

  voiceInputButton.addEventListener("click", () => {
    recognition.start(); // Start listening for voice input
  });

  recognition.addEventListener("result", (event) => {
    const transcript = event.results[0][0].transcript; // Get the transcribed text
    currentUserMessage = transcript;
    handleOutgoingMessage(); // Send the transcribed message
  });

  recognition.addEventListener("error", (event) => {
    console.error("Speech recognition error:", event.error);
    alert("Voice input failed. Please try again.");
  });
} else {
  console.warn("Speech Recognition API is not supported in this browser.");
  voiceInputButton.style.display = "none"; // Hide the button if not supported
}

// ==============================
// Voice Output (Text-to-Speech)
// ==============================
const speakText = (text) => {
  if (!synth) {
    console.warn("Speech Synthesis API is not supported in this browser.");
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US"; // Set language for synthesis
  synth.speak(utterance);
};

// ==============================
// Initialize
// ==============================
loadSavedChatHistory();