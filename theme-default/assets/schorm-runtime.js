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
        console.log('[SCHORM Preview] Preview mode enabled - no SCORM API found');
        this.isPreviewMode = true;
        this.isInitialized = true;
        return true;
      }

      // Initialize SCORM session
      const result = this.api.Initialize('');
      if (result === 'true') {
        this.isInitialized = true;
        console.log('[SCHORM] SCORM API initialized successfully');
        return true;
      } else {
        console.error('[SCHORM] Failed to initialize SCORM API');
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
        console.log('[SCHORM Preview] SCORM getValue:', element, '→ ""');
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
        console.log('[SCHORM Preview] SCORM setValue:', element, '=', value);
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
        console.log('[SCHORM Preview] SCORM commit');
        return true;
      }

      const result = this.api.Commit('');
      return result === 'true';
    },

    /**
     * Terminate SCORM session
     */
    terminate: function() {
      if (!this.isInitialized) {
        return true;
      }

      if (this.isPreviewMode) {
        console.log('[SCHORM Preview] SCORM terminate');
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

        console.log('[SCHORM Preview] Marking SCO complete, quizId="' + quizId + '"', resultData);

        try {
          localStorage.setItem('schorm:quiz:' + quizId, JSON.stringify(resultData));
          console.log('[SCHORM Preview] Quiz result saved to localStorage');
        } catch (e) {
          console.error('[SCHORM Preview] Failed to save quiz result to localStorage', e);
        }
      } else {
        // LMS mode: set SCORM data model values
        SchormRuntime.setValue('cmi.score.raw', totalScore.toString());
        SchormRuntime.setValue('cmi.score.max', maxScore.toString());
        SchormRuntime.setValue('cmi.score.scaled', scaledScore.toFixed(2));
        SchormRuntime.setValue('cmi.success_status', passed ? 'passed' : 'failed');
        SchormRuntime.setValue('cmi.completion_status', 'completed');

        // Set the primary objective status for sequencing support
        // This enables quiz-gated progression via SCORM 2004 sequencing
        // The objective ID format matches what the manifest generator creates
        SchormRuntime.setValue('cmi.objectives.0.id', 'local-' + quizId + '-passed');
        SchormRuntime.setValue('cmi.objectives.0.success_status', passed ? 'passed' : 'failed');
        SchormRuntime.setValue('cmi.objectives.0.completion_status', 'completed');
        SchormRuntime.setValue('cmi.objectives.0.score.scaled', scaledScore.toFixed(2));

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
      let result;
      
      switch (question.type) {
        case 'single-choice':
          result = this.evaluateSingleChoice(question, userAnswer, points);
          break;
        
        case 'true-false':
          result = this.evaluateTrueFalse(question, userAnswer, points);
          break;
        
        case 'multiple-response':
          result = this.evaluateMultipleResponse(question, userAnswer, points);
          break;
        
        case 'fill-blank':
          result = this.evaluateFillBlank(question, userAnswer, points);
          break;
        
        case 'matching':
          result = this.evaluateMatching(question, userAnswer, points);
          break;
        
        default:
          result = { correct: false, score: 0, maxScore: points };
      }

      if (SchormRuntime.isPreviewMode) {
        console.log('[SCHORM Preview] Scoring question:', {
          questionId: question.id,
          type: question.type,
          userAnswer: userAnswer,
          correct: result.correct,
          score: result.score,
          maxScore: result.maxScore
        });
      }

      return result;
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

        if (SchormRuntime.isPreviewMode) {
          console.log('[SCHORM Preview] Event: quiz submit button clicked');
        }

        // Collect user answers
        const userAnswers = SchormQuiz.collectUserAnswersFromDom();

        if (SchormRuntime.isPreviewMode) {
          console.log('[SCHORM Preview] Collected user answers:', userAnswers);
        }

        // Check if all answers are provided
        const completionCheck = SchormQuiz.checkAnswersComplete(quizModel, userAnswers);
        if (!completionCheck.complete) {
          if (SchormRuntime.isPreviewMode) {
            console.log('[SCHORM Preview] Incomplete answers, missing:', completionCheck.missingCount);
          }
          alert('Please answer all questions before submitting.');
          return;
        }

        // Evaluate quiz
        const result = SchormQuiz.evaluateQuiz(quizModel, userAnswers);

        if (SchormRuntime.isPreviewMode) {
          console.log('[SCHORM Preview] Quiz evaluation complete:', {
            totalScore: result.totalScore,
            maxScore: result.maxScore,
            scaledScore: result.scaledScore,
            passed: result.passed,
            perQuestion: result.perQuestion
          });
        }

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
  // Media Completion Tracking
  // ============================================================================

  const SchormMedia = {
    /**
     * Internal state for media completion tracking
     * Structure: { [mediaId: string]: { completed: boolean, completedAt?: number } }
     */
    _completionState: {},

    /**
     * List of all tracked media IDs on the current page
     */
    _trackedMediaIds: [],

    /**
     * Mark a media item as completed
     * @param {string} mediaId - The ID of the media item
     */
    markMediaCompleted: function(mediaId) {
      if (!mediaId) {
        return;
      }

      // Idempotent: only update if not already completed
      if (!this._completionState[mediaId] || !this._completionState[mediaId].completed) {
        this._completionState[mediaId] = {
          completed: true,
          completedAt: Date.now()
        };

        // Log in preview mode
        if (SchormRuntime.isPreviewMode) {
          console.log('[SCHORM Preview] Event: media ended, mediaId="' + mediaId + '"');
        }

        // Persist to localStorage in preview mode
        this._persistState();

        // Check if all media completed
        if (this.allMediaCompleted()) {
          if (SchormRuntime.isPreviewMode) {
            console.log('[SCHORM Preview] All tracked media completed');
          }
        }
      }
    },

    /**
     * Check if a media item has been completed
     * @param {string} mediaId - The ID of the media item
     * @returns {boolean} True if the media has been completed
     */
    isMediaCompleted: function(mediaId) {
      if (!mediaId) {
        return false;
      }
      return !!(this._completionState[mediaId] && this._completionState[mediaId].completed);
    },

    /**
     * Get the full completion state for all tracked media
     * @returns {Object} MediaCompletionState object
     */
    getMediaCompletionState: function() {
      // Return a copy to prevent external modification
      var state = {};
      for (var key in this._completionState) {
        if (this._completionState.hasOwnProperty(key)) {
          state[key] = {
            completed: this._completionState[key].completed,
            completedAt: this._completionState[key].completedAt
          };
        }
      }
      return state;
    },

    /**
     * Check if all tracked media items have been completed
     * @returns {boolean} True if all media have been completed
     */
    allMediaCompleted: function() {
      if (this._trackedMediaIds.length === 0) {
        return true;
      }

      for (var i = 0; i < this._trackedMediaIds.length; i++) {
        var mediaId = this._trackedMediaIds[i];
        if (!this.isMediaCompleted(mediaId)) {
          return false;
        }
      }
      return true;
    },

    /**
     * Initialize media completion tracking
     * Finds all .schorm-media[data-id] elements and attaches event listeners
     */
    initMediaCompletionTracking: function() {
      var self = this;

      // Reset state
      this._completionState = {};
      this._trackedMediaIds = [];

      // Find all media containers with data-id
      var mediaContainers = document.querySelectorAll('.schorm-media[data-id]');

      for (var i = 0; i < mediaContainers.length; i++) {
        var container = mediaContainers[i];
        var mediaId = container.getAttribute('data-id');
        if (!mediaId) {
          continue;
        }

        // Track this media ID
        self._trackedMediaIds.push(mediaId);

        // Find nested audio or video element
        var mediaElement = container.querySelector('audio, video');
        if (!mediaElement) {
          continue;
        }

        // Attach ended event listener using closure to capture mediaId
        (function(id) {
          mediaElement.addEventListener('ended', function() {
            self.markMediaCompleted(id);
          });
        })(mediaId);
      }

      // Load persisted state from localStorage in preview mode
      this._loadPersistedState();

      if (SchormRuntime.isPreviewMode && this._trackedMediaIds.length > 0) {
        console.log('[SCHORM Preview] Tracking ' + this._trackedMediaIds.length + ' media element(s):', this._trackedMediaIds);
      }
    },

    /**
     * Get the storage key for persisting media state
     * @returns {string} localStorage key
     */
    _getStorageKey: function() {
      // Use the page path as a simple SCO identifier
      return 'schorm:media:' + window.location.pathname;
    },

    /**
     * Persist completion state to localStorage (preview mode only)
     */
    _persistState: function() {
      if (!SchormRuntime.isPreviewMode) {
        return;
      }

      try {
        localStorage.setItem(this._getStorageKey(), JSON.stringify(this._completionState));
      } catch (e) {
        console.error('schorm: Failed to persist media state', e);
      }
    },

    /**
     * Load persisted state from localStorage (preview mode only)
     */
    _loadPersistedState: function() {
      if (!SchormRuntime.isPreviewMode) {
        return;
      }

      try {
        var stored = localStorage.getItem(this._getStorageKey());
        if (stored) {
          var parsed = JSON.parse(stored);
          // Merge persisted state (only for tracked media IDs)
          for (var i = 0; i < this._trackedMediaIds.length; i++) {
            var mediaId = this._trackedMediaIds[i];
            if (parsed[mediaId] && parsed[mediaId].completed) {
              this._completionState[mediaId] = parsed[mediaId];
            }
          }
        }
      } catch (e) {
        console.error('schorm: Failed to load persisted media state', e);
      }
    }
  };

  // ============================================================================
  // Debug Helpers
  // ============================================================================

  const SchormDebug = {
    /**
     * Dump the current media completion state to the console
     */
    dumpMediaState: function() {
      console.log('[SCHORM Debug] Media Completion State');
      console.log('  Tracked IDs:', SchormMedia._trackedMediaIds);
      console.log('  Completion State:', SchormMedia.getMediaCompletionState());
      console.log('  All Completed:', SchormMedia.allMediaCompleted());
    },

    /**
     * Dump the current quiz state to the console
     */
    dumpQuizAnswers: function() {
      const answers = SchormQuiz.collectUserAnswersFromDom();
      console.log('[SCHORM Debug] Current Quiz Answers:', answers);
    },

    /**
     * Check if preview mode is active
     */
    isPreviewMode: function() {
      console.log('[SCHORM Debug] Preview mode:', SchormRuntime.isPreviewMode);
      return SchormRuntime.isPreviewMode;
    }
  };

  // ============================================================================
  // Auto-initialization
  // ============================================================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      SchormRuntime.init();
      SchormQuiz.initQuizSubmit();
      SchormMedia.initMediaCompletionTracking();
    });
  } else {
    SchormRuntime.init();
    SchormQuiz.initQuizSubmit();
    SchormMedia.initMediaCompletionTracking();
  }

  // Export for use in page scripts
  window.SchormRuntime = SchormRuntime;
  window.SchormQuiz = SchormQuiz;
  window.SchormMedia = SchormMedia;
  window.schormDebug = SchormDebug;
})();
