// Inject overlay into the page
const overlay = document.createElement('iframe');
overlay.src = chrome.runtime.getURL('overlay.html');
overlay.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    width: 280px;
    height: 400px;
    border: none;
    z-index: 2147483647;
    opacity: 0;
    transform: translateY(-6px);
    transition: all 0.12s cubic-bezier(0.2, 0, 0.1, 1);
    pointer-events: none;
    background: transparent;
    display: none;
`;
document.body.appendChild(overlay);

// Track key states and first load
let cmdPressed = false;
let optionPressed = false;
let currentHistory = [];
let isFirstLoad = true;

// Function to handle messages from the overlay
window.addEventListener('message', async (event) => {
    if (event.data.type === 'getHistory') {
        // Get history from background script
        try {
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage({action: 'getHistory'}, resolve);
            });
            
            currentHistory = response.history || []; // Store history locally
            
            // Send history back to overlay
            event.source.postMessage({
                type: 'historyUpdate',
                history: currentHistory
            }, '*');
        } catch (error) {
            event.source.postMessage({
                type: 'error',
                message: error.message
            }, '*');
        }
    } else if (event.data.type === 'copyText') {
        // Handle copy request from overlay
        try {
            const text = event.data.text;
            await insertTextAtCursor(text);
            // Hide overlay after successful insertion
            hideOverlay();
            cmdPressed = false;
            optionPressed = false;
        } catch (error) {
            console.error('Error inserting text:', error);
        }
    }
});

// Function to insert text at cursor position
function insertTextAtCursor(text) {
    const activeElement = document.activeElement;
    
    if (!activeElement) return;

    // For regular input and textarea elements
    if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
        const start = activeElement.selectionStart;
        const end = activeElement.selectionEnd;
        const value = activeElement.value;
        
        // Insert text at cursor position
        activeElement.value = value.substring(0, start) + text + value.substring(end);
        
        // Move cursor to end of inserted text
        const newPosition = start + text.length;
        activeElement.setSelectionRange(newPosition, newPosition);
        
        // Trigger input event for reactive frameworks
        activeElement.dispatchEvent(new Event('input', { bubbles: true }));
        activeElement.dispatchEvent(new Event('change', { bubbles: true }));
    }
    // For contenteditable elements
    else if (activeElement.isContentEditable) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            // Get the current selection range
            const range = selection.getRangeAt(0);
            
            // Delete any selected text
            range.deleteContents();
            
            // Insert the new text
            const textNode = document.createTextNode(text);
            range.insertNode(textNode);
            
            // Move cursor to end of inserted text
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
            
            // Trigger input event
            activeElement.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                inputType: 'insertText',
                data: text
            }));
        }
    }
}

// Function to show overlay
function showOverlay() {
    if (isFirstLoad) {
        // First time load with animation
        overlay.style.opacity = '0';
        overlay.style.transform = 'translateY(-6px)';
        overlay.style.display = 'block';
        overlay.style.pointerEvents = 'auto';
        
        // Force a reflow
        overlay.offsetHeight;
        
        // Trigger animation
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            overlay.style.transform = 'translateY(0)';
        });
        
        isFirstLoad = false;
    } else {
        // Subsequent loads without animation
        overlay.style.transition = 'none';
        overlay.style.display = 'block';
        overlay.style.opacity = '1';
        overlay.style.transform = 'translateY(0)';
        overlay.style.pointerEvents = 'auto';
    }
}

// Function to hide overlay
function hideOverlay() {
    overlay.style.display = 'none';
    overlay.style.pointerEvents = 'none';
}

// Function to handle text by index
async function handleTextByIndex(index) {
    if (currentHistory && currentHistory[index]) {
        try {
            insertTextAtCursor(currentHistory[index]);
            // Hide overlay after successful insertion
            hideOverlay();
            cmdPressed = false;
            optionPressed = false;
        } catch (error) {
            console.error('Error inserting text:', error);
        }
    }
}

// Listen for keydown events
document.addEventListener('keydown', async (e) => {
    // Update modifier key states
    if (e.key === 'Meta') {
        cmdPressed = true;
    } else if (e.key === 'Alt') {
        optionPressed = true;
    }

    // Show overlay when both modifier keys are pressed
    if (cmdPressed && optionPressed && overlay.style.display !== 'block') {
        showOverlay();
        overlay.contentWindow.postMessage({ type: 'show' }, '*');
    }

    // Handle number keys only when overlay is visible
    if (overlay.style.display === 'block') {
        // Map of Option+number special characters to their number values
        const optionNumberMap = {
            '£': '3',
            '¢': '4',
            '∞': '5',
            '§': '6',
            '¶': '7',
            '•': '8',
            'ª': '9',
            '¡': '1',
            '™': '2'
        };

        // Get the actual number, either from direct key or mapped special character
        const numberKey = optionNumberMap[e.key] || e.key;
        
        // Check if it's a number between 1-9
        if (numberKey >= '1' && numberKey <= '9') {
            e.preventDefault(); // Prevent number from being typed
            e.stopPropagation(); // Stop event from bubbling
            const index = parseInt(numberKey) - 1;
            await handleTextByIndex(index);
        }
    }
});

// Listen for keyup events
document.addEventListener('keyup', (e) => {
    if (e.key === 'Meta') {
        cmdPressed = false;
    } else if (e.key === 'Alt') {
        optionPressed = false;
    }

    // Hide overlay when either key is released
    if (!cmdPressed || !optionPressed) {
        hideOverlay();
    }
});

// Listen for copy events in the page
document.addEventListener('copy', (e) => {
    // Get the selected text directly from the selection
    const selectedText = window.getSelection().toString();
    if (selectedText) {
        chrome.runtime.sendMessage({action: 'addToHistory', text: selectedText});
    }
});

// Listen for cut events as well
document.addEventListener('cut', (e) => {
    // Get the selected text directly from the selection
    const selectedText = window.getSelection().toString();
    if (selectedText) {
        chrome.runtime.sendMessage({action: 'addToHistory', text: selectedText});
    }
});
