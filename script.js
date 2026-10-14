
const questionElement = document.getElementById("question");
const multipleChoice = document.getElementById("multiplechoice");
const shortAnswers = document.getElementById("shortanswers");
const shortAnswerInput = document.getElementById("shortanswer");
const submitAnswer = document.getElementById("submitanswer");
const feedback = document.getElementById("feedback");
const nextQuestionButton = document.getElementById("nextquestion");
const progress = document.getElementById("progress");

let questions = [];
let remainingQuestions = [];
let currentQuestion = null;
let questionsAnswered = 0;
let score = 0;
let answered = false;

// Normalise answers so capitalisation and extra spaces don't matter.
function normalise(answer) {
    return String(answer).trim().toLowerCase().replace(/\s+/g, " ");
}

// Shuffle an array using the Fisher-Yates algorithm.
function shuffle(array) {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
}

// Get a random question without repeating until all have been used.
function getRandomQuestion() {
    if (remainingQuestions.length === 0) {
        remainingQuestions = shuffle(
            questions.map((_, index) => index)
        );
    }

    const index = remainingQuestions.pop();
    return questions[index];
}

// Load the questions from JSON.
async function loadQuestions() {
    try {
        const response = await fetch("questions.json");

        if (!response.ok) {
            throw new Error("Could not load questions.json");
        }

        questions = await response.json();

        if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error("The question list is empty or invalid.");
        }

        remainingQuestions = shuffle(
            questions.map((_, index) => index)
        );

        showQuestion();
    } catch (error) {
        questionElement.textContent = "Could not load questions.";
        feedback.textContent =
            error.message + " Make sure you are using a local server.";
        console.error(error);
    }
}

// Display a question.
function showQuestion() {
    currentQuestion = getRandomQuestion();
    answered = false;

    questionElement.textContent = currentQuestion.question;

    multipleChoice.replaceChildren();
    shortAnswerInput.value = "";

    feedback.textContent = "";
    nextQuestionButton.hidden = true;

    if (currentQuestion.type === "multiple") {
        multipleChoice.hidden = false;
        shortAnswers.hidden = true;

        currentQuestion.answers.forEach((answer) => {
            const button = document.createElement("button");

            button.textContent = answer;
            button.type = "button";

            button.addEventListener("click", () => {
                checkAnswer(answer, button);
            });

            multipleChoice.appendChild(button);
        });
    } else if (currentQuestion.type === "short") {
        multipleChoice.hidden = true;
        shortAnswers.hidden = false;

        shortAnswerInput.disabled = false;
        submitAnswer.disabled = false;
        shortAnswerInput.focus();
    } else {
        questionElement.textContent = "Invalid question type.";
    }

    progress.textContent =
        `Answered: ${questionsAnswered} | Score: ${score}/${questionsAnswered}`;
}

// Check an answer.
function checkAnswer(answer, selectedButton = null) {
    if (answered) return;

    answered = true;

    const isCorrect =
        normalise(answer) === normalise(currentQuestion.correct);

    questionsAnswered++;

    if (isCorrect) {
        score++;
        feedback.textContent = "Correct!";
        feedback.style.color = "#39d76b";
    } else {
        feedback.textContent =
            `Incorrect! The correct answer is: ${currentQuestion.correct}`;
        feedback.style.color = "#ff5252";
    }

    // Highlight the selected multiple-choice answer.
    if (selectedButton) {
        selectedButton.classList.add(
            isCorrect ? "correct" : "incorrect"
        );
    }

    // Also reveal the correct multiple-choice answer.
    if (currentQuestion.type === "multiple") {
        const buttons = multipleChoice.querySelectorAll("button");

        buttons.forEach((button) => {
            button.disabled = true;

            if (
                normalise(button.textContent) ===
                normalise(currentQuestion.correct)
            ) {
                button.classList.add("correct");
            }
        });
    }

    shortAnswerInput.disabled = true;
    submitAnswer.disabled = true;

    progress.textContent =
        `Answered: ${questionsAnswered} | Score: ${score}/${questionsAnswered}`;

    nextQuestionButton.hidden = false;
    nextQuestionButton.focus();
}

// Submit a typed answer.
submitAnswer.addEventListener("click", () => {
    if (!shortAnswerInput.value.trim()) {
        feedback.textContent = "Please enter an answer.";
        feedback.style.color = "#ffcc66";
        return;
    }

    checkAnswer(shortAnswerInput.value);
});

// Allow Enter to submit a short answer.
shortAnswerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !answered) {
        submitAnswer.click();
    }
});

// Move to the next question.
nextQuestionButton.addEventListener("click", showQuestion);

// Start the quiz.
loadQuestions();
