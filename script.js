class MathGame {
    constructor() {
        this.state = {
            totalQuestions: 10,
            currentQuestionIndex: 0,
            score: 0,
            questions: [],
            results: [], // { question: "3x4", userAnswer: 12, correctAnswer: 12, time: 1.2, isCorrect: true }
            questionStartTime: 0,
            settings: {
                operations: [],
                ranges: {
                    op1: { min: 0, max: 9 },
                    op2: { min: 0, max: 9 }
                }
            }
        };

        this.elements = {
            screens: {
                start: document.getElementById('start-screen'),
                game: document.getElementById('game-screen'),
                result: document.getElementById('result-screen')
            },
            inputs: {
                questionCount: document.getElementById('question-count'),
                answer: document.getElementById('answer-input'),
                op1Min: document.getElementById('op1-min'),
                op1Max: document.getElementById('op1-max'),
                op2Min: document.getElementById('op2-min'),
                op2Max: document.getElementById('op2-max'),
                operations: document.querySelectorAll('input[name="operation"]')
            },
            display: {
                questionCounter: document.getElementById('question-counter'),
                progressFill: document.getElementById('progress-fill'),
                factor1: document.getElementById('factor1'),
                operator: document.querySelector('.operator'),
                factor2: document.getElementById('factor2'),
                feedback: document.getElementById('feedback'),
                avgTime: document.getElementById('avg-time'),
                scoreText: document.getElementById('score-text'),
                wrongAnswersList: document.getElementById('wrong-answers-list'),
                wrongAnswersSection: document.getElementById('wrong-answers-section')
            },
            buttons: {
                start: document.getElementById('start-btn'),
                restart: document.getElementById('restart-btn'),
                themeToggle: document.getElementById('theme-toggle')
            }
        };

        this.init();
    }

    init() {
        this.elements.buttons.start.addEventListener('click', () => this.startGame());
        this.elements.buttons.restart.addEventListener('click', () => this.resetGame());
        this.elements.buttons.themeToggle.addEventListener('click', () => this.toggleTheme());

        this.elements.inputs.answer.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleAnswer();
            }
        });

        // Prevent non-numeric input (extra safety)
        this.elements.inputs.answer.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9-]/g, '');
        });

        // Load saved theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.body.classList.add('dark-mode');
            this.updateThemeIcon(true);
        } else {
            this.updateThemeIcon(false);
        }
    }

    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        this.updateThemeIcon(isDark);
    }

    updateThemeIcon(isDark) {
        const sunIcon = this.elements.buttons.themeToggle.querySelector('.sun-icon');
        const moonIcon = this.elements.buttons.themeToggle.querySelector('.moon-icon');
        if (isDark) {
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
        } else {
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        }
    }

    startGame() {
        // Get Settings
        const count = parseInt(this.elements.inputs.questionCount.value);
        const selectedOps = Array.from(this.elements.inputs.operations)
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        if (selectedOps.length === 0) {
            alert('Lütfen en az bir işlem seçin.');
            return;
        }

        this.state.settings.operations = selectedOps;
        this.state.settings.ranges.op1.min = parseInt(this.elements.inputs.op1Min.value) || 0;
        this.state.settings.ranges.op1.max = parseInt(this.elements.inputs.op1Max.value) || 9;
        this.state.settings.ranges.op2.min = parseInt(this.elements.inputs.op2Min.value) || 0;
        this.state.settings.ranges.op2.max = parseInt(this.elements.inputs.op2Max.value) || 9;

        // Validate Ranges
        if (this.state.settings.ranges.op1.min > this.state.settings.ranges.op1.max) {
            [this.state.settings.ranges.op1.min, this.state.settings.ranges.op1.max] = [this.state.settings.ranges.op1.max, this.state.settings.ranges.op1.min];
        }
        if (this.state.settings.ranges.op2.min > this.state.settings.ranges.op2.max) {
            [this.state.settings.ranges.op2.min, this.state.settings.ranges.op2.max] = [this.state.settings.ranges.op2.max, this.state.settings.ranges.op2.min];
        }

        this.state.totalQuestions = count;
        this.state.currentQuestionIndex = 0;
        this.state.score = 0;
        this.state.results = [];

        this.generateQuestions(count);
        this.switchScreen('game');
        this.showNextQuestion();
    }

    generateQuestions(count) {
        this.state.questions = [];
        const { operations, ranges } = this.state.settings;

        for (let i = 0; i < count; i++) {
            const op = operations[Math.floor(Math.random() * operations.length)];
            let n1, n2;

            if (op === '/') {
                // Division: Result should be integer. n1 = n2 * result.
                // We generate n2 (divisor) and result (quotient).
                // n2 from op2 range. result from op1 range (conceptually n1 is the dividend, but usually we limit the result size or the dividend size).
                // Let's stick to: n2 from op2 range. n1 from op1 range.
                // But n1 must be divisible by n2.
                // Strategy: Generate n2. Generate result. n1 = n2 * result. Check if n1 is in op1 range.

                let valid = false;
                let attempts = 0;
                while (!valid && attempts < 100) {
                    // Avoid division by zero
                    let min2 = Math.max(1, ranges.op2.min);
                    let max2 = Math.max(1, ranges.op2.max);
                    if (min2 > max2) min2 = max2;

                    n2 = Math.floor(Math.random() * (max2 - min2 + 1)) + min2;

                    // Estimate max result to keep n1 within max op1 range
                    const maxResult = Math.floor(ranges.op1.max / n2);
                    const minResult = Math.ceil(ranges.op1.min / n2);

                    if (maxResult >= minResult) {
                        const result = Math.floor(Math.random() * (maxResult - minResult + 1)) + minResult;
                        n1 = n2 * result;
                        valid = true;
                    }
                    attempts++;
                }
                // Fallback if generation fails
                if (!valid) {
                    n2 = Math.floor(Math.random() * 9) + 1;
                    n1 = n2 * (Math.floor(Math.random() * 9) + 1);
                }

            } else if (op === '-') {
                // Subtraction: n1 >= n2
                let valid = false;
                let attempts = 0;
                while (!valid && attempts < 100) {
                    n1 = Math.floor(Math.random() * (ranges.op1.max - ranges.op1.min + 1)) + ranges.op1.min;
                    n2 = Math.floor(Math.random() * (ranges.op2.max - ranges.op2.min + 1)) + ranges.op2.min;
                    if (n1 >= n2) valid = true;
                    attempts++;
                }
                if (!valid) {
                    // Force valid
                    n1 = 10; n2 = 5;
                }
            } else {
                // Addition and Multiplication
                n1 = Math.floor(Math.random() * (ranges.op1.max - ranges.op1.min + 1)) + ranges.op1.min;
                n2 = Math.floor(Math.random() * (ranges.op2.max - ranges.op2.min + 1)) + ranges.op2.min;
            }

            this.state.questions.push({ n1, n2, op });
        }
    }

    showNextQuestion() {
        if (this.state.currentQuestionIndex >= this.state.totalQuestions) {
            this.endGame();
            return;
        }

        const q = this.state.questions[this.state.currentQuestionIndex];

        // Update UI
        this.elements.display.factor1.textContent = q.n1;
        this.elements.display.factor2.textContent = q.n2;

        let opSymbol = '';
        switch (q.op) {
            case '+': opSymbol = '+'; break;
            case '-': opSymbol = '-'; break;
            case '*': opSymbol = '×'; break;
            case '/': opSymbol = '÷'; break;
        }
        this.elements.display.operator.textContent = opSymbol;

        this.elements.display.questionCounter.textContent = `Soru ${this.state.currentQuestionIndex + 1}/${this.state.totalQuestions}`;

        const progressPercent = (this.state.currentQuestionIndex / this.state.totalQuestions) * 100;
        this.elements.display.progressFill.style.width = `${progressPercent}%`;

        // Reset Input
        this.elements.inputs.answer.value = '';
        this.elements.inputs.answer.focus();

        // Start Timer
        this.state.questionStartTime = performance.now();
    }

    handleAnswer() {
        const inputVal = this.elements.inputs.answer.value;
        if (inputVal === '') return;

        const userAnswer = parseInt(inputVal);
        const currentQ = this.state.questions[this.state.currentQuestionIndex];

        let correctAnswer;
        switch (currentQ.op) {
            case '+': correctAnswer = currentQ.n1 + currentQ.n2; break;
            case '-': correctAnswer = currentQ.n1 - currentQ.n2; break;
            case '*': correctAnswer = currentQ.n1 * currentQ.n2; break;
            case '/': correctAnswer = currentQ.n1 / currentQ.n2; break;
        }

        const isCorrect = userAnswer === correctAnswer;
        const timeTaken = (performance.now() - this.state.questionStartTime) / 1000; // seconds

        // Record Result
        let opSymbol = '';
        switch (currentQ.op) {
            case '+': opSymbol = '+'; break;
            case '-': opSymbol = '-'; break;
            case '*': opSymbol = '×'; break;
            case '/': opSymbol = '÷'; break;
        }

        this.state.results.push({
            question: `${currentQ.n1} ${opSymbol} ${currentQ.n2}`,
            userAnswer,
            correctAnswer,
            time: timeTaken,
            isCorrect
        });

        if (isCorrect) {
            this.state.score++;
            this.showFeedback(true);
        } else {
            this.showFeedback(false);
        }

        this.state.currentQuestionIndex++;

        // Small delay to show feedback before next question
        setTimeout(() => {
            this.showNextQuestion();
        }, 300);
    }

    showFeedback(isCorrect) {
        // Visual feedback could be added here
    }

    endGame() {
        // Calculate Stats
        const correctAnswers = this.state.results.filter(r => r.isCorrect);
        const totalTime = correctAnswers.reduce((sum, r) => sum + r.time, 0);
        const avgTime = correctAnswers.length > 0 ? (totalTime / correctAnswers.length).toFixed(1) : '0.0';

        // Update Result Screen
        this.elements.display.avgTime.textContent = `${avgTime}s`;
        this.elements.display.scoreText.textContent = `${this.state.score}/${this.state.totalQuestions}`;

        // Wrong Answers
        const wrongAnswers = this.state.results.filter(r => !r.isCorrect);
        this.elements.display.wrongAnswersList.innerHTML = '';

        if (wrongAnswers.length > 0) {
            this.elements.display.wrongAnswersSection.classList.remove('hidden');
            wrongAnswers.forEach(r => {
                const item = document.createElement('div');
                item.className = 'wrong-item';
                item.innerHTML = `
                    <span class="question">${r.question}</span>
                    <div>
                        <span class="user-ans">${r.userAnswer}</span>
                        <span class="correct-ans">${r.correctAnswer}</span>
                    </div>
                `;
                this.elements.display.wrongAnswersList.appendChild(item);
            });
        } else {
            this.elements.display.wrongAnswersSection.classList.add('hidden');
        }

        this.switchScreen('result');
    }

    resetGame() {
        this.switchScreen('start');
    }

    switchScreen(screenName) {
        Object.values(this.elements.screens).forEach(el => {
            el.classList.add('hidden');
            el.classList.remove('active');
        });

        const target = this.elements.screens[screenName];
        target.classList.remove('hidden');
        // Small timeout to allow display:block to apply before opacity transition
        setTimeout(() => {
            target.classList.add('active');
        }, 10);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new MathGame();
});
