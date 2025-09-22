// EasyLlama Automation 
(() => {
    console.log('🦙 EasyLlama Hybrid Automation Starting...');

    const config = {
        playbackRate: 16, // Maximum safe speed for most browsers
        checkInterval: 800,
        clickDelay: 300,
        debug: true,
        stealthMode: true
    };

    const state = {
        questionsAnswered: 0,
        lastQuestionText: '',
        mediaPlaying: false,
        lastClickedButton: null,
        stuckCount: 0,
        lastPageText: '',
        quizCompleted: false,
        mediaCompleted: false,
        navigationAttempted: false,
        lastQuizCompletionTime: 0,
        processedQuestions: new Set()
    };

    // === STEALTH FEATURES (from 1.js) ===

    // Block WebSocket telemetry
    if (config.stealthMode) {
        const originalSend = WebSocket.prototype.send;
        WebSocket.prototype.send = function (data) {
            const str = typeof data === 'string' ? data : '';
            if (str.includes('playbackRate') || str.includes('devtools') || str.includes('automation')) {
                console.log("⚠️ Blocked suspicious WebSocket");
                return;
            }
            return originalSend.apply(this, arguments);
        };

        // Disable detection
        window.MutationObserver = class {
            constructor() {}
            observe() {}
            disconnect() {}
            takeRecords() { return []; }
        };

        // Visibility spoofing
        document.hasFocus = () => true;
        Object.defineProperty(document, 'hidden', { get: () => false });
        Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
    }

    // === IFRAME ACCESS (from 2.js improved) ===

    function findSCORMContent() {
        // Try contentRelay iframe first (your specific case)
        const contentRelay = document.getElementById('contentRelay');
        if (contentRelay) {
            try {
                const doc = contentRelay.contentDocument || contentRelay.contentWindow?.document;
                if (doc && doc.body && hasContent(doc)) {
                    return { doc, source: 'contentRelay-iframe' };
                }
            } catch (e) {
                if (config.debug) console.log('⚠️ ContentRelay iframe access blocked');
            }
        }

        // Try direct SCORM iframe
        const scormFrame = document.getElementById('scorm-iframe');
        if (scormFrame) {
            try {
                const doc = scormFrame.contentDocument;
                if (doc && doc.body && hasContent(doc)) {
                    return { doc, source: 'scorm-iframe' };
                }
            } catch (e) {}
        }

        // Deep iframe search
        function searchIframes(startDoc, depth = 0) {
            if (depth > 3) return null; // Prevent infinite recursion

            const iframes = startDoc.querySelectorAll('iframe');
            for (const iframe of iframes) {
                try {
                    const doc = iframe.contentDocument;
                    if (doc && doc.body) {
                        if (hasContent(doc)) {
                            return { doc, source: `iframe-${iframe.id || 'unknown'}-depth-${depth}` };
                        }
                        // Recurse into nested iframes
                        const nested = searchIframes(doc, depth + 1);
                        if (nested) return nested;
                    }
                } catch (e) {}
            }
            return null;
        }

        const result = searchIframes(document);
        if (result) return result;

        // Fallback to main document if it has content
        if (hasContent(document)) {
            return { doc: document, source: 'main-document' };
        }

        return null;
    }

    function hasContent(doc) {
        return doc.querySelectorAll('button, audio, video, .DragAndDropItem, [data-id*="_title"]').length > 0;
    }

    // === SMART MEDIA HANDLING ===

    function handleMedia(doc) {
        let handled = false;

        console.log('🎵 Media handler called - checking audio/video elements...');

        // FIRST PRIORITY: Always try to click play buttons if media exists but isn't playing
        if (doc.querySelectorAll('audio, video').length > 0) {
            console.log('🎵 Found audio/video elements, looking for play buttons...');

            // Target the specific play buttons we found in debug
            const specificPlayButtons = doc.querySelectorAll('button.sc-isRoRg.ftWxPu');
            if (specificPlayButtons.length > 0) {
                console.log(`🎯 Found ${specificPlayButtons.length} specific play buttons (sc-isRoRg ftWxPu)`);

                for (let i = 0; i < specificPlayButtons.length; i++) {
                    const btn = specificPlayButtons[i];
                    if (btn && btn.offsetParent !== null && !btn.disabled) {
                        try {
                            btn.click();
                            console.log(`▶️ CLICKED specific play button ${i}: ${btn.className}`);
                            state.mediaPlaying = true;
                            handled = true;
                            break;
                        } catch (e) {
                            console.log(`⚠️ Error clicking play button ${i}:`, e.message);
                        }
                    }
                }
            }

            // Fallback to other play button selectors
            if (!handled) {
                const playButtons = [
                    doc.querySelector('button[aria-label*="Play"]'),
                    doc.querySelector('button[title*="Play"]'),
                    doc.querySelector('.vjs-big-play-button'),
                    doc.querySelector('.vjs-play-control'),
                    doc.querySelector('button.sc-isRoRg')
                ].filter(btn => btn && btn.offsetParent !== null);

                if (playButtons.length > 0) {
                    playButtons[0].click();
                    console.log('▶️ Clicked fallback play button');
                    state.mediaPlaying = true;
                    handled = true;
                } else {
                    console.log('🔍 No standard play buttons found, searching all buttons...');

                    // Search all buttons for play functionality
                    const allButtons = doc.querySelectorAll('button');
                    console.log(`🔍 Checking ${allButtons.length} buttons for play functionality...`);

                    for (const btn of allButtons) {
                        const ariaLabel = btn.getAttribute('aria-label') || '';
                        const title = btn.getAttribute('title') || '';
                        const className = btn.className || '';

                        if ((ariaLabel.toLowerCase().includes('play') ||
                             title.toLowerCase().includes('play') ||
                             className.includes('play') ||
                             className.includes('sc-isRoRg')) &&
                            btn.offsetParent !== null) {

                            btn.click();
                            console.log(`▶️ Clicked play button: "${title || ariaLabel}" (${className})`);
                            state.mediaPlaying = true;
                            handled = true;
                            break;
                        }
                    }
                }
            }
        }

        // Handle videos
        doc.querySelectorAll('video').forEach(video => {
            if (video.src && !video.paused) {
                if (video.playbackRate !== config.playbackRate) {
                    try {
                        video.playbackRate = config.playbackRate;
                        console.log(`🎥 Video speed: ${config.playbackRate}x`);
                    } catch (e) {
                        // Try progressively lower speeds if max rate not supported
                        const fallbackRates = [16, 12, 10, 8, 4, 2];
                        for (const rate of fallbackRates) {
                            try {
                                video.playbackRate = rate;
                                console.log(`🎥 Video speed (fallback): ${rate}x`);
                                break;
                            } catch (fallbackError) {
                                continue;
                            }
                        }
                    }
                }
                state.mediaPlaying = true;

                // Better completion detection
                if (video.duration && video.currentTime >= video.duration - 0.1) {
                    console.log('🎥 Video completed');
                    state.mediaPlaying = false;
                    state.mediaCompleted = true;
                }
                handled = true;

                // Set up ended event listener
                if (!video.hasEndedListener) {
                    video.addEventListener('ended', () => {
                        console.log('🎥 Video ended event');
                        state.mediaPlaying = false;
                        state.mediaCompleted = true;
                    });
                    video.hasEndedListener = true;
                }
            } else if (video.src && video.paused && video.readyState >= 2 && !state.mediaCompleted) {
                try {
                    video.playbackRate = config.playbackRate;
                } catch (e) {
                    video.playbackRate = 16; // Safe fallback
                }
                video.play().catch(() => {});
                state.mediaPlaying = true;
                console.log('▶️ Started video playback programmatically');
                handled = true;
            }
        });

        // Handle audio
        doc.querySelectorAll('audio').forEach(audio => {
            if (audio.src && !audio.paused) {
                if (audio.playbackRate !== config.playbackRate) {
                    try {
                        audio.playbackRate = config.playbackRate;
                        console.log(`🔊 Audio speed: ${config.playbackRate}x`);
                    } catch (e) {
                        // Try progressively lower speeds if max rate not supported
                        const fallbackRates = [16, 12, 10, 8, 4, 2];
                        for (const rate of fallbackRates) {
                            try {
                                audio.playbackRate = rate;
                                console.log(`🔊 Audio speed (fallback): ${rate}x`);
                                break;
                            } catch (fallbackError) {
                                continue;
                            }
                        }
                    }
                }
                state.mediaPlaying = true;

                // Better completion detection
                if (audio.duration && audio.currentTime >= audio.duration - 0.1) {
                    console.log('🔊 Audio completed - ready for navigation');
                    state.mediaPlaying = false;
                    state.mediaCompleted = true;
                }
                handled = true;

                // Set up ended event listener
                if (!audio.hasEndedListener) {
                    audio.addEventListener('ended', () => {
                        console.log('🔊 Audio ended event - ready for navigation');
                        state.mediaPlaying = false;
                        state.mediaCompleted = true;
                    });
                    audio.hasEndedListener = true;
                }
            } else if (audio.src && audio.paused && audio.readyState >= 2 && !state.mediaCompleted) {
                try {
                    audio.playbackRate = config.playbackRate;
                } catch (e) {
                    audio.playbackRate = 16; // Safe fallback
                }
                audio.play().catch(() => {});
                state.mediaPlaying = true;
                console.log('▶️ Started audio playback programmatically');
                handled = true;
            }
        });

        console.log(`🎵 Media handler finished - handled: ${handled}`);
        return handled;
    }

    // === DRAG-AND-DROP QUIZ HANDLING ===

    // Smart knowledge base for federally protected characteristics
    const protectedCharacteristics = [
        'national origin',
        'age (40 or older)',
        'age',
        'genetic information',
        'sex',
        'disability',
        'race',
        'religion',
        'pregnancy',
        'color',
        'veteran status',
        'sexual orientation'
    ];

    const notFederallyProtected = [
        'marital status',
        'political affiliation',
        'personal style',
        'height',
        'weight'
    ];

    function handleDragDropQuiz(doc) {
        // Skip if quiz is already completed or recently completed
        if (state.quizCompleted || (Date.now() - state.lastQuizCompletionTime < 10000)) {
            return false;
        }

        // Find drag items and drop zone
        const dragItems = doc.querySelectorAll('.DragAndDropItem[data-item-id]');
        const dropZone = doc.getElementById('drop_zone_box');

        if (dragItems.length === 0 || !dropZone) return false;

        // Find question text
        const questionElement = doc.querySelector('[data-id*="_title"], h1[data-id*="title"]');
        if (!questionElement) return false;

        const questionText = questionElement.textContent.trim();
        const questionHash = questionText.substring(0, 100);

        // Skip if we've already processed this exact question
        if (state.processedQuestions.has(questionHash)) {
            console.log('🔄 Question already processed, skipping...');
            return false;
        }

        if (questionText === state.lastQuestionText) return false;

        console.log('📝 Drag-Drop Question:', questionText.substring(0, 80) + '...');

        // Check if this is a "select all that apply" question
        const isSelectAll = questionText.toLowerCase().includes('select all that apply') ||
                           questionText.toLowerCase().includes('all that apply');

        let selectedCount = 0;

        // Smart selection for federally protected characteristics
        if (questionText.toLowerCase().includes('federally protected') ||
            questionText.toLowerCase().includes('protected characteristic')) {

            dragItems.forEach(item => {
                const itemText = item.textContent.trim().toLowerCase();
                const isPressed = item.getAttribute('aria-pressed') === 'true';

                if (isPressed) return; // Skip if already selected

                const isProtected = protectedCharacteristics.some(protected =>
                    itemText.includes(protected.toLowerCase())
                );

                const isNotProtected = notFederallyProtected.some(notProtected =>
                    itemText.includes(notProtected.toLowerCase())
                );

                // Only select if it's protected AND not in the excluded list
                if (isProtected && !isNotProtected) {
                    if ((isSelectAll) || (!isSelectAll && selectedCount === 0)) {
                        setTimeout(() => {
                            simulateDragDrop(item, dropZone);
                            console.log('✅ Selected protected:', itemText);
                            selectedCount++;
                        }, selectedCount * 300);
                    }
                } else if (isNotProtected) {
                    console.log('🚫 Skipping non-federally protected:', itemText);
                }
            });

            if (selectedCount > 0) {
                state.lastQuestionText = questionText;
                state.questionsAnswered++;
                state.processedQuestions.add(questionHash);

                // Mark quiz as completed and prevent further attempts
                state.quizCompleted = true;
                state.lastQuizCompletionTime = Date.now();
                state.mediaPlaying = false;
                state.mediaCompleted = false; // Reset for next media

                console.log(`🎉 Quiz completed with ${selectedCount} selections`);
                console.log('⏳ Waiting for media to become available...');

                // Reset navigation state after quiz completion
                setTimeout(() => {
                    state.lastClickedButton = null;
                    console.log('🔄 Navigation state reset for next section');
                }, 2000);

                return true;
            }
        }

        return false;
    }

    // Simulate drag and drop operation
    function simulateDragDrop(dragElement, dropZone) {
        try {
            // Method 1: Try simple click
            dragElement.click();

            // Method 2: Try setting aria-pressed directly
            dragElement.setAttribute('aria-pressed', 'true');

            // Method 3: Simulate drag events without problematic DataTransfer
            const mouseDown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
            const mouseMove = new MouseEvent('mousemove', { bubbles: true, cancelable: true });
            const mouseUp = new MouseEvent('mouseup', { bubbles: true, cancelable: true });

            dragElement.dispatchEvent(mouseDown);
            dropZone.dispatchEvent(mouseMove);
            dropZone.dispatchEvent(mouseUp);

            // Method 4: Try focus and keyboard
            dragElement.focus();
            const spaceKey = new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true });
            dragElement.dispatchEvent(spaceKey);

        } catch (e) {
            if (config.debug) console.log('⚠️ Drag-drop error:', e.message);
            // Fallback: just click
            try {
                dragElement.click();
            } catch (fallbackError) {
                console.log('⚠️ Even fallback click failed:', fallbackError.message);
            }
        }
    }

    // === REGULAR QUIZ HANDLING ===

    function handleQuiz(doc) {
        // Find quiz buttons
        const quizSelectors = [
            'button.pressable',
            'button.sc-gbWDHf',
            'fieldset button',
            'button.sc-WsMwQ',
            'button[class*="sc-"]'
        ];

        let buttons = [];
        for (const selector of quizSelectors) {
            const found = doc.querySelectorAll(selector);
            if (found.length > 0) {
                buttons = Array.from(found).filter(b => b.offsetParent !== null);
                break;
            }
        }

        if (buttons.length === 0) return false;

        // Get question text
        const questionSelectors = [
            '[data-id*="_body"]',
            '.sc-xwuxA',
            '.sc-bXCLTC p',
            'h3',
            '.question-text'
        ];

        let questionText = '';
        for (const selector of questionSelectors) {
            const element = doc.querySelector(selector);
            if (element && element.textContent.trim().length > 20) {
                questionText = element.textContent.trim();
                break;
            }
        }

        if (!questionText || questionText === state.lastQuestionText) {
            return false;
        }

        console.log('📝 Question:', questionText.substring(0, 60) + '...');

        // Smart answer selection
        let selectedButton = selectSmartAnswer(questionText, buttons);

        if (selectedButton) {
            setTimeout(() => {
                selectedButton.click();
                state.lastQuestionText = questionText;
                state.questionsAnswered++;
                console.log(`✅ Answer: ${selectedButton.textContent.trim()} (Q#${state.questionsAnswered})`);
            }, config.clickDelay);
            return true;
        }

        return false;
    }

    function selectSmartAnswer(question, buttons) {
        const q = question.toLowerCase();

        // Find True/False buttons
        const trueBtn = buttons.find(b => b.textContent.trim().toLowerCase() === 'true');
        const falseBtn = buttons.find(b => b.textContent.trim().toLowerCase() === 'false');

        if (trueBtn && falseBtn) {
            // Smart True/False logic based on compliance training patterns
            const truePatterns = [
                'harassment', 'discrimination', 'report', 'tell', 'supervisor', 'manager',
                'appropriate', 'professional', 'training', 'policy', 'required',
                'hostile environment', 'retaliation', 'witness'
            ];

            const falsePatterns = [
                'personal style', 'preference', 'ignore', 'not your problem',
                'joke', 'harmless', 'overreacting'
            ];

            for (const pattern of truePatterns) {
                if (q.includes(pattern)) return trueBtn;
            }

            for (const pattern of falsePatterns) {
                if (q.includes(pattern)) return falseBtn;
            }

            // Default to True for compliance questions
            return trueBtn;
        }

        // For multiple choice, look for appropriate answers
        const goodAnswers = ['report', 'manager', 'supervisor', 'hr', 'human resources', 'policy', 'appropriate'];
        for (const btn of buttons) {
            const btnText = btn.textContent.toLowerCase();
            if (goodAnswers.some(good => btnText.includes(good))) {
                return btn;
            }
        }

        // Fallback to first button
        return buttons[0];
    }

    // === NAVIGATION HANDLING ===

    function handleNavigation(doc) {
        // SIMPLE LOGIC: If Next button exists, click it. Period.

        // Check for Next buttons by ID (highest priority)
        const nextBtnById = doc.getElementById('nextBtn');
        if (nextBtnById && nextBtnById.offsetParent !== null && !nextBtnById.disabled) {
            console.log('🎯 Found nextBtn by ID, clicking IMMEDIATELY!');
            setTimeout(() => {
                nextBtnById.click();
                state.lastClickedButton = nextBtnById;
                // Reset ALL states for next section
                state.mediaPlaying = false;
                state.mediaCompleted = false;
                state.quizCompleted = false;
                state.lastQuestionText = '';
                state.lastQuizCompletionTime = 0;
                console.log(`➡️ NEXT BUTTON CLICKED: ${nextBtnById.id}`);
                console.log('🔄 All states reset for next section');
            }, 10);
            return true;
        }

        // Check for Next buttons by text content (second priority)
        const allButtons = doc.querySelectorAll('button');
        for (const button of allButtons) {
            const text = button.textContent.toLowerCase().trim();
            if (text === 'next' && button.offsetParent !== null && !button.disabled) {
                console.log('🎯 Found Next button by text, clicking IMMEDIATELY!');
                setTimeout(() => {
                    button.click();
                    state.lastClickedButton = button;
                    // Reset ALL states for next section
                    state.mediaPlaying = false;
                    state.mediaCompleted = false;
                    state.quizCompleted = false;
                    state.lastQuestionText = '';
                    state.lastQuizCompletionTime = 0;
                    console.log(`➡️ NEXT BUTTON CLICKED: "${text}"`);
                    console.log('🔄 All states reset for next section');
                }, 10);
                return true;
            }
        }

        // No Next button found
        return false;

        // ONLY AFTER checking for Next buttons, apply normal navigation restrictions
        // Don't navigate while media is playing or if we just completed a quiz recently
        if (state.mediaPlaying || (Date.now() - state.lastQuizCompletionTime < 5000 && !state.mediaCompleted)) {
            return false;
        }

        // Only navigate if we have completed the quiz AND media (if any)
        if (!state.quizCompleted && !state.mediaCompleted) {
            return false;
        }

        // Priority 1: Look for specific next button with ID or class
        for (const docToCheck of documentsToCheck) {
            const specificNextButtons = [
                docToCheck.getElementById('nextBtn'),
                docToCheck.querySelector('#nextBtn'),
                docToCheck.querySelector('button#nextBtn'),
                docToCheck.querySelector('.next-button'),
                docToCheck.querySelector('button[title*="Next"]'),
                docToCheck.querySelector('button[aria-label*="Next"]'),
                docToCheck.querySelector('button:has(svg[title="Next"])') // SVG with Next title
            ].filter(btn => btn && btn.offsetParent !== null && !btn.disabled);

            if (specificNextButtons.length > 0) {
                const nextBtn = specificNextButtons[0];
                if (nextBtn !== state.lastClickedButton) {
                    setTimeout(() => {
                        nextBtn.click();
                        state.lastClickedButton = nextBtn;
                        // Reset ALL states for next section
                        state.mediaPlaying = false;
                        state.mediaCompleted = false;
                        state.quizCompleted = false;
                        state.lastQuestionText = '';
                        state.lastQuizCompletionTime = 0;
                        // Don't clear processedQuestions as questions might repeat
                        const location = docToCheck === document ? 'parent frame' : 'iframe';
                        console.log(`➡️ Next button clicked in ${location}:`, nextBtn.id || nextBtn.className);
                        console.log('🔄 All states reset for next section');
                    }, config.clickDelay);
                    return true;
                }
            }
        }

        // Priority 2: Look for submit/check answer buttons after quiz (in both documents)
        for (const docToCheck of documentsToCheck) {
            const submitButtons = docToCheck.querySelectorAll('button');
            for (const button of submitButtons) {
                const text = button.textContent.toLowerCase().trim();
                const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();

                if ((text.includes('submit') || text.includes('check answer') ||
                     ariaLabel.includes('submit') || ariaLabel.includes('check')) &&
                    button.offsetParent !== null && !button.disabled) {

                    if (button !== state.lastClickedButton) {
                        setTimeout(() => {
                            button.click();
                            state.lastClickedButton = button;
                            // Reset states after submit
                            state.mediaPlaying = false;
                            state.mediaCompleted = false;
                            state.quizCompleted = false;
                            state.lastQuestionText = '';
                            state.lastQuizCompletionTime = 0;
                            const location = docToCheck === document ? 'parent frame' : 'iframe';
                            console.log(`📤 Submit clicked in ${location}:`, text);
                            console.log('🔄 States reset after submit');
                        }, config.clickDelay);
                        return true;
                    }
                }
            }
        }

        // Priority 3: General navigation keywords (in both documents)
        const navKeywords = ['next', 'continue', 'done', 'proceed', 'finish'];

        for (const docToCheck of documentsToCheck) {
            const allButtons = docToCheck.querySelectorAll('button');

            for (const button of allButtons) {
                const text = button.textContent.toLowerCase().trim();
                const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();

                if (navKeywords.some(keyword => text === keyword || text.includes(keyword) || ariaLabel.includes(keyword))) {
                    if (button.offsetParent !== null && !button.disabled && button !== state.lastClickedButton) {
                        setTimeout(() => {
                            button.click();
                            state.lastClickedButton = button;
                            // Reset ALL states for next section
                            state.mediaPlaying = false;
                            state.mediaCompleted = false;
                            state.quizCompleted = false;
                            state.lastQuestionText = '';
                            state.lastQuizCompletionTime = 0;
                            const location = docToCheck === document ? 'parent frame' : 'iframe';
                            console.log(`➡️ Navigation in ${location}:`, text || ariaLabel);
                            console.log('🔄 All states reset for next section');
                        }, config.clickDelay);
                        return true;
                    }
                }
            }
        }

        return false;
    }

    // === INTERACTIVE CARD HANDLING ===

    function handleInteractiveCards(doc) {
        // ONLY check iframe document - DON'T auto-click parent frame buttons!
        // Parent frame buttons like "Rate this", "Overview" are not part of the course content
        const documentsToCheck = [doc];

        for (const docToCheck of documentsToCheck) {
            // AGGRESSIVE AUTO-DETECTION: Find ALL potentially clickable elements
            const allElements = docToCheck.querySelectorAll('*');
            const clickableElements = [];

            Array.from(allElements).forEach(element => {
                // Skip if already clicked or is a button/input (handled elsewhere)
                if (element.hasAttribute('data-clicked') ||
                    element.tagName === 'BUTTON' ||
                    element.tagName === 'INPUT' ||
                    element.tagName === 'A' ||
                    element.tagName === 'SCRIPT' ||
                    element.tagName === 'STYLE') {
                    return;
                }

                // Must be visible and reasonably sized
                if (element.offsetParent === null ||
                    element.clientHeight < 20 ||
                    element.clientWidth < 20) {
                    return;
                }

                let isClickable = false;
                const style = window.getComputedStyle(element);

                // 1. Has explicit click handlers
                if (element.onclick ||
                    element.getAttribute('onclick') ||
                    element.hasAttribute('data-testid') ||
                    element.getAttribute('role') === 'button') {
                    isClickable = true;
                }

                // 2. Has cursor pointer (indicates clickability)
                if (style.cursor === 'pointer') {
                    isClickable = true;
                }

                // 3. Has interactive CSS classes or attributes (VERY BROAD)
                const className = element.className.toString().toLowerCase();
                const interactiveKeywords = [
                    // Cards and containers
                    'card', 'clickable', 'interactive', 'option', 'choice', 'select',
                    'scenario', 'item', 'tile', 'panel', 'box', 'container',

                    // UI components
                    'component', 'widget', 'element', 'block', 'section',
                    'content', 'area', 'zone', 'region', 'wrapper',

                    // Interactive indicators
                    'hover', 'active', 'focus', 'selectable', 'pressable',
                    'touchable', 'actionable', 'trigger', 'handle',

                    // Common CSS framework classes
                    'btn', 'link', 'nav', 'menu', 'tab', 'modal', 'popup',
                    'dropdown', 'toggle', 'switch', 'control', 'input'
                ];

                if (interactiveKeywords.some(keyword => className.includes(keyword))) {
                    isClickable = true;
                }

                // 4. Has styled appearance that suggests interactivity
                if (style.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
                    style.backgroundColor !== 'transparent' &&
                    (style.border !== 'none' ||
                     style.borderRadius !== '0px' ||
                     style.boxShadow !== 'none')) {
                    isClickable = true;
                }

                // 5. Has hover effects (check for CSS transitions/transforms)
                if (style.transition.includes('transform') ||
                    style.transition.includes('background') ||
                    style.transition.includes('opacity') ||
                    style.transform !== 'none') {
                    isClickable = true;
                }

                // 6. Contains text that suggests it's clickable (VERY BROAD)
                const text = element.textContent.trim().toLowerCase();
                const clickableTextPatterns = [
                    // Action words
                    'click', 'select', 'choose', 'pick', 'tap', 'start', 'begin',
                    'continue', 'next', 'option', 'scenario', 'case', 'situation',
                    'play', 'watch', 'listen', 'view', 'see', 'read', 'learn',
                    'explore', 'discover', 'find', 'open', 'close', 'expand',
                    'collapse', 'show', 'hide', 'toggle', 'switch', 'change',

                    // Questions and prompts
                    'what', 'how', 'when', 'where', 'why', 'which', 'who',
                    'would you', 'should you', 'do you', 'can you', 'will you',

                    // Interactive content
                    'lesson', 'module', 'chapter', 'section', 'part', 'step',
                    'exercise', 'activity', 'practice', 'quiz', 'test', 'exam',
                    'training', 'course', 'tutorial', 'guide', 'help',

                    // Navigation
                    'menu', 'home', 'back', 'forward', 'up', 'down', 'left', 'right',
                    'previous', 'next', 'first', 'last', 'skip', 'goto', 'jump',

                    // Common UI elements
                    'button', 'link', 'tab', 'panel', 'dialog', 'modal', 'popup',
                    'tooltip', 'dropdown', 'accordion', 'carousel', 'slider'
                ];

                if (text.length > 0 && text.length < 500 &&
                    clickableTextPatterns.some(pattern => text.includes(pattern))) {
                    isClickable = true;
                }

                // 7. Has specific data attributes that suggest interactivity
                const dataAttributes = element.getAttributeNames().filter(name => name.startsWith('data-'));
                if (dataAttributes.some(attr =>
                    attr.includes('click') ||
                    attr.includes('select') ||
                    attr.includes('action') ||
                    attr.includes('id'))) {
                    isClickable = true;
                }

                // 8. Is a div/span with meaningful content and styling
                if ((element.tagName === 'DIV' || element.tagName === 'SPAN') &&
                    text.length > 3 && text.length < 1000 &&
                    element.children.length < 20) {
                    isClickable = true;
                }

                // 9. Has any event listeners attached (very strong indicator)
                if (element.getEventListeners && Object.keys(element.getEventListeners()).length > 0) {
                    isClickable = true;
                }

                // 10. Has elevated z-index (often indicates interactive overlays)
                const zIndex = parseInt(style.zIndex);
                if (!isNaN(zIndex) && zIndex > 1) {
                    isClickable = true;
                }

                // 11. Has any form of positioning (absolute, fixed, relative with offsets)
                if (style.position === 'absolute' ||
                    style.position === 'fixed' ||
                    (style.position === 'relative' && (style.top !== 'auto' || style.left !== 'auto'))) {
                    isClickable = true;
                }

                // 12. Is an image with meaningful size (could be clickable)
                if (element.tagName === 'IMG' &&
                    element.clientWidth > 30 &&
                    element.clientHeight > 30) {
                    isClickable = true;
                }

                // 13. Has certain ARIA attributes that suggest interactivity
                const ariaAttributes = ['aria-label', 'aria-describedby', 'aria-expanded', 'aria-controls', 'aria-pressed'];
                if (ariaAttributes.some(attr => element.hasAttribute(attr))) {
                    isClickable = true;
                }

                // 14. Is part of a form-like structure (fieldset, legend, label)
                if (['FIELDSET', 'LEGEND', 'LABEL'].includes(element.tagName) ||
                    element.closest('fieldset') || element.closest('form')) {
                    isClickable = true;
                }

                // 15. Contains icons or symbols (SVG, icon fonts)
                if (element.tagName === 'SVG' ||
                    element.querySelector('svg') ||
                    className.includes('icon') ||
                    className.includes('fa-') ||
                    text.match(/[▶▷►▸⏵▲△▼▽◄◂◀⬅➡⬆⬇]/)) {
                    isClickable = true;
                }

                if (isClickable) {
                    clickableElements.push({
                        element: element,
                        text: text.substring(0, 50),
                        reasons: [] // Could track why it was detected as clickable
                    });
                }
            });

            if (clickableElements.length > 0) {
                const location = docToCheck === document ? 'parent frame' : 'iframe';
                console.log(`🎯 Auto-detected ${clickableElements.length} clickable elements in ${location}`);

                // Sort by size (larger elements first) and position (top to bottom, left to right)
                clickableElements.sort((a, b) => {
                    const aRect = a.element.getBoundingClientRect();
                    const bRect = b.element.getBoundingClientRect();

                    // First by area (larger first)
                    const aArea = aRect.width * aRect.height;
                    const bArea = bRect.width * bRect.height;
                    if (aArea !== bArea) return bArea - aArea;

                    // Then by vertical position (top first)
                    if (aRect.top !== bRect.top) return aRect.top - bRect.top;

                    // Finally by horizontal position (left first)
                    return aRect.left - bRect.left;
                });

                // Click up to 5 elements at a time (to avoid overwhelming the page)
                const elementsToClick = clickableElements.slice(0, 5);

                elementsToClick.forEach((item, index) => {
                    setTimeout(() => {
                        try {
                            const element = item.element;

                            // VALIDATE ELEMENT BEFORE CLICKING
                            if (!element || !element.nodeType || element.nodeType !== 1) {
                                console.log('⚠️ Invalid element detected, skipping');
                                return;
                            }

                            // Check if element still exists in DOM
                            if (!element.isConnected || !element.ownerDocument) {
                                console.log('⚠️ Element not in DOM, skipping');
                                return;
                            }

                            // Check if element is still visible
                            if (!element.offsetParent && element.style.display !== 'none') {
                                console.log('⚠️ Element not visible, skipping');
                                return;
                            }

                            // Try multiple click methods with validation
                            let clickSuccessful = false;

                            // Method 1: Direct click (safest)
                            if (typeof element.click === 'function') {
                                try {
                                    element.click();
                                    clickSuccessful = true;
                                } catch (clickErr) {
                                    console.log('⚠️ Direct click failed:', clickErr.message);
                                }
                            }

                            // Method 2: Mouse events
                            if (!clickSuccessful) {
                                try {
                                    ['mousedown', 'mouseup', 'click'].forEach(eventType => {
                                        const event = new MouseEvent(eventType, {
                                            bubbles: true,
                                            cancelable: true,
                                            view: docToCheck.defaultView || window
                                        });
                                        element.dispatchEvent(event);
                                    });
                                    clickSuccessful = true;
                                } catch (mouseErr) {
                                    console.log('⚠️ Mouse events failed:', mouseErr.message);
                                }
                            }

                            // Method 3: Focus and keyboard events
                            if (!clickSuccessful) {
                                try {
                                    if (typeof element.focus === 'function') {
                                        element.focus();
                                    }
                                    const enterEvent = new KeyboardEvent('keydown', {
                                        key: 'Enter',
                                        code: 'Enter',
                                        bubbles: true,
                                        cancelable: true
                                    });
                                    element.dispatchEvent(enterEvent);
                                    clickSuccessful = true;
                                } catch (keyErr) {
                                    console.log('⚠️ Keyboard events failed:', keyErr.message);
                                }
                            }

                            // Method 4: Touch events for mobile
                            try {
                                ['touchstart', 'touchend'].forEach(eventType => {
                                    const event = new TouchEvent(eventType, {
                                        bubbles: true,
                                        cancelable: true
                                    });
                                    element.dispatchEvent(event);
                                });
                            } catch (touchErr) {
                                // Touch events may not be supported, ignore
                            }

                            // Mark as clicked if we have a valid element
                            if (typeof element.setAttribute === 'function') {
                                element.setAttribute('data-clicked', 'true');
                            }

                            if (clickSuccessful) {
                                console.log(`🃏 Auto-clicked in ${location}: "${item.text}"`);
                            } else {
                                console.log(`⚠️ All click methods failed for: "${item.text}"`);
                            }

                        } catch (e) {
                            console.log('⚠️ Auto-click error:', e.message);
                            console.log('Element details:', item.element);
                        }
                    }, index * 400); // 400ms delay between clicks
                });

                return true; // Found and processed clickable elements
            }
        }

        return false; // No clickable elements found
    }

    // === SPECIAL HANDLERS (from 1.js) ===

    function handleAudioPopups(doc) {
        const popupButtons = doc.querySelectorAll('.audioPopUpBtn button:not([data-clicked])');

        popupButtons.forEach(btn => {
            btn.click();
            btn.dataset.clicked = 'true';
            console.log('🔊 Audio popup clicked');
        });

        return popupButtons.length > 0;
    }

    function handleSvgAudio(doc) {
        const svgIcons = doc.querySelectorAll('svg.sc-dZxRDy:not([data-clicked])');

        if (svgIcons.length > 0) {
            svgIcons[0].click();
            svgIcons[0].dataset.clicked = 'true';
            console.log('🎯 SVG audio icon clicked');
            return true;
        }

        return false;
    }

    // === STUCK DETECTION ===

    function checkIfStuck(doc) {
        const currentText = doc.body.innerText;
        if (currentText === state.lastPageText) {
            state.stuckCount++;
            if (state.stuckCount > 8) {
                console.warn('⚠️ Stuck detected, resetting state...');
                state.mediaPlaying = false;
                state.lastClickedButton = null;
                state.stuckCount = 0;
                return true;
            }
        } else {
            state.stuckCount = 0;
            state.lastPageText = currentText;
        }
        return false;
    }

    // === MAIN AUTOMATION LOOP ===

    function runAutomation() {
        try {
            const content = findSCORMContent();
            if (!content) {
                console.log('⏳ Searching for SCORM content...');
                return;
            }

            const { doc, source } = content;
            if (config.debug && state.stuckCount === 0) {
                console.log(`🎯 Using: ${source}`);
            }

            // Check for completion - be more specific to avoid false positives
            const bodyText = doc.body.innerText.toLowerCase();
            if ((bodyText.includes('100%') && bodyText.includes('complete') && bodyText.includes('course')) ||
                (bodyText.includes('congratulations') && bodyText.includes('completed')) ||
                bodyText.includes('you have successfully completed') ||
                bodyText.includes('course completion')) {
                console.log('🎉 Course actually completed!');
                clearInterval(automationInterval);
                return;
            }

            // Check if stuck
            const isStuck = checkIfStuck(doc);

            // Action priority:
            // 1. ALWAYS CHECK FOR NAVIGATION FIRST (Next, Continue buttons)
            // 2. Handle media (audio/video) - MOVED UP for media sections
            // 3. Handle drag-and-drop quizzes
            // 4. Handle regular quizzes/questions
            // 5. Handle interactive cards/elements (AUTO-DETECTION)
            // 6. Handle special elements (popups, SVGs)

            if (handleNavigation(doc)) return;
            if (handleMedia(doc)) return; // MOVED UP - handle media immediately after navigation
            if (handleDragDropQuiz(doc)) return;
            if (handleQuiz(doc)) return;
            // DISABLED: if (handleInteractiveCards(doc)) return; // CAUSING PARENT FRAME CLICKS
            if (handleAudioPopups(doc)) return;
            if (handleSvgAudio(doc)) return;

            // If nothing worked and we're stuck, try clicking any prominent buttons
            if (isStuck) {
                const allButtons = doc.querySelectorAll('button');
                const clickableButtons = Array.from(allButtons).filter(b =>
                    b.offsetParent !== null && !b.disabled && b.clientHeight > 20
                );

                if (clickableButtons.length > 0) {
                    clickableButtons[0].click();
                    console.log('🔄 Unstuck attempt:', clickableButtons[0].textContent.trim());
                }
            }

        } catch (e) {
            if (config.debug) console.log('❌ Error:', e.message);
        }
    }

    // === START AUTOMATION ===

    const automationInterval = setInterval(runAutomation, config.checkInterval);

    // === GLOBAL CONTROLS ===

    window.EasyLlamaAuto = {
        stop() {
            clearInterval(automationInterval);
            console.log('🛑 Stopped');
            console.log('📊 Stats:', state);
        },
        start() {
            clearInterval(automationInterval); // Clear any existing interval
            const newInterval = setInterval(runAutomation, config.checkInterval);
            // Update the global reference for stop() method
            eval('automationInterval = newInterval');
            console.log('▶️ Started/Restarted');
            runAutomation(); // Run immediately
        },
        stats() {
            console.log('📊 Current stats:', state);
            console.log('🔧 Config:', config);
        },
        debug() {
            const content = findSCORMContent();
            if (content) {
                const { doc, source } = content;
                console.log(`🎯 Content source: ${source}`);
                console.log(`📄 Buttons: ${doc.querySelectorAll('button').length}`);
                console.log(`🎵 Audio: ${doc.querySelectorAll('audio').length}`);
                console.log(`🎥 Video: ${doc.querySelectorAll('video').length}`);
                console.log(`❓ Questions: ${doc.querySelectorAll('[data-id*="_body"], .question-text, [data-id*="_title"]').length}`);
                console.log(`🎯 Drag Items: ${doc.querySelectorAll('.DragAndDropItem').length}`);
                console.log(`📦 Drop Zone: ${doc.getElementById('drop_zone_box') ? 'Found' : 'Missing'}`);
                console.log(`🔘 Next Button in iframe: ${doc.getElementById('nextBtn') ? 'Found' : 'Missing'}`);
                console.log(`🔘 Next Button in parent: ${document.getElementById('nextBtn') ? 'Found' : 'Missing'}`);

                // List all visible buttons in iframe
                const buttons = doc.querySelectorAll('button');
                console.log('🔽 Available buttons in iframe:');
                buttons.forEach((btn, i) => {
                    if (btn.offsetParent !== null) {
                        console.log(`  ${i}: "${btn.textContent.trim()}" (${btn.id || btn.className || 'no-id'})`);
                    }
                });

                // List all visible buttons in parent document
                if (doc !== document) {
                    const parentButtons = document.querySelectorAll('button');
                    console.log('🔽 Available buttons in parent frame:');
                    parentButtons.forEach((btn, i) => {
                        if (btn.offsetParent !== null) {
                            console.log(`  ${i}: "${btn.textContent.trim()}" (${btn.id || btn.className || 'no-id'})`);
                        }
                    });
                }
            } else {
                console.log('❌ No SCORM content found');
            }
        },
        forceNavigation() {
            const content = findSCORMContent();
            if (content) {
                const { doc } = content;
                console.log('🔍 Looking for navigation buttons...');

                // Try all possible documents
                const docs = [doc, document];

                for (const d of docs) {
                    const allButtons = d.querySelectorAll('button');
                    console.log(`📋 Found ${allButtons.length} buttons in ${d === document ? 'parent' : 'iframe'}`);

                    allButtons.forEach((btn, i) => {
                        if (btn.offsetParent !== null && !btn.disabled) {
                            const text = btn.textContent.trim();
                            const id = btn.id;
                            const classes = btn.className;
                            console.log(`  ${i}: "${text}" (id: ${id}, class: ${classes})`);

                            // Try clicking anything that looks like navigation
                            if (text.toLowerCase().includes('next') ||
                                text.toLowerCase().includes('submit') ||
                                text.toLowerCase().includes('continue') ||
                                id.includes('next') ||
                                classes.includes('next')) {
                                console.log(`🎯 Attempting to click: "${text}"`);
                                btn.click();
                                return;
                            }
                        }
                    });
                }
            }
        },
        config,
        state
    };

    console.log('🦙 EasyLlama Hybrid Automation Ready!');
    console.log('📋 Commands: EasyLlamaAuto.stop(), .stats(), .debug()');

})();
