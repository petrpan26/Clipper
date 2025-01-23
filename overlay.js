// Get reference to the clipboard list element
const clipboardList = document.getElementById('clipboardList');
let isFirstLoad = true;

// Function to create a clipboard item element
function createClipboardItem(text, index) {
    const li = document.createElement('li');
    li.className = 'clipboard-item';
    
    // Create number badge
    const badge = document.createElement('div');
    badge.className = 'number-badge';
    badge.textContent = index + 1;
    
    // Create text container
    const textSpan = document.createElement('span');
    textSpan.className = 'item-text';
    // Truncate text if too long
    textSpan.textContent = text.length > 100 ? text.substring(0, 100) + '...' : text;
    
    // Add tooltip for full text
    textSpan.title = text;
    
    // Append elements
    li.appendChild(badge);
    li.appendChild(textSpan);
    
    // Add click handler
    li.addEventListener('click', async () => {
        try {
            // Send message to content script
            window.parent.postMessage({
                type: 'copyText',
                text: text
            }, '*');
            
            // Add temporary highlight effect
            li.style.background = 'rgba(138, 180, 248, 0.3)';
            setTimeout(() => {
                li.style.background = '';
            }, 200);
        } catch (error) {
            console.error('Error copying text:', error);
        }
    });
    
    return li;
}

// Function to show empty state
function showEmptyState() {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.textContent = 'No clipboard history yet';
    clipboardList.appendChild(emptyState);
}

// Function to update the clipboard history display
function updateClipboardHistory(history) {
    // Clear current list
    clipboardList.innerHTML = '';
    
    // Handle empty or null history
    if (!history || !Array.isArray(history) || history.length === 0) {
        showEmptyState();
    } else {
        // Add items (limit to 9 for number shortcuts)
        history.slice(0, 9).forEach((text, index) => {
            const item = createClipboardItem(text, index);
            clipboardList.appendChild(item);
        });
    }

    if (isFirstLoad) {
        // First load: enable animations
        document.body.classList.add('animate-enabled');
        requestAnimationFrame(() => {
            document.body.classList.add('visible');
        });
        isFirstLoad = false;
    } else {
        // Subsequent loads: instant show
        document.body.classList.remove('animate-enabled');
        document.body.classList.add('visible');
    }
}

// Listen for messages from the content script
window.addEventListener('message', (event) => {
    if (event.data.type === 'historyUpdate') {
        updateClipboardHistory(event.data.history);
    } else if (event.data.type === 'show') {
        // Remove visible class immediately
        document.body.classList.remove('visible');
        // Request history update
        window.parent.postMessage({ type: 'getHistory' }, '*');
    }
});

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('clipboardOverlay');
    overlay.style.display = 'block';
});
