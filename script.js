const API_KEY = "AIzaSyAURG4DVM5VEzfeV87E5a8qDUf_0_6JXik";
const MODEL = "models/gemini-2.5-flash";

document.getElementById("generateBtn").onclick = () => generateQuiz();

let quizData = [];  // store questions, options, answers, explanation

// Helper: normalize answer to single uppercase letter A/B/C/D
// Accepts values like "A", "A)", "A. Option", "B. Paris", "B) Paris" and returns "A".."D"
function normalizeAnswer(ans) {
  if (!ans) return "";
  const s = String(ans).trim();
  const match = s.match(/[A-D]/i);
  return match ? match[0].toUpperCase() : "";
}

// MAIN QUIZ GENERATOR
async function generateQuiz() {
  const topic = document.getElementById("topic").value.trim();
  const count = document.getElementById("count").value;
  const difficulty = document.getElementById("difficulty").value;
  const output = document.getElementById("output");

  if (!topic) {
    output.textContent = "❌ Please enter a topic.";
    return;
  }

  output.textContent = "⏳ Generating quiz...";

  const url = `https://generativelanguage.googleapis.com/v1/${MODEL}:generateContent?key=${API_KEY}`;

  const prompt = `
Generate exactly ${count} MCQs on "${topic}" at ${difficulty} difficulty.

Return output STRICTLY in this JSON format:

[
  {
    "question": "....",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "answer": "A",
    "explanation": "..."
  }
]

NO extra text. Only JSON array.
`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    // Extract model text
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    // If text is missing
    if (!text) {
      output.textContent = "❌ No response from Gemini or unexpected response shape. Check console.";
      console.error("API response:", data);
      return;
    }

    // Parse JSON produced by model
    let jsonText = text.trim();

    // Keep only the JSON array []
    const start = jsonText.indexOf("[");
    const end = jsonText.lastIndexOf("]");

    // valid JSON range extraction
    if (start >= 0 && end > start) {
      jsonText = jsonText.slice(start, end + 1);
    }

    // safety: remove markdown code fences if present
    jsonText = jsonText.replace(/```/g, "");

    try {
      quizData = JSON.parse(jsonText);
    } catch (parseErr) {
      output.textContent = "❌ Failed to parse model JSON. See console for raw text.";
      console.error("Raw model text:", text);
      throw parseErr;
    }

    // Normalize answers to single letter A-D 
    quizData = quizData.map(q => ({
      question: q.question ?? "",
      options: Array.isArray(q.options) ? q.options.slice(0,4) : ["A)", "B)", "C)", "D)"],
      // store answer as single letter
      answer: normalizeAnswer(q.answer),
      explanation: q.explanation ?? ""
    }));

    // console.log("quizData (parsed):", quizData);
    displayQuiz();

  } catch (error) {
    output.textContent = "❌ Error: " + (error?.message || error);
    console.error(error);
  }
}

function displayQuiz() {
  const output = document.getElementById("output");
  output.innerHTML = ""; // clear previous

  // For each question build DOM nodes (safer than innerHTML)
  quizData.forEach((q, index) => {
    const card = document.createElement("div");
    card.className = "question-card";

    // ensure html tags become normal text
    const h3 = document.createElement("h3");
    h3.textContent = `${index + 1}. ${q.question}`;
    card.appendChild(h3);

    const optionsWrap = document.createElement("div");
    optionsWrap.className = "options";

    // build each option
    q.options.forEach((rawOpt, i) => {
      let optText = String(rawOpt).replace(/\n/g, " ").trim();
      
      const optionLetter = ["A", "B", "C", "D"][i];

      // Container for option
      const optionDiv = document.createElement("div");
      optionDiv.className = "option";

      // Create radio input
      const input = document.createElement("input");
      input.type = "radio";
      input.name = `q${index}`;
      input.value = optionLetter;
      // unique id 
      const inputId = `q${index}_opt${i}`;
      input.id = inputId;

      // Create label and set its textContent4
      const label = document.createElement("label");
      label.htmlFor = inputId;
      label.textContent = optText; // use textContent so "<div>" appears as text, not an element

      // Append children
      optionDiv.appendChild(input);
      optionDiv.appendChild(label);
      optionsWrap.appendChild(optionDiv);
    });

    card.appendChild(optionsWrap);
    output.appendChild(card);
  });

  // Submit button and results container
  const submitBtn = document.createElement("button");
  submitBtn.id = "submitQuizBtn";
  submitBtn.textContent = "Submit Quiz";
  submitBtn.className = "btn primary";
  submitBtn.addEventListener("click", evaluateQuiz);

  const resultDiv = document.createElement("div");
  resultDiv.id = "result";

  output.appendChild(submitBtn);
  output.appendChild(resultDiv);
}

// EVALUATE QUIZ
function evaluateQuiz() {
  let score = 0;
  const resultBox = document.getElementById("result");

  // Result area
  resultBox.innerHTML = "";

  const heading = document.createElement("h2");
  heading.textContent = "Results:";
  resultBox.appendChild(heading);

  quizData.forEach((q, index) => {
    const selected = document.querySelector(`input[name="q${index}"]:checked`);
    const userAns = selected ? selected.value : "Not answered";
    const correct = q.answer;

    if (userAns === correct) score++;

    const letters = ["A", "B", "C", "D"];
    const pos = letters.indexOf(correct);
    const correctFullText = pos >= 0 && q.options[pos] ? q.options[pos] : "";

    // RESULT BLOCK 
    const block = document.createElement("div");
    block.className = "result-item";

    const qText = document.createElement("p");
    qText.textContent = `Q${index + 1}: ${q.question}`;

    const userText = document.createElement("p");
    userText.textContent = `Your Answer: ${userAns}`;

    const correctText = document.createElement("p");
    correctText.textContent = `Correct Answer: ${correctFullText}`;

    const exp = document.createElement("p");
    exp.textContent = q.explanation;

    // append
    block.appendChild(qText);
    block.appendChild(userText);
    block.appendChild(correctText);
    block.appendChild(exp);

    resultBox.appendChild(block);

    resultBox.appendChild(document.createElement("hr"));
  });

  // SCORE
  const scoreHeading = document.createElement("h2");
  scoreHeading.textContent = `Score: ${score} / ${quizData.length}`;
  resultBox.prepend(scoreHeading);
}
