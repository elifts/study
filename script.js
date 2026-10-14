
const questionElement = document.getElementById("question");
const multipleChoice = document.getElementById("multiplechoice");
const shortAnswers = document.getElementById("shortanswers");
const shortAnswerInput = document.getElementById("shortanswer");
const submitAnswer = document.getElementById("submitanswer");
const feedback = document.getElementById("feedback");
const nextQuestionButton = document.getElementById("nextquestion");
const progress = document.getElementById("progress");
const skipAnswer = document.getElementById("Skipanswer");
const graph = document.getElementById("timegraph");
const ctx = graph.getContext("2d");
const confetti = document.getElementById("confetti");

let questions = [];
let remainingQuestions = [];
let currentQuestion = null;
let questionsAnswered = 0;
let score = 0;
let answered = false;
let questionStartTime = 0;
let graphData = [];

function normalise(answer) {
    return String(answer).trim().toLowerCase().replace(/\s+/g, " ");
}

function shuffle(array) {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
}

function getRandomQuestion() {
    if (remainingQuestions.length === 0) {
        remainingQuestions = shuffle(
            questions.map((_, index) => index)
        );
    }

    return questions[remainingQuestions.pop()];
}

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
    }
}

function showQuestion() {
    currentQuestion = getRandomQuestion();
    answered = false;
    questionStartTime = performance.now();

    questionElement.textContent = currentQuestion.question;

    multipleChoice.replaceChildren();
    shortAnswerInput.value = "";
    shortAnswerInput.disabled = false;
    submitAnswer.disabled = false;

    feedback.textContent = "";
    nextQuestionButton.hidden = true;
    skipAnswer.hidden = false;

    if (currentQuestion.type === "multiple") {
        multipleChoice.hidden = false;
        shortAnswers.hidden = true;

        shuffle(currentQuestion.answers).forEach((answer) => {
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
        shortAnswerInput.focus();
    } else {
        questionElement.textContent = "Invalid question type.";
        skipAnswer.hidden = true;
    }

    updateProgress();
}

function checkAnswer(answer, selectedButton = null) {
    if (answered) return;

    const isCorrect =
        normalise(answer) === normalise(currentQuestion.correct);

    finishQuestion(isCorrect, selectedButton);
}

function finishQuestion(isCorrect, selectedButton = null, skipped = false) {
    if (answered) return;

    answered = true;

    const elapsed = (performance.now() - questionStartTime) / 1000;

    questionsAnswered++;

    if (isCorrect) {
        score++;
        feedback.textContent = "Correct!";
        feedback.style.color = "#39d76b";
        launchConfetti();
    } else if (skipped) {
        feedback.textContent =
            `Skipped! The correct answer is: ${currentQuestion.correct}`;
        feedback.style.color = "#929292";
    } else {
        feedback.textContent =
            `Incorrect! The correct answer is: ${currentQuestion.correct}`;
        feedback.style.color = "#ff5252";
    }

    graphData.push({
        question: questionsAnswered,
        time: elapsed,
        result: skipped ? "skipped" : isCorrect ? "correct" : "incorrect"
    });

    if (selectedButton) {
        selectedButton.classList.add(
            isCorrect ? "correct" : "incorrect"
        );
    }

    if (currentQuestion.type === "multiple") {
        multipleChoice.querySelectorAll("button").forEach((button) => {
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
    skipAnswer.hidden = true;

    updateProgress();
    drawGraph();

    nextQuestionButton.hidden = false;
    nextQuestionButton.focus();
}

function updateProgress() {
    const percentage = questionsAnswered
        ? Math.round((score / questionsAnswered) * 100)
        : 0;

    progress.textContent =
        `Answered: ${questionsAnswered} | Score: ${score}/${questionsAnswered} | ${percentage}%`;
}

function launchConfetti() {
    const colours = [
        "#39d76b",
        "#00cfdb",
        "#ff5252",
        "#ffcc66",
        "#bd7bff",
        "#ffffff",
        "#ff79c6"
    ];

    for (let i = 0; i < 5000; i++) {
        const piece = document.createElement("span");

        piece.className = "confetti-piece";
        piece.style.left = `${Math.random() * 100}%`;
        piece.style.backgroundColor =
            colours[Math.floor(Math.random() * colours.length)];
        piece.style.setProperty(
            "--drift",
            `${Math.random() * 300 - 150}px`
        );
        piece.style.setProperty(
            "--duration",
            `${2 + Math.random() * 2}s`
        );
        piece.style.animationDelay = `${Math.random() * 0.5}s`;

        confetti.appendChild(piece);

        piece.addEventListener("animationend", () => {
            piece.remove();
        });
    }
}

function drawGraph() {
    const width = graph.clientWidth;
    const height = graph.clientHeight;

    if (!width || !height) return;

    const dpr = window.devicePixelRatio || 1;

    graph.width = Math.round(width * dpr);
    graph.height = Math.round(height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const margin = {
        top: 20,
        right: 20,
        bottom: 45,
        left: 55
    };

    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    if (plotWidth <= 0 || plotHeight <= 0) return;

    const maxTime = Math.max(
        5,
        Math.ceil(Math.max(0, ...graphData.map(point => point.time)) / 5) * 5
    );

    const maxQuestions = Math.max(5, graphData.length);

    const x = question =>
        margin.left + ((question - 1) / Math.max(1, maxQuestions - 1)) * plotWidth;

    const y = time =>
        margin.top + plotHeight - (time / maxTime) * plotHeight;

    ctx.font = "12px Arial";
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#383838";
    ctx.fillStyle = "#aaaaaa";

    const divisions = 5;

    for (let i = 0; i <= divisions; i++) {
        const value = (maxTime / divisions) * i;
        const py = y(value);

        ctx.beginPath();
        ctx.moveTo(margin.left, py);
        ctx.lineTo(width - margin.right, py);
        ctx.stroke();

        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(`${value.toFixed(1)}s`, margin.left - 9, py);
    }

    ctx.strokeStyle = "#777777";
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, height - margin.bottom);
    ctx.lineTo(width - margin.right, height - margin.bottom);
    ctx.stroke();

    const xLabels = Math.min(maxQuestions, 6);

    for (let i = 0; i < xLabels; i++) {
        const questionNumber = xLabels === 1
            ? 1
            : Math.round(1 + (i / (xLabels - 1)) * (maxQuestions - 1));

        const px = x(questionNumber);

        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(String(questionNumber), px, height - margin.bottom + 10);
    }

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
        "All Questions",
        margin.left + plotWidth / 2,
        height - 8
    );

    ctx.save();
    ctx.translate(14, margin.top + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("Time per Question (seconds)", 0, 0);
    ctx.restore();

    if (graphData.length === 0) {
        ctx.fillStyle = "#777777";
        ctx.textAlign = "center";
        ctx.fillText(
            "Answer a question to start the graph",
            margin.left + plotWidth / 2,
            margin.top + plotHeight / 2
        );
        return;
    }

    ctx.strokeStyle = "#777777";
    ctx.lineWidth = 2;
    ctx.beginPath();

    graphData.forEach((point, index) => {
        const px = x(point.question);
        const py = y(point.time);

        if (index === 0) {
            ctx.moveTo(px, py);
        } else {
            ctx.lineTo(px, py);
        }
    });

    ctx.stroke();

    graphData.forEach((point) => {
        const px = x(point.question);
        const py = y(point.time);

        const colour = point.result === "correct"
            ? "#39d76b"
            : point.result === "incorrect"
                ? "#ff5252"
                : "#929292";

        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = colour;
        ctx.fill();

        ctx.lineWidth = 2;
        ctx.strokeStyle = "#141414";
        ctx.stroke();
    });
}

submitAnswer.addEventListener("click", () => {
    if (!shortAnswerInput.value.trim()) {
        feedback.textContent = "Please enter an answer.";
        feedback.style.color = "#ffcc66";
        return;
    }

    checkAnswer(shortAnswerInput.value);
});

skipAnswer.addEventListener("click", () => {
    finishQuestion(false, null, true);
});

shortAnswerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !answered) {
        submitAnswer.click();
    }
});

nextQuestionButton.addEventListener("click", showQuestion);

window.addEventListener("resize", drawGraph);

if ("ResizeObserver" in window) {
    new ResizeObserver(drawGraph).observe(graph);
}

drawGraph();
loadQuestions();
