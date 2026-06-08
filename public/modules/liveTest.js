/* ==========================================================================
   LITCRACK LIVE TEST LOBBY & WEBSOCKET CLIENT (REAL-TIME APTITUDE ARENA)
   ========================================================================== */

(function() {
  let socket = null;
  let currentRoomCode = null;
  let userRole = null; // 'admin' or 'student'
  let studentName = "";
  let liveRoomType = "aptitude";
  let interviewScoresHistory = [];
  let speechRecognition = null;
  let isListening = false;
  
  // Live quiz state
  let liveQuestions = [];
  let currentQuestionIndex = 0;
  let studentAnswers = {}; // questionId -> selectedOptionIndex
  let testDuration = 300;

  // DOM Elements
  const viewSelection = document.getElementById('live-selection-panel');
  const viewLobby = document.getElementById('live-lobby-panel');
  const viewTest = document.getElementById('live-test-panel');
  const viewResults = document.getElementById('live-results-panel');
  
  const inputName = document.getElementById('student-name');
  const inputRoomCode = document.getElementById('room-code-input');
  
  const btnJoin = document.getElementById('btn-join-room');
  const btnCreate = document.getElementById('btn-create-room');
  const btnStartTest = document.getElementById('btn-start-live-test');
  const btnPrev = document.getElementById('btn-live-prev');
  const btnNext = document.getElementById('btn-live-next');
  const btnExit = document.getElementById('btn-exit-test');
  
  const displayLobbyCode = document.getElementById('lobby-code-display');
  const containerLobbyUsers = document.getElementById('lobby-users-container');
  const lobbyEmptyText = document.getElementById('lobby-empty-text');
  
  const adminControlsBox = document.getElementById('admin-controls-box');
  const studentWaitingBox = document.getElementById('student-waiting-box');
  
  const displayLiveProgress = document.getElementById('live-progress-display');
  const displayLiveTimer = document.getElementById('live-timer-display');
  const displayQuestionTitle = document.getElementById('live-question-title');
  const containerOptions = document.getElementById('live-options-container');

  const tbodyLeaderboard = document.getElementById('leaderboard-tbody');
  const colCertificate = document.getElementById('certificate-column');
  
  const btnDownloadCert = document.getElementById('btn-download-pdf');
  
  // Live Interview DOM references
  const liveInterviewWrapper = document.getElementById('live-interview-wrapper');
  const liveQuestionsWrapper = document.getElementById('live-questions-wrapper');
  const liveInterviewChatContainer = document.getElementById('live-interview-chat-container');
  const liveInterviewTextAnswer = document.getElementById('live-interview-text-answer');
  const btnLiveMicToggle = document.getElementById('btn-live-mic-toggle');
  const btnLiveSubmitAnswer = document.getElementById('btn-live-submit-answer');
  const liveVoiceWaveBox = document.getElementById('live-voice-wave-box');
  const liveVoiceMicStatus = document.getElementById('live-voice-mic-status');
  const liveMicBtnText = document.getElementById('live-mic-btn-text');
  const liveAiEvaluationResults = document.getElementById('live-ai-evaluation-results');
  const liveAiEvaluationPlaceholder = document.getElementById('live-ai-evaluation-placeholder');
  
  const liveEvalGrade = document.getElementById('live-eval-grade');
  const liveScoreTech = document.getElementById('live-score-tech');
  const liveScoreGrammar = document.getElementById('live-score-grammar');
  const liveScoreStructure = document.getElementById('live-score-structure');
  const liveBarTech = document.getElementById('live-bar-tech');
  const liveBarGrammar = document.getElementById('live-bar-grammar');
  const liveBarStructure = document.getElementById('live-bar-structure');
  const liveEvalSuggested = document.getElementById('live-eval-suggested');
  
  // Connect to Socket.io Server
  function getSocket() {
    if (!socket) {
      socket = io();
      setupSocketListeners();
    }
    return socket;
  }

  function setupSocketListeners() {
    // 1. Participant joined/left room
    socket.on('lobby_update', (data) => {
      if (!containerLobbyUsers) return;
      
      const { students } = data;
      if (students.length === 0) {
        lobbyEmptyText.style.display = 'block';
        containerLobbyUsers.innerHTML = '';
      } else {
        lobbyEmptyText.style.display = 'none';
        containerLobbyUsers.innerHTML = students.map(s => `
          <div class="lobby-user-tag"><i class="fa-solid fa-user"></i> ${s.name}</div>
        `).join('');
      }
    });

    // 2. Admin disbanded room
    socket.on('room_disbanded', (data) => {
      alert(data.message || "Lobby closed by Admin.");
      exitLobby();
    });

    // 3. Test started synchronized trigger
    socket.on('test_started', (data) => {
      liveQuestions = data.questions;
      testDuration = data.duration;
      liveRoomType = data.roomType || 'aptitude';
      currentQuestionIndex = 0;
      studentAnswers = {};
      interviewScoresHistory = [];

      viewLobby.style.display = 'none';
      viewTest.style.display = 'block';

      if (liveRoomType === 'interview') {
        if (liveInterviewWrapper) liveInterviewWrapper.style.display = 'block';
        if (liveQuestionsWrapper) liveQuestionsWrapper.style.display = 'none';
        if (btnPrev) btnPrev.style.display = 'none';
        if (liveInterviewChatContainer) liveInterviewChatContainer.innerHTML = '';
        if (liveAiEvaluationResults) liveAiEvaluationResults.style.display = 'none';
        if (liveAiEvaluationPlaceholder) liveAiEvaluationPlaceholder.style.display = 'block';
        initLiveSpeechRecognition();
      } else {
        if (liveInterviewWrapper) liveInterviewWrapper.style.display = 'none';
        if (liveQuestionsWrapper) liveQuestionsWrapper.style.display = 'block';
        if (btnPrev) btnPrev.style.display = 'inline-block';
      }

      loadLiveQuestion();
    });

    // 4. Timer updates
    socket.on('timer_update', (data) => {
      const minutes = Math.floor(data.timeLeft / 60);
      const seconds = data.timeLeft % 60;
      if (displayLiveTimer) {
        displayLiveTimer.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    });

    // 5. Timer ran out
    socket.on('timer_out', () => {
      alert("Time is up! Submitting answers automatically.");
      submitAnswers();
    });

    // 6. Realtime Leaderboard updates
    socket.on('leaderboard_update', (data) => {
      updateLeaderboardUI(data.leaderboard);
    });

    // 7. Full Test Finished (Everyone done or Timer out)
    socket.on('test_finished', (data) => {
      viewTest.style.display = 'none';
      viewResults.style.display = 'block';
      
      updateLeaderboardUI(data.leaderboard);
      
      // If student, check score to award Certificate
      if (userRole === 'student') {
        const myRecord = data.leaderboard.find(s => s.name.toLowerCase() === studentName.toLowerCase());
        if (myRecord && myRecord.score >= 60) {
          showCertificate(myRecord.score);
        } else {
          colCertificate.style.display = 'none';
        }
      } else {
        colCertificate.style.display = 'none';
      }
    });
  }

  // Lobby Focus toggler
  window.toggleLobbyFocusGroup = () => {
    const selectMode = document.getElementById('lobby-mode-select');
    const focusGroup = document.getElementById('lobby-interview-focus-group');
    if (selectMode && focusGroup) {
      if (selectMode.value === 'interview') {
        focusGroup.style.display = 'block';
      } else {
        focusGroup.style.display = 'none';
      }
    }
  };

  // Lobby Handlers
  if (btnCreate) {
    btnCreate.addEventListener('click', () => {
      const socket = getSocket();
      const selectDuration = document.getElementById('test-duration');
      const duration = parseInt(selectDuration.value);
      
      const selectMode = document.getElementById('lobby-mode-select');
      const selectFocus = document.getElementById('lobby-interview-focus');
      const roomType = selectMode ? selectMode.value : 'aptitude';
      const interviewFocus = selectFocus ? selectFocus.value : 'hr';

      socket.emit('create_room', { duration, roomType, interviewFocus }, (response) => {
        if (response.success) {
          currentRoomCode = response.roomCode;
          userRole = 'admin';
          
          viewSelection.style.display = 'none';
          viewLobby.style.display = 'block';
          
          displayLobbyCode.innerText = currentRoomCode;
          adminControlsBox.style.display = 'block';
          studentWaitingBox.style.display = 'none';
          
          containerLobbyUsers.innerHTML = '';
          lobbyEmptyText.style.display = 'block';
        } else {
          alert("Error creating room.");
        }
      });
    });
  }

  if (btnJoin) {
    btnJoin.addEventListener('click', () => {
      const name = inputName.value.trim();
      const code = inputRoomCode.value.trim().toUpperCase();

      if (!name) {
        alert("Please login first to join live tests.");
        return;
      }
      if (!code || code.length !== 4) {
        alert("Please enter a valid 4-digit code.");
        return;
      }

      studentName = name;
      const socket = getSocket();

      // Read session from local storage to fetch USN
      const session = JSON.parse(localStorage.getItem('litcrack_user') || '{}');
      const usn = session.usn || '2KL20CS000';

      socket.emit('join_room', { name, roomCode: code, usn }, (response) => {
        if (response.success) {
          currentRoomCode = response.roomCode;
          userRole = 'student';

          viewSelection.style.display = 'none';
          viewLobby.style.display = 'block';

          displayLobbyCode.innerText = currentRoomCode;
          adminControlsBox.style.display = 'none';
          studentWaitingBox.style.display = 'block';
        } else {
          alert(response.message || "Failed to join room.");
        }
      });
    });
  }

  if (btnStartTest) {
    btnStartTest.addEventListener('click', () => {
      if (userRole === 'admin' && currentRoomCode) {
        socket.emit('start_test', { roomCode: currentRoomCode });
      }
    });
  }

  // Helper for live chat bubbles
  function appendLiveChatBubble(sender, text) {
    if (!liveInterviewChatContainer) return;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    const senderName = sender === 'ai' ? 'Interviewer' : (studentName || 'Candidate');
    bubble.innerHTML = `<strong>${senderName}</strong><p>${text}</p>`;
    liveInterviewChatContainer.appendChild(bubble);
    liveInterviewChatContainer.scrollTop = liveInterviewChatContainer.scrollHeight;
  }

  // Initialize Speech Recognition for live interview
  function initLiveSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (liveVoiceMicStatus) {
        liveVoiceMicStatus.innerText = "Speech Recognition not supported. Please type.";
      }
      if (btnLiveMicToggle) {
        btnLiveMicToggle.disabled = true;
      }
      return;
    }

    speechRecognition = new SpeechRecognition();
    speechRecognition.continuous = true;
    speechRecognition.interimResults = false;
    speechRecognition.lang = 'en-US';

    speechRecognition.onstart = () => {
      isListening = true;
      if (liveVoiceWaveBox) {
        liveVoiceWaveBox.classList.add('listening');
      }
      if (liveMicBtnText) {
        liveMicBtnText.innerText = "Stop Recording";
      }
      if (liveVoiceMicStatus) {
        liveVoiceMicStatus.innerText = "Listening... Speak clearly.";
      }
    };

    speechRecognition.onresult = (event) => {
      const resultIndex = event.resultIndex;
      const transcript = event.results[resultIndex][0].transcript;
      if (liveInterviewTextAnswer) {
        liveInterviewTextAnswer.value += (liveInterviewTextAnswer.value ? " " : "") + transcript;
      }
    };

    speechRecognition.onerror = (event) => {
      console.error("Live speech error", event.error);
      stopLiveListening();
    };

    speechRecognition.onend = () => {
      stopLiveListening();
    };
  }

  function stopLiveListening() {
    isListening = false;
    if (liveVoiceWaveBox) {
      liveVoiceWaveBox.classList.remove('listening');
    }
    if (liveMicBtnText) {
      liveMicBtnText.innerText = "Start Microphone";
    }
    if (liveVoiceMicStatus) {
      liveVoiceMicStatus.innerText = "Microphone is inactive.";
    }
    if (speechRecognition) {
      speechRecognition.stop();
    }
  }

  // Bind live mic toggle
  if (btnLiveMicToggle) {
    btnLiveMicToggle.addEventListener('click', () => {
      if (isListening) {
        stopLiveListening();
      } else {
        if (liveInterviewTextAnswer) liveInterviewTextAnswer.value = "";
        if (speechRecognition) {
          speechRecognition.start();
        }
      }
    });
  }

  // Bind live response submission
  if (btnLiveSubmitAnswer) {
    btnLiveSubmitAnswer.addEventListener('click', () => {
      const answer = liveInterviewTextAnswer ? liveInterviewTextAnswer.value.trim() : '';
      if (!answer) {
        alert("Please speak or type your answer before submitting!");
        return;
      }

      stopLiveListening();
      appendLiveChatBubble("user", answer);
      
      const q = liveQuestions[currentQuestionIndex];
      studentAnswers[q.id] = answer;

      if (btnLiveSubmitAnswer) btnLiveSubmitAnswer.disabled = true;
      if (liveInterviewTextAnswer) liveInterviewTextAnswer.disabled = true;

      evaluateLiveResponse(answer);
    });
  }

  // Real-time evaluation (Gemini API or Local Fallback)
  async function evaluateLiveResponse(userAnswer) {
    const q = liveQuestions[currentQuestionIndex];
    const apiKey = localStorage.getItem('litcrack_gemini_api_key') || '';

    // Show Loading in scorecard
    if (liveAiEvaluationPlaceholder) liveAiEvaluationPlaceholder.style.display = 'none';
    if (liveAiEvaluationResults) liveAiEvaluationResults.style.display = 'block';

    if (liveEvalGrade) liveEvalGrade.innerText = "Analyzing...";
    if (liveScoreTech) liveScoreTech.innerText = "...";
    if (liveScoreGrammar) liveScoreGrammar.innerText = "...";
    if (liveScoreStructure) liveScoreStructure.innerText = "...";
    if (liveBarTech) liveBarTech.style.width = "0%";
    if (liveBarGrammar) liveBarGrammar.style.width = "0%";
    if (liveBarStructure) liveBarStructure.style.width = "0%";
    if (liveEvalSuggested) liveEvalSuggested.innerText = "Evaluating response on Google Gemini...";

    let scoreTech = 0;
    let scoreGrammar = 0;
    let scoreStructure = 0;
    let suggested = "";

    if (apiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const promptText = `You are a professional technical interviewer and communication coach.
Evaluate the candidate's spoken response to the interview question: "${q.question}".

Candidate's response: "${userAnswer}".

Analyze and score the response from 0 to 100 on three dimensions:
1. Technical Accuracy (scoreTech): Correctness of engineering concepts, systems, logic, or HR values.
2. Spoken Grammar & Verbal Correctness (scoreGrammar): Sentence structures, slang reduction, vocabulary.
3. Professional Structure (scoreStructure): Clarity, formatting, conciseness.

Provide also a "suggested" rephrasing: A highly polished, professional, corporate-level phrasing of their response with literary enhancement. Keep it brief.

Return your response in strict, valid JSON format matching this schema, with no other text wrappers or markdown blocks:
{
  "scoreTech": 80,
  "scoreGrammar": 75,
  "scoreStructure": 85,
  "suggested": "Polished corporate answer..."
}`;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        if (!res.ok) throw new Error("API call failed.");
        const data = await res.json();
        const rawText = data.candidates[0].content.parts[0].text;
        const parsed = JSON.parse(rawText);

        scoreTech = Math.min(100, Math.max(0, parsed.scoreTech || 50));
        scoreGrammar = Math.min(100, Math.max(0, parsed.scoreGrammar || 50));
        scoreStructure = Math.min(100, Math.max(0, parsed.scoreStructure || 50));
        suggested = parsed.suggested || "Could not polish phrasing.";
      } catch (err) {
        console.warn("Gemini evaluation error, using fallback", err);
        const localEval = computeLocalEvaluation(userAnswer, q);
        scoreTech = localEval.scoreTech;
        scoreGrammar = localEval.scoreGrammar;
        scoreStructure = localEval.scoreStructure;
        suggested = localEval.suggested;
      }
    } else {
      const localEval = computeLocalEvaluation(userAnswer, q);
      scoreTech = localEval.scoreTech;
      scoreGrammar = localEval.scoreGrammar;
      scoreStructure = localEval.scoreStructure;
      suggested = localEval.suggested;
    }

    const avg = (scoreTech + scoreGrammar + scoreStructure) / 3;
    let grade = "C";
    if (avg >= 85) grade = "A Grade (Excellent)";
    else if (avg >= 70) grade = "B Grade (Good)";
    else grade = "C Grade (Needs Work)";

    // Update UI Scorecard
    if (liveEvalGrade) liveEvalGrade.innerText = grade;
    if (liveScoreTech) liveScoreTech.innerText = `${scoreTech}%`;
    if (liveScoreGrammar) liveScoreGrammar.innerText = `${scoreGrammar}%`;
    if (liveScoreStructure) liveScoreStructure.innerText = `${scoreStructure}%`;
    if (liveBarTech) liveBarTech.style.width = `${scoreTech}%`;
    if (liveBarGrammar) liveBarGrammar.style.width = `${scoreGrammar}%`;
    if (liveBarStructure) liveBarStructure.style.width = `${scoreStructure}%`;
    if (liveEvalSuggested) liveEvalSuggested.innerText = suggested;

    // Save score in local history
    interviewScoresHistory[currentQuestionIndex] = avg;

    // Emit live running score to Socket server
    const totalRunningScore = interviewScoresHistory.reduce((a, b) => a + (b || 0), 0);
    const countCompleted = interviewScoresHistory.filter(s => s !== undefined).length;
    const runningAverage = Math.round(totalRunningScore / countCompleted);

    if (currentRoomCode && userRole === 'student') {
      socket.emit('submit_live_interview_score', {
        roomCode: currentRoomCode,
        score: runningAverage
      });
    }

    // Enable next button
    if (btnNext) {
      btnNext.disabled = false;
    }
  }

  function computeLocalEvaluation(userAnswer, q) {
    const answerLower = userAnswer.toLowerCase();
    
    // Technical Score keyword match
    let matchedKeywords = 0;
    const kwList = q.keywords || [];
    kwList.forEach(word => {
      if (answerLower.includes(word.toLowerCase())) {
        matchedKeywords++;
      }
    });

    const keywordRatio = kwList.length > 0 ? (matchedKeywords / kwList.length) : 0.5;
    let scoreTech = Math.round(30 + (keywordRatio * 70));
    
    if (userAnswer.length < 30) {
      scoreTech = Math.min(scoreTech, 40);
    }

    // Grammar Score
    let scoreGrammar = 80;
    const informalWords = ["just", "like", "gonna", "wanna", "stuff", "thing"];
    informalWords.forEach(word => {
      if (answerLower.includes(word)) scoreGrammar -= 6;
    });
    scoreGrammar = Math.max(50, Math.min(scoreGrammar, 95));

    // Structure Score
    let scoreStructure = 60;
    if (userAnswer.length > 80) scoreStructure += 15;
    if (answerLower.includes("because") || answerLower.includes("for example") || answerLower.includes("firstly")) {
      scoreStructure += 15;
    }
    scoreStructure = Math.min(scoreStructure, 95);

    return {
      scoreTech,
      scoreGrammar,
      scoreStructure,
      suggested: q.goodPhrasing || "No phrasing suggestion available."
    };
  }

  // Synchronized Test Core Renderer
  function loadLiveQuestion() {
    if (!liveQuestions || liveQuestions.length === 0) return;

    if (liveRoomType === 'interview') {
      const q = liveQuestions[currentQuestionIndex];
      displayLiveProgress.innerText = `Prompt ${currentQuestionIndex + 1} of ${liveQuestions.length}`;
      
      // Clear textbox response
      if (liveInterviewTextAnswer) {
        liveInterviewTextAnswer.value = '';
        liveInterviewTextAnswer.disabled = false;
      }
      
      if (btnLiveSubmitAnswer) {
        btnLiveSubmitAnswer.disabled = false;
      }
      
      // Hide evaluation results and show placeholder for the new question
      if (liveAiEvaluationResults) liveAiEvaluationResults.style.display = 'none';
      if (liveAiEvaluationPlaceholder) liveAiEvaluationPlaceholder.style.display = 'block';
      
      // Append Interviewer Prompt bubble
      appendLiveChatBubble('ai', q.question);

      // Disable 'Next' button until response is submitted for this question
      if (btnNext) {
        btnNext.disabled = true;
        btnNext.innerText = (currentQuestionIndex === liveQuestions.length - 1) ? "Submit Test" : "Next";
        btnNext.classList.remove('btn-secondary');
        btnNext.classList.add('btn-primary');
      }
      return;
    }

    const wrapper = document.getElementById('live-questions-wrapper');
    if (wrapper) {
      wrapper.style.opacity = '0';
      wrapper.style.transform = 'translateY(12px)';
      wrapper.style.transition = 'none';
    }

    const q = liveQuestions[currentQuestionIndex];
    displayLiveProgress.innerText = `Question ${currentQuestionIndex + 1} of ${liveQuestions.length}`;
    displayQuestionTitle.innerText = q.question;

    containerOptions.innerHTML = q.options.map((opt, idx) => {
      const isSelected = studentAnswers[q.id] === idx ? 'selected' : '';
      return `
        <button class="option-btn ${isSelected}" onclick="window.selectLiveOption(${idx})">${opt}</button>
      `;
    }).join('');

    if (wrapper) {
      setTimeout(() => {
        wrapper.style.transition = 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
        wrapper.style.opacity = '1';
        wrapper.style.transform = 'translateY(0)';
      }, 50);
    }

    if (currentQuestionIndex === liveQuestions.length - 1) {
      btnNext.innerText = "Submit Test";
      btnNext.classList.remove('btn-primary');
      btnNext.classList.add('btn-secondary');
    } else {
      btnNext.innerText = "Next";
      btnNext.classList.remove('btn-secondary');
      btnNext.classList.add('btn-primary');
    }

    if (currentQuestionIndex === 0) {
      btnPrev.disabled = true;
    } else {
      btnPrev.disabled = false;
    }
  }

  window.selectLiveOption = (optionIndex) => {
    const q = liveQuestions[currentQuestionIndex];
    studentAnswers[q.id] = optionIndex;
    
    const btns = containerOptions.querySelectorAll('.option-btn');
    btns.forEach((btn, idx) => {
      if (idx === optionIndex) {
        btn.classList.add('selected');
        btn.style.transform = 'scale(0.97)';
        setTimeout(() => {
          btn.style.transform = 'scale(1.02)';
        }, 80);
      } else {
        btn.classList.remove('selected');
        btn.style.transform = 'none';
      }
    });
  };

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        loadLiveQuestion();
      }
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (liveRoomType === 'interview') {
        stopLiveListening();
      }
      if (currentQuestionIndex < liveQuestions.length - 1) {
        currentQuestionIndex++;
        loadLiveQuestion();
      } else {
        if (confirm("Are you sure you want to submit your answers?")) {
          submitAnswers();
        }
      }
    });
  }

  function submitAnswers() {
    if (userRole !== 'student' || !currentRoomCode) return;
    
    stopLiveListening();
    
    viewTest.style.display = 'none';
    viewResults.style.display = 'block';

    // Read session from local storage to fetch Email
    const session = JSON.parse(localStorage.getItem('litcrack_user') || '{}');
    const email = session.email || null;

    let payload = { roomCode: currentRoomCode, email };
    if (liveRoomType === 'interview') {
      const totalScore = interviewScoresHistory.reduce((a, b) => a + (b || 0), 0);
      const finalScore = Math.round(totalScore / liveQuestions.length) || 0;
      payload.score = finalScore;
      payload.answers = studentAnswers;
    } else {
      payload.answers = studentAnswers;
    }

    socket.emit('submit_answers', payload, (res) => {
      if (res.success) {
        if (res.alreadySubmitted) {
          console.log("Answers were already sent.");
        } else {
          console.log(`Test submitted successfully. Score: ${res.score}%`);
        }
      }
    });
  }

  // Leaderboard Drawing
  function updateLeaderboardUI(leaderboard) {
    if (!tbodyLeaderboard) return;

    if (leaderboard.length === 0) {
      tbodyLeaderboard.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No student has submitted yet.</td></tr>`;
      return;
    }

    tbodyLeaderboard.innerHTML = leaderboard.map((row, idx) => {
      const rank = idx + 1;
      let medalClass = "";
      if (rank === 1) medalClass = "rank-gold";
      else if (rank === 2) medalClass = "rank-silver";
      else if (rank === 3) medalClass = "rank-bronze";

      const timeMin = Math.floor(row.timeTaken / 60);
      const timeSec = row.timeTaken % 60;
      const statusLabel = row.finished 
        ? `<span class="badge badge-success">Completed</span>`
        : `<span class="badge badge-warning">Solving...</span>`;

      return `
        <tr>
          <td class="leaderboard-rank ${medalClass}">${rank}</td>
          <td><strong>${row.name}</strong></td>
          <td style="font-family: var(--font-display); font-weight: 700;">${row.finished ? row.score + '%' : '-'}</td>
          <td>${statusLabel}</td>
          <td>${row.finished ? `${timeMin}m ${timeSec}s` : '-'}</td>
        </tr>
      `;
    }).join('');
  }

  // Certificate Render Overlay
  function showCertificate(score) {
    colCertificate.style.display = 'block';
    
    document.getElementById('cert-recipient-name').innerText = studentName;
    document.getElementById('cert-score').innerText = `${score}%`;
    document.getElementById('cert-date').innerText = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  if (btnDownloadCert) {
    btnDownloadCert.addEventListener('click', () => {
      const scoreRaw = document.getElementById('cert-score').innerText;
      const scoreNum = parseInt(scoreRaw);
      
      if (window.generatePDFCertificate) {
        window.generatePDFCertificate(studentName, scoreNum);
      }
    });
  }

  // Exit/Disband Test Session
  function exitLobby() {
    stopLiveListening();
    viewLobby.style.display = 'none';
    viewTest.style.display = 'none';
    viewResults.style.display = 'none';
    viewSelection.style.display = 'grid';

    if (socket) {
      socket.disconnect();
      socket = null;
    }
    currentRoomCode = null;
    userRole = null;
    studentName = "";
    liveQuestions = [];
    currentQuestionIndex = 0;
    studentAnswers = {};
    liveRoomType = "aptitude";
    interviewScoresHistory = [];
  }

  if (btnExit) {
    btnExit.addEventListener('click', () => {
      if (confirm("Exit the live test area? You will lose any active lobby connection.")) {
        exitLobby();
      }
    });
  }
})();
