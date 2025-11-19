/**
 * schorm SCORM Runtime
 * 
 * This file provides the JavaScript runtime for SCORM 2004 API integration.
 * It handles communication with the LMS via the SCORM API adapter and manages
 * student progress, completion status, and score tracking.
 * 
 * Full implementation will be added in a future milestone.
 * 
 * @version 0.1.0
 * @license MIT
 */

(function() {
  'use strict';

  // SCORM API wrapper will be implemented here
  const SchormRuntime = {
    /**
     * Initialize the SCORM runtime
     */
    init: function() {
      console.log('schorm runtime initialized (stub)');
      // TODO: Implement SCORM API detection and initialization
    },

    /**
     * Find the SCORM API object
     */
    findAPI: function() {
      // TODO: Implement recursive search for SCORM API in window hierarchy
      return null;
    },

    /**
     * Set completion status
     */
    setCompleted: function() {
      console.log('setCompleted called (stub)');
      // TODO: Implement LMSSetValue('cmi.completion_status', 'completed')
    },

    /**
     * Set score
     */
    setScore: function(score, min, max) {
      console.log('setScore called (stub):', score, min, max);
      // TODO: Implement LMSSetValue('cmi.score.scaled', scaled_score)
    },

    /**
     * Commit data to LMS
     */
    commit: function() {
      console.log('commit called (stub)');
      // TODO: Implement LMSCommit()
    },

    /**
     * Terminate SCORM session
     */
    terminate: function() {
      console.log('terminate called (stub)');
      // TODO: Implement LMSFinish()
    }
  };

  // Quiz handling functionality
  const SchormQuiz = {
    /**
     * Check if a fill-blank answer is correct
     */
    checkFillBlankAnswer: function(userAnswer, correctAnswers, caseSensitive, trimWhitespace) {
      let answer = userAnswer;
      
      // Apply whitespace trimming if enabled
      if (trimWhitespace) {
        answer = answer.trim();
      }
      
      // Check against all correct answers
      for (let i = 0; i < correctAnswers.length; i++) {
        let correctAnswer = correctAnswers[i];
        
        if (trimWhitespace) {
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
     * Grade a fill-blank question
     */
    gradeFillBlankQuestion: function(questionElement) {
      const inputs = questionElement.querySelectorAll('.fill-blank-input');
      let totalBlanks = inputs.length;
      let correctBlanks = 0;

      inputs.forEach(function(input) {
        const userAnswer = input.value;
        const correctAnswers = input.dataset.correctAnswers.split('|||');
        const caseSensitive = input.dataset.caseSensitive === 'true';
        const trimWhitespace = input.dataset.trimWhitespace !== 'false';

        const isCorrect = SchormQuiz.checkFillBlankAnswer(
          userAnswer,
          correctAnswers,
          caseSensitive,
          trimWhitespace
        );

        if (isCorrect) {
          correctBlanks++;
          input.classList.add('correct');
          input.classList.remove('incorrect');
        } else {
          input.classList.add('incorrect');
          input.classList.remove('correct');
        }
      });

      return {
        correct: correctBlanks === totalBlanks,
        score: totalBlanks > 0 ? correctBlanks / totalBlanks : 0,
        correctCount: correctBlanks,
        totalCount: totalBlanks
      };
    },

    /**
     * Grade a single-choice question
     */
    gradeSingleChoiceQuestion: function(questionElement) {
      const questionId = questionElement.dataset.questionId;
      const selectedInput = questionElement.querySelector('input[type="radio"]:checked');
      
      if (!selectedInput) {
        return { correct: false, score: 0 };
      }
      
      const isCorrect = selectedInput.dataset.correct === 'true';
      
      // Mark all options
      const allInputs = questionElement.querySelectorAll('input[type="radio"]');
      allInputs.forEach(function(input) {
        const label = input.closest('label');
        if (input === selectedInput) {
          if (isCorrect) {
            label.classList.add('correct');
          } else {
            label.classList.add('incorrect');
          }
        }
      });
      
      return { correct: isCorrect, score: isCorrect ? 1 : 0 };
    },

    /**
     * Grade a multiple-response question
     */
    gradeMultipleResponseQuestion: function(questionElement) {
      const selectedInputs = questionElement.querySelectorAll('input[type="checkbox"]:checked');
      const allInputs = questionElement.querySelectorAll('input[type="checkbox"]');
      
      let allCorrect = true;
      let correctCount = 0;
      let totalCorrect = 0;
      
      allInputs.forEach(function(input) {
        const isCorrect = input.dataset.correct === 'true';
        const isChecked = input.checked;
        
        if (isCorrect) {
          totalCorrect++;
          if (isChecked) {
            correctCount++;
          } else {
            allCorrect = false;
          }
        } else if (isChecked) {
          allCorrect = false;
        }
        
        const label = input.closest('label');
        if (isChecked) {
          if (isCorrect) {
            label.classList.add('correct');
          } else {
            label.classList.add('incorrect');
          }
        }
      });
      
      return { 
        correct: allCorrect, 
        score: totalCorrect > 0 ? correctCount / totalCorrect : 0 
      };
    },

    /**
     * Grade a true/false question
     */
    gradeTrueFalseQuestion: function(questionElement) {
      const selectedInput = questionElement.querySelector('input[type="radio"]:checked');
      
      if (!selectedInput) {
        return { correct: false, score: 0 };
      }
      
      const isCorrect = selectedInput.dataset.correct === 'true';
      
      const allInputs = questionElement.querySelectorAll('input[type="radio"]');
      allInputs.forEach(function(input) {
        const label = input.closest('label');
        if (input === selectedInput) {
          if (isCorrect) {
            label.classList.add('correct');
          } else {
            label.classList.add('incorrect');
          }
        }
      });
      
      return { correct: isCorrect, score: isCorrect ? 1 : 0 };
    },

    /**
     * Initialize quiz form handler
     */
    initQuizForm: function() {
      const quizForm = document.getElementById('quiz-form');
      if (!quizForm) {
        return;
      }

      quizForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const questions = quizForm.querySelectorAll('.question');
        let totalScore = 0;
        let maxScore = questions.length;
        let correctCount = 0;

        questions.forEach(function(questionElement) {
          const questionType = questionElement.dataset.questionType;
          let result;

          switch (questionType) {
            case 'fill-blank':
              result = SchormQuiz.gradeFillBlankQuestion(questionElement);
              break;
            case 'single-choice':
              result = SchormQuiz.gradeSingleChoiceQuestion(questionElement);
              break;
            case 'multiple-response':
              result = SchormQuiz.gradeMultipleResponseQuestion(questionElement);
              break;
            case 'true-false':
              result = SchormQuiz.gradeTrueFalseQuestion(questionElement);
              break;
            default:
              result = { correct: false, score: 0 };
          }

          if (result.correct) {
            correctCount++;
          }
          totalScore += result.score;
        });

        // Display results
        const percentage = Math.round((totalScore / maxScore) * 100);
        const resultsDiv = document.getElementById('quiz-results');
        const scoreValue = document.getElementById('score-value');
        
        if (scoreValue) {
          scoreValue.textContent = percentage + '% (' + correctCount + '/' + questions.length + ' correct)';
        }
        
        if (resultsDiv) {
          resultsDiv.style.display = 'block';
        }

        // Scroll to results
        resultsDiv.scrollIntoView({ behavior: 'smooth' });

        // Report to SCORM
        SchormRuntime.setScore(percentage, 0, 100);
        SchormRuntime.setCompleted();
        SchormRuntime.commit();
      });
    }
  };

  // Auto-initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      SchormRuntime.init();
      SchormQuiz.initQuizForm();
    });
  } else {
    SchormRuntime.init();
    SchormQuiz.initQuizForm();
  }

  // Export for use in page scripts
  window.SchormRuntime = SchormRuntime;
  window.SchormQuiz = SchormQuiz;
})();
