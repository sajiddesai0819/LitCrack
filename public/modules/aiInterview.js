/* ==========================================================================
   LITCRACK AI MOCK INTERVIEWER (WEB SPEECH API & GEMINI / SIMULATED EVAL)
   ========================================================================== */

(function() {
  // Interview Question Databases - Loaded dynamically from the Express API
  let INTERVIEW_QUESTIONS = {
    hr: [],
    technical: []
  };

  // State Variables
  let activeFocus = "hr";
  let activeName = "";
  let questionIndex = 0;
  let savedApiKey = "";
  
  let speechRecognition = null;
  let isListening = false;

  // DOM Elements
  const panelConfig = document.getElementById('interview-config-panel');
  const panelRoom = document.getElementById('interview-room-panel');
  
  const selectType = document.getElementById('interview-type');
  const inputName = document.getElementById('candidate-name-input');
  const inputApiKey = document.getElementById('gemini-api-key');
  const chatContainer = document.getElementById('interview-chat-container');
  const textareaAnswer = document.getElementById('interview-text-answer');
  
  const btnStart = document.getElementById('btn-start-interview');
  const btnMic = document.getElementById('btn-mic-toggle');
  const btnSubmit = document.getElementById('btn-submit-answer');
  const btnEnd = document.getElementById('btn-end-interview');
  
  const labelMicStatus = document.getElementById('voice-mic-status');
  const waveBox = document.getElementById('voice-wave-box');
  const micBtnText = document.getElementById('mic-btn-text');

  const panelEvaluation = document.getElementById('ai-evaluation-results');
  const placeholderEvaluation = document.getElementById('ai-evaluation-placeholder');

  // Tabs for mobile
  const tabBtnChat = document.getElementById('tab-btn-chat');
  const tabBtnFeedback = document.getElementById('tab-btn-feedback');
  const chatColumn = document.getElementById('interview-chat-column');
  const evalPanel = document.getElementById('interview-evaluation-panel');
  const feedbackDot = document.getElementById('feedback-dot');

  const labelGrade = document.getElementById('eval-grade');
  const labelTech = document.getElementById('score-tech');
  const labelGrammar = document.getElementById('score-grammar');
  const labelStructure = document.getElementById('score-structure');
  
  const barTech = document.getElementById('bar-tech');
  const barGrammar = document.getElementById('bar-grammar');
  const barStructure = document.getElementById('bar-structure');

  const textSaid = document.getElementById('eval-said');
  const textSuggested = document.getElementById('eval-suggested');

  // Load Saved API Key
  if (inputApiKey) {
    inputApiKey.value = localStorage.getItem('litcrack_gemini_api_key') || '';
  }

  // Initialize Speech Recognition
  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      labelMicStatus.innerText = "Speech Recognition is not supported in this browser. Please type your answer.";
      btnMic.disabled = true;
      return;
    }

    speechRecognition = new SpeechRecognition();
    speechRecognition.continuous = true;
    speechRecognition.interimResults = false;
    speechRecognition.lang = 'en-US';

    speechRecognition.onstart = () => {
      isListening = true;
      waveBox.classList.add('listening');
      micBtnText.innerText = "Stop Recording";
      labelMicStatus.innerText = "Listening... Speak clearly into your mic.";
    };

    speechRecognition.onresult = (event) => {
      const resultIndex = event.resultIndex;
      const transcript = event.results[resultIndex][0].transcript;
      textareaAnswer.value += (textareaAnswer.value ? " " : "") + transcript;
    };

    speechRecognition.onerror = (event) => {
      console.error("Speech error", event.error);
      stopListening();
    };

    speechRecognition.onend = () => {
      stopListening();
    };
  }

  function stopListening() {
    isListening = false;
    waveBox.classList.remove('listening');
    micBtnText.innerText = "Start Microphone";
    labelMicStatus.innerText = "Microphone is inactive.";
    if (speechRecognition) {
      speechRecognition.stop();
    }
  }

  // Bind Config Start Button
  if (btnStart) {
    btnStart.addEventListener('click', async () => {
      activeFocus = selectType.value;
      activeName = inputName.value.trim() || "Candidate";
      questionIndex = 0;

      // Disable button during loading
      btnStart.disabled = true;
      const originalText = btnStart.innerText;
      btnStart.innerText = "Loading Custom Prompts...";

      try {
        const res = await fetch('/api/questions/interview');
        const data = await res.json();
        if (data.success) {
          INTERVIEW_QUESTIONS.hr = data.interviewQuestions.hr || [];
          INTERVIEW_QUESTIONS.technical = data.interviewQuestions.technical || [];
        }
      } catch (err) {
        console.error("Error loading interview questions from backend", err);
      } finally {
        btnStart.disabled = false;
        btnStart.innerText = originalText;
      }

      if (inputApiKey) {
        savedApiKey = inputApiKey.value.trim();
        localStorage.setItem('litcrack_gemini_api_key', savedApiKey);
      }

      panelConfig.style.display = 'none';
      panelRoom.style.display = 'grid';

      // Reset active tabs on launch
      if (tabBtnChat) tabBtnChat.classList.add('active');
      if (tabBtnFeedback) tabBtnFeedback.classList.remove('active');
      if (chatColumn) chatColumn.style.display = 'block';
      if (evalPanel) evalPanel.style.display = 'none';
      if (feedbackDot) feedbackDot.style.display = 'none';

      // Clear chat
      chatContainer.innerHTML = '';
      
      initSpeechRecognition();
      askAIQuestion();
    });
  }

  // Mic Toggle Button
  if (btnMic) {
    btnMic.addEventListener('click', () => {
      if (isListening) {
        stopListening();
      } else {
        textareaAnswer.value = ""; // Clear previous text
        if (speechRecognition) {
          speechRecognition.start();
        }
      }
    });
  }

  function askAIQuestion() {
    const questions = INTERVIEW_QUESTIONS[activeFocus];
    if (questionIndex >= questions.length) {
      // Completed interview
      appendChatBubble("ai", "Congratulations! You have completed the mock interview. Click 'Finish Interview' to exit and review your final results.");
      textareaAnswer.disabled = true;
      btnSubmit.disabled = true;
      btnMic.disabled = true;
      return;
    }

    const q = questions[questionIndex];
    appendChatBubble("ai", q.question);
  }

  function appendChatBubble(sender, text) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    bubble.innerHTML = `<strong>${sender === 'ai' ? 'Interviewer' : activeName}</strong><p>${text}</p>`;
    chatContainer.appendChild(bubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // Answer Submission & Router
  if (btnSubmit) {
    btnSubmit.addEventListener('click', () => {
      const answer = textareaAnswer.value.trim();
      if (!answer) {
        alert("Please speak or type your answer before submitting!");
        return;
      }

      stopListening();

      // Show in chat bubble
      appendChatBubble("user", answer);
      textareaAnswer.value = "";

      // Perform evaluation (Gemini or Local fallback)
      if (savedApiKey) {
        evaluateWithGemini(savedApiKey, answer);
      } else {
        evaluateLocalAnswer(answer);
      }

      // Move forward
      questionIndex++;
      setTimeout(askAIQuestion, 1500);
    });
  }

  // Real Gemini API Evaluation
  async function evaluateWithGemini(apiKey, userAnswer) {
    const questions = INTERVIEW_QUESTIONS[activeFocus];
    const q = questions[questionIndex];

    // Show Loading skeleton
    placeholderEvaluation.style.display = 'none';
    panelEvaluation.style.display = 'block';

    labelGrade.innerText = "Analyzing...";
    labelTech.innerText = "...";
    labelGrammar.innerText = "...";
    labelStructure.innerText = "...";
    barTech.style.width = "0%";
    barGrammar.style.width = "0%";
    barStructure.style.width = "0%";
    textSaid.innerText = `"${userAnswer}"`;
    textSuggested.innerText = "Running evaluation on Google Gemini 1.5 Flash...";

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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: promptText }]
          }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!res.ok) throw new Error("API call failed.");

      const data = await res.json();
      const rawText = data.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(rawText);

      const scoreTech = Math.min(100, Math.max(0, parsed.scoreTech || 50));
      const scoreGrammar = Math.min(100, Math.max(0, parsed.scoreGrammar || 50));
      const scoreStructure = Math.min(100, Math.max(0, parsed.scoreStructure || 50));
      const suggested = parsed.suggested || "Could not polish phrasing.";

      const avg = (scoreTech + scoreGrammar + scoreStructure) / 3;
      let grade = "C";
      if (avg >= 85) grade = "A Grade (Excellent)";
      else if (avg >= 70) grade = "B Grade (Good)";
      else grade = "C Grade (Needs Work)";

      labelGrade.innerText = grade;
      labelTech.innerText = `${scoreTech}%`;
      labelGrammar.innerText = `${scoreGrammar}%`;
      labelStructure.innerText = `${scoreStructure}%`;

      barTech.style.width = `${scoreTech}%`;
      barGrammar.style.width = `${scoreGrammar}%`;
      barStructure.style.width = `${scoreStructure}%`;

      textSuggested.innerText = suggested;
      triggerScorecardUpdateNotify();

    } catch (err) {
      console.warn("Gemini API failed, falling back to local simulator.", err);
      evaluateLocalAnswer(userAnswer);
    }
  }

  // Local Keyword-based Fallback Parser
  function evaluateLocalAnswer(userAnswer) {
    const questions = INTERVIEW_QUESTIONS[activeFocus];
    const q = questions[questionIndex];

    const answerLower = userAnswer.toLowerCase();
    
    // 1. Calculate Technical score based on matched keywords
    let matchedKeywords = 0;
    q.keywords.forEach(word => {
      if (answerLower.includes(word)) {
        matchedKeywords++;
      }
    });

    const keywordRatio = matchedKeywords / q.keywords.length;
    let scoreTech = Math.round(30 + (keywordRatio * 70)); // Baseline 30, up to 100
    
    // Cap tech score based on response length (depth)
    if (userAnswer.length < 40) {
      scoreTech = Math.min(scoreTech, 45); // short answers get penalised
    } else if (userAnswer.length > 200) {
      scoreTech = Math.min(scoreTech + 5, 100);
    }

    // 2. Calculate Grammar & Literary score (length, common spelling errors, sentence complexity)
    let scoreGrammar = 80;
    const informalWords = ["just", "like", "random", "gonna", "wanna", "stuff", "thing"];
    informalWords.forEach(word => {
      if (answerLower.includes(word)) {
        scoreGrammar -= 5;
      }
    });
    const formalWords = ["however", "therefore", "consequently", "specifically", "pillars", "implementation"];
    formalWords.forEach(word => {
      if (answerLower.includes(word)) {
        scoreGrammar += 4;
      }
    });
    scoreGrammar = Math.max(50, Math.min(scoreGrammar, 98));

    // 3. Structure score (based on paragraph structures, connectors)
    let scoreStructure = 60;
    if (userAnswer.length > 80) scoreStructure += 10;
    if (userAnswer.length > 150) scoreStructure += 10;
    if (answerLower.includes("because") || answerLower.includes("since") || answerLower.includes("for example")) {
      scoreStructure += 10;
    }
    scoreStructure = Math.min(scoreStructure, 95);

    // Calculate Grade
    const avg = (scoreTech + scoreGrammar + scoreStructure) / 3;
    let grade = "C";
    if (avg >= 85) {
      grade = "A Grade (Excellent)";
    } else if (avg >= 70) {
      grade = "B Grade (Good)";
    } else {
      grade = "C Grade (Needs Work)";
    }

    // Render evaluations in HTML
    placeholderEvaluation.style.display = 'none';
    panelEvaluation.style.display = 'block';

    labelGrade.innerText = grade;
    labelTech.innerText = `${scoreTech}%`;
    labelGrammar.innerText = `${scoreGrammar}%`;
    labelStructure.innerText = `${scoreStructure}%`;

    barTech.style.width = `${scoreTech}%`;
    barGrammar.style.width = `${scoreGrammar}%`;
    barStructure.style.width = `${scoreStructure}%`;

    // What you said vs Suggested phrasing
    textSaid.innerText = `"${userAnswer}"`;
    textSuggested.innerText = q.phrasingFix.good;
    triggerScorecardUpdateNotify();
  }

  function triggerScorecardUpdateNotify() {
    if (window.innerWidth <= 1024) {
      if (tabBtnFeedback && !tabBtnFeedback.classList.contains('active')) {
        if (feedbackDot) feedbackDot.style.display = 'block';
      }
    }
  }

  // Bind mobile tabs click actions
  if (tabBtnChat && tabBtnFeedback && chatColumn && evalPanel) {
    tabBtnChat.addEventListener('click', () => {
      tabBtnChat.classList.add('active');
      tabBtnFeedback.classList.remove('active');
      chatColumn.style.display = 'block';
      evalPanel.style.display = 'none';
    });

    tabBtnFeedback.addEventListener('click', () => {
      tabBtnFeedback.classList.add('active');
      tabBtnChat.classList.remove('active');
      evalPanel.style.display = 'block';
      chatColumn.style.display = 'none';
      if (feedbackDot) feedbackDot.style.display = 'none';
    });
  }

  // End Interview Simulation
  if (btnEnd) {
    btnEnd.addEventListener('click', () => {
      if (confirm("End the active interview session?")) {
        stopListening();
        
        // Reset panels
        panelConfig.style.display = 'block';
        panelRoom.style.display = 'none';
        
        textareaAnswer.disabled = false;
        btnSubmit.disabled = false;
        btnMic.disabled = false;

        placeholderEvaluation.style.display = 'block';
        panelEvaluation.style.display = 'none';
      }
    });
  }
})();
