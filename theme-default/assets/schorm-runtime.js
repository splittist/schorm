/**
 * schorm SCORM Runtime
 * 
 * This file provides the JavaScript runtime for SCORM 2004 API integration.
 * It handles communication with the LMS via the SCORM API adapter and manages
 * student progress, completion status, and score tracking.
 * 
 * @version 0.3.0
 * @license MIT
 */

(function() {
  'use strict';

  // ============================================================================
  // SCORM API Integration
  // ============================================================================

  const SchormRuntime = {
    api: null,
    isInitialized: false,
    isPreviewMode: false,

    /**
     * Find the SCORM API object by searching the window hierarchy
     */
    findAPI: function(win) {
      let findAttempts = 0;
      const maxAttempts = 500;
      
      while (win.API_1484_11 == null && win.parent != null && win.parent != win) {
        findAttempts++;
        if (findAttempts > maxAttempts) {
          return null;
        }
        win = win.parent;
      }
      
      return win.API_1484_11;
    },

    /**
     * Initialize the SCORM runtime
     */
    init: function() {
      if (this.isInitialized) {
        return true;
      }

      // Try to find SCORM API
      this.api = this.findAPI(window);
      
      if (this.api == null) {
        console.log('schorm: preview mode - no SCORM API found');
        this.isPreviewMode = true;
        this.isInitialized = true;
        return true;
      }

      // Initialize SCORM session
      const result = this.api.Initialize('');
      if (result === 'true') {
        this.isInitialized = true;
        console.log('schorm: SCORM API initialized');
        return true;
      } else {
        console.error('schorm: Failed to initialize SCORM API');
        return false;
      }
    },

    /**
     * Get a value from the SCORM API
     */
    getValue: function(element) {
      if (!this.isInitialized) {
        this.init();
      }

      if (this.isPreviewMode) {
        return '';
      }

      return this.api.GetValue(element);
    },

    /**
     * Set a value in the SCORM API
     */
    setValue: function(element, value) {
      if (!this.isInitialized) {
        this.init();
      }

      if (this.isPreviewMode) {
        console.log('schorm: preview mode setValue:', element, '=', value);
        return true;
      }

      const result = this.api.SetValue(element, value);
      return result === 'true';
    },

    /**
     * Commit data to LMS
     */
    commit: function() {
      if (!this.isInitialized) {
        return false;
      }

      if (this.isPreviewMode) {
        console.log('schorm: preview mode commit');
        return true;
      }

      const result = this.api.Commit('');
      return result === 'true';
    },

    /**
     * Terminate SCORM session
     */
    terminate: function() {
      if (!this.isInitialized || this.isPreviewMode) {
        return true;
      }

      const result = this.api.Terminate('');
      if (result === 'true') {
        this.isInitialized = false;
        return true;
      }
      return false;
    }
  };

  // ============================================================================
  // Quiz Scoring Logic
  // ============================================================================

  const SchormQuiz = {
    /**
     * Default passing score threshold (80%)
     */
    DEFAULT_PASSING_SCORE: 0.8,

    /**
     * Decide if a quiz result is a "pass".
     *
     * @param {number} scaledScore - number in [0, 1] (e.g. 0.8 for 80%)
     * @param {number} [passingScore] - number in [0, 1], default 0.8
     * @returns {boolean} true if scaledScore >= passingScore
     */
    quizPassed: function(scaledScore, passingScore) {
      // Use default passing score if not provided
      const threshold = (typeof passingScore === 'number') ? passingScore : this.DEFAULT_PASSING_SCORE;
      
      // Validate scaledScore is a number, default to 0 if not
      const score = (typeof scaledScore === 'number' && !isNaN(scaledScore)) ? scaledScore : 0;
      
      // Clamp score to [0, 1]
      const clampedScore = Math.max(0, Math.min(1, score));
      
      return clampedScore >= threshold;
    },

    /**
     * Set SCORM 2004 completion/success/score fields for the current SCO and commit them.
     *
     * @param {string} quizId - Quiz identifier
     * @param {Object} result - QuizResult object with totalScore, maxScore, scaledScore, passed
     */
    markScoComplete: function(quizId, result) {
      // Validate result object
      if (!result || typeof result !== 'object') {
        console.error('schorm: markScoComplete called with invalid result object');
        return;
      }

      // Extract values with defaults for missing properties
      const totalScore = (typeof result.totalScore === 'number') ? result.totalScore : 0;
      const maxScore = (typeof result.maxScore === 'number') ? result.maxScore : 0;
      const scaledScore = (typeof result.scaledScore === 'number') ? result.scaledScore : 0;
      const passed = (typeof result.passed === 'boolean') ? result.passed : false;

      // Ensure SCORM is initialized
      SchormRuntime.init();

      if (SchormRuntime.isPreviewMode) {
        // Preview mode: log and store in localStorage
        const resultData = {
          quizId: quizId,
          totalScore: totalScore,
          maxScore: maxScore,
          scaledScore: scaledScore,
          passed: passed,
          timestamp: new Date().toISOString()
        };

        console.log('schorm: preview – markScoComplete quizId="' + quizId + '" result=', resultData);

        try {
          localStorage.setItem('schorm:quiz:' + quizId, JSON.stringify(resultData));
        } catch (e) {
          console.error('schorm: Failed to save quiz result to localStorage', e);
        }
      } else {
        // LMS mode: set SCORM data model values
        SchormRuntime.setValue('cmi.score.raw', totalScore.toString());
        SchormRuntime.setValue('cmi.score.max', maxScore.toString());
        SchormRuntime.setValue('cmi.score.scaled', scaledScore.toFixed(2));
        SchormRuntime.setValue('cmi.success_status', passed ? 'passed' : 'failed');
        SchormRuntime.setValue('cmi.completion_status', 'completed');
        SchormRuntime.commit();
      }
    },

    /**
     * Collect user answers from the DOM
     * @returns {Object} Map of question ID to user answer
     */
    collectUserAnswersFromDom: function() {
      const answers = {};
      const questions = document.querySelectorAll('.question');

      questions.forEach(function(questionElement) {
        const questionId = questionElement.dataset.questionId;
        const questionType = questionElement.dataset.questionType;

        switch (questionType) {
          case 'single-choice':
          case 'true-false':
            const selectedRadio = questionElement.querySelector('input[type="radio"]:checked');
            if (selectedRadio) {
              answers[questionId] = selectedRadio.value;
            }
            break;

          case 'multiple-response':
            const selectedCheckboxes = questionElement.querySelectorAll('input[type="checkbox"]:checked');
            answers[questionId] = Array.from(selectedCheckboxes).map(cb => cb.value);
            break;

          case 'fill-blank':
            const inputs = questionElement.querySelectorAll('.fill-blank-input');
            const blankAnswers = {};
            inputs.forEach(function(input) {
              const blankId = input.dataset.blankId;
              blankAnswers[blankId] = input.value;
            });
            answers[questionId] = blankAnswers;
            break;

          case 'matching':
            const selects = questionElement.querySelectorAll('.matching-select');
            const matchingAnswers = {};
            selects.forEach(function(select) {
              const premiseId = select.dataset.premiseId;
              matchingAnswers[premiseId] = select.value;
            });
            answers[questionId] = matchingAnswers;
            break;
        }
      });

      return answers;
    },

    /**
     * Check if a fill-blank answer is correct
     */
    checkFillBlankAnswer: function(userAnswer, correctAnswers, caseSensitive, trimWhitespace) {
      let answer = userAnswer || '';
      
      if (trimWhitespace !== false) {
        answer = answer.trim();
      }
      
      for (let i = 0; i < correctAnswers.length; i++) {
        let correctAnswer = correctAnswers[i];
        
        if (trimWhitespace !== false) {
          correctAnswer = correctAnswer.trim();
        }
        
        if (caseSensitive) {
          if (answer === correctAnswer) {
            return true;
          }
        } else {
          if (answer.toLowerCase() === correctAnswer.toLowerCase()) {
            return true;
          }
        }
      }
      
      return false;
    },

    /**
     * Evaluate a single question
     * @param {Object} question - Question object from quiz model
     * @param {*} userAnswer - User's answer for this question
     * @returns {Object} Result with correct, score, maxScore
     */
    evaluateQuestion: function(question, userAnswer) {
      const points = question.points || 1;
      
      switch (question.type) {
        case 'single-choice':
          return this.evaluateSingleChoice(question, userAnswer, points);
        
        case 'true-false':
          return this.evaluateTrueFalse(question, userAnswer, points);
        
        case 'multiple-response':
          return this.evaluateMultipleResponse(question, userAnswer, points);
        
        case 'fill-blank':
          return this.evaluateFillBlank(question, userAnswer, points);
        
        case 'matching':
          return this.evaluateMatching(question, userAnswer, points);
        
        default:
          return { correct: false, score: 0, maxScore: points };
      }
    },

    /**
     * Evaluate single-choice question
     */
    evaluateSingleChoice: function(question, userAnswer, points) {
      const correct = userAnswer === question.correct;
      return {
        correct: correct,
        score: correct ? points : 0,
        maxScore: points
      };
    },

    /**
     * Evaluate true-false question
     */
    evaluateTrueFalse: function(question, userAnswer, points) {
      const userBool = userAnswer === 'true' || userAnswer === true;
      const correct = userBool === question.correct;
      return {
        correct: correct,
        score: correct ? points : 0,
        maxScore: points
      };
    },

    /**
     * Evaluate multiple-response question
     */
    evaluateMultipleResponse: function(question, userAnswer, points) {
      if (!Array.isArray(userAnswer)) {
        return { correct: false, score: 0, maxScore: points };
      }

      // Sort both arrays for comparison
      const userSet = userAnswer.slice().sort();
      const correctSet = question.correct.slice().sort();
      
      // Check if arrays are equal
      const correct = userSet.length === correctSet.length &&
                      userSet.every((val, index) => val === correctSet[index]);
      
      return {
        correct: correct,
        score: correct ? points : 0,
        maxScore: points
      };
    },

    /**
     * Evaluate fill-blank question
     */
    evaluateFillBlank: function(question, userAnswer, points) {
      if (typeof userAnswer !== 'object' || userAnswer === null) {
        return { correct: false, score: 0, maxScore: points };
      }

      const blanks = question.blanks;
      let correctCount = 0;

      for (let i = 0; i < blanks.length; i++) {
        const blank = blanks[i];
        const userBlankAnswer = userAnswer[blank.id];
        
        if (userBlankAnswer !== undefined) {
          const isCorrect = this.checkFillBlankAnswer(
            userBlankAnswer,
            blank.correct_answers,
            blank.case_sensitive,
            blank.trim_whitespace
          );
          
          if (isCorrect) {
            correctCount++;
          }
        }
      }

      const allCorrect = correctCount === blanks.length;
      const score = blanks.length > 0 ? (correctCount / blanks.length) * points : 0;
      
      return {
        correct: allCorrect,
        score: score,
        maxScore: points
      };
    },

    /**
     * Evaluate matching question
     */
    evaluateMatching: function(question, userAnswer, points) {
      if (typeof userAnswer !== 'object' || userAnswer === null) {
        return { correct: false, score: 0, maxScore: points };
      }

      const correctPairs = question.correct_pairs;
      let allCorrect = true;

      for (let i = 0; i < correctPairs.length; i++) {
        const pair = correctPairs[i];
        const userResponse = userAnswer[pair.premise];
        
        if (userResponse !== pair.response) {
          allCorrect = false;
          break;
        }
      }

      return {
        correct: allCorrect,
        score: allCorrect ? points : 0,
        maxScore: points
      };
    },

    /**
     * Evaluate entire quiz
     * @param {Object} quizModel - Quiz object with questions
     * @param {Object} userAnswers - Map of question ID to user answer
     * @returns {Object} QuizResult with totalScore, maxScore, scaledScore, passed, perQuestion
     */
    evaluateQuiz: function(quizModel, userAnswers) {
      const perQuestion = [];
      let totalScore = 0;
      let maxScore = 0;

      for (let i = 0; i < quizModel.questions.length; i++) {
        const question = quizModel.questions[i];
        const userAnswer = userAnswers[question.id];
        const result = this.evaluateQuestion(question, userAnswer);

        perQuestion.push({
          id: question.id,
          correct: result.correct,
          score: result.score,
          maxScore: result.maxScore
        });

        totalScore += result.score;
        maxScore += result.maxScore;
      }

      const scaledScore = maxScore > 0 ? totalScore / maxScore : 0;
      const passingScore = quizModel.passing_score || this.DEFAULT_PASSING_SCORE;
      const passed = this.quizPassed(scaledScore, passingScore);

      return {
        totalScore: totalScore,
        maxScore: maxScore,
        scaledScore: scaledScore,
        passed: passed,
        perQuestion: perQuestion
      };
    },

    /**
     * Submit quiz result to SCORM API or localStorage
     * @param {string} quizId - Quiz identifier
     * @param {Object} result - QuizResult object
     */
    submitQuizResult: function(quizId, result) {
      // Delegate to markScoComplete for SCORM API handling
      this.markScoComplete(quizId, result);
    },

    /**
     * Check if all required answers are provided
     * @param {Object} quizModel - Quiz object
     * @param {Object} userAnswers - User answers
     * @returns {Object} { complete: boolean, missingCount: number }
     */
    checkAnswersComplete: function(quizModel, userAnswers) {
      let missingCount = 0;

      for (let i = 0; i < quizModel.questions.length; i++) {
        const question = quizModel.questions[i];
        const answer = userAnswers[question.id];

        if (answer === undefined || answer === null || answer === '') {
          missingCount++;
        } else if (question.type === 'multiple-response' && Array.isArray(answer) && answer.length === 0) {
          missingCount++;
        } else if (question.type === 'fill-blank') {
          const blanks = question.blanks;
          for (let j = 0; j < blanks.length; j++) {
            const blankId = blanks[j].id;
            if (!answer[blankId] || answer[blankId].trim() === '') {
              missingCount++;
              break;
            }
          }
        } else if (question.type === 'matching') {
          const pairs = question.correct_pairs;
          for (let j = 0; j < pairs.length; j++) {
            const premiseId = pairs[j].premise;
            if (!answer[premiseId]) {
              missingCount++;
              break;
            }
          }
        }
      }

      return {
        complete: missingCount === 0,
        missingCount: missingCount
      };
    },

    /**
     * Display quiz results in the UI
     * @param {Object} result - QuizResult object
     */
    displayResults: function(result) {
      const resultsDiv = document.getElementById('schorm-quiz-result');
      if (!resultsDiv) {
        return;
      }

      const percentage = Math.round(result.scaledScore * 100);
      const passFailText = result.passed ? 'Passed' : 'Failed';
      const passFailClass = result.passed ? 'passed' : 'failed';

      resultsDiv.innerHTML = 
        '<h2>Results</h2>' +
        '<p class="score">You scored ' + result.totalScore.toFixed(1) + '/' + result.maxScore + ' (' + percentage + '%). ' +
        '<span class="' + passFailClass + '">' + passFailText + '</span></p>';
      
      resultsDiv.style.display = 'block';
      resultsDiv.scrollIntoView({ behavior: 'smooth' });
    },

    /**
     * Initialize quiz submit handler
     */
    initQuizSubmit: function() {
      const submitButton = document.getElementById('schorm-quiz-submit');
      if (!submitButton) {
        return;
      }

      // Get quiz model from embedded data
      const quizDataElement = document.getElementById('schorm-quiz-data');
      if (!quizDataElement) {
        console.error('schorm: Quiz data not found');
        return;
      }

      let quizModel;
      try {
        quizModel = JSON.parse(quizDataElement.textContent);
      } catch (e) {
        console.error('schorm: Failed to parse quiz data', e);
        return;
      }

      submitButton.addEventListener('click', function(e) {
        e.preventDefault();

        // Collect user answers
        const userAnswers = SchormQuiz.collectUserAnswersFromDom();

        // Check if all answers are provided
        const completionCheck = SchormQuiz.checkAnswersComplete(quizModel, userAnswers);
        if (!completionCheck.complete) {
          alert('Please answer all questions before submitting.');
          return;
        }

        // Evaluate quiz
        const result = SchormQuiz.evaluateQuiz(quizModel, userAnswers);

        // Submit to SCORM/localStorage
        SchormQuiz.submitQuizResult(quizModel.id, result);

        // Display results
        SchormQuiz.displayResults(result);

        // Disable submit button
        submitButton.disabled = true;
      });
    }
  };

  // ============================================================================
  // Auto-initialization
  // ============================================================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      SchormRuntime.init();
      SchormQuiz.initQuizSubmit();
    });
  } else {
    SchormRuntime.init();
    SchormQuiz.initQuizSubmit();
  }

  // Export for use in page scripts
  window.SchormRuntime = SchormRuntime;
  window.SchormQuiz = SchormQuiz;
})();
